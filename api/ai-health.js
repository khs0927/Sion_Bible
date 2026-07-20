import { callGeminiChat } from './_lib/gemini.js';
import { guardAiRequest } from './_lib/httpGuard.js';
import {
  callNvidiaChat,
  filterLikelyChatModels,
  listNvidiaModels,
  sendJson,
} from './_lib/nvidia.js';

function providerFailure(error) {
  const status = Number(error?.statusCode || 0);
  return {
    ok: false,
    status: Number.isFinite(status) && status > 0 ? status : undefined,
    errorCode: String(error?.errorCode || error?.name || 'PROBE_FAILED').slice(0, 80),
  };
}

async function probeNvidia() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(new Error('NVIDIA health probe timeout')), 10_000);
  const startedAt = Date.now();
  try {
    const models = await listNvidiaModels({ signal: controller.signal });
    const candidates = filterLikelyChatModels(models);
    const configuredModel = String(process.env.NVIDIA_PRIMARY_MODEL || process.env.NVIDIA_FAST_MODEL_1 || '').trim();
    const model = configuredModel && models.includes(configuredModel) ? configuredModel : candidates[0];
    if (!model) throw new Error('No NVIDIA chat model is available');

    const response = await callNvidiaChat({
      model,
      messages: [{ role: 'user', content: 'Reply with the single word OK.' }],
      temperature: 0,
      maxTokens: 8,
      signal: controller.signal,
      responseFormat: null,
      retryWithoutResponseFormat: false,
    });

    return {
      ok: Boolean(response.content),
      latencyMs: Date.now() - startedAt,
      modelCount: models.length,
      model: response.model,
      generation: Boolean(response.content),
    };
  } catch (error) {
    return { ...providerFailure(error), latencyMs: Date.now() - startedAt };
  } finally {
    clearTimeout(timeout);
  }
}

async function probeGemini() {
  const startedAt = Date.now();
  try {
    const response = await callGeminiChat({
      messages: [{ role: 'user', content: 'Reply with the single word OK.' }],
      temperature: 0,
      maxTokens: 8,
      timeoutMs: 8_000,
      responseMimeType: 'text/plain',
    });
    if (!response) return { ok: false, errorCode: 'MISSING_GEMINI_API_KEY' };
    return {
      ok: Boolean(response.content),
      latencyMs: Date.now() - startedAt,
      model: response.model,
      generation: Boolean(response.content),
    };
  } catch (error) {
    return { ...providerFailure(error), latencyMs: Date.now() - startedAt };
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return sendJson(res, 405, {
      ok: false,
      error: 'Method not allowed',
      errorCode: 'INVALID_METHOD',
    });
  }

  const guard = guardAiRequest(req, { limit: 4, windowMs: 60_000, maxBodyBytes: 1_000 });
  if (!guard.ok) {
    if (guard.retryAfterSeconds) res.setHeader('Retry-After', String(guard.retryAfterSeconds));
    return sendJson(res, guard.status, guard.body);
  }

  res.setHeader('Cache-Control', 'no-store, max-age=0');
  const configured = {
    nvidia: Boolean(process.env.NVIDIA_API_KEY),
    gemini: Boolean(process.env.GEMINI_API_KEY),
  };
  const shouldProbe = String(req.query?.probe || '') === '1';

  if (!shouldProbe) {
    return sendJson(res, 200, {
      ok: configured.nvidia || configured.gemini,
      configured,
      probeAvailable: true,
      routes: ['/api/verse-devotion', '/api/verse-question', '/api/bible-search-intent'],
    });
  }

  const [nvidia, gemini] = await Promise.all([
    configured.nvidia ? probeNvidia() : Promise.resolve({ ok: false, errorCode: 'NOT_CONFIGURED' }),
    configured.gemini ? probeGemini() : Promise.resolve({ ok: false, errorCode: 'NOT_CONFIGURED' }),
  ]);

  return sendJson(res, 200, {
    ok: nvidia.ok || gemini.ok,
    configured,
    providers: { nvidia, gemini },
    checkedAt: new Date().toISOString(),
  });
}
