import { callGeminiChat } from './_lib/gemini.js';
import { guardAiRequest } from './_lib/httpGuard.js';
import { parseJsonLoose, sendJson } from './_lib/nvidia.js';

const MODEL = 'gemini-3.5-flash-lite';
const PRAYER_ENDING = '아버지, 감사합니다. 예수 그리스도의 이름으로 기도드립니다. 아멘.';
const PARTS = new Set(['explanation', 'context', 'meditation', 'prayer']);

function text(value, maxLength) {
  return String(value || '').replace(/\u0000/g, '').trim().slice(0, maxLength);
}

function hasKorean(value) {
  return /[가-힣]/.test(String(value || ''));
}

function normalizePart(parsed, part) {
  if (!parsed || typeof parsed !== 'object') return null;

  if (part === 'explanation') {
    const title = text(parsed.title, 64);
    const coreMessage = text(parsed.coreMessage, 220);
    const explanation = text(parsed.explanation, 1000);
    const keyWords = Array.isArray(parsed.keyWords)
      ? parsed.keyWords.map((item) => text(item, 24)).filter(Boolean).slice(0, 3)
      : [];
    const keyPhrase = text(parsed.keyPhrase, 80);
    if (!title || coreMessage.length < 30 || explanation.length < 120 || !hasKorean(`${title} ${coreMessage} ${explanation}`)) return null;
    return { title, coreMessage, explanation, keyWords, keyPhrase };
  }

  if (part === 'context') {
    const context = text(parsed.context, 850);
    return context.length >= 80 && hasKorean(context) ? { context } : null;
  }

  if (part === 'meditation') {
    const meditation = text(parsed.meditation, 850);
    const application = Array.isArray(parsed.application)
      ? parsed.application.map((item) => text(item, 120)).filter(Boolean).slice(0, 3)
      : [];
    const question = text(parsed.question, 180);
    if (meditation.length < 90 || application.length < 3 || question.length < 18 || !hasKorean(`${meditation} ${question}`)) return null;
    return { meditation, application, question, reflectionQuestion: question };
  }

  if (part === 'prayer') {
    const prayer = text(parsed.prayer, 900);
    return prayer.length >= 90 && hasKorean(prayer) ? { prayer } : null;
  }

  return null;
}

