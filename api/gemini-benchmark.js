import { callGeminiChat } from './_lib/gemini.js';
import { guardAiRequest } from './_lib/httpGuard.js';
import { parseJsonLoose, sendJson } from './_lib/nvidia.js';

const MODELS = ['gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.5-flash'];

function validate(parsed) {
  if (!parsed || typeof parsed !== 'object') return null;
  const terms = Array.isArray(parsed.terms) ? parsed.terms.map(String).filter(Boolean).slice(0, 5) : [];
  const summary = String(parsed.summary || '').trim();
  if (!summary || terms.length === 0) return null;
  return { summary, terms };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return sendJson(res, 405, { ok: false, error: 'Method not allowed' });
  }

  const guard = guardAiRequest(req, { limit: 4, maxBodyBytes: 1000 });
  if (!guard.ok) return sendJson(res, guard.status, guard.body);
  if (!process.env.GEMINI_API_KEY) return sendJson(res, 503, { ok: false, error: 'GEMINI_API_KEY is not configured' });

  res.setHeader('Cache-Control', 'no-store, max-age=0');
  const messages = [
    { role: 'system', content: '한국어 성경 검색 의도를 빠르게 구조화하라. 성경 본문은 인용하지 말고 JSON 객체만 반환하라.' },
    { role: 'user', content: '질문: 불안할 때 붙들 말씀을 찾고 싶어. {"summary":"한 문장 요약","terms":["검색어 최대 5개"]} 형식으로만 답하라.' },
  ];

  const results = [];
  for (const model of MODELS) {
    const startedAt = Date.now();
    try {
      const response = await callGeminiChat({ model, messages, temperature: 0.1, maxTokens: 900, timeoutMs: 9000 });
      const parsed = response ? parseJsonLoose(response.content) : null;
      const validated = validate(parsed);
      results.push({
        model,
        ok: Boolean(validated),
        latencyMs: Date.now() - startedAt,
        result: validated,
        error: validated ? null : 'invalid_payload',
      });
    } catch (error) {
      results.push({
        model,
        ok: false,
        latencyMs: Date.now() - startedAt,
        result: null,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return sendJson(res, 200, { ok: results.some((item) => item.ok), results });
}
