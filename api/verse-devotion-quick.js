import { callGeminiChat } from './_lib/gemini.js';
import { guardAiRequest } from './_lib/httpGuard.js';
import { parseJsonLoose, sendJson } from './_lib/nvidia.js';

const MODEL = 'gemini-3.5-flash';

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
  const title = text(parsed.title, 70);
  const coreMessage = text(parsed.coreMessage, 220);
  const explanation = text(parsed.explanation, 650);
  const keyWords = Array.isArray(parsed.keyWords)
    ? parsed.keyWords.map((item) => text(item, 24)).filter(Boolean).slice(0, 3)
    : [];
  if (!title || coreMessage.length < 35 || explanation.length < 80) return null;
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
        '너는 시온성경의 빠른 1차 해설자다.',
        '성경 본문을 최우선 근거로 삼고 본문에 없는 사실을 만들지 않는다.',
        '사용자가 기다리지 않도록 핵심만 짧고 정확하게 쓴다.',
        '내부적으로 본문의 주체, 행동, 문맥상 의미를 먼저 확인한 뒤 답한다.',
        '과도한 단정, 억지 복음 연결, 출처 없는 역사 배경은 쓰지 않는다.',
        '반드시 JSON 객체만 반환한다.',
        '형식: {"title":"15~32자","coreMessage":"한두 문장 55~120자","explanation":"2~4문장 120~260자","keyWords":["단어1","단어2","단어3"]}',
      ].join('\n'),
    },
    {
      role: 'user',
      content: `구절: ${ref}\n본문: ${verseText}\n\n이 구절의 핵심을 한국어로 먼저 설명해줘.`,
    },
  ];

  try {
    const response = await callGeminiChat({
      model: MODEL,
      messages,
      temperature: 0.1,
      maxTokens: 520,
      timeoutMs: 4500,
      thinkingLevel: 'minimal',
    });
    if (!response) return sendJson(res, 200, fallback(ref, verseText, 'GEMINI_NOT_CONFIGURED'));
    const parsed = parseJsonLoose(response.content);
    const quick = normalizeQuick(parsed, ref);
    if (!quick) return sendJson(res, 200, fallback(ref, verseText, 'INVALID_QUICK_PAYLOAD'));
    return sendJson(res, 200, {
      ok: true,
      ...quick,
      provider: 'gemini',
      model: response.model,
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
