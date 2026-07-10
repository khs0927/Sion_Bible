import { callGeminiChat } from './_lib/gemini.js';
import { hedgedNvidiaRace } from './_lib/hedgedAiRace.js';
import { guardAiRequest } from './_lib/httpGuard.js';
import { getRecommendedNvidiaModels } from './_lib/modelSelector.js';
import { getNvidiaApiKey, parseJsonLoose, sendJson } from './_lib/nvidia.js';

const STOP_WORDS = new Set([
  '관련', '구절', '성경', '말씀', '보여줘', '찾아줘', '알려줘', '쉽게', '이해', '문맥', '문맥적',
  '순차적', '순차', '흐름', '정리', '설명', '주제별', '질문', '대한', '대해', '해줘', '해주세요',
]);

function cleanText(value, maxLength) {
  return String(value || '').replace(/\u0000/g, '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function uniqueStrings(value, limit, maxLength = 40) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => cleanText(item, maxLength)).filter(Boolean))].slice(0, limit);
}

function fallbackTerms(query) {
  return [...new Set(query
    .replace(/[^가-힣A-Za-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map((term) => term.trim())
    .filter((term) => term.length >= 2 && !STOP_WORDS.has(term))
  )].slice(0, 12);
}

function validateIntent(parsed, query) {
  if (!parsed || typeof parsed !== 'object') return null;
  const terms = uniqueStrings(parsed.terms, 16);
  const topics = uniqueStrings(parsed.topics, 5, 30);
  const sections = Array.isArray(parsed.sections)
    ? parsed.sections.slice(0, 6).map((section, index) => ({
        id: cleanText(section?.id, 40) || `intent-${index + 1}`,
        title: cleanText(section?.title, 50),
        description: cleanText(section?.description, 140),
        terms: uniqueStrings(section?.terms, 12),
      })).filter((section) => section.title && section.terms.length > 0)
    : [];

  const queryTerms = fallbackTerms(query);
  const finalTerms = terms.length > 0 ? terms : queryTerms;
  if (finalTerms.length === 0) return null;
  return { terms: finalTerms, topics, sections };
}

function buildMessages(query) {
  return [
    {
      role: 'system',
      content: [
        '너는 한국어 성경 검색 의도를 구조화하는 도우미다.',
        '성경 본문을 만들어 내거나 인용하지 말고 검색어와 주제 구조만 반환한다.',
        '사용자의 질문을 신학적으로 과장하거나 단정하지 않는다.',
        '반드시 JSON 객체만 반환한다.',
      ].join(' '),
    },
    {
      role: 'user',
      content: [
        `검색 질문: ${query}`,
        '',
        '다음 JSON 구조로만 답하라:',
        '{',
        '  "terms": ["본문에서 실제로 검색할 핵심어와 유사어, 최대 16개"],',
        '  "topics": ["질문을 설명하는 짧은 주제, 최대 5개"],',
        '  "sections": [',
        '    {"id":"영문-또는-짧은-id","title":"주제 제목","description":"한 문장 설명","terms":["해당 묶음의 검색어"]}',
        '  ]',
        '}',
        'sections는 질문의 흐름에 맞춰 2~5개로 만들고, 예시 표현을 기계적으로 반복하지 말라.',
      ].join('\n'),
    },
  ];
}

function localIntent(query) {
  const terms = fallbackTerms(query);
  return {
    terms,
    topics: terms.slice(0, 3),
    sections: terms.length > 0 ? [
      {
        id: 'question-core',
        title: '질문의 핵심 말씀',
        description: '질문에서 직접 드러난 핵심 표현과 가까운 말씀입니다.',
        terms,
      },
      {
        id: 'gospel-view',
        title: '하나님과 복음의 관점',
        description: '하나님과 예수 그리스도의 은혜 안에서 이어 볼 말씀입니다.',
        terms: [...new Set([...terms, '하나님', '예수', '그리스도', '은혜', '믿음'])].slice(0, 12),
      },
      {
        id: 'life-response',
        title: '마음의 응답과 삶',
        description: '기도와 순종, 실제 삶의 반응으로 이어지는 말씀입니다.',
        terms: [...new Set([...terms, '마음', '기도', '순종', '사랑', '행함'])].slice(0, 12),
      },
    ] : [],
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

  const guard = guardAiRequest(req, { limit: 30, maxBodyBytes: 4000 });
  if (!guard.ok) return rejectGuard(res, guard);

  const query = cleanText(req.body?.query, 600);
  if (query.length < 2) {
    return sendJson(res, 400, { ok: false, error: 'query is required', errorCode: 'INVALID_REQUEST' });
  }

  res.setHeader('Cache-Control', 'no-store, max-age=0');
  const messages = buildMessages(query);
  const failures = [];
  const apiKey = getNvidiaApiKey();

  if (apiKey) {
    try {
      const config = await getRecommendedNvidiaModels();
      const models = [...new Set([config.primaryFastModel, config.secondaryFastModel, config.qualityModel].filter(Boolean))];
      const result = await hedgedNvidiaRace({
        apiKey,
        models,
        delaysMs: [0, 650, 1500],
        messages,
        timeoutMs: 11_000,
        temperature: 0.15,
        maxTokens: 900,
        responseFormat: { type: 'json_object' },
        validate: (parsed) => validateIntent(parsed, query),
      });

      return sendJson(res, 200, {
        ok: true,
        ...result.result,
        provider: 'nvidia',
        model: result.model,
        fallback: false,
        ...debugPayload({ latencyMs: result.latencyMs, modelSource: config.source, attempts: result.attempts }),
      });
    } catch (error) {
      failures.push({ provider: 'nvidia', message: error instanceof Error ? error.message : String(error) });
    }
  }

  if (process.env.GEMINI_API_KEY) {
    try {
      const response = await callGeminiChat({ messages, temperature: 0.15, maxTokens: 900 });
      const parsed = response ? parseJsonLoose(response.content) : null;
      const result = validateIntent(parsed, query);
      if (!result) throw new Error('Gemini returned an invalid intent payload');

      return sendJson(res, 200, {
        ok: true,
        ...result,
        provider: 'gemini',
        model: response.model,
        fallback: false,
        ...debugPayload({ failures }),
      });
    } catch (error) {
      failures.push({ provider: 'gemini', message: error instanceof Error ? error.message : String(error) });
    }
  }

  return sendJson(res, 200, {
    ok: true,
    ...localIntent(query),
    provider: 'local-fallback',
    fallback: true,
    errorCode: apiKey || process.env.GEMINI_API_KEY ? 'AI_PROVIDERS_FAILED' : 'AI_NOT_CONFIGURED',
    ...debugPayload({ failures }),
  });
}
