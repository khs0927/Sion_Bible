import { DEFAULT_FAST_MODEL_1, DEFAULT_FAST_MODEL_2, DEFAULT_QUALITY_MODEL, getNvidiaApiKey } from './_lib/nvidia.js';

export default async function handler(req, res) {
  const apiKey = getNvidiaApiKey();
  
  res.status(200).json({
    ok: true,
    runtime: "vercel-function",
    env: {
      hasNvidiaKey: !!apiKey,
      fastModel1: process.env.NVIDIA_FAST_MODEL_1 || DEFAULT_FAST_MODEL_1,
      fastModel2: process.env.NVIDIA_FAST_MODEL_2 || DEFAULT_FAST_MODEL_2,
      defaultModel: process.env.NVIDIA_MODEL || DEFAULT_QUALITY_MODEL
    }
  });
}
