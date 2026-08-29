import { hedgedGeminiRace } from './_lib/gemini.js';
import { hedgedNvidiaRace } from './_lib/hedgedAiRace.js';
import { guardAiRequest } from './_lib/httpGuard.js';
import { resolveNvidiaModelsForVerseDevotion } from './_lib/modelSelector.js';
import { getNvidiaApiKey, parseJsonLoose, sendJson, validateVerseDevotion } from './_lib/nvidia.js';
import { buildVerseDevotionReferenceMessages } from './_lib/verseDevotionReferencePrompt.js';

const GPT_OSS_120B_MODEL = 'openai/gpt-oss-120b';
const GPT_OSS_20B_MODEL = 'openai/gpt-oss-20b';
const LLAMA_3_1_8B_MODEL = 'meta/llama-3.1-8b-instruct';
const GEMINI_FAST_MODEL = 'gemini-3.5-flash-lite';
const PRAYER_ENDING = '아버지, 감사합니다. 예수 그리스도의 이름으로 기도드립니다. 아멘.';

function text(value, maxLength) {
  return String(value || '').replace(/\u0000/g, '').trim().slice(0, maxLength);
}

function numberEnv(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function shouldIncludeDebug() {
  return process.env.NODE_ENV !== 'production' || process.env.AI_DEBUG === '1';
}

function uniqueModels(models) {
  return [...new Set((models || []).map((model) => String(model || '').trim()).filter(Boolean))];
}

function stripPrayerEndings(value) {
  let valueText = String(value || '').trim();
  let previous = '';
  const patterns = [
    /아버지,?\s*감사합니다[.!?。．…]*\s*예수\s+그리스도의\s+이름으로\s+기도드립니다[.!?。．…]*\s*아멘[.!?。．…]*$/i,
    /우리\s+주\s+예수\s+그리스도의\s+이름으로\s+기도드립니다[.!?。．…]*\s*아멘[.!?。．…]*$/i,
    /우리\s+주\s+예수\s+그리스도의\s+이름으로\s+기도드립니다[.!?。．…]*$/i,
    /예수\s+그리스도의\s+이름으로\s+기도(?:드립니|합니)다[.!?。．…]*\s*아멘[.!?。．…]*$/i,
    /예수님의\s+이름으로\s+기도(?:드립니|합니)다[.!?。．…]*\s*아멘[.!?。．…]*$/i,
    /아멘[.!?。．…]*$/i,
  ];
  while (previous !== valueText) {
    previous = valueText;
    for (const pattern of patterns) valueText = valueText.replace(pattern, '').trim();
  }
  return valueText.replace(/[.!?。．…]+$/, '').trim();
}

function withPreferredPrayerEnding(devotion) {
  const body = stripPrayerEndings(devotion?.prayer || '');
  return { ...devotion, prayer: body ? `${body}. ${PRAYER_ENDING}` : PRAYER_ENDING };
}

function buildFallbackDevotion(ref, errorCode) {
  const normalizedRef = String(ref || '').trim() || '선택한 말씀';
  const question = '오늘 이 말씀 앞에서 하나님께 맡기고 순종해야 할 한 가지는 무엇일까?';
  return {
    ok: true,
    reference: normalizedRef,
    title: '말씀 앞에 잠시 머무르기',
    coreMessage: '하나님은 말씀 안에서 오늘 붙들 은혜와 순종의 길을 조용히 보여주십니다.',
    keyWords: ['말씀', '은혜', '기도'],
    keyPhrase: '말씀 붙들기',
    explanation: '이 말씀을 잠시 멈추어 다시 읽어보세요. 본문 안에서 마음에 남는 단어와 표현이 무엇인지 천천히 살펴보면 좋겠습니다. 하나님은 짧은 말씀 속에서도 우리의 마음을 비추시고, 예수 그리스도의 은혜 안에서 오늘 걸어갈 방향을 보여주십니다.',
    meditation: '말씀 앞에 조용히 머물며 지금 내 마음을 아버지께 올려드립니다. 답을 급히 찾기보다 하나님이 이 말씀을 통해 보여주시는 작은 빛을 기다립니다.',
    prayer: PRAYER_ENDING,
    application: [
      '본문을 한 번 더 천천히 읽고 마음에 남는 표현 하나 적기',
      '그 표현 앞에서 지금 내 마음을 짧게 기도하기',
      '오늘 할 수 있는 작은 순종 한 가지를 정하고 실천하기',
    ],
    question,
    reflectionQuestion: question,
    fallback: true,
    errorCode,
  };
}

function buildFastModels(modelConfig) {
  return uniqueModels([
    GPT_OSS_120B_MODEL,
    process.env.NVIDIA_QUALITY_MODEL,
    modelConfig?.qualityModel,
    GPT_OSS_20B_MODEL,
    process.env.NVIDIA_PRIMARY_MODEL,
    process.env.NVIDIA_FAST_MODEL_1,
    modelConfig?.primaryFastModel,
    LLAMA_3_1_8B_MODEL,
    process.env.NVIDIA_SECONDARY_MODEL,
    process.env.NVIDIA_FAST_MODEL_2,
    modelConfig?.secondaryFastModel,
  ]);
}

function buildDeepModels(modelConfig) {
  return uniqueModels([
    GPT_OSS_120B_MODEL,
    process.env.NVIDIA_DEEP_MODEL,
    process.env.NVIDIA_QUALITY_MODEL,
    modelConfig?.deepModel,
    modelConfig?.qualityModel,
    process.env.NVIDIA_PRIMARY_MODEL,
    modelConfig?.primaryFastModel,
    LLAMA_3_1_8B_MODEL,
  ]);
}

async function callNvidiaVerseDevotion({ apiKey, messages, ref, verseText, mode }) {
  const modelConfig = await resolveNvidiaModelsForVerseDevotion();
  const models = mode === 'deep' ? buildDeepModels(modelConfig) : buildFastModels(modelConfig);
  const delaysMs = mode === 'deep'
    ? [0, numberEnv('NVIDIA_DEEP_HEDGE_DELAY_MS', 900), numberEnv('NVIDIA_FAST_BACKUP_DELAY_MS', 1800)]
    : [0, numberEnv('NVIDIA_HEDGE_DELAY_MS', 650), numberEnv('NVIDIA_QUALITY_DELAY_MS', 1350)];
  const raceResult = await hedgedNvidiaRace({
    apiKey,
    models,
    delaysMs,
    messages,
    timeoutMs: mode === 'deep' ? numberEnv('NVIDIA_DEEP_TOTAL_TIMEOUT_MS', 12_000) : numberEnv('NVIDIA_TOTAL_TIMEOUT_MS', 7_500),
    temperature: mode === 'deep' ? 0.25 : 0.22,
    maxTokens: mode === 'deep' ? 2400 : 1500,
    responseFormat: { type: 'json_object' },
    validate: (parsed) => validateVerseDevotion(parsed, { ref, verseText }),
  });
  return {
    ...raceResult,
    result: withPreferredPrayerEnding(raceResult.result),
    modelConfig: { ...modelConfig, modelsForRace: models },
    mode,
  };
}

function hasKorean(value) {
  return /[가-힣]/.test(String(value || ''));
}

function partValue(parsed, part) {
  if (!parsed || typeof parsed !== 'object') return null;
  if (part === 'explanation') {
    const title = text(parsed.title, 64);
    const coreMessage = text(parsed.coreMessage, 220);
    const explanation = text(parsed.explanation, 1000);
    const keyWords = Array.isArray(parsed.keyWords) ? parsed.keyWords.map((item) => text(item, 24)).filter(Boolean).slice(0, 3) : [];
    const keyPhrase = text(parsed.keyPhrase, 80);
    if (!title || coreMessage.length < 35 || explanation.length < 150 || !hasKorean(`${title} ${coreMessage} ${explanation}`)) return null;
    return { title, coreMessage, explanation, keyWords, keyPhrase };
  }
  if (part === 'context') {
    const context = text(parsed.context, 850);
    return context.length >= 90 && hasKorean(context) ? { context } : null;
  }
  if (part === 'meditation') {
    const meditation = text(parsed.meditation, 850);
    const application = Array.isArray(parsed.application)
      ? parsed.application.map((item) => text(item, 120)).filter(Boolean).slice(0, 3)
      : [];
    const question = text(parsed.question, 180);
    if (meditation.length < 100 || application.length < 3 || question.length < 20 || !hasKorean(`${meditation} ${question}`)) return null;
    return { meditation, application, question };
  }
  if (part === 'prayer') {
    const prayer = text(parsed.prayer, 900);
    return prayer.length >= 100 && hasKorean(prayer) ? { prayer } : null;
  }
  return null;
}

function buildPartMessages({ part, ref, verseText, contextText }) {
  const shared = [
    '너는 한국어 성경앱 시온성경의 성경 해설 도우미다.',
    `선택 구절은 ${ref}이며 반드시 이 절 자체가 중심이다.`,
    '선택 절에 실제로 있는 단어와 문장 표현을 먼저 설명하고 일반적인 위로 문구로 대체하지 않는다.',
    '본문에 없는 역사적 사실, 화자의 의도, 하나님의 뜻을 추측해서 단정하지 않는다.',
    '주변 문맥은 제공된 내용에서 확인되는 범위에서만 사용한다.',
    '예수 그리스도와 복음의 연결은 본문의 흐름을 왜곡하지 않을 때만 자연스럽게 한다.',
    '한국어만 사용하고 JSON 객체만 출력한다.',
  ];

  const taskByPart = {
    explanation: [
      '선택 절을 구절 해설하라.',
      '핵심 표현을 실제 문구에 붙여 4~6문장으로 상세히 설명한다.',
      '무엇을 말하는지, 중요한 표현이 어떤 의미를 만드는지, 하나님과 인간의 모습이 어떻게 드러나는지 순서대로 쓴다.',
      '형식: {"title":"짧은 제목","coreMessage":"핵심 한 문장","keyWords":["단어1","단어2","단어3"],"keyPhrase":"선택 절의 핵심 표현","explanation":"선택 절 자체에 대한 4~6문장 상세 해설"}',
    ],
    context: [
      '선택 절이 앞뒤 문맥에서 어떤 역할을 하는지 2~4문장으로 설명하라.',
      '선택 절보다 주변 절을 더 길게 해설하지 말고, 주변 절은 선택 절의 의미를 밝히는 데만 사용한다.',
      '형식: {"context":"선택 절과 앞뒤 문맥의 관계 설명"}',
    ],
    meditation: [
      '선택 절을 오늘의 삶에 연결한 1인칭 고백형 묵상을 3~5문장으로 작성한다.',
      '정죄보다 은혜와 순종의 방향을 제시한다.',
      '오늘 바로 할 수 있는 구체적 적용 3개와 본문에 직접 연결된 묵상 질문 1개를 만든다.',
      '형식: {"meditation":"1인칭 묵상","application":["적용1","적용2","적용3"],"question":"묵상 질문"}',
    ],
    prayer: [
      '선택 절의 핵심 표현을 반영한 고백형 기도문을 4~6문장으로 작성한다.',
      '반드시 “아버지,”로 시작한다.',
      `반드시 “${PRAYER_ENDING}”으로 끝낸다.`,
      '형식: {"prayer":"기도문"}',
    ],
  };

  return [
    { role: 'system', content: [...shared, ...taskByPart[part]].join('\n') },
    {
      role: 'user',
      content: `선택 구절: ${ref}\n선택 절 본문: ${verseText}\n\n앞뒤 문맥(선택 절 포함):\n${contextText || '제공되지 않음'}\n\n선택 절 자체를 중심으로 작성하라.`,
    },
  ];
}

async function callGeminiPart({ part, ref, verseText, contextText }) {
  const startedAt = Date.now();
  const result = await hedgedGeminiRace({
    models: [GEMINI_FAST_MODEL],
    delaysMs: [0],
    messages: buildPartMessages({ part, ref, verseText, contextText }),
    temperature: 0.08,
    maxTokens: part === 'explanation' ? 460 : part === 'context' ? 300 : 420,
    timeoutMs: numberEnv('GEMINI_PARALLEL_PART_TIMEOUT_MS', 2_800),
    thinkingLevel: 'minimal',
    validate: (response) => {
      const parsed = response ? parseJsonLoose(response.content) : null;
      return partValue(parsed, part);
    },
  });
  return { part, value: result.result, latencyMs: Date.now() - startedAt, model: result.model };
}

async function callParallelFastGemini({ ref, verseText, contextText }) {
  const startedAt = Date.now();
  const parts = ['explanation', 'context', 'meditation', 'prayer'];
  const settled = await Promise.allSettled(parts.map((part) => callGeminiPart({ part, ref, verseText, contextText })));
  const fallback = buildFallbackDevotion(ref, 'PARALLEL_PART_FALLBACK');
  const values = {};
  const partLatency = {};
  const failedParts = [];

  settled.forEach((entry, index) => {
    const part = parts[index];
    if (entry.status === 'fulfilled') {
      values[part] = entry.value.value;
      partLatency[part] = entry.value.latencyMs;
    } else {
      failedParts.push(part);
    }
  });

  const explanationPart = values.explanation || {};
  const contextPart = values.context || {};
  const meditationPart = values.meditation || {};
  const prayerPart = values.prayer || {};
  const combined = {
    reference: ref,
    title: explanationPart.title || fallback.title,
    coreMessage: explanationPart.coreMessage || fallback.coreMessage,
    keyWords: explanationPart.keyWords?.length ? explanationPart.keyWords : fallback.keyWords,
    keyPhrase: explanationPart.keyPhrase || fallback.keyPhrase,
    explanation: [explanationPart.explanation || fallback.explanation, contextPart.context].filter(Boolean).join('\n\n'),
    meditation: meditationPart.meditation || fallback.meditation,
    prayer: prayerPart.prayer || fallback.prayer,
    application: meditationPart.application?.length === 3 ? meditationPart.application : fallback.application,
    question: meditationPart.question || fallback.question,
    reflectionQuestion: meditationPart.question || fallback.question,
  };

  const validated = validateVerseDevotion(withPreferredPrayerEnding(combined), { ref, verseText });
  if (!validated) throw new Error('PARALLEL_VALIDATION_FAILED');
  return {
    result: validated,
    model: GEMINI_FAST_MODEL,
    latencyMs: Date.now() - startedAt,
    partLatency,
    failedParts,
  };
}

async function callGeminiVerseDevotion({ messages, ref, verseText, mode }) {
  const startedAt = Date.now();
  const raceResult = await hedgedGeminiRace({
    models: ['gemini-3.5-flash-lite', 'gemini-3.5-flash'],
    delaysMs: [0, 1200],
    messages,
    temperature: 0.22,
    maxTokens: 2200,
    timeoutMs: numberEnv('GEMINI_DEEP_DEVOTION_TIMEOUT_MS', 9_000),
    thinkingLevel: 'minimal',
    validate: (response) => {
      const parsed = response ? parseJsonLoose(response.content) : null;
      return validateVerseDevotion(parsed, { ref, verseText });
    },
  });
  return {
    result: withPreferredPrayerEnding(raceResult.result),
    model: raceResult.model,
    latencyMs: Date.now() - startedAt,
    attempts: raceResult.attempts,
  };
}

function debugPayload(value) {
  return shouldIncludeDebug() ? { debug: value } : {};
}

function rejectGuard(res, guard) {
  if (guard.retryAfterSeconds) res.setHeader('Retry-After', String(guard.retryAfterSeconds));
  return sendJson(res, guard.status, guard.body);
}

async function respondWithGemini({ res, messages, ref, verseText, contextText, mode, failures }) {
  if (mode === 'fast') {
    const parallel = await callParallelFastGemini({ ref, verseText, contextText });
    const timing = Object.entries(parallel.partLatency).map(([part, ms]) => `${part};dur=${ms}`).join(',');
    res.setHeader('Server-Timing', `gemini;dur=${parallel.latencyMs}${timing ? `,${timing}` : ''}`);
    console.info('[ai-perf] verse-devotion-parallel', JSON.stringify({ provider: 'gemini', model: parallel.model, mode, latencyMs: parallel.latencyMs, partLatency: parallel.partLatency, failedParts: parallel.failedParts }));
    return sendJson(res, 200, {
      ok: true,
      ...parallel.result,
      fallback: parallel.failedParts.length > 0,
      provider: 'gemini-parallel',
      model: parallel.model,
      ...debugPayload({ provider: 'gemini-parallel', latencyMs: parallel.latencyMs, partLatency: parallel.partLatency, failedParts: parallel.failedParts, failures, mode }),
    });
  }

  const geminiResult = await callGeminiVerseDevotion({ messages, ref, verseText, mode });
  res.setHeader('Server-Timing', `gemini;dur=${geminiResult.latencyMs}`);
  console.info('[ai-perf] verse-devotion', JSON.stringify({ provider: 'gemini', model: geminiResult.model, mode, latencyMs: geminiResult.latencyMs }));
  return sendJson(res, 200, {
    ok: true,
    ...geminiResult.result,
    fallback: false,
    provider: 'gemini',
    model: geminiResult.model,
    ...debugPayload({ provider: 'gemini', latencyMs: geminiResult.latencyMs, attempts: geminiResult.attempts, failures, mode }),
  });
}

async function respondWithNvidia({ res, apiKey, messages, ref, verseText, mode, failures }) {
  const raceResult = await callNvidiaVerseDevotion({ apiKey, messages, ref, verseText, mode });
  return sendJson(res, 200, {
    ok: true,
    ...raceResult.result,
    fallback: false,
    provider: 'nvidia',
    model: raceResult.model,
    ...debugPayload({
      provider: 'nvidia',
      prompt: 'verseDevotionReferencePrompt',
      selectedModels: raceResult.modelConfig?.modelsForRace || [],
      winningModel: raceResult.model,
      latencyMs: raceResult.latencyMs,
      attempts: raceResult.attempts,
      modelSource: raceResult.modelConfig?.source,
      failures,
      mode,
    }),
  });
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return sendJson(res, 405, { ok: false, error: 'Method not allowed', errorCode: 'INVALID_METHOD' });
    }

    const guard = guardAiRequest(req, { limit: 18, maxBodyBytes: 22_000 });
    if (!guard.ok) return rejectGuard(res, guard);

    const ref = text(req.body?.ref, 120);
    const verseText = text(req.body?.verseText, 5000);
    const contextText = text(req.body?.contextText, 8000);
    const requestMode = req.body?.mode === 'deep' ? 'deep' : 'fast';
    if (!ref || !verseText) {
      return sendJson(res, 400, { ok: false, error: 'ref and verseText are required', errorCode: 'INVALID_REQUEST' });
    }

    res.setHeader('Cache-Control', 'no-store, max-age=0');
    const messages = buildVerseDevotionReferenceMessages({ ref, verseText, mode: requestMode });
    const failures = [];
    const apiKey = getNvidiaApiKey();

    if (process.env.GEMINI_API_KEY) {
      const geminiStartedAt = Date.now();
      try {
        return await respondWithGemini({ res, messages, ref, verseText, contextText, mode: requestMode, failures });
      } catch (error) {
        const latencyMs = Date.now() - geminiStartedAt;
        failures.push({ provider: 'gemini', latencyMs, message: error instanceof Error ? error.message : String(error) });
        console.warn('[ai-perf] verse-devotion gemini failed', JSON.stringify({ mode: requestMode, latencyMs, error: error instanceof Error ? error.message : String(error) }));
      }
    } else {
      failures.push({ provider: 'gemini', message: 'GEMINI_API_KEY is not configured' });
    }

    if (requestMode === 'fast' && process.env.GEMINI_API_KEY) {
      return sendJson(res, 200, {
        ...buildFallbackDevotion(ref, 'FAST_GEMINI_FAILED'),
        ...debugPayload({ failures, mode: requestMode }),
      });
    }

    if (apiKey) {
      try {
        return await respondWithNvidia({ res, apiKey, messages, ref, verseText, mode: requestMode, failures });
      } catch (error) {
        failures.push({ provider: 'nvidia', message: error instanceof Error ? error.message : String(error) });
      }
    } else {
      failures.push({ provider: 'nvidia', message: 'NVIDIA_API_KEY is not configured' });
    }

    return sendJson(res, 200, {
      ...buildFallbackDevotion(ref, apiKey || process.env.GEMINI_API_KEY ? 'AI_PROVIDERS_FAILED' : 'AI_NOT_CONFIGURED'),
      ...debugPayload({ failures, mode: requestMode }),
    });
  } catch (fatalError) {
    return sendJson(res, 200, {
      ...buildFallbackDevotion(req.body?.ref, 'UNKNOWN_ERROR'),
      ...debugPayload({ error: fatalError instanceof Error ? fatalError.message : String(fatalError) }),
    });
  }
}