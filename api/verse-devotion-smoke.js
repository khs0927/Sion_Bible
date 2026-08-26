import { callGeminiChat } from './_lib/gemini.js';
import { buildVerseDevotionReferenceMessages } from './_lib/verseDevotionReferencePrompt.js';
import { parseJsonLoose, sendJson, validateVerseDevotion } from './_lib/nvidia.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return sendJson(res, 405, { ok: false, error: 'Method not allowed' });
  }

  const ref = '창세기 22:7';
  const verseText = '이삭이 그 아버지 아브라함에게 말하여 이르되 내 아버지여 하니 그가 이르되 내 아들아 내가 여기 있노라 이삭이 이르되 불과 나무는 있거니와 번제할 어린 양은 어디 있나이까';
  const messages = buildVerseDevotionReferenceMessages({ ref, verseText, mode: 'fast' });
  const startedAt = Date.now();

  try {
    const response = await callGeminiChat({
      model: 'gemini-3.5-flash',
      messages,
      temperature: 0.18,
      maxTokens: 1800,
      timeoutMs: 7000,
      thinkingLevel: 'low',
    });
    const content = response?.content || '';
    let parsed = null;
    let parseError = null;
    try {
      parsed = parseJsonLoose(content);
    } catch (error) {
      parseError = error instanceof Error ? error.message : String(error);
    }
    const validated = parsed ? validateVerseDevotion(parsed, { ref, verseText }) : null;
    return sendJson(res, 200, {
      ok: Boolean(validated),
      model: response?.model,
      latencyMs: Date.now() - startedAt,
      contentLength: content.length,
      finishReason: response?.raw?.candidates?.[0]?.finishReason || null,
      parseError,
      parsedKeys: parsed && typeof parsed === 'object' ? Object.keys(parsed) : [],
      fieldLengths: parsed && typeof parsed === 'object' ? {
        explanation: String(parsed.explanation || '').length,
        meditation: String(parsed.meditation || '').length,
        prayer: String(parsed.prayer || '').length,
        application: Array.isArray(parsed.application) ? parsed.application.length : 0,
      } : null,
      validated: Boolean(validated),
    });
  } catch (error) {
    return sendJson(res, 200, {
      ok: false,
      latencyMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
      detail: error?.detail || null,
    });
  }
}
