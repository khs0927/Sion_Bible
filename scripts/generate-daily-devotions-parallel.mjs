import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DEFAULT_FAST_MODEL_1,
  DEFAULT_FAST_MODEL_2,
} from '../api/_lib/nvidia.js';
import { raceNvidiaModels } from '../api/_lib/raceNvidiaModels.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const versesPath = path.join(root, 'src/data/verses.ts');
const outPath = path.join(root, 'src/data/generated/dailyDevotions.generated.ts');
const concurrency = 3;

await loadEnvLocal();

const apiKey = process.env.NVIDIA_API_KEY;
if (!apiKey) {
  throw new Error('NVIDIA_API_KEY is required in .env.local or the shell environment.');
}

const models = [
  process.env.NVIDIA_FAST_MODEL_1 || DEFAULT_FAST_MODEL_1,
  process.env.NVIDIA_FAST_MODEL_2 || DEFAULT_FAST_MODEL_2,
];

const source = await fs.readFile(versesPath, 'utf8');
const verses = extractVerses(source);
const results = {};

await runWithConcurrency(verses, concurrency, async (verse) => {
  const ref = `${verse.book} ${verse.chapter}:${verse.verse}`;
  console.log(`Generating ${ref}`);
  const winner = await raceNvidiaModels({
    apiKey,
    models,
    messages: buildMessages(ref, verse.content),
    validate: validateDevotion,
    maxTokens: 650,
    temperature: 0.35,
  });
  results[ref] = winner.result;
});

await fs.mkdir(path.dirname(outPath), { recursive: true });
await fs.writeFile(outPath, renderGeneratedFile(results), 'utf8');
console.log(`Wrote ${Object.keys(results).length} devotions to ${path.relative(root, outPath)}`);

function extractVerses(text) {
  const blocks = [...text.matchAll(/\{\s*id:\s*\d+,[\s\S]*?\n\s*\}/g)].map((match) => match[0]);
  return blocks.map((block) => ({
    book: readProp(block, 'book'),
    chapter: readProp(block, 'chapter'),
    verse: readProp(block, 'verse'),
    content: readProp(block, 'content'),
  })).filter((verse) => verse.book && verse.chapter && verse.verse && verse.content);
}

function readProp(block, name) {
  const match = block.match(new RegExp(`${name}:\\s*'([\\s\\S]*?)',`));
  return match?.[1]?.replace(/\\'/g, "'").trim() ?? '';
}

function buildMessages(ref, verseText) {
  return [
    {
      role: 'system',
      content: '너는 한국어 성경 묵상과 기도문을 돕는 목회적 글쓰기 도우미다. JSON만 반환하고 본문에 없는 내용을 억지로 만들지 않는다.',
    },
    {
      role: 'user',
      content: [
        '홈 화면에서 즉시 보여줄 짧은 devotional JSON을 작성해줘.',
        '따뜻하고 경건한 한국어로 쓰고, 본문 범위를 벗어나지 마.',
        'JSON 형식: {"title":"묵상 제목","meditation":"묵상 내용","prayer":"기도문","application":"오늘 적용 한 가지"}',
        `구절: ${ref}`,
        `본문: ${verseText}`,
      ].join('\n\n'),
    },
  ];
}

function validateDevotion(parsed, model) {
  const title = String(parsed?.title ?? '').trim();
  const meditation = String(parsed?.meditation ?? '').trim();
  const prayer = String(parsed?.prayer ?? '').trim();
  if (!title || !meditation || !prayer) return null;
  return {
    title,
    meditation,
    prayer,
    application: String(parsed?.application ?? '').trim(),
    model,
  };
}

async function runWithConcurrency(items, limit, worker) {
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      await worker(items[index], index);
    }
  });
  await Promise.all(workers);
}

async function loadEnvLocal() {
  const envPath = path.join(root, '.env.local');
  try {
    const env = await fs.readFile(envPath, 'utf8');
    for (const line of env.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const [key, ...rest] = trimmed.split('=');
      if (!key || process.env[key]) continue;
      process.env[key] = rest.join('=').trim();
    }
  } catch {
    // .env.local is optional when variables are supplied by the shell.
  }
}

function renderGeneratedFile(data) {
  return [
    "import type { VerseDevotionResult } from '../../services/verseDevotionApi';",
    '',
    `export const DAILY_DEVOTIONS: Record<string, VerseDevotionResult> = ${JSON.stringify(data, null, 2)};`,
    '',
  ].join('\n');
}