function buildMessages({ part, ref, verseText, contextText }) {
  const shared = [
    '너는 한국어 성경앱 시온성경의 성경 해설 도우미다.',
    `선택 구절은 ${ref}이며 반드시 이 절 자체가 중심이다.`,
    '선택 절에 실제로 있는 단어와 문장 표현을 먼저 설명하고 일반적인 위로 문구로 대체하지 않는다.',
    '본문에 없는 역사적 사실, 화자의 의도, 하나님의 뜻을 추측해서 단정하지 않는다.',
    '주변 문맥은 제공된 내용에서 확인되는 범위에서만 사용한다.',
    '예수 그리스도와 복음의 연결은 본문의 흐름을 왜곡하지 않을 때만 자연스럽게 한다.',
    '한국어만 사용하고 JSON 객체만 출력한다.',
  ];

  const tasks = {
    explanation: [
      '선택 절 자체를 3~5문장으로 상세히 해설한다.',
      '핵심 표현을 실제 본문 문구에 붙여 설명하고, 무엇을 말하는지와 하나님·인간의 모습이 어떻게 드러나는지 분명히 쓴다.',
      '형식: {"title":"짧은 제목","coreMessage":"핵심 한 문장","keyWords":["단어1","단어2","단어3"],"keyPhrase":"선택 절의 핵심 표현","explanation":"선택 절 자체에 대한 상세 해설"}',
    ],
    context: [
      '선택 절이 앞뒤 문맥에서 어떤 역할을 하는지 2~4문장으로 설명한다.',
      '주변 절은 선택 절의 의미를 밝히는 데만 사용한다.',
      '형식: {"context":"선택 절과 앞뒤 문맥의 관계 설명"}',
    ],
    meditation: [
      '선택 절을 오늘의 삶에 연결한 1인칭 고백형 묵상을 3~5문장으로 작성한다.',
      '오늘 바로 할 수 있는 구체적 적용 3개와 본문에 직접 연결된 묵상 질문 1개를 만든다.',
      '형식: {"meditation":"1인칭 묵상","application":["적용1","적용2","적용3"],"question":"묵상 질문"}',
    ],
    prayer: [
      '선택 절의 핵심 표현을 반영한 현재형 고백 기도문을 4~6문장으로 작성한다.',
      '반드시 “아버지,”로 시작한다.',
      `반드시 “${PRAYER_ENDING}”으로 끝낸다.`,
      '형식: {"prayer":"기도문"}',
    ],
  };

  return [
    { role: 'system', content: [...shared, ...tasks[part]].join('\n') },
    {
      role: 'user',
      content: `선택 구절: ${ref}\n선택 절 본문: ${verseText}\n\n앞뒤 문맥(선택 절 포함):\n${contextText || '제공되지 않음'}\n\n선택 절 자체를 중심으로 작성하라.`,
    },
  ];
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, { ok: false, error: 'Method not allowed', errorCode: 'INVALID_METHOD' });
  }

  const guard = guardAiRequest(req, { limit: 32, maxBodyBytes: 22_000 });
  if (!guard.ok) {
    if (guard.retryAfterSeconds) res.setHeader('Retry-After', String(guard.retryAfterSeconds));
    return sendJson(res, guard.status, guard.body);
  }

  const ref = text(req.body?.ref, 120);
  const verseText = text(req.body?.verseText, 5000);
  const contextText = text(req.body?.contextText, 8000);
  const part = text(req.body?.part, 24);
  if (!ref || !verseText || !PARTS.has(part)) {
    return sendJson(res, 400, { ok: false, error: 'ref, verseText and valid part are required', errorCode: 'INVALID_REQUEST' });
  }

  res.setHeader('Cache-Control', 'no-store, max-age=0');
  const startedAt = Date.now();
  if (!process.env.GEMINI_API_KEY) {
    return sendJson(res, 200, { ok: false, part, fallback: true, errorCode: 'GEMINI_NOT_CONFIGURED' });
  }

  const timeoutMs = part === 'explanation' ? 2600 : 2800;
  const maxTokens = part === 'explanation' ? 380 : part === 'context' ? 240 : 340;

  try {
    const response = await callGeminiChat({
      model: MODEL,
      messages: buildMessages({ part, ref, verseText, contextText }),
      temperature: 0.06,
      maxTokens,
      timeoutMs,
      thinkingLevel: 'minimal',
    });
    if (!response) throw new Error('NO_GEMINI_RESPONSE');

    const parsed = parseJsonLoose(response.content);
    const value = normalizePart(parsed, part);
    if (!value) throw new Error('INVALID_PART_PAYLOAD');

    const latencyMs = Date.now() - startedAt;
    res.setHeader('Server-Timing', `${part};dur=${latencyMs}`);
    console.info('[ai-perf] verse-devotion-part', JSON.stringify({ provider: 'gemini', model: response.model, part, latencyMs }));
    return sendJson(res, 200, {
      ok: true,
      part,
      ...value,
      provider: 'gemini-part',
      model: response.model,
      fallback: false,
      latencyMs,
    });
  } catch (error) {
    const latencyMs = Date.now() - startedAt;
    res.setHeader('Server-Timing', `${part};dur=${latencyMs}`);
    console.warn('[ai-perf] verse-devotion-part failed', JSON.stringify({ part, latencyMs, error: error instanceof Error ? error.message : String(error) }));
    return sendJson(res, 200, {
      ok: false,
      part,
      fallback: true,
      errorCode: 'PART_PROVIDER_FAILED',
      latencyMs,
    });
  }
}
