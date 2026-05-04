import { callNvidiaChat, parseJsonLoose } from './nvidia.js';

export async function raceNvidiaModels({
  models,
  messages,
  validate,
  apiKey,
  temperature = 0.35,
  maxTokens = 900,
}) {
  const uniqueModels = [...new Set(models.filter(Boolean))].slice(0, 2);
  if (uniqueModels.length === 0) throw new Error('At least one NVIDIA model is required');

  const controllers = uniqueModels.map(() => new AbortController());
  const attempts = uniqueModels.map(async (model, index) => {
    const response = await callNvidiaChat({
      apiKey,
      model,
      messages,
      temperature,
      maxTokens,
      signal: controllers[index].signal,
    });
    const parsed = parseJsonLoose(response.content);
    const normalized = validate(parsed, model, response.content);
    if (!normalized) throw new Error(`Model ${model} returned invalid JSON shape`);
    return { result: normalized, model, rawText: response.content };
  });

  try {
    const winner = await Promise.any(attempts);
    controllers.forEach((controller, index) => {
      if (uniqueModels[index] !== winner.model) controller.abort();
    });
    return winner;
  } catch (error) {
    const messages = error?.errors?.map((item) => item?.message || String(item)).join(' | ');
    const aggregate = new Error(messages || 'All NVIDIA model attempts failed');
    aggregate.statusCode = 502;
    aggregate.detail = messages || 'No model returned valid JSON.';
    throw aggregate;
  }
}
