import { hedgedGeminiRace } from './_lib/gemini.js';
import { hedgedNvidiaRace } from './_lib/hedgedAiRace.js';
import { guardAiRequest } from './_lib/httpGuard.js';
import { getRecommendedNvidiaModels } from './_lib/modelSelector.js';
import { getNvidiaApiKey, parseJsonLoose, sendJson } from './_lib/nvidia.js';

function text(value, maxLength) {
  return String(value || '').replace(/\u0000/g, '').trim().slice(0, maxLength);
}

function unique(values) {
  return [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))];
}

function sanitizeAnswer(value) {
  return String(value || '')
    .replace(/```(?:json)?/gi, '')
    .replace(/\*\*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function validateAnswer(parsed, originalQuestion) {
  if (!parsed || typeof parsed !== 'object') return null;
  const answer = sanitizeAnswer(parsed.answer);
  if (answer.length < 80 || answer.length > 1700 || !/[가-힣]/.test(answer)) return null;

  const question = sanitizeAnswer(parsed.question) || originalQuestion;
  const followUpQuestion = sanitizeAnswer(parsed.followUpQuestion || parsed.reflectionQuestion).slice(0, 240);
  return { question, answer, followUpQuestion };
}

function buildMessages({ ref, verseText, meditation, prayer, question }) {
  return [
    {
      role: 'system',
      content: [
        '너는 시온성경의 한국어 성경 해설 도우미다.',
        '빠르게 답하되 성급하게 단정하지 말고, 내부적으로 먼저 질문의 의도와 본문 근거를 검토한 뒤 최종 답만 출력한다.',
        '우선순위는 1) 제공된 성경 본문, 2) 본문에서 직접 추론 가능한 의미, 3) 복음 전체의 균형이다.',
        '본문에 없는 역사적 배경, 인물의 동기, 하나님의 숨은 의도를 사실처럼 만들지 않는다.',
        '질문의 전제를 그대로 받아들이기 전에 본문과 맞는지 확인하고, 틀린 전제는 부드럽게 바로잡는다.',
        '하나님의 성품, 예수 그리스도의 복음, 성령의 도우심, 회개·믿음·순종을 본문과 관련 있을 때만 연결한다.',
        '해석과 적용을 구분한다. 먼저 본문이 무엇을 말하는지 설명하고, 그 다음 오늘의 적용을 제안한다.',
        '여러 해석 가능성이 있으면 가장 자연스러운 해석을 중심으로 말하되 다른 가능성이 있음을 짧게 밝힌다.',
        '사용자가 정서적 위로나 확신을 요청해도 본문이 보장하지 않는 결과를 약속하지 않는다.',
        '답변 전 내부 점검: 질문에 직접 답했는가, 본문 근거가 있는가, 과장이 없는가, 그리스도 중심 연결이 억지스럽지 않은가, 실제 적용이 가능한가.',
        '내부 추론 과정이나 점검 목록은 사용자에게 공개하지 않는다.',
        '반드시 JSON 객체만 반환한다.',
      ].join(' '),
    },
    {
      role: 'user',
      content: [
        `성경 구절: ${ref}`,
        `본문: ${verseText}`,
        meditation ? `기존 묵상 참고: ${meditation}` : '',
        prayer ? `기존 기도문 참고: ${prayer}` : '',
        `사용자 질문: ${question}`,
        '',
        '답변 구성 지침:',
        '- 첫 1~2문장에서 질문에 바로 답한다.',
        '- 이어서 본문에 근거한 이유를 설명한다.',
        '- 필요하면 문맥상 주의점이나 오해하기 쉬운 지점을 짧게 짚는다.',
        '- 마지막에는 오늘 실천할 수 있는 믿음·순종의 방향을 한 가지 제안한다.',
        '- 550~900자 정도의 자연스러운 한국어를 목표로 한다.',
        '- 마지막에 이어서 묵상할 질문 한 가지를 제안한다.',
        '- JSON 형식: {"question":"질문","answer":"답변","followUpQuestion":"후속 질문"}',
      ].filter(Boolean).join('\n'),
    },
  ];
}

function buildFallback({ ref, verseText, question }, errorCode) {
  const shortVerse = verseText.length > 180 ? `${verseText.slice(0, 180)}…` : verseText;
  return {
    ok: true,
    question,
    answer: `${ref}의 본문은 “${shortVerse}”라고 말씀합니다. 지금은 외부 답변 생성이 원활하지 않아 본문 밖의 내용을 추측하지 않고 안내드립니다. 먼저 이 구절에서 반복되거나 마음에 남는 표현을 찾고, 그 표현이 하나님에 대해 무엇을 보여주는지 살펴보세요. 이어서 예수 그리스도의 은혜 안에서 오늘 믿고 맡기거나 순종할 한 가지를 정해 보세요. 질문의 답을 서둘러 단정하기보다 앞뒤 구절을 함께 읽으면 본문의 뜻을 더 안전하게 이해할 수 있습니다.`,
    followUpQuestion: '이 본문에서 하나님에 대해 가장 분명하게 드러나는 사실은 무엇인가요?',
    provider: 'local-fallback',
    fallback: true,
    errorCode,
  };
}

function debugPayload(value) {
  if (process.env.NODE_ENV === 'production' && process.env.AI_DEBUG !== '1') return {};
  return { debug: value };
}

function rejectGuard(res, guard) {
  if (guard.retryAfterSeconds) res.setHeader('Retry-After', String(guard.retryAfterSeconds));
  return sendJson(res, guard.status, guard.body);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, { ok: false, error: 'Method not allowed', errorCode: 'INVALID_METHOD' });
  }

  const guard = guardAiRequest(req, { limit: 18, maxBodyBytes: 18_000 });
  if (!guard.ok) return rejectGuard(res, guard);

  const input = {
    ref: text(req.body?.ref, 120),
    verseText: text(req.body?.verseText, 3000),
    meditation: text(req.body?.meditation, 4000),
    prayer: text(req.body?.prayer, 3000),
    question: text(req.body?.question, 500),
  };

  if (!input.ref || !input.verseText || !input.question) {
    return sendJson(res, 400, {
      ok: false,
      error: 'ref, verseText, question are required',
      errorCode: 'INVALID_REQUEST',
    });
  }

  res.setHeader('Cache-Control', 'no-store, max-age=0');
  const messages = buildMessages(input);
  const failures = [];
  const apiKey = getNvidiaApiKey();

  if (process.env.GEMINI_API_KEY) {
    try {
      const result = await hedgedGeminiRace({
        models: ['gemini-3.5-flash', 'gemini-3.6-flash'],
        delaysMs: [0, 1300],
        messages,
        temperature: 0.22,
        maxTokens: 2200,
        timeoutMs: 10_000,
        thinkingLevelByModel: {
          'gemini-3.5-flash': 'medium',
          'gemini-3.6-flash': 'low',
        },
        validate: (response) => {
          const parsed = response ? parseJsonLoose(response.content) : null;
          return validateAnswer(parsed, input.question);
        },
      });

      return sendJson(res, 200, {
        ok: true,
        ...result.result,
        provider: 'gemini',
        model: result.model,
        fallback: false,
        ...debugPayload({ latencyMs: result.latencyMs, attempts: result.attempts, reasoningProfile: 'quality-balanced' }),
      });
    } catch (error) {
      failures.push({ provider: 'gemini', message: error instanceof Error ? error.message : String(error) });
    }
  }

  if (apiKey) {
    try {
      const config = await getRecommendedNvidiaModels();
      const models = unique([config.qualityModel, config.primaryFastModel, config.secondaryFastModel]);
      const result = await hedgedNvidiaRace({
        apiKey,
        models,
        delaysMs: [0, 900, 1900],
        messages,
        timeoutMs: 16_000,
        temperature: 0.3,
        maxTokens: 1400,
        responseFormat: { type: 'json_object' },
        validate: (parsed) => validateAnswer(parsed, input.question),
      });

      return sendJson(res, 200, {
        ok: true,
        ...result.result,
        provider: 'nvidia',
        model: result.model,
        fallback: false,
        ...debugPayload({ latencyMs: result.latencyMs, attempts: result.attempts, modelSource: config.source, failures }),
      });
    } catch (error) {
      failures.push({ provider: 'nvidia', message: error instanceof Error ? error.message : String(error) });
    }
  }

  return sendJson(res, 200, {
    ...buildFallback(input, apiKey || process.env.GEMINI_API_KEY ? 'AI_PROVIDERS_FAILED' : 'AI_NOT_CONFIGURED'),
    ...debugPayload({ failures }),
  });
}