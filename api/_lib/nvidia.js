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
  const title = String(parsed?.title ?? '').trim();
  const keyPhrase = String(parsed?.keyPhrase ?? '').trim();
  const meditation = String(parsed?.meditation ?? '').trim();
  const prayer = String(parsed?.prayer ?? '').trim();
  const application = String(parsed?.application ?? '').trim();
  const reflectionQuestion = String(parsed?.reflectionQuestion ?? '').trim();
  const verseText = String(options.verseText ?? '').trim();

  if (!title || !meditation || !prayer || !application) return null;
  const combined = `${title}\n${keyPhrase}\n${meditation}\n${prayer}\n${application}\n${reflectionQuestion}`;
  if (!/[가-힣]/.test(combined)) return null;
  if ((combined.match(/\?/g) ?? []).length > 6) return null;
  if (/\b(minutes?|hours?|meditation|prayer|application)\b/i.test(combined)) return null;
  if (meditation.length < 100 || prayer.length < 70 || application.length < 40) return null;
  if (keyPhrase && verseText && !verseText.includes(keyPhrase)) return null;
  if (hasExcessiveRepeats(combined)) return null;

  return {
    title,
    keyPhrase,
    meditation,
    prayer,
    application,
    reflectionQuestion,
  };
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
