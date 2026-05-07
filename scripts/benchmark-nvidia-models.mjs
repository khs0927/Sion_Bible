import { readFile } from 'node:fs/promises';
import {
  DEFAULT_DEEP_MODEL,
  DEFAULT_PRIMARY_FAST_MODEL,
  DEFAULT_QUALITY_MODEL,
  DEFAULT_QUALITY_MODEL_FALLBACK,
  DEFAULT_SECONDARY_FAST_MODEL,
  PREFERRED_NVIDIA_MODELS,
  callNvidiaChat,
  dedupeModels,
  filterLikelyChatModels,
  getNvidiaApiKey,
  listNvidiaModels,
  parseJsonLoose,
  validateVerseDevotion,
} from '../api/_lib/nvidia.js';
import { saveBenchmarkCache } from '../api/_lib/modelSelector.js';

const args = new Set(process.argv.slice(2));
const REQUIRED_PRAYER_ENDING = '우리 주 예수 그리스도의 이름으로 기도드립니다. 아멘.';
const TEST_REF = '요한복음 9:3';
const TEST_TEXT = '예수께서 대답하시되 이 사람이나 그 부모가 죄를 범한 것이 아니라 그에게서 하나님의 하시는 일을 나타내고자 하심이니라';

async function loadDotenv() {
  for (const file of ['.env.local', '.env']) {
    try {
      const raw = await readFile(file, 'utf8');
      raw.split(/\r?\n/).forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;
        const index = trimmed.indexOf('=');
        if (index < 0) return;
        const key = trimmed.slice(0, index).trim();
        const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) process.env[key] = value;
      });
    } catch {
      // optional
    }
  }
}

function benchmarkMessages() {
  return [
    {
      role: 'system',
      content: `너는 한국어 성경앱의 묵상 도우미다. 반드시 JSON만 반환한다. 고난, 질병, 장애를 개인의 죄 때문이라고 단정하지 말고 예수 그리스도의 은혜와 회복의 관점으로 따뜻하게 작성한다. 기도문은 반드시 "${REQUIRED_PRAYER_ENDING}"으로 끝낸다.`,
    },
    {
      role: 'user',
      content: `본문 위치: ${TEST_REF}
본문: ${TEST_TEXT}

반드시 JSON만 반환:
{
  "title": "...",
  "explanation": "...",
  "meditation": "...",
  "prayer": "...",
  "application": ["...", "...", "..."],
  "question": "..."
}`,
    },
  ];
}

function scoreResult(result) {
  let score = 0;
  if (result.validateSuccess) score += 50;
  if (result.latencyMs <= 2000) score += 30;
  else if (result.latencyMs <= 4000) score += 20;
  else if (result.latencyMs <= 7000) score += 10;
  if (result.hasKorean) score += 10;
  if (result.applicationCount >= 3) score += 5;
  if (result.endsWithRequiredPrayerEnding) score += 5;
  if (result.explanationLength < 180) score -= 10;
  if (result.meditationLength < 80) score -= 8;
  if (result.prayerLength < 100) score -= 8;
  if (!result.parseJsonSuccess) score -= 25;
  if (!result.ok) score -= 20;
  if (result.latencyMs > 10000) score -= 20;
  return score;
}

async function benchmarkModel(model, apiKey) {
  const startedAt = Date.now();
  const base = {
    model,
    ok: false,
    statusCode: undefined,
    parseJsonSuccess: false,
    validateSuccess: false,
    hasKorean: false,
    explanationLength: 0,
    meditationLength: 0,
    prayerLength: 0,
    applicationCount: 0,
    questionLength: 0,
    endsWithRequiredPrayerEnding: false,
    latencyMs: 0,
    score: 0,
  };

  try {
    const response = await callNvidiaChat({
      apiKey,
      model,
      messages: benchmarkMessages(),
      temperature: 0.2,
      maxTokens: 1600,
      timeoutMs: 12000,
      responseFormat: { type: 'json_object' },
    });
    const parsed = parseJsonLoose(response.content);
    const validated = validateVerseDevotion(parsed, { ref: TEST_REF, verseText: TEST_TEXT });
    const application = Array.isArray(parsed?.application) ? parsed.application : [];
    const combined = JSON.stringify(parsed);
    const result = {
      ...base,
      ok: true,
      parseJsonSuccess: true,
      validateSuccess: Boolean(validated),
      hasKorean: /[가-힣]/.test(combined),
      explanationLength: String(parsed?.explanation || '').length,
      meditationLength: String(parsed?.meditation || '').length,
      prayerLength: String(parsed?.prayer || '').length,
      applicationCount: application.filter(Boolean).length,
      questionLength: String(parsed?.question || parsed?.reflectionQuestion || '').length,
      endsWithRequiredPrayerEnding: String(validated?.prayer || parsed?.prayer || '').trim().endsWith(REQUIRED_PRAYER_ENDING),
      latencyMs: Date.now() - startedAt,
    };
    result.score = scoreResult(result);
    return result;
  } catch (error) {
    const result = {
      ...base,
      statusCode: error?.statusCode,
      latencyMs: Date.now() - startedAt,
      error: {
        message: error?.message || String(error),
        statusCode: error?.statusCode,
      },
    };
    result.score = scoreResult(result);
    return result;
  }
}

