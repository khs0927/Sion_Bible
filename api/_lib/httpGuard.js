const buckets = new Map();
const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_LIMIT = 24;
const DEFAULT_MAX_BODY_BYTES = 24_000;

function clientKey(req) {
  const forwarded = String(req.headers?.['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || String(req.headers?.['x-real-ip'] || req.socket?.remoteAddress || 'unknown');
}

function cleanup(now) {
  if (buckets.size < 500) return;
  for (const [key, bucket] of buckets) {
    if (now - bucket.startedAt > DEFAULT_WINDOW_MS * 2) buckets.delete(key);
  }
}

function sameOrigin(req) {
  const origin = String(req.headers?.origin || '').trim();
  if (!origin) return true;
  const host = String(req.headers?.['x-forwarded-host'] || req.headers?.host || '').trim();
  if (!host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export function guardAiRequest(req, {
  limit = DEFAULT_LIMIT,
  windowMs = DEFAULT_WINDOW_MS,
  maxBodyBytes = DEFAULT_MAX_BODY_BYTES,
} = {}) {
  if (!sameOrigin(req)) {
    return {
      ok: false,
      status: 403,
      body: { ok: false, error: 'Cross-origin requests are not allowed', errorCode: 'ORIGIN_NOT_ALLOWED' },
    };
  }

  const contentLength = Number(req.headers?.['content-length'] || 0);
  if (Number.isFinite(contentLength) && contentLength > maxBodyBytes) {
    return {
      ok: false,
      status: 413,
      body: { ok: false, error: 'Request body is too large', errorCode: 'REQUEST_TOO_LARGE' },
    };
  }

  const now = Date.now();
  cleanup(now);
  const key = clientKey(req);
  const current = buckets.get(key);
  const bucket = !current || now - current.startedAt >= windowMs
    ? { startedAt: now, count: 0 }
    : current;
  bucket.count += 1;
  buckets.set(key, bucket);

  if (bucket.count > limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((windowMs - (now - bucket.startedAt)) / 1000));
    return {
      ok: false,
      status: 429,
      retryAfterSeconds,
      body: { ok: false, error: 'Too many requests', errorCode: 'RATE_LIMITED', retryAfterSeconds },
    };
  }

  return { ok: true };
}
