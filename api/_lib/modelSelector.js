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
const DEFAULT_TTL_MS = 86_400_000;

let memoryModelCache = null;

function envFlag(value, fallback = true) {
  if (value === undefined) return fallback;
  return !['0', 'false', 'no', 'off'].includes(String(value).toLowerCase());
}

function ttlMs() {
  const parsed = Number(process.env.NVIDIA_MODEL_BENCHMARK_CACHE_TTL_MS || DEFAULT_TTL_MS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TTL_MS;
}

function isFresh(isoDate) {
  const time = Date.parse(isoDate || '');
  return Number.isFinite(time) && Date.now() - time < ttlMs();
}

function compactModels(models) {
  return dedupeModels(models).filter(Boolean);
}

export async function loadBenchmarkCache({ allowStale = false } = {}) {
  if (memoryModelCache && (allowStale || isFresh(memoryModelCache.benchmarkedAt))) return memoryModelCache;
  try {
    const raw = await readFile(BENCHMARK_CACHE_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    if (!allowStale && !isFresh(parsed?.benchmarkedAt)) return null;
    memoryModelCache = parsed;
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
  memoryModelCache = safeCache;
  return safeCache;
}

export function getConfiguredModels() {
  const primaryFastModel = process.env.NVIDIA_PRIMARY_MODEL || '';
  const secondaryFastModel = process.env.NVIDIA_SECONDARY_MODEL || '';
  const qualityModel = process.env.NVIDIA_QUALITY_MODEL || '';
  const deepModel = process.env.NVIDIA_DEEP_MODEL || '';
  return {
    primaryFastModel,
    secondaryFastModel,
    qualityModel,
    deepModel,
  };
}

function chooseFirst(available, candidates, fallback) {
  return candidates.find((model) => available.includes(model)) || fallback;
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

export async function getRecommendedNvidiaModels() {
  const configured = getConfiguredModels();
  const configuredList = compactModels(Object.values(configured));
  if (configuredList.length > 0) {
    return {
      primaryFastModel: configured.primaryFastModel || DEFAULT_PRIMARY_FAST_MODEL,
      secondaryFastModel: configured.secondaryFastModel || DEFAULT_SECONDARY_FAST_MODEL,
      qualityModel: configured.qualityModel || DEFAULT_QUALITY_MODEL,
      deepModel: configured.deepModel || DEFAULT_DEEP_MODEL,
      source: 'env',
    };
  }

  const benchmark = await loadBenchmarkCache();
  const benchmarkModels = modelsFromBenchmark(benchmark);
  if (compactModels(Object.values(benchmarkModels)).length > 0) {
    return { ...benchmarkModels, source: 'benchmark-cache' };
  }

  if (envFlag(process.env.NVIDIA_MODEL_DISCOVERY, true)) {
    try {
      const discovered = filterLikelyChatModels(await listNvidiaModels());
      const available = discovered.length > 0 ? discovered : PREFERRED_NVIDIA_MODELS;
      return {
        primaryFastModel: chooseFirst(available, [
          DEFAULT_PRIMARY_FAST_MODEL,
          DEFAULT_SECONDARY_FAST_MODEL,
          'meta/llama-3.1-8b-instruct',
        ], DEFAULT_PRIMARY_FAST_MODEL),
        secondaryFastModel: chooseFirst(available, [
          DEFAULT_SECONDARY_FAST_MODEL,
          'qwen/qwen3.5-122b-a10b',
          DEFAULT_PRIMARY_FAST_MODEL,
        ], DEFAULT_SECONDARY_FAST_MODEL),
        qualityModel: chooseFirst(available, [
          DEFAULT_QUALITY_MODEL,
          DEFAULT_QUALITY_MODEL_FALLBACK,
          DEFAULT_DEEP_MODEL,
        ], DEFAULT_QUALITY_MODEL_FALLBACK),
        deepModel: chooseFirst(available, [
          DEFAULT_DEEP_MODEL,
          DEFAULT_QUALITY_MODEL,
        ], DEFAULT_DEEP_MODEL),
        source: 'discovery',
        discoveredModels: discovered,
      };
    } catch (error) {
      console.warn('NVIDIA model discovery failed:', error?.message || error);
    }
  }

  return {
    primaryFastModel: DEFAULT_PRIMARY_FAST_MODEL,
    secondaryFastModel: DEFAULT_SECONDARY_FAST_MODEL,
    qualityModel: DEFAULT_QUALITY_MODEL,
    deepModel: DEFAULT_DEEP_MODEL,
    source: 'defaults',
  };
}

export async function resolveNvidiaModelsForVerseDevotion() {
  const recommended = await getRecommendedNvidiaModels();
  const primaryFastModel = recommended.primaryFastModel || DEFAULT_PRIMARY_FAST_MODEL;
  const secondaryFastModel = recommended.secondaryFastModel || DEFAULT_SECONDARY_FAST_MODEL;
  const qualityModel = recommended.qualityModel || DEFAULT_QUALITY_MODEL_FALLBACK;
  const deepModel = recommended.deepModel || DEFAULT_DEEP_MODEL;
  const modelsForRace = compactModels([qualityModel, primaryFastModel, secondaryFastModel]);

  return {
    ...recommended,
    primaryFastModel,
    secondaryFastModel,
    qualityModel,
    deepModel,
    modelsForRace,
  };
}
