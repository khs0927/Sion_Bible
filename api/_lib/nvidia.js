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
  const fallbackQuestion = `${ref || '이 말씀'} 앞에서 오늘 내가 예수 그리스도의 은혜로 다시 바라보아야 할 마음은 무엇일까?`;
  const fallbackExplanation = `${ref || '선택한 본문'}의 말씀은 ${verseText ? `“${verseText}”입니다. ` : ''}본문의 표현을 붙들고 하나님이 어떤 분으로 드러나시는지 살피도록 초대합니다. 이 구절을 내 상황에 바로 끼워 맞추기보다, 먼저 말씀의 흐름 안에서 하나님의 성품과 인간의 모습을 차분히 바라볼 수 있습니다. 예수 그리스도의 은혜는 우리를 정죄에 머물게 하지 않고 회복과 순종의 자리로 이끕니다.`;
  const fallbackMeditation = `${ref || '이 말씀'}을 오늘 내 마음의 자리로 가져와 봅니다. 말씀 앞에서 떠오르는 두려움과 질문을 주님께 솔직히 올려드릴 수 있습니다. 하나님은 이 자리에서도 은혜로 우리를 부르시며, 예수 그리스도 안에서 작은 순종으로 반응하게 하십니다.`;
  const fallbackPrayer = `하나님, ${ref || '이 말씀'} 앞에 제 마음을 조용히 내려놓습니다. 본문을 제 생각대로만 해석하지 않고 주님이 보여주시는 뜻을 겸손히 듣게 하소서. 예수 그리스도의 은혜와 성령님의 도우심으로 오늘 작은 순종을 걷게 하소서. 우리 주 예수 그리스도의 이름으로 기도드립니다. 아멘.`;
  const reference = ref;
  const title = String(parsed?.title || `${ref || '선택한 말씀'} 말씀 묵상`).trim();
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
  const text = String(value || '').trim();
  if (text.endsWith(ending)) return text;
  return `${text.replace(/(?:아멘[.]?)?$/g, '').trim()} ${ending}`.trim();
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
