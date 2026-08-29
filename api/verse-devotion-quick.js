import { hedgedGeminiRace } from './_lib/gemini.js';
import { guardAiRequest } from './_lib/httpGuard.js';
import { parseJsonLoose, sendJson } from './_lib/nvidia.js';

const MODELS = ['gemini-3.5-flash-lite', 'gemini-3.5-flash'];

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
  const title = text(parsed.title, 64);
  const coreMessage = text(parsed.coreMessage, 180);
  const explanation = text(parsed.explanation, 460);
  const keyWords = Array.isArray(parsed.keyWords)
    ? parsed.keyWords.map((item) => text(item, 24)).filter(Boolean).slice(0, 3)
    : [];
  if (!title || coreMessage.length < 30 || explanation.length < 70) return null;
  if (!/[가-힣]/.test(`${title} ${coreMessage} ${explanation}`)) return null;
  return { reference: ref, title, coreMessage, explanation, keyWords };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, { ok: false, error: 'Method not allowed' });
  }

  const guard = guardAiRequest(req, { limit: 20, maxBodyBytes: 9000 });
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
        '성경 본문을 최우선 근거로 삼고 본문에 없는 사실을 만들지 않는다.',
        '첫 화면에 바로 읽을 수 있도록 짧고 분명하게 쓴다.',
        '과도한 단정, 억지 복음 연결, 출처 없는 역사 배경은 쓰지 않는다.',
        '반드시 JSON 객체만 반환한다.',
        '형식: {"title":"12~28자","coreMessage":"한 문장 45~90자","explanation":"2~3문장 90~190자","keyWords":["단어1","단어2","단어3"]}',
      ].join('\n'),
    },
    {
      role: 'user',
      content: `구절: ${ref}\n본문: ${verseText}\n\n이 구절의 핵심 해설만 바로 작성해줘.`,
    },
  ];

  try {
    const result = await hedgedGeminiRace({
      models: MODELS,
      delaysMs: [0, 750],
      messages,
      temperature: 0.08,
      maxTokens: 360,
      timeoutMs: 3200,
      thinkingLevel: 'minimal',
      validate: (response) => {
        const parsed = response ? parseJsonLoose(response.content) : null;
        return normalizeQuick(parsed, ref);
      },
    });

    return sendJson(res, 200, {
      ok: true,
      ...result.result,
      provider: 'gemini',
      model: result.model,
      fallback: false,
      latencyMs: Date.now() - startedAt,
    });
  } catch (error) {
    return sendJson(res, 200, {
      ...fallback(ref, verseText, 'QUICK_PROVIDER_FAILED'),
      latencyMs: Date.now() - startedAt,
    });
  }
}
