import { getNvidiaApiKey, sendJson } from './_lib/nvidia.js';
import { getRecommendedNvidiaModels } from './_lib/modelSelector.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return sendJson(res, 405, {
      ok: false,
      error: 'Method not allowed',
      errorCode: 'INVALID_METHOD',
    });
  }

  const hasNvidiaKey = Boolean(getNvidiaApiKey());
  const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY);
  let modelConfig = null;

  if (hasNvidiaKey) {
    try {
      modelConfig = await getRecommendedNvidiaModels();
    } catch (error) {
      modelConfig = {
        source: 'unavailable',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  res.setHeader('Cache-Control', 'no-store, max-age=0');
  return sendJson(res, 200, {
    ok: true,
    runtime: 'vercel-function',
    timestamp: new Date().toISOString(),
    ai: {
      ready: hasNvidiaKey || hasGeminiKey,
      nvidiaConfigured: hasNvidiaKey,
      geminiFallbackConfigured: hasGeminiKey,
      modelSource: modelConfig?.source || 'none',
      primaryFastModel: modelConfig?.primaryFastModel || null,
      secondaryFastModel: modelConfig?.secondaryFastModel || null,
      qualityModel: modelConfig?.qualityModel || null,
      deepModel: modelConfig?.deepModel || null,
    },
    endpoints: {
      verseDevotion: '/api/verse-devotion',
      verseQuestion: '/api/verse-question',
      bibleSearchIntent: '/api/bible-search-intent',
    },
  });
}
