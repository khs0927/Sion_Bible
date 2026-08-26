import { sendJson } from './_lib/nvidia.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return sendJson(res, 405, { ok: false, error: 'Method not allowed' });
  }

  const host = process.env.VERCEL_URL;
  if (!host) return sendJson(res, 500, { ok: false, error: 'VERCEL_URL missing' });

  const startedAt = Date.now();
  const response = await fetch(`https://${host}/api/verse-devotion`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ref: '창세기 22:7',
      verseText: '이삭이 그 아버지 아브라함에게 말하여 이르되 내 아버지여 하니 그가 이르되 내 아들아 내가 여기 있노라 이삭이 이르되 불과 나무는 있거니와 번제할 어린 양은 어디 있나이까',
      mode: 'fast',
    }),
  });
  const payload = await response.json().catch(() => null);
  return sendJson(res, 200, {
    ok: response.ok && Boolean(payload?.ok),
    status: response.status,
    latencyMs: Date.now() - startedAt,
    provider: payload?.provider,
    model: payload?.model,
    fallback: payload?.fallback,
    title: payload?.title,
    explanationLength: String(payload?.explanation || '').length,
  });
}
