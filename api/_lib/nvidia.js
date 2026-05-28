export const NVIDIA_BASE_URL = process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1';
export const NVIDIA_CHAT_ENDPOINT = `${NVIDIA_BASE_URL.replace(/\/+$/, '')}/chat/completions`;
export const NVIDIA_MODELS_ENDPOINT = `${NVIDIA_BASE_URL.replace(/\/+$/, '')}/models`;

export const DEFAULT_PRIMARY_FAST_MODEL = 'meta/llama-3.1-8b-instruct';
export const DEFAULT_SECONDARY_FAST_MODEL = 'meta/llama-3.1-8b-instruct';
export const DEFAULT_QUALITY_MODEL = 'meta/llama-3.1-8b-instruct';
export const DEFAULT_QUALITY_MODEL_FALLBACK = 'meta/llama-3.1-8b-instruct';
export const DEFAULT_DEEP_MODEL = 'meta/llama-3.1-8b-instruct';

export const PREFERRED_NVIDIA_MODELS = [
  DEFAULT_PRIMARY_FAST_MODEL,
  DEFAULT_SECONDARY_FAST_MODEL,
  DEFAULT_QUALITY_MODEL,
  DEFAULT_QUALITY_MODEL_FALLBACK,
  DEFAULT_DEEP_MODEL,
  'qwen/qwen3.5-122b-a10b',
  'qwen/qwen3.5-397b-a17b',
  'meta/llama-3.1-8b-instruct',
];

const REQUIRED_PRAYER_ENDING = '우리 주 예수 그리스도의 이름으로 기도드립니다. 아멘.';

export function getNvidiaApiKey() {
  return process.env.NVIDIA_API_KEY;
}

