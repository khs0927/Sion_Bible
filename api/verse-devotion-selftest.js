import handler from './verse-devotion.js';

function makeResponse() {
  let statusCode = 200;
  const headers = new Map();
  let payload = null;
  return {
    setHeader(name, value) { headers.set(String(name).toLowerCase(), value); },
    status(code) { statusCode = code; return this; },
    json(value) { payload = value; return this; },
    end(value) {
      if (value) {
        try { payload = JSON.parse(value); } catch { payload = value; }
      }
      return this;
    },
    getResult() { return { statusCode, headers: Object.fromEntries(headers), payload }; },
  };
}

export default async function selftest(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const internalReq = {
    method: 'POST',
    headers: {
      host: req.headers?.host || 'sion-bible.vercel.app',
      'x-forwarded-host': req.headers?.['x-forwarded-host'] || req.headers?.host || 'sion-bible.vercel.app',
      'x-forwarded-for': '127.0.0.1',
      'content-length': '0',
    },
    body: {
      ref: '창세기 22:7',
      verseText: '이삭이 그 아버지 아브라함에게 말하여 이르되 내 아버지여 하니 그가 이르되 내 아들아 내가 여기 있노라 이삭이 이르되 불과 나무는 있거니와 번제할 어린 양은 어디 있나이까',
      mode: 'fast',
    },
    socket: { remoteAddress: '127.0.0.1' },
  };

  const internalRes = makeResponse();
  const startedAt = Date.now();
  await handler(internalReq, internalRes);
  const result = internalRes.getResult();
  const payload = result.payload || {};

  return res.status(200).json({
    ok: Boolean(payload.ok),
    statusCode: result.statusCode,
    elapsedMs: Date.now() - startedAt,
    provider: payload.provider || null,
    model: payload.model || null,
    fallback: Boolean(payload.fallback),
    title: payload.title || null,
    reference: payload.reference || null,
    explanationLength: String(payload.explanation || '').length,
    meditationLength: String(payload.meditation || '').length,
    applicationCount: Array.isArray(payload.application) ? payload.application.length : 0,
    errorCode: payload.errorCode || null,
  });
}
