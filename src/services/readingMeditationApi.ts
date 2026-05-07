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

const CLIENT_FALLBACK: ReadingMeditationResult = {
  title: '통독 말씀과 함께하는 묵상',
  overview: '오늘 읽은 성경 본문은 하나님의 주권과 우리를 향한 계획을 보여줍니다. 말씀을 차근차근 읽으며 그 속에 담긴 영적 교훈을 발견해 보시기 바랍니다.',
  chapters: [],
  sermon: {
    title: '생명의 양식인 하나님의 말씀',
    body: '성경 통독은 단순히 글자를 읽는 행위를 넘어, 하나님의 마음을 알아가는 귀한 시간입니다. 오늘 우리가 마주한 말씀들이 우리 삶의 등불이 되고 발의 빛이 되기를 소망합니다. 본문을 다시 한번 조용히 묵상하며, 주님께서 오늘 나에게 개인적으로 주시는 세미한 음성에 귀를 기울여 보십시오.',
  },
  applications: [
    '오늘 읽은 본문 중 가장 마음에 와닿는 구절 하나를 선택해 암송해 보기',
    '말씀을 통해 깨달은 하나님의 성품 한 가지를 묵상하고 감사 기도하기',
    '깨달은 말씀을 오늘 하루의 삶 속에서 어떻게 실천할지 구체적으로 적어보기',
  ],
  prayer: '사랑의 하나님, 오늘도 귀한 생명의 말씀을 허락해 주심에 감사합니다. 읽은 말씀이 제 머리에만 머물지 않고 가슴으로 내려와 삶의 변화를 일으키게 하옵소서. 말씀이 가르치는 대로 순종하며 살아갈 힘을 주시고, 매일의 통독을 통해 주님과 더 깊이 교제하게 하옵소서. 우리 주 예수 그리스도의 이름으로 기도드립니다. 아멘.',
};

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

  try {
    const response = await fetch('/api/reading-meditation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passageTitle, chaptersText }),
    });
    
    if (!response.ok) {
      return { result: CLIENT_FALLBACK, cacheKey, fromCache: false, isFallback: true };
    }
    
    const data = await response.json();
    const result = data as ReadingMeditationResult;
    saveCachedReadingMeditation(cacheKey, result);
    return { result, cacheKey, fromCache: false };
  } catch (err) {
    console.error('Failed to generate reading meditation:', err);
    return { result: CLIENT_FALLBACK, cacheKey, fromCache: false, isFallback: true };
  }
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
