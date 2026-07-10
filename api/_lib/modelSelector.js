import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import {
  DEFAULT_DEEP_MODEL,
  DEFAULT_PRIMARY_FAST_MODEL,
  DEFAULT_QUALITY_MODEL,
  DEFAULT_QUALITY_MODEL_FALLBACK,
  DEFAULT_SECONDARY_FAST_MODEL,
  PREFERRED_NVIDIA_MODELS,
  dedupeModels,
  filterLikelyChatModels,
  listNvidiaModels,
} from './nvidia.js';

const BENCHMARK_CACHE_PATH = resolve(process.cwd(), 'data/generated/nvidia-model-benchmarks.json');
const DEFAULT_BENCHMARK_TTL_MS = 86_400_000;
const DEFAULT_DISCOVERY_TTL_MS = 21_600_000;

let memoryBenchmarkCache = null;
let recommendedModelCache = null;

function positiveNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function envFlag(value, fallback = true) {
  if (value === undefined) return fallback;
  return !['0', 'false', 'no', 'off'].includes(String(value).toLowerCase());
}

function benchmarkTtlMs() {
  return positiveNumber(process.env.NVIDIA_MODEL_BENCHMARK_CACHE_TTL_MS, DEFAULT_BENCHMARK_TTL_MS);
}

function discoveryTtlMs() {
  return positiveNumber(process.env.NVIDIA_MODEL_DISCOVERY_CACHE_TTL_MS, DEFAULT_DISCOVERY_TTL_MS);
}

function isFresh(isoDate, ttl = benchmarkTtlMs()) {
  const time = Date.parse(isoDate || '');
  return Number.isFinite(time) && Date.now() - time < ttl;
}

function compactModels(models) {
  return dedupeModels(models).filter(Boolean);
}

function withCache(result) {
  recommendedModelCache = {
    value: result,
    expiresAt: Date.now() + discoveryTtlMs(),
  };
  return result;
}

export async function loadBenchmarkCache({ allowStale = false } = {}) {
  if (memoryBenchmarkCache && (allowStale || isFresh(memoryBenchmarkCache.benchmarkedAt))) {
    return memoryBenchmarkCache;
  }

  try {
    const raw = await readFile(BENCHMARK_CACHE_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    if (!allowStale && !isFresh(parsed?.benchmarkedAt)) return null;
    memoryBenchmarkCache = parsed;
    return parsed;
  } catch {
    return null;
  }
}

export async function saveBenchmarkCache(cache) {
  await mkdir(dirname(BENCHMARK_CACHE_PATH), { recursive: true });
  const safeCache = { ...cache };
  delete safeCache.apiKey;
  await writeFile(BENCHMARK_CACHE_PATH, `${JSON.stringify(safeCache, null, 2)}\n`, 'utf8');
  memoryBenchmarkCache = safeCache;
  recommendedModelCache = null;
  return safeCache;
}

export function getConfiguredModels() {
  return {
    primaryFastModel: process.env.NVIDIA_PRIMARY_MODEL || process.env.NVIDIA_FAST_MODEL_1 || '',
    secondaryFastModel: process.env.NVIDIA_SECONDARY_MODEL || process.env.NVIDIA_FAST_MODEL_2 || '',
    qualityModel: process.env.NVIDIA_QUALITY_MODEL || process.env.NVIDIA_MODEL || '',
    deepModel: process.env.NVIDIA_DEEP_MODEL || '',
  };
}

function chooseFirst(available, candidates, fallback) {
  return candidates.find((model) => model && available.includes(model)) || fallback;
}

function modelsFromBenchmark(cache) {
  if (!cache) return {};
  return {
    primaryFastModel: cache.primaryFastModel,
    secondaryFastModel: cache.secondaryFastModel,
    qualityModel: cache.qualityModel,
    deepModel: cache.deepModel,
  };
}

function normalizeRecommendation(recommended, source) {
  return {
    primaryFastModel: recommended.primaryFastModel || DEFAULT_PRIMARY_FAST_MODEL,
    secondaryFastModel: recommended.secondaryFastModel || DEFAULT_SECONDARY_FAST_MODEL,
    qualityModel: recommended.qualityModel || DEFAULT_QUALITY_MODEL_FALLBACK,
    deepModel: recommended.deepModel || DEFAULT_DEEP_MODEL,
    source,
    ...(recommended.discoveredModels ? { discoveredModels: recommended.discoveredModels } : {}),
  };
}

export async function getRecommendedNvidiaModels({ forceRefresh = false } = {}) {
  const configured = getConfiguredModels();
  if (compactModels(Object.values(configured)).length > 0) {
    return normalizeRecommendation(configured, 'env');
  }

  if (!forceRefresh && recommendedModelCache && recommendedModelCache.expiresAt > Date.now()) {
    return recommendedModelCache.value;
  }

  const benchmark = await loadBenchmarkCache();
  const benchmarkModels = modelsFromBenchmark(benchmark);
  if (compactModels(Object.values(benchmarkModels)).length > 0) {
    return withCache(normalizeRecommendation(benchmarkModels, 'benchmark-cache'));
  }

  if (envFlag(process.env.NVIDIA_MODEL_DISCOVERY, true)) {
    try {
      const discovered = filterLikelyChatModels(await listNvidiaModels());
      const available = discovered.length > 0 ? discovered : PREFERRED_NVIDIA_MODELS;
      const recommendation = {
        primaryFastModel: chooseFirst(available, [
          'openai/gpt-oss-20b',
          'meta/llama-3.1-8b-instruct',
          DEFAULT_PRIMARY_FAST_MODEL,
        ], DEFAULT_PRIMARY_FAST_MODEL),
        secondaryFastModel: chooseFirst(available, [
          'qwen/qwen3.5-122b-a10b',
          'openai/gpt-oss-20b',
          DEFAULT_SECONDARY_FAST_MODEL,
        ], DEFAULT_SECONDARY_FAST_MODEL),
        qualityModel: chooseFirst(available, [
          'qwen/qwen3.5-397b-a17b',
          'openai/gpt-oss-120b',
          DEFAULT_QUALITY_MODEL,
          DEFAULT_QUALITY_MODEL_FALLBACK,
        ], DEFAULT_QUALITY_MODEL_FALLBACK),
        deepModel: chooseFirst(available, [
          'openai/gpt-oss-120b',
          'qwen/qwen3.5-397b-a17b',
          DEFAULT_DEEP_MODEL,
        ], DEFAULT_DEEP_MODEL),
        discoveredModels: discovered,
      };
      return withCache(normalizeRecommendation(recommendation, 'discovery'));
    } catch (error) {
      console.warn('NVIDIA model discovery failed:', error?.message || error);
    }
  }

  return withCache(normalizeRecommendation({}, 'defaults'));
}

export async function resolveNvidiaModelsForVerseDevotion() {
  const recommended = await getRecommendedNvidiaModels();
  const modelsForRace = compactModels([
    recommended.qualityModel,
    recommended.primaryFastModel,
    recommended.secondaryFastModel,
  ]);

  return {
    ...recommended,
    modelsForRace,
  };
}
