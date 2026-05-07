export const NVIDIA_ENDPOINT = 'https://integrate.api.nvidia.com/v1/chat/completions';

export const DEFAULT_FAST_MODEL_1 = 'meta/llama-3.1-8b-instruct';
export const DEFAULT_FAST_MODEL_2 = 'openai/gpt-oss-20b';
export const DEFAULT_QUALITY_MODEL = 'nvidia/llama-3.3-nemotron-super-49b-v1';

export function getNvidiaApiKey() {
  return process.env.NVIDIA_API_KEY;
}

export async function callNvidiaChat({
  apiKey = getNvidiaApiKey(),
  model,
  messages,
  temperature = 0.35,
  maxTokens = 480,
  signal,
  responseFormat = null,
}) {
  if (!apiKey) {
    const error = new Error('NVIDIA_API_KEY is not configured');
    error.statusCode = 500;
    error.detail = 'Set NVIDIA_API_KEY in the server environment. Do not expose it with a VITE_ prefix.';
    throw error;
  }
  if (!model) throw new Error('NVIDIA model is required');

  const body = {
    model,
    temperature,
    max_tokens: maxTokens,
    messages,
    stream: false,
  };
  if (responseFormat) body.response_format = responseFormat;

  const response = await fetch(NVIDIA_ENDPOINT, {
    method: 'POST',
    signal,
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
  if (!content) throw new Error('Model returned empty content');

  return { model, content, raw: data };
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

export function validateVerseDevotion(parsed, options = {}) {
  const ref = String(options.ref || parsed?.reference || '').trim();
  const verseText = String(options.verseText || '').trim();
  const fallbackApplication = [
    `${ref || '선택한 말씀'}을 한 번 더 천천히 읽고 마음에 남는 표현 하나 적어보기`,
    '그 표현 앞에서 지금 내 마음을 짧게 기도하기',
    '오늘 할 수 있는 작은 순종 한 가지를 정하고 실천하기',
  ];
  const fallbackQuestion = '오늘 이 말씀 앞에서 주님께 맡겨야 할 마음은 무엇일까?';
  const fallbackExplanation = '이 말씀을 잠시 멈추어 다시 읽어보세요. 본문 안에서 마음에 남는 단어와 표현이 무엇인지 천천히 살펴보면 좋겠습니다. 하나님은 짧은 말씀 속에서도 우리의 마음을 비추시고, 예수 그리스도의 은혜 안에서 오늘 걸어갈 방향을 보여주십니다.';
  const fallbackMeditation = '말씀 앞에 조용히 머물며 지금 내 마음을 주님께 올려드릴 수 있습니다. 답을 급히 찾기보다, 하나님이 이 말씀을 통해 내게 보여주시는 작은 빛을 기다려보세요. 오늘은 큰 결심보다 마음에 남은 한 문장을 붙들고 주님과 동행해볼 수 있습니다.';
  const fallbackPrayer = '하나님, 이 말씀 앞에 제 마음을 조용히 내려놓습니다. 제 생각과 감정보다 주님의 뜻을 먼저 듣게 하시고, 예수 그리스도의 은혜 안에서 오늘 작은 순종을 걷게 하소서. 성령님께서 제 마음을 비추시고 주님을 신뢰할 힘을 주소서. 우리 주 예수 그리스도의 이름으로 기도드립니다. 아멘.';
  const reference = ref;
  const title = String(parsed?.title || '말씀 앞에 잠시 머무르기').trim();
  const coreMessage = String(parsed?.coreMessage || `${ref || '이 말씀'}은 하나님의 성품을 바라보고 오늘 믿음으로 반응하도록 초대합니다.`).trim();
  const keyWords = Array.isArray(parsed?.keyWords)
    ? parsed.keyWords.map((item) => String(item).trim()).filter(Boolean).slice(0, 3)
    : ['본문', '은혜', '순종'];
  const keyPhrase = String(parsed?.keyPhrase ?? keyWords.join(', ')).trim();
  const explanation = String(parsed?.explanation || fallbackExplanation).trim();
  const meditation = String(parsed?.meditation || fallbackMeditation).trim();
  const prayer = ensurePrayerEnding(String(parsed?.prayer || fallbackPrayer).trim());
  const application = Array.isArray(parsed?.application)
    ? parsed.application.map((item) => String(item).trim()).filter(Boolean).slice(0, 3)
    : String(parsed?.application ?? '').split(/\n+/).map((item) => item.replace(/^\s*\d+[.)]\s*/, '').trim()).filter(Boolean).slice(0, 3);
  const normalizedApplication = application.length > 0 ? application : fallbackApplication;
  const question = String(parsed?.question ?? parsed?.reflectionQuestion ?? fallbackQuestion).trim();

  if (!title || !coreMessage || !explanation || !meditation || !prayer || normalizedApplication.length < 1 || !question) return null;
  const combined = `${title}\n${coreMessage}\n${keyWords.join('\n')}\n${explanation}\n${meditation}\n${prayer}\n${normalizedApplication.join('\n')}\n${question}`;
  if (!/[가-힣]/.test(combined)) return null;
  if (/\b(minutes?|hours?|meditation|prayer|application|explanation|coreMessage)\b/i.test(combined)) return null;
  if (explanation.length < 260 || meditation.length < 90 || prayer.length < 90) return null;
  if (hasExcessiveRepeats(combined)) return null;

  return {
    reference,
    title,
    coreMessage,
    keyWords,
    keyPhrase,
    explanation,
    meditation,
    prayer,
    application: normalizedApplication,
    question,
    reflectionQuestion: question,
  };
}

function ensurePrayerEnding(value) {
  const ending = '우리 주 예수 그리스도의 이름으로 기도드립니다. 아멘.';
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
  const body = text.replace(/[.!?。．…]+$/, '').trim();
  return body ? `${body}. ${ending}` : ending;
}

function hasExcessiveRepeats(value) {
  const compact = value.replace(/\s+/g, ' ');
  const sentences = compact.split(/[.!?。]|다\.|요\.|니다\./).map((item) => item.trim()).filter(Boolean);
  const seen = new Map();
  for (const sentence of sentences) {
    if (sentence.length < 10) continue;
    const count = (seen.get(sentence) || 0) + 1;
    if (count >= 3) return true;
    seen.set(sentence, count);
  }
  const chunks = compact.match(/.{12,40}/g) || [];
  const chunkCounts = new Map();
  for (const chunk of chunks) {
    const count = (chunkCounts.get(chunk) || 0) + 1;
    if (count >= 4) return true;
    chunkCounts.set(chunk, count);
  }
  return false;
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
