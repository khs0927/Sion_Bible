import { callGeminiChat } from './_lib/gemini.js';
import { guardAiRequest } from './_lib/httpGuard.js';
import { parseJsonLoose, sendJson } from './_lib/nvidia.js';

const MODEL = 'gemini-3.5-flash-lite';
const QUICK_TIMEOUT_MS = 2200;

function text(value, maxLength) {
  return String(value || '').replace(/\u0000/g, '').trim().slice(0, maxLength);
}

function fallback(ref, verseText, errorCode) {
  const words = String(verseText || '').split(/\s+/).filter((item) => item.length >= 2).slice(0, 3);
  return {
    ok: true,
    reference: ref,
    title: '말씀의 핵심을 살펴보고 있습니다',
    coreMessage: '본문의 흐름과 핵심 표현을 먼저 확인하고 있습니다.',
    explanation: '먼저 이 구절이 실제로 말하는 내용을 붙들고, 이어서 묵상과 기도까지 준비합니다.',
    keyWords: words.length ? words : ['말씀', '본문', '묵상'],
    provider: 'local',
    model: null,
    fallback: true,
    errorCode,
  };
}

function normalizeQuick(parsed, ref) {
  if (!parsed || typeof parsed !== 'object') return null;
  const title = text(parsed.title, 56);
  const coreMessage = text(parsed.coreMessage, 150);
  const explanation = text(parsed.explanation, 360);
  const keyWords = Array.isArray(parsed.keyWords)
    ? parsed.keyWords.map((item) => text(item, 24)).filter(Boolean).slice(0, 3)
    : [];
  if (!title || coreMessage.length < 24 || explanation.length < 60) return null;
  if (!/[가-힣]/.test(`${title} ${coreMessage} ${explanation}`)) return null;
  return { reference: ref, title, coreMessage, explanation, keyWords };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, { ok: false, error: 'Method not allowed' });
  }

  const guard = guardAiRequest(req, { limit: 24, maxBodyBytes: 9000 });
  if (!guard.ok) {
    if (guard.retryAfterSeconds) res.setHeader('Retry-After', String(guard.retryAfterSeconds));
    return sendJson(res, guard.status, guard.body);
  }

  const ref = text(req.body?.ref, 120);
  const verseText = text(req.body?.verseText, 5000);
  if (!ref || !verseText) return sendJson(res, 400, { ok: false, error: 'ref and verseText are required' });

  res.setHeader('Cache-Control', 'no-store, max-age=0');
  const startedAt = Date.now();
  if (!process.env.GEMINI_API_KEY) return sendJson(res, 200, fallback(ref, verseText, 'GEMINI_NOT_CONFIGURED'));

  const messages = [
    {
      role: 'system',
      content: [
        '너는 시온성경의 즉시 해설자다.',
        '제공된 성경 본문만을 최우선 근거로 삼고 본문에 없는 사실을 만들지 않는다.',
        '첫 화면에서 바로 읽을 수 있도록 짧고 분명하게 쓴다.',
        '반드시 JSON 객체만 반환한다.',
        '형식: {"title":"12~24자","coreMessage":"한 문장 35~75자","explanation":"2문장 70~150자","keyWords":["단어1","단어2","단어3"]}',
      ].join('\n'),
    },
    {
      role: 'user',
      content: `구절: ${ref}\n본문: ${verseText}\n\n핵심 해설만 즉시 작성해줘.`,
    },
  ];

  try {
    const response = await callGeminiChat({
      model: MODEL,
      messages,
      temperature: 0.05,
      maxTokens: 260,
      timeoutMs: QUICK_TIMEOUT_MS,
      thinkingLevel: 'minimal',
    });
    if (!response) return sendJson(res, 200, fallback(ref, verseText, 'GEMINI_NOT_CONFIGURED'));

    const parsed = parseJsonLoose(response.content);
    const quick = normalizeQuick(parsed, ref);
    if (!quick) return sendJson(res, 200, fallback(ref, verseText, 'INVALID_QUICK_PAYLOAD'));

    const latencyMs = Date.now() - startedAt;
    res.setHeader('Server-Timing', `gemini;dur=${latencyMs}`);
    console.info('[ai-perf] verse-devotion-quick', JSON.stringify({ provider: 'gemini', model: response.model, latencyMs }));
    return sendJson(res, 200, {
      ok: true,
      ...quick,
      provider: 'gemini',
      model: response.model,
      fallback: false,
      latencyMs,
    });
  } catch (error) {
    const latencyMs = Date.now() - startedAt;
    res.setHeader('Server-Timing', `gemini;dur=${latencyMs}`);
    console.warn('[ai-perf] verse-devotion-quick failed', JSON.stringify({ latencyMs, error: error instanceof Error ? error.message : String(error) }));
    return sendJson(res, 200, {
      ...fallback(ref, verseText, 'QUICK_PROVIDER_FAILED'),
      latencyMs,
    });
  }
}
