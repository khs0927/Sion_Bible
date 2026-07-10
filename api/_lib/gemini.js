const DEFAULT_GEMINI_MODEL = 'gemini-3.1-flash-lite';
const DEFAULT_TIMEOUT_MS = 12_000;

function positiveNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function toGeminiRequest(messages) {
  const systemText = (messages || [])
    .filter((message) => message?.role === 'system')
    .map((message) => String(message.content || '').trim())
    .filter(Boolean)
    .join('\n\n');

  const contents = (messages || [])
    .filter((message) => message?.role !== 'system')
    .map((message) => ({
      role: message?.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: String(message?.content || '') }],
    }))
    .filter((message) => message.parts[0].text.trim());

  return {
    contents,
    ...(systemText ? { systemInstruction: { parts: [{ text: systemText }] } } : {}),
  };
}

export async function callGeminiChat({
  apiKey = process.env.GEMINI_API_KEY,
  model = process.env.GEMINI_MODEL || process.env.GEMINI_FALLBACK_MODEL || DEFAULT_GEMINI_MODEL,
  messages,
  temperature = 0.35,
  maxTokens = 1024,
  timeoutMs = positiveNumber(process.env.GEMINI_TIMEOUT_MS, DEFAULT_TIMEOUT_MS),
  responseMimeType = 'application/json',
}) {
  if (!apiKey) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(new Error('Gemini request timeout')), timeoutMs);
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const request = toGeminiRequest(messages);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...request,
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens,
          ...(responseMimeType ? { responseMimeType } : {}),
        },
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      const error = new Error(`Gemini API failed: ${response.status}`);
      error.statusCode = response.status;
      error.detail = detail || response.statusText;
      throw error;
    }

    const data = await response.json();
    const content = data?.candidates?.[0]?.content?.parts
      ?.map((part) => part?.text || '')
      .join('')
      .trim();

    if (!content) {
      const error = new Error('Gemini returned empty content');
      error.statusCode = 502;
      throw error;
    }

    return {
      model,
      content,
      raw: data,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export { DEFAULT_GEMINI_MODEL };