export function parseModelList(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function dedupeModels(models) {
  const seen = new Set();
  return (models || [])
    .map((model) => typeof model === 'string' ? model : model?.id)
    .map((id) => String(id || '').trim())
    .filter(Boolean)
    .filter((id) => {
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
}

export function isBlockedModel(modelId) {
  const id = String(modelId || '').toLowerCase();
  if (!id) return true;
  const blocklist = parseModelList(process.env.NVIDIA_MODEL_BLOCKLIST).map((item) => item.toLowerCase());
  if (blocklist.some((blocked) => id.includes(blocked))) return true;
  return [
    'embedding',
    'embed',
    'rerank',
    'retrieval',
    'audio',
    'image',
    'video',
    'vision-only',
    'vlm-only',
    'diffusion',
    'flux',
    'stable',
    'whisper',
    'tts',
  ].some((blocked) => id.includes(blocked));
}

export function isPreferredModel(modelId) {
  return PREFERRED_NVIDIA_MODELS.includes(String(modelId || '').trim());
}

export function filterLikelyChatModels(models) {
  const allowlist = parseModelList(process.env.NVIDIA_MODEL_ALLOWLIST);
  const ids = dedupeModels(models);
  const filtered = allowlist.length > 0
    ? ids.filter((id) => allowlist.includes(id))
    : ids.filter((id) => !isBlockedModel(id));

  return filtered.sort((a, b) => {
    const aIndex = PREFERRED_NVIDIA_MODELS.indexOf(a);
    const bIndex = PREFERRED_NVIDIA_MODELS.indexOf(b);
    if (aIndex >= 0 && bIndex >= 0) return aIndex - bIndex;
    if (aIndex >= 0) return -1;
    if (bIndex >= 0) return 1;
    return a.localeCompare(b);
  });
}

export async function listNvidiaModels({ apiKey = getNvidiaApiKey(), signal } = {}) {
  if (!apiKey) {
    const error = new Error('NVIDIA_API_KEY is not configured');
    error.errorCode = 'MISSING_NVIDIA_API_KEY';
    error.statusCode = 500;
    throw error;
  }

  const response = await fetch(NVIDIA_MODELS_ENDPOINT, {
    method: 'GET',
    signal,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    const error = new Error(`NVIDIA models request failed: ${response.status}`);
    error.errorCode = response.status === 401 ? 'NVIDIA_UNAUTHORIZED' : 'NVIDIA_MODELS_FAILED';
    error.statusCode = response.status;
    error.detail = detail || response.statusText;
    throw error;
  }

  const data = await response.json();
  return dedupeModels(data?.data || []);
}

export async function callNvidiaChat({
  apiKey = getNvidiaApiKey(),
  model,
  messages,
  temperature = 0.35,
  topP,
  seed,
  maxTokens = 480,
  signal,
  timeoutMs,
  responseFormat = null,
  retryWithoutResponseFormat = true,
  extraBody = {},
  baseUrl = process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1',
}) {
  if (!apiKey) {
    const error = new Error('NVIDIA_API_KEY is not configured');
    error.statusCode = 500;
    error.detail = 'Set NVIDIA_API_KEY in the server environment. Do not expose it with a VITE_ prefix.';
    throw error;
  }
  if (!model) throw new Error('NVIDIA model is required');

  const endpoint = `${String(baseUrl).replace(/\/+$/, '')}/chat/completions`;
  const controller = !signal && timeoutMs ? new AbortController() : null;
  const timeout = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  const requestSignal = signal || controller?.signal;

  const send = async (format) => {
    const body = {
      model,
      temperature,
      max_tokens: maxTokens,
      messages,
      stream: false,
      ...extraBody,
    };
    if (topP !== undefined) body.top_p = topP;
    if (seed !== undefined) body.seed = seed;
    if (format) body.response_format = format;

    const response = await fetch(endpoint, {
      method: 'POST',
      signal: requestSignal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      const error = new Error(`NVIDIA API failed: ${response.status}`);
      error.statusCode = response.status;
      error.detail = detail || response.statusText;
      error.model = model;
      throw error;
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content ?? '';
    if (!content) {
      const error = new Error('Model returned empty content');
      error.model = model;
      throw error;
    }

    return { model, content, raw: data };
  };

  try {
    try {
      return await send(responseFormat);
    } catch (error) {
      const detail = String(error?.detail || error?.message || '');
      if (
        retryWithoutResponseFormat &&
        responseFormat &&
        error?.statusCode === 400 &&
        /response[_ -]?format|json_object/i.test(detail)
      ) {
        return await send(null);
      }
      throw error;
    }
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export function parseJsonLoose(value) {
  const raw = String(value ?? '').trim();
  if (!raw) throw new Error('Empty response');

  const unfenced = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();

  try {
    return JSON.parse(unfenced);
  } catch (error) {
    const start = unfenced.indexOf('{');
    const end = unfenced.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(unfenced.slice(start, end + 1));
    }
    throw error;
  }
}

function stripPrayerEnding(value) {
  let text = String(value || '').trim();
  let previous = '';
  const patterns = [
    /우리\s+주\s+예수\s+그리스도의\s+이름으로\s+기도드립니다[.!?。．…]*\s*아멘[.!?。．…]*$/i,
    /우리\s+주\s+예수\s+그리스도의\s+이름으로\s+기도드립니다[.!?。．…]*$/i,
    /예수\s+그리스도의\s+이름으로\s+기도(?:드립니|합니)다[.!?。．…]*\s*아멘[.!?。．…]*$/i,
    /예수님의\s+이름으로\s+기도(?:드립니|합니)다[.!?。．…]*\s*아멘[.!?。．…]*$/i,
    /아멘[.!?。．…]*$/i,
  ];
  while (previous !== text) {
    previous = text;
    for (const pattern of patterns) text = text.replace(pattern, '').trim();
  }
  return text.replace(/[.!?。．…]+$/, '').trim();
}

export function ensurePrayerEnding(value) {
  const body = stripPrayerEnding(value);
  return body ? `${body}. ${REQUIRED_PRAYER_ENDING}` : REQUIRED_PRAYER_ENDING;
}

function normalizeJesusLanguage(value) {
  return String(value || '')
    .replace(/예수께서/g, '예수님께서')
    .replace(/예수에게/g, '예수님께')
    .replace(/예수를/g, '예수님을')
    .replace(/예수의/g, '예수님의')
    .replace(/예수는/g, '예수님은')
    .replace(/예수가/g, '예수님이')
    .replace(/예수와/g, '예수님과')
    .replace(/(?<!그리스도 )예수(?!님| 그리스도)/g, '예수님');
}

function normalizeApplication(value, fallback) {
  const items = Array.isArray(value)
    ? value
    : String(value || '')
      .split(/\n+/)
      .map((item) => item.replace(/^\s*\d+[.)]\s*/, '').trim());
  const normalized = items.map((item) => normalizeJesusLanguage(item).trim()).filter(Boolean).slice(0, 3);
  return normalized.length >= 3 ? normalized : [...normalized, ...fallback].slice(0, 3);
}

function hasKorean(value) {
  return /[가-힣]/.test(String(value || ''));
}

function hasExcessiveRepeats(value) {
  const compact = String(value || '').replace(/\s+/g, ' ');
  const sentences = compact.split(/[.!?。]|다\.|요\.|니다\./).map((item) => item.trim()).filter(Boolean);
  const seen = new Map();
  for (const sentence of sentences) {
    if (sentence.length < 10) continue;
    const count = (seen.get(sentence) || 0) + 1;
    if (count >= 3) return true;
    seen.set(sentence, count);
  }
  return false;
}

export function validateVerseDevotion(parsed, options = {}) {
  const ref = String(options.ref || parsed?.reference || '').trim();
  const fallbackApplication = [
    '본문을 한 번 더 천천히 읽고 마음에 남는 표현 하나 적어보기',
    '그 표현 앞에서 지금 내 마음을 짧게 기도하기',
    '오늘 할 수 있는 작은 순종 한 가지를 정하고 실천하기',
  ];
  const fallbackQuestion = '오늘 이 말씀 앞에서 주님께 맡겨야 할 마음은 무엇일까?';
  const fallbackExplanation = '이 말씀을 잠시 멈추어 다시 읽어보세요. 본문 안에서 마음에 남는 단어와 표현이 무엇인지 천천히 살펴보면 좋겠습니다. 하나님은 짧은 말씀 속에서도 우리의 마음을 비추시고, 예수 그리스도의 은혜 안에서 오늘 걸어갈 방향을 보여주십니다.';
  const fallbackMeditation = '말씀 앞에 조용히 머물며 지금 내 마음을 주님께 올려드릴 수 있습니다. 답을 급히 찾기보다, 하나님이 이 말씀을 통해 내게 보여주시는 작은 빛을 기다려보세요. 오늘은 큰 결심보다 마음에 남은 한 문장을 붙들고 주님과 동행해볼 수 있습니다.';
  const fallbackPrayer = '하나님, 이 말씀 앞에 제 마음을 조용히 내려놓습니다. 제 생각과 감정보다 주님의 뜻을 먼저 듣게 하시고, 예수 그리스도의 은혜 안에서 오늘 작은 순종을 걷게 하소서. 성령님께서 제 마음을 비추시고 주님을 신뢰할 힘을 주소서.';

  const title = normalizeJesusLanguage(String(parsed?.title || `${ref || '선택한 말씀'} 말씀 묵상`).trim());
  const coreMessage = normalizeJesusLanguage(String(parsed?.coreMessage || `${ref || '이 말씀'}은 하나님의 성품을 바라보고 오늘 믿음으로 반응하도록 초대합니다.`).trim());
  const keyWords = Array.isArray(parsed?.keyWords)
    ? parsed.keyWords.map((item) => String(item).trim()).filter(Boolean).slice(0, 3)
    : ['본문', '은혜', '순종'];
  const keyPhrase = String(parsed?.keyPhrase ?? keyWords.join(', ')).trim();
  const explanation = normalizeJesusLanguage(String(parsed?.explanation || fallbackExplanation).trim());
  const meditation = normalizeJesusLanguage(String(parsed?.meditation || fallbackMeditation).trim());
  const prayer = ensurePrayerEnding(normalizeJesusLanguage(String(parsed?.prayer || fallbackPrayer).trim()));
  const application = normalizeApplication(parsed?.application, fallbackApplication);
  const question = normalizeJesusLanguage(String(parsed?.question ?? parsed?.reflectionQuestion ?? fallbackQuestion).trim());

  const combined = `${title}\n${coreMessage}\n${keyWords.join('\n')}\n${explanation}\n${meditation}\n${prayer}\n${application.join('\n')}\n${question}`;
  if (!title || !explanation || !meditation || !prayer || application.length < 3 || !question) return null;
  if (!hasKorean(combined)) return null;
  if (/\b(minutes?|hours?|meditation|prayer|application|explanation|coreMessage)\b/i.test(combined)) return null;
  if (explanation.length < 120 || meditation.length < 60 || prayer.length < 80) return null;
  if (hasExcessiveRepeats(combined)) return null;

  return {
    reference: ref,
    title,
    coreMessage,
    keyWords,
    keyPhrase,
    explanation,
    meditation,
    prayer,
    application,
    question,
    reflectionQuestion: question,
  };
}

export function sendJson(res, status, body) {
  res.status(status).json(body);
}

export function normalizeError(error) {
  return {
    status: error?.statusCode || error?.status || 500,
    error: error?.message || 'Unexpected server error',
    detail: error?.detail || (error instanceof Error ? error.message : String(error)),
    model: error?.model,
  };
}
