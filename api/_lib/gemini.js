const DEFAULT_GEMINI_MODEL = 'gemini-3.5-flash';
const DEFAULT_TIMEOUT_MS = 12_000;
const DEFAULT_GEMINI_FLASH_MODELS = ['gemini-3.5-flash', 'gemini-3.6-flash', 'gemini-3.7-flash'];

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

function defaultThinkingLevel(model) {
  if (model === 'gemini-3.7-flash') return 'low';
  if (model === 'gemini-3.6-flash' || model === 'gemini-3.5-flash') return 'minimal';
  return null;
}

function supportsLegacySampling(model) {
  return !/^gemini-3\.(?:6|7)-flash/.test(String(model || ''));
}

export async function callGeminiChat({
  apiKey = process.env.GEMINI_API_KEY,
  model = process.env.GEMINI_MODEL || process.env.GEMINI_FALLBACK_MODEL || DEFAULT_GEMINI_MODEL,
  messages,
  temperature = 0.35,
  maxTokens = 1024,
  timeoutMs = positiveNumber(process.env.GEMINI_TIMEOUT_MS, DEFAULT_TIMEOUT_MS),
  responseMimeType = 'application/json',
  thinkingLevel = defaultThinkingLevel(model),
}) {
  if (!apiKey) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(new Error('Gemini request timeout')), timeoutMs);
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const request = toGeminiRequest(messages);
  const generationConfig = {
    maxOutputTokens: maxTokens,
    ...(responseMimeType ? { responseMimeType } : {}),
    ...(thinkingLevel ? { thinkingConfig: { thinkingLevel } } : {}),
    ...(supportsLegacySampling(model) && Number.isFinite(Number(temperature)) ? { temperature } : {}),
  };

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...request, generationConfig }),
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

    return { model, content, raw: data };
  } finally {
    clearTimeout(timeout);
  }
}

export async function hedgedGeminiRace({
  apiKey = process.env.GEMINI_API_KEY,
  models = DEFAULT_GEMINI_FLASH_MODELS,
  delaysMs = [0, 1800, 3200],
  messages,
  temperature = 0.2,
  maxTokens = 1200,
  timeoutMs = 10_000,
  responseMimeType = 'application/json',
  thinkingLevel,
  thinkingLevelByModel,
  validate,
}) {
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured');
  const selected = [...new Set((models || []).map((model) => String(model || '').trim()).filter(Boolean))].slice(0, 3);
  if (selected.length === 0) throw new Error('At least one Gemini model is required');

  const attempts = [];
  let settled = false;
  let pending = selected.length;

  return new Promise((resolve, reject) => {
    const failIfDone = () => {
      pending -= 1;
      if (!settled && pending === 0) {
        const error = new Error('All Gemini model attempts failed');
        error.attempts = attempts;
        reject(error);
      }
    };

    selected.forEach((model, index) => {
      (async () => {
        const delayMs = Math.max(0, Number(delaysMs[index] ?? delaysMs[delaysMs.length - 1] ?? 0));
        if (delayMs) await new Promise((done) => setTimeout(done, delayMs));
        if (settled) return failIfDone();

        const startedAt = Date.now();
        try {
          const modelThinkingLevel = thinkingLevelByModel?.[model] ?? thinkingLevel ?? defaultThinkingLevel(model);
          const response = await callGeminiChat({
            apiKey,
            model,
            messages,
            temperature,
            maxTokens,
            timeoutMs,
            responseMimeType,
            thinkingLevel: modelThinkingLevel,
          });
          const latencyMs = Date.now() - startedAt;
          const validated = validate ? await validate(response) : response;
          attempts.push({ model, ok: Boolean(validated), latencyMs, thinkingLevel: modelThinkingLevel });
          if (!validated) return failIfDone();
          if (settled) return failIfDone();
          settled = true;
          resolve({ model, response, result: validated, latencyMs, attempts });
        } catch (error) {
          attempts.push({
            model,
            ok: false,
            latencyMs: Date.now() - startedAt,
            error: error instanceof Error ? error.message : String(error),
          });
          failIfDone();
        }
      })();
    });
  });
}

export { DEFAULT_GEMINI_MODEL, DEFAULT_GEMINI_FLASH_MODELS };