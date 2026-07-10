import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const port = Number(process.env.API_PORT || 3001);

async function loadEnvFile(filename) {
  try {
    const raw = await readFile(resolve(root, filename), 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const separator = trimmed.indexOf('=');
      if (separator < 1) continue;
      const key = trimmed.slice(0, separator).trim();
      let value = trimmed.slice(separator + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = value;
    }
  } catch {
    // Optional local environment file.
  }
}

await loadEnvFile('.env');
await loadEnvFile('.env.local');
process.env.NODE_ENV ||= 'development';

const routeFiles = {
  '/api/health': 'api/health.js',
  '/api/verse-devotion': 'api/verse-devotion.js',
  '/api/verse-question': 'api/verse-question.js',
  '/api/bible-search-intent': 'api/bible-search-intent.js',
};

const handlers = new Map();
for (const [route, filename] of Object.entries(routeFiles)) {
  const module = await import(pathToFileURL(resolve(root, filename)).href);
  handlers.set(route, module.default);
}

function setCors(req, res) {
  const origin = String(req.headers.origin || '');
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
}

async function readJsonBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 1_000_000) throw new Error('Request body too large');
    chunks.push(chunk);
  }
  if (chunks.length === 0) return {};
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

const server = createServer(async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const url = new URL(req.url || '/', `http://${req.headers.host || `localhost:${port}`}`);
  const handler = handlers.get(url.pathname);
  if (!handler) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ ok: false, error: 'API route not found', path: url.pathname }));
    return;
  }

  try {
    req.query = Object.fromEntries(url.searchParams.entries());
    req.body = ['POST', 'PUT', 'PATCH'].includes(req.method || '') ? await readJsonBody(req) : {};
    await handler(req, res);
  } catch (error) {
    if (res.writableEnded) return;
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      errorCode: 'LOCAL_API_ERROR',
    }));
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Sion Bible local API server: http://127.0.0.1:${port}`);
  console.log(`Routes: ${[...handlers.keys()].join(', ')}`);
});
