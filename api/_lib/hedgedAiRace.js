import { callNvidiaChat, parseJsonLoose } from './nvidia.js';

function delay(ms, signal) {
  if (!ms) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(resolve, ms);
    if (signal) {
      signal.addEventListener('abort', () => {
        clearTimeout(timeout);
        reject(signal.reason || new DOMException('Aborted', 'AbortError'));
      }, { once: true });
    }
  });
}

function serializeError(error) {
  return {
    name: error?.name,
    message: error?.message || String(error),
    statusCode: error?.statusCode,
    detail: error?.detail,
    model: error?.model,
  };
}

export async function hedgedNvidiaRace({
  models,
  delaysMs = [0, 700, 1800],
  messages,
  apiKey,
  timeoutMs = 14000,
  temperature = 0.25,
  topP,
  seed,
  maxTokens = 1800,
  responseFormat = { type: 'json_object' },
  validate,
}) {
  const uniqueModels = [...new Set((models || []).filter(Boolean))];
  if (uniqueModels.length === 0) throw new Error('At least one model is required');

  const attempts = [];
  const controllers = uniqueModels.map(() => new AbortController());
  const overallController = new AbortController();
  let settled = false;
  let pending = uniqueModels.length;
  let timeoutId;

  const abortOthers = (winnerIndex) => {
    settled = true;
    controllers.forEach((controller, index) => {
      if (index !== winnerIndex && !controller.signal.aborted) controller.abort(new Error('Hedged race resolved'));
    });
    if (!overallController.signal.aborted) overallController.abort(new Error('Hedged race resolved'));
    if (timeoutId) clearTimeout(timeoutId);
  };

  return new Promise((resolve, reject) => {
    timeoutId = setTimeout(() => {
      if (settled) return;
      settled = true;
      controllers.forEach((controller) => {
        if (!controller.signal.aborted) controller.abort(new Error('AI Generation Timeout'));
      });
      const error = new Error('AI Generation Timeout');
      error.statusCode = 504;
      error.attempts = attempts;
      reject(error);
    }, timeoutMs);

    const maybeReject = () => {
      if (settled || pending > 0) return;
      const error = new Error('All NVIDIA model attempts failed');
      error.statusCode = 502;
      error.attempts = attempts;
      reject(error);
    };

    uniqueModels.forEach((model, index) => {
      (async () => {
        const startedAt = Date.now();
        try {
          await delay(delaysMs[index] ?? delaysMs[delaysMs.length - 1] ?? 0, overallController.signal);
          if (settled) throw new DOMException('Aborted after successful hedge', 'AbortError');

          const response = await callNvidiaChat({
            apiKey,
            model,
            messages,
            temperature,
            topP,
            seed,
            maxTokens,
            responseFormat,
            signal: controllers[index].signal,
          });

          const parsed = parseJsonLoose(response.content);
          const result = validate ? validate(parsed) : parsed;
          if (!result) {
            const error = new Error(`Model ${model} returned invalid JSON payload`);
            error.model = model;
            throw error;
          }

          const latencyMs = Date.now() - startedAt;
          attempts.push({ model, ok: true, latencyMs });
          if (!settled) {
            abortOthers(index);
            resolve({ result, model, latencyMs, attempts: [...attempts] });
          }
        } catch (error) {
          const latencyMs = Date.now() - startedAt;
          if (!(settled && error?.name === 'AbortError')) {
            attempts.push({ model, ok: false, latencyMs, error: serializeError(error) });
          }
        } finally {
          pending -= 1;
          maybeReject();
        }
      })();
    });
  });
}
