import { hedgedGeminiRace } from './gemini.js';
import { parseJsonLoose } from './nvidia.js';

const FAST_MODELS = ['gemini-3.5-flash', 'gemini-3.7-flash'];

export async function raceGeminiFast({
  messages,
  validate,
  temperature = 0.15,
  maxTokens = 1000,
  timeoutMs = 7000,
  delaysMs = [0, 1400],
}) {
  return hedgedGeminiRace({
    models: FAST_MODELS,
    delaysMs,
    messages,
    temperature,
    maxTokens,
    timeoutMs,
    validate: async (response) => {
      const parsed = response ? parseJsonLoose(response.content) : null;
      return validate ? validate(parsed, response) : parsed;
    },
  });
}

export { FAST_MODELS as GEMINI_FAST_MODELS };
