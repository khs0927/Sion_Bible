import { callNvidiaChat, getNvidiaApiKey, parseJsonLoose, sendJson, validateVerseDevotion } from './_lib/nvidia.js';
import { guardAiRequest } from './_lib/httpGuard.js';

const MODEL = 'openai/gpt-oss-120b';
const PRAYER_ENDING = '아버지, 감사합니다. 예수 그리스도의 이름으로 기도드립니다. 아멘.';

function text(value, maxLength) {
  return String(value || '').replace(/\u0000/g, '').trim().slice(0, maxLength);
}

function numberEnv(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function stripPrayerEnding(value) {
  let next = String(value || '').trim();
  const patterns = [
    /아버지,?\s*감사합니다[.!?。．…]*\s*예수\s+그리스도의\s+이름으로\s+기도드립니다[.!?。．…]*\s*아멘[.!?。．…]*$/i,
    /우리\s+주\s+예수\s+그리스도의\s+이름으로\s+기도드립니다[.!?。．…]*\s*아멘[.!?。．…]*$/i,
    /예수\s+그리스도의\s+이름으로\s+기도(?:드립니|합니)다[.!?。．…]*\s*아멘[.!?。．…]*$/i,
    /아멘[.!?。．…]*$/i,
  ];
  let previous = '';
  while (previous !== next) {
    previous = next;
    for (const pattern of patterns) next = next.replace(pattern, '').trim();
  }
  return next.replace(/[.!?。．…]+$/, '').trim();
}

function withPrayerEnding(devotion) {
  const body = stripPrayerEnding(devotion?.prayer);
  return { ...devotion, prayer: body ? `${body}. ${PRAYER_ENDING}` : PRAYER_ENDING };
}

function normalizeCandidate(candidate, ref) {
  if (!candidate || typeof candidate !== 'object') return null;
  return {
    reference: text(candidate.reference || ref, 120),
    title: text(candidate.title, 120),
    coreMessage: text(candidate.coreMessage, 700),
    keyWords: Array.isArray(candidate.keyWords) ? candidate.keyWords.map((item) => text(item, 40)).filter(Boolean).slice(0, 3) : [],
    keyPhrase: text(candidate.keyPhrase, 120),
    explanation: text(candidate.explanation, 6000),
    meditation: text(candidate.meditation, 6000),
    prayer: text(candidate.prayer, 6000),
    application: Array.isArray(candidate.application)
      ? candidate.application.map((item) => text(item, 800)).filter(Boolean).slice(0, 3)
      : text(candidate.application, 2400),
    question: text(candidate.question || candidate.reflectionQuestion, 800),
    reflectionQuestion: text(candidate.reflectionQuestion || candidate.question, 800),
  };
}

function normalizeReview(parsed, ref, verseText) {
  if (!parsed || typeof parsed !== 'object') return null;
  const decision = parsed.decision === 'replace' ? 'replace' : 'keep';
  const confidence = Math.max(0, Math.min(1, Number(parsed.confidence) || 0));
  const reasons = Array.isArray(parsed.reasons)
    ? parsed.reasons.map((item) => text(item, 180)).filter(Boolean).slice(0, 4)
    : [];

  if (decision !== 'replace' || confidence < 0.76) {
    return { decision: 'keep', confidence, reasons, improved: null };
  }

  const improved = normalizeCandidate(parsed.improved, ref);
  if (!improved) return { decision: 'keep', confidence, reasons: [...reasons, '개선안 형식이 올바르지 않음'], improved: null };
  const validated = validateVerseDevotion(improved, { ref, verseText });
  if (!validated) return { decision: 'keep', confidence, reasons: [...reasons, '개선안이 본문 검증을 통과하지 못함'], improved: null };
  return { decision: 'replace', confidence, reasons, improved: withPrayerEnding(validated) };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, { ok: false, error: 'Method not allowed', errorCode: 'INVALID_METHOD' });
  }

  const guard = guardAiRequest(req, { limit: 12, maxBodyBytes: 32_000 });
  if (!guard.ok) {
    if (guard.retryAfterSeconds) res.setHeader('Retry-After', String(guard.retryAfterSeconds));
    return sendJson(res, guard.status, guard.body);
  }

  const ref = text(req.body?.ref, 120);
  const verseText = text(req.body?.verseText, 5000);
  const candidate = normalizeCandidate(req.body?.candidate, ref);
  if (!ref || !verseText || !candidate) {
    return sendJson(res, 400, { ok: false, error: 'ref, verseText and candidate are required', errorCode: 'INVALID_REQUEST' });
  }

  const apiKey = getNvidiaApiKey();
  if (!apiKey) return sendJson(res, 200, { ok: true, reviewed: false, decision: 'keep', errorCode: 'NVIDIA_NOT_CONFIGURED' });

  res.setHeader('Cache-Control', 'no-store, max-age=0');
  const startedAt = Date.now();
  const messages = [
    {
      role: 'system',
      content: [
        '너는 시온성경의 2차 품질 검토자다. 1차 해설을 무조건 다시 쓰는 것이 아니라, 성경 본문에 비추어 실제로 더 좋아질 때만 교체한다.',
        '검토 우선순위: 1) 본문과의 직접 일치 2) 과도한 단정/본문 밖 추측 제거 3) 해석과 적용의 자연스러운 연결 4) 한국어 명료성 5) 복음 연결은 본문 흐름상 자연스러울 때만.',
        '원문에 없는 역사·문화 배경을 만들어내지 말고, 신학적 논쟁점은 한 구절만으로 확정하지 않는다.',
        '기존 결과가 이미 충분히 정확하면 decision은 keep으로 한다. 단순한 문체 취향 차이는 replace 사유가 아니다.',
        'replace는 본문 오독, 중요한 누락, 과도한 추론, 모호한 적용처럼 실질적인 개선이 가능할 때만 선택한다.',
        'replace 시 improved는 기존과 동일한 전체 묵상 JSON 필드를 모두 제공한다. 기도문은 현재형 고백 중심으로 쓰고 마지막은 정확히 "아버지, 감사합니다. 예수 그리스도의 이름으로 기도드립니다. 아멘."으로 끝낸다.',
        '내부 추론 과정은 노출하지 않는다. 반드시 JSON 객체만 반환한다.',
        '형식: {"decision":"keep|replace","confidence":0.0,"reasons":["짧은 이유"],"improved":null 또는 {"reference":"...","title":"...","coreMessage":"...","keyWords":["...","...","..."],"keyPhrase":"...","explanation":"...","meditation":"...","prayer":"...","application":["...","...","..."],"question":"...","reflectionQuestion":"..."}}',
      ].join('\n'),
    },
    {
      role: 'user',
      content: `구절: ${ref}\n본문: ${verseText}\n\n1차 결과:\n${JSON.stringify(candidate)}\n\n본문에 근거해 품질을 검토하고, 실제 개선이 명확할 때만 교체해줘.`,
    },
  ];

  try {
    const response = await callNvidiaChat({
      apiKey,
      model: MODEL,
      messages,
      temperature: 0.12,
      maxTokens: numberEnv('GPT_OSS_REVIEW_MAX_TOKENS', 2800),
      timeoutMs: numberEnv('GPT_OSS_REVIEW_TIMEOUT_MS', 14_000),
      responseFormat: { type: 'json_object' },
      extraBody: { reasoning_effort: process.env.GPT_OSS_REVIEW_REASONING_EFFORT || 'low' },
    });
    const parsed = parseJsonLoose(response.content);
    const review = normalizeReview(parsed, ref, verseText);
    if (!review) return sendJson(res, 200, { ok: true, reviewed: false, decision: 'keep', errorCode: 'INVALID_REVIEW_PAYLOAD', latencyMs: Date.now() - startedAt });

    return sendJson(res, 200, {
      ok: true,
      reviewed: true,
      decision: review.decision,
      confidence: review.confidence,
      reasons: review.reasons,
      improved: review.improved,
      provider: 'nvidia',
      model: response.model,
      latencyMs: Date.now() - startedAt,
    });
  } catch (error) {
    return sendJson(res, 200, {
      ok: true,
      reviewed: false,
      decision: 'keep',
      provider: 'nvidia',
      model: MODEL,
      latencyMs: Date.now() - startedAt,
      errorCode: 'REVIEW_PROVIDER_FAILED',
    });
  }
}
