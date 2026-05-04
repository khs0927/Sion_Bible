import { callNvidiaChat, parseJsonLoose } from './nvidia.js';

/**
 * Hedged Request (Hedged AI Race) Utility
 * 
 * 1. Calls the first model immediately.
 * 2. If no valid response within firstDelayMs, calls the second model.
 * 3. Uses the first one that returns valid JSON (validated by the validate function).
 * 4. Aborts others upon success.
 * 5. Times out after timeoutMs.
 */
export async function hedgedNvidiaRace({
  models,
  messages,
  apiKey,
  firstDelayMs = 1200,
  timeoutMs = 10000,
  temperature = 0.5,
  maxTokens = 1024,
  responseFormat = null,
  validate,
}) {
  const uniqueModels = [...new Set(models.filter(Boolean))].slice(0, 2);
  if (uniqueModels.length === 0) throw new Error('At least one model is required');

  const controllers = uniqueModels.map(() => new AbortController());
  
  // Overall timeout
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      controllers.forEach(c => c.abort());
      const err = new Error('AI Generation Timeout');
      err.statusCode = 504;
      reject(err);
    }, timeoutMs);
  });

  const runModel = async (model, index) => {
    try {
      const response = await callNvidiaChat({
        apiKey,
        model,
        messages,
        temperature,
        maxTokens,
        responseFormat,
        signal: controllers[index].signal,
      });

      const parsed = parseJsonLoose(response.content);
      const result = validate(parsed);
      
      if (!result) {
        throw new Error(`Model ${model} returned invalid data format`);
      }

      // Success! Abort others
      controllers.forEach((c, i) => {
        if (i !== index) c.abort();
      });

      return { result, model };
    } catch (error) {
      if (error.name === 'AbortError') {
        throw error;
      }
      console.warn(`Model ${model} attempt failed:`, error.message);
      throw error;
    }
  };

  const tasks = [];
  
  // First attempt
  tasks.push(runModel(uniqueModels[0], 0));

  // Second attempt after delay
  if (uniqueModels.length > 1) {
    const delayedAttempt = new Promise((resolve, reject) => {
      setTimeout(async () => {
        try {
          const res = await runModel(uniqueModels[1], 1);
          resolve(res);
        } catch (e) {
          reject(e);
        }
      }, firstDelayMs);
    });
    tasks.push(delayedAttempt);
  }

  // Race between attempts and timeout
  return Promise.race([
    Promise.any(tasks),
    timeoutPromise
  ]);
}
