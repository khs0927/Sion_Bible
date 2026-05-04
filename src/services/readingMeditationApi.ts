import { BIBLE_BOOKS } from '../data/bibleBooks';
import { formatReadingReference } from '../data/readingPlans';
import type { ReadingDayTask, ReadingReference } from '../types/readingPlan';

export interface ChapterMeditation {
  chapterTitle: string;
  summary: string;
  meditation: string;
  application: string;
}

export interface ReadingMeditationResult {
  title: string;
  overview: string;
  chapters: ChapterMeditation[];
  sermon: {
    title: string;
    body: string;
  };
  applications: string[];
  prayer: string;
  model?: string;
  models?: Record<string, unknown>;
}

const CACHE_PREFIX = 'sion_reading_meditation_';
const MAX_CLIENT_TEXT_LENGTH = 28000;

export function getReadingPassageTitle(task: ReadingDayTask) {
  return task.references.map(formatReadingReference).join(', ');
}

export function getReadingMeditationCacheKey(passageTitle: string, chaptersText: string) {
  return `${CACHE_PREFIX}${hashString(`${passageTitle}:${chaptersText.length}:${chaptersText.slice(0, 600)}`)}`;
}

export function readCachedReadingMeditation(cacheKey: string): ReadingMeditationResult | null {
  try {
    const raw = localStorage.getItem(cacheKey);
    return raw ? (JSON.parse(raw) as ReadingMeditationResult) : null;
  } catch {
    return null;
  }
}

export function saveCachedReadingMeditation(cacheKey: string, result: ReadingMeditationResult) {
  localStorage.setItem(cacheKey, JSON.stringify(result));
}

export async function buildReadingChaptersText(task: ReadingDayTask) {
  const chunks: string[] = [];
  for (const reference of task.references) {
    chunks.push(await fetchReferenceText(reference));
  }
  const chaptersText = chunks.join('\n\n');
  if (chaptersText.length > MAX_CLIENT_TEXT_LENGTH) {
    throw new Error(`본문이 너무 깁니다. ${MAX_CLIENT_TEXT_LENGTH}자 이하의 통독 범위로 다시 시도해주세요.`);
  }
  return chaptersText;
}

export async function generateReadingMeditation({
  passageTitle,
  chaptersText,
  force = false,
}: {
  passageTitle: string;
  chaptersText: string;
  force?: boolean;
}) {
  if (!passageTitle || !chaptersText) throw new Error('통독 본문 제목과 본문 내용이 필요합니다.');
  if (chaptersText.length > MAX_CLIENT_TEXT_LENGTH) {
    throw new Error(`본문이 너무 깁니다. ${MAX_CLIENT_TEXT_LENGTH}자 이하의 통독 범위로 다시 시도해주세요.`);
  }

  const cacheKey = getReadingMeditationCacheKey(passageTitle, chaptersText);
  if (!force) {
    const cached = readCachedReadingMeditation(cacheKey);
    if (cached) return { result: cached, cacheKey, fromCache: true };
  }

  const response = await fetch('/api/reading-meditation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ passageTitle, chaptersText }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = data?.detail ? `\n${data.detail}` : '';
    throw new Error(`${data?.error ?? '통독 묵상 생성에 실패했습니다.'}${detail}`);
  }

  const result = data as ReadingMeditationResult;
  saveCachedReadingMeditation(cacheKey, result);
  return { result, cacheKey, fromCache: false };
}

async function fetchReferenceText(reference: ReadingReference) {
  const book = BIBLE_BOOKS.find((item) => item.id === reference.bookId);
  if (!book) throw new Error(`${reference.bookName} 정보를 찾을 수 없습니다.`);
  const endChapter = reference.endChapter ?? reference.startChapter;
  const chapterTexts: string[] = [];

  for (let chapter = reference.startChapter; chapter <= endChapter; chapter += 1) {
    const response = await fetch(`https://api.getbible.net/v2/korean/${book.number}/${chapter}.json`, { mode: 'cors' });
    if (!response.ok) throw new Error(`${reference.bookName} ${chapter}장을 불러오지 못했습니다.`);
    const data = await response.json();
    const verses = Array.isArray(data?.verses) ? data.verses : [];
    const text = verses
      .map((verse: { verse?: number; text?: string }) => `${verse.verse ?? ''}. ${cleanText(verse.text ?? '')}`.trim())
      .join(' ');
    chapterTexts.push(`[${reference.bookName} ${chapter}장]\n${text}`);
  }

  return chapterTexts.join('\n\n');
}

function cleanText(value: string) {
  return value.replace(/\s+/g, ' ').replace(/\[[^\]]*\]/g, '').trim();
}

function hashString(value: string) {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index);
  }
  return (hash >>> 0).toString(36);
}
