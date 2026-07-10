import { callGeminiChat } from './_lib/gemini.js';
import { hedgedNvidiaRace } from './_lib/hedgedAiRace.js';
import { guardAiRequest } from './_lib/httpGuard.js';
import { resolveNvidiaModelsForVerseDevotion } from './_lib/modelSelector.js';
import {
  getNvidiaApiKey,
  parseJsonLoose,
  sendJson,
  validateVerseDevotion,
} from './_lib/nvidia.js';
import { buildVerseDevotionReferenceMessages } from './_lib/verseDevotionReferencePrompt.js';

const GPT_OSS_120B_MODEL = 'openai/gpt-oss-120b';
const GPT_OSS_20B_MODEL = 'openai/gpt-oss-20b';
const LLAMA_3_1_8B_MODEL = 'meta/llama-3.1-8b-instruct';
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
  return {
    ...devotion,
    prayer: body ? `${body}. ${PRAYER_ENDING}` : PRAYER_ENDING,
  };
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
    explanation: '이 말씀을 잠시 멈추어 다시 읽어보세요. 본문 안에서 마음에 남는 단어와 표현이 무엇인지 천천히 살펴보면 좋겠습니다. 하나님은 짧은 말씀 속에서도 우리의 마음을 비추시고, 예수 그리스도의 은혜 안에서 오늘 걸어갈 방향을 보여주십니다. 본문을 내 소원대로만 적용하기보다, 하나님이 오늘 내게 보여주시는 뜻을 겸손히 묵상하는 것이 중요합니다.',
    meditation: '말씀 앞에 조용히 머물며 지금 내 마음을 아버지께 올려드립니다. 답을 급히 찾기보다, 하나님이 이 말씀을 통해 내게 보여주시는 작은 빛을 기다립니다. 오늘은 큰 결심보다 마음에 남은 한 문장을 붙들고 주님과 동행합니다.',
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
    process.env.NVIDIA_PRIMARY_MODEL,
    process.env.NVIDIA_FAST_MODEL_1,
    modelConfig?.primaryFastModel,
    GPT_OSS_20B_MODEL,
    LLAMA_3_1_8B_MODEL,
    process.env.NVIDIA_SECONDARY_MODEL,
    process.env.NVIDIA_FAST_MODEL_2,
    modelConfig?.secondaryFastModel,
    process.env.NVIDIA_QUALITY_MODEL,
    modelConfig?.qualityModel,
  ]);
}

function buildDeepModels(modelConfig) {
  return uniqueModels([
    process.env.NVIDIA_DEEP_MODEL,
    process.env.NVIDIA_QUALITY_MODEL,
    modelConfig?.deepModel,
    modelConfig?.qualityModel,
    GPT_OSS_120B_MODEL,
    process.env.NVIDIA_PRIMARY_MODEL,
    modelConfig?.primaryFastModel,
    LLAMA_3_1_8B_MODEL,
  ]);
}

async function callNvidiaVerseDevotion({ apiKey, messages, ref, verseText, mode }) {
  const modelConfig = await resolveNvidiaModelsForVerseDevotion();
  const models = mode === 'deep' ? buildDeepModels(modelConfig) : buildFastModels(modelConfig);
  const delaysMs = mode === 'deep'
    ? [0, numberEnv('NVIDIA_DEEP_HEDGE_DELAY_MS', 1100), numberEnv('NVIDIA_FAST_BACKUP_DELAY_MS', 2400)]
    : [0, numberEnv('NVIDIA_HEDGE_DELAY_MS', 700), numberEnv('NVIDIA_QUALITY_DELAY_MS', 1800)];

  const raceResult = await hedgedNvidiaRace({
    apiKey,
    models,
    delaysMs,
    messages,
    timeoutMs: mode === 'deep'
      ? numberEnv('NVIDIA_DEEP_TOTAL_TIMEOUT_MS', 26_000)
      : numberEnv('NVIDIA_TOTAL_TIMEOUT_MS', 15_000),
    temperature: mode === 'deep' ? 0.25 : 0.22,
    maxTokens: mode === 'deep' ? 2800 : 2300,
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

async function callGeminiVerseDevotion({ messages, ref, verseText, mode }) {
  const response = await callGeminiChat({
    messages,
    temperature: mode === 'deep' ? 0.25 : 0.22,
    maxTokens: mode === 'deep' ? 2800 : 2300,
    timeoutMs: mode === 'deep' ? 20_000 : 13_000,
  });
  if (!response) throw new Error('GEMINI_API_KEY is not configured');
  const parsed = parseJsonLoose(response.content);
  const validated = validateVerseDevotion(parsed, { ref, verseText });
  if (!validated) throw new Error('Gemini returned an invalid devotion payload');
  return { result: withPreferredPrayerEnding(validated), model: response.model };
}

function debugPayload(value) {
  return shouldIncludeDebug() ? { debug: value } : {};
}

function rejectGuard(res, guard) {
  if (guard.retryAfterSeconds) res.setHeader('Retry-After', String(guard.retryAfterSeconds));
  return sendJson(res, guard.status, guard.body);
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return sendJson(res, 405, {
        ok: false,
        error: 'Method not allowed',
        errorCode: 'INVALID_METHOD',
      });
    }

    const guard = guardAiRequest(req, { limit: 14, maxBodyBytes: 14_000 });
    if (!guard.ok) return rejectGuard(res, guard);

    const ref = text(req.body?.ref, 120);
    const verseText = text(req.body?.verseText, 5000);
    const requestMode = req.body?.mode === 'deep' ? 'deep' : 'fast';
    if (!ref || !verseText) {
      return sendJson(res, 400, {
        ok: false,
        error: 'ref and verseText are required',
        errorCode: 'INVALID_REQUEST',
      });
    }

    res.setHeader('Cache-Control', 'no-store, max-age=0');
    const messages = buildVerseDevotionReferenceMessages({ ref, verseText, mode: requestMode });
    const failures = [];
    const apiKey = getNvidiaApiKey();

    if (apiKey) {
      try {
        const raceResult = await callNvidiaVerseDevotion({ apiKey, messages, ref, verseText, mode: requestMode });
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
            mode: requestMode,
          }),
        });
      } catch (error) {
        failures.push({ provider: 'nvidia', message: error instanceof Error ? error.message : String(error) });
      }
    } else {
      failures.push({ provider: 'nvidia', message: 'NVIDIA_API_KEY is not configured' });
    }

    if (process.env.GEMINI_API_KEY) {
      try {
        const geminiResult = await callGeminiVerseDevotion({ messages, ref, verseText, mode: requestMode });
        return sendJson(res, 200, {
          ok: true,
          ...geminiResult.result,
          fallback: false,
          provider: 'gemini',
          model: geminiResult.model,
          ...debugPayload({ failures, mode: requestMode }),
        });
      } catch (error) {
        failures.push({ provider: 'gemini', message: error instanceof Error ? error.message : String(error) });
      }
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
