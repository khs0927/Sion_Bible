import { getNvidiaApiKey } from '../api/_lib/nvidia.js';
import { hedgedNvidiaRace } from '../api/_lib/hedgedAiRace.js';
import { callGeminiChat } from '../api/_lib/gemini.js';

console.log('Imports successful');
console.log('NVIDIA_API_KEY configured:', !!getNvidiaApiKey());