function chooseRecommendations(results) {
  const validPrimary = results
    .filter((item) => item.validateSuccess && item.latencyMs <= 10000)
    .sort((a, b) => b.score - a.score || a.latencyMs - b.latencyMs);
  const validAny = results
    .filter((item) => item.validateSuccess)
    .sort((a, b) => b.score - a.score || a.latencyMs - b.latencyMs);
  const available = results.filter((item) => item.ok).map((item) => item.model);

  const primaryFastModel = validPrimary[0]?.model || available.find((id) => id === DEFAULT_PRIMARY_FAST_MODEL) || DEFAULT_PRIMARY_FAST_MODEL;
  const secondaryFastModel = validPrimary.find((item) => item.model !== primaryFastModel)?.model
    || available.find((id) => id === DEFAULT_SECONDARY_FAST_MODEL && id !== primaryFastModel)
    || DEFAULT_SECONDARY_FAST_MODEL;
  const qualityModel = validAny.find((item) => [
    DEFAULT_QUALITY_MODEL,
    DEFAULT_QUALITY_MODEL_FALLBACK,
    DEFAULT_DEEP_MODEL,
  ].includes(item.model))?.model
    || results
      .filter((item) => item.ok && [
        DEFAULT_QUALITY_MODEL,
        DEFAULT_QUALITY_MODEL_FALLBACK,
        DEFAULT_DEEP_MODEL,
      ].includes(item.model))
      .sort((a, b) => b.score - a.score || a.latencyMs - b.latencyMs)[0]?.model
    || validAny.find((item) => ![primaryFastModel, secondaryFastModel].includes(item.model))?.model
    || available.find((id) => id === DEFAULT_QUALITY_MODEL)
    || available.find((id) => id === DEFAULT_QUALITY_MODEL_FALLBACK)
    || DEFAULT_QUALITY_MODEL_FALLBACK;
  const deepModel = available.find((id) => id === DEFAULT_DEEP_MODEL)
    || available.find((id) => id === DEFAULT_QUALITY_MODEL)
    || DEFAULT_DEEP_MODEL;

  return { primaryFastModel, secondaryFastModel, qualityModel, deepModel };
}

async function main() {
  await loadDotenv();
  const apiKey = getNvidiaApiKey();
  if (!apiKey) {
    console.error('NVIDIA_API_KEY is not configured.');
    process.exitCode = 1;
    return;
  }

  const models = await listNvidiaModels({ apiKey });
  const likelyChatModels = filterLikelyChatModels(models);

  if (args.has('--list')) {
    console.log(JSON.stringify({
      count: models.length,
      likelyChatCount: likelyChatModels.length,
      preferredAvailable: PREFERRED_NVIDIA_MODELS.filter((id) => likelyChatModels.includes(id)),
      models: likelyChatModels,
    }, null, 2));
    return;
  }

  const preferredAvailable = PREFERRED_NVIDIA_MODELS.filter((id) => likelyChatModels.includes(id));
  const extraCandidates = likelyChatModels.filter((id) => !preferredAvailable.includes(id)).slice(0, 12);
  const candidates = dedupeModels([...preferredAvailable, ...extraCandidates]);
  const results = [];

  for (const model of candidates) {
    console.log(`Benchmarking ${model}...`);
    results.push(await benchmarkModel(model, apiKey));
  }

  const recommendations = chooseRecommendations(results);
  const payload = {
    ...recommendations,
    benchmarkedAt: new Date().toISOString(),
    listedModelCount: models.length,
    likelyChatModelCount: likelyChatModels.length,
    benchmarkedModelCount: results.length,
    results: results.sort((a, b) => b.score - a.score || a.latencyMs - b.latencyMs),
  };

  await saveBenchmarkCache(payload);
  console.log(JSON.stringify(payload, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
