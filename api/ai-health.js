import { sendJson } from './_lib/nvidia.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return sendJson(res, 405, {
      ok: false,
      message: 'Method not allowed',
      providers: { nvidia: false, gemini: false },
    });
  }

  const nvidia = Boolean(process.env.NVIDIA_API_KEY || process.env.NVIDIA_NIM_API_KEY);
  const gemini = Boolean(process.env.GEMINI_API_KEY);
  const ok = nvidia || gemini;

  res.setHeader('Cache-Control', 'no-store, max-age=0');
  return sendJson(res, 200, {
    ok,
    providers: { nvidia, gemini },
    routes: {
      verseDevotion: '/api/verse-devotion',
      verseQuestion: '/api/verse-question',
      bibleIntent: '/api/bible-intent',
    },
    message: ok
      ? 'AI provider configuration is available.'
      : 'NVIDIA_API_KEY or GEMINI_API_KEY is not configured.',
  });
}
