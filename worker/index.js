import aiHealth from '../api/ai-health.js';
import bibleSearchIntent from '../api/bible-search-intent.js';
import health from '../api/health.js';
import insight from '../api/insight.js';
import readingMeditation from '../api/reading-meditation.js';
import verseDevotion from '../api/verse-devotion.js';
import verseDevotionPart from '../api/verse-devotion-part.js';
import verseDevotionQuick from '../api/verse-devotion-quick.js';
import verseDevotionReview from '../api/verse-devotion-review.js';
import verseQuestion from '../api/verse-question.js';

const API_ROUTES = new Map([
  ['/api/ai-health', aiHealth],
  ['/api/bible-search-intent', bibleSearchIntent],
  ['/api/health', health],
  ['/api/insight', insight],
  ['/api/reading-meditation', readingMeditation],
  ['/api/verse-devotion', verseDevotion],
  ['/api/verse-devotion-part', verseDevotionPart],
  ['/api/verse-devotion-quick', verseDevotionQuick],
  ['/api/verse-devotion-review', verseDevotionReview],
  ['/api/verse-question', verseQuestion],
]);

const MAX_WORKER_BODY_BYTES = 128 * 1024;

function requestHeaders(request, url) {
  const headers = {};
  for (const [key, value] of request.headers.entries()) {
    headers[key.toLowerCase()] = value;
  }

  if (!headers.host) headers.host = url.host;
  if (!headers['x-forwarded-host']) headers['x-forwarded-host'] = url.host;
  if (!headers['x-forwarded-proto']) headers['x-forwarded-proto'] = url.protocol.replace(':', '');
  if (!headers['x-real-ip'] && headers['cf-connecting-ip']) {
    headers['x-real-ip'] = headers['cf-connecting-ip'];
  }

  return headers;
}

function bodyTooLargeError() {
  const error = new Error('Request body too large');
  error.statusCode = 413;
  return error;
}

async function requestBody(request) {
  if (request.method === 'GET' || request.method === 'HEAD') return undefined;

  const contentLength = Number(request.headers.get('content-length') || 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_WORKER_BODY_BYTES) {
    throw bodyTooLargeError();
  }
  if (!request.body) return undefined;

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let bytesRead = 0;
  let text = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytesRead += value.byteLength;
    if (bytesRead > MAX_WORKER_BODY_BYTES) {
      await reader.cancel();
      throw bodyTooLargeError();
    }
    text += decoder.decode(value, { stream: true });
  }
  text += decoder.decode();

  if (!text) return undefined;

  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      return JSON.parse(text);
    } catch {
      return undefined;
    }
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function queryObject(url) {
  const query = {};
  for (const [key, value] of url.searchParams.entries()) query[key] = value;
  return query;
}

function createVercelResponseAdapter() {
  let statusCode = 200;
  let response = null;
  const headers = new Headers();

  const res = {
    setHeader(name, value) {
      headers.delete(name);
      if (Array.isArray(value)) {
        for (const item of value) headers.append(name, String(item));
      } else {
        headers.set(name, String(value));
      }
      return res;
    },
    getHeader(name) {
      return headers.get(name);
    },
    status(code) {
      statusCode = Number(code) || 200;
      return res;
    },
    json(body) {
      if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json; charset=utf-8');
      }
      response = new Response(JSON.stringify(body), { status: statusCode, headers });
      return res;
    },
    send(body) {
      if (body !== null && typeof body === 'object' && !(body instanceof ArrayBuffer) && !ArrayBuffer.isView(body)) {
        return res.json(body);
      }
      response = new Response(body ?? null, { status: statusCode, headers });
      return res;
    },
    end(body) {
      response = new Response(body ?? null, { status: statusCode, headers });
      return res;
    },
    writeHead(code, nextHeaders = {}) {
      statusCode = Number(code) || statusCode;
      for (const [name, value] of Object.entries(nextHeaders)) res.setHeader(name, value);
      return res;
    },
  };

  Object.defineProperty(res, 'statusCode', {
    get() {
      return statusCode;
    },
    set(value) {
      statusCode = Number(value) || statusCode;
    },
  });

  return {
    res,
    getResponse() {
      return response;
    },
  };
}

async function runVercelHandler(handler, request) {
  const url = new URL(request.url);
  const headers = requestHeaders(request, url);
  let body;

  try {
    body = await requestBody(request);
  } catch (error) {
    if (error?.statusCode === 413) {
      return Response.json(
        { ok: false, error: 'Request body too large', errorCode: 'REQUEST_BODY_TOO_LARGE' },
        { status: 413 },
      );
    }
    throw error;
  }

  const req = {
    method: request.method,
    url: `${url.pathname}${url.search}`,
    headers,
    query: queryObject(url),
    body,
    socket: {
      remoteAddress: headers['cf-connecting-ip'] || headers['x-real-ip'] || 'unknown',
    },
  };

  const adapter = createVercelResponseAdapter();

  try {
    await handler(req, adapter.res);
    return adapter.getResponse() || new Response(null, { status: 204 });
  } catch (error) {
    console.error('API handler failed', url.pathname, error);
    return Response.json(
      {
        ok: false,
        error: 'Internal server error',
        errorCode: 'WORKER_HANDLER_FAILED',
      },
      { status: 500 },
    );
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.length > 1 ? url.pathname.replace(/\/$/, '') : url.pathname;
    const handler = API_ROUTES.get(path);

    if (handler) return runVercelHandler(handler, request);

    if (path.startsWith('/api/')) {
      return Response.json(
        { ok: false, error: 'API route not found', errorCode: 'API_ROUTE_NOT_FOUND' },
        { status: 404 },
      );
    }

    return env.ASSETS.fetch(request);
  },
};
