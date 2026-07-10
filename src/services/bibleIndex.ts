import type { BibleVerseRecord } from '../types/bible';

let bibleIndex: BibleVerseRecord[] | null = null;
let loadingPromise: Promise<BibleVerseRecord[]> | null = null;

function verseKey(verse: Pick<BibleVerseRecord, 'bookId' | 'chapter' | 'verse'>) {
  return `${verse.bookId}-${verse.chapter}-${verse.verse}`;
}

function sortBibleIndex(index: BibleVerseRecord[]) {
  return index.sort((left, right) => {
    if (left.bookOrder !== right.bookOrder) return left.bookOrder - right.bookOrder;
    if (left.chapter !== right.chapter) return left.chapter - right.chapter;
    return left.verse - right.verse;
  });
}

function mergeBibleIndex(base: BibleVerseRecord[], patches: BibleVerseRecord[]) {
  const map = new Map<string, BibleVerseRecord>();
  base.forEach((verse) => map.set(verseKey(verse), verse));
  patches.forEach((verse) => map.set(verseKey(verse), verse));
  return sortBibleIndex(Array.from(map.values()));
}

function findInternalGaps(index: BibleVerseRecord[]) {
  const chapters = new Map<string, number[]>();
  index.forEach((verse) => {
    const key = `${verse.bookId}-${verse.chapter}`;
    chapters.set(key, [...(chapters.get(key) || []), verse.verse]);
  });

  const gaps: string[] = [];
  chapters.forEach((numbers, key) => {
    const unique = [...new Set(numbers)].sort((left, right) => left - right);
    const maximum = unique.length > 0 ? unique[unique.length - 1] : 0;
    const present = new Set(unique);
    for (let verse = 1; verse <= maximum; verse += 1) {
      if (!present.has(verse)) gaps.push(`${key}-${verse}`);
    }
  });
  return gaps;
}

async function fetchJson<T>(path: string, required: boolean): Promise<T> {
  const response = await fetch(path, { cache: 'no-store' });
  if (!response.ok) {
    if (required) throw new Error(`Failed to load ${path}: ${response.status}`);
    return [] as T;
  }
  return response.json() as Promise<T>;
}

async function loadIndex() {
  try {
    const [base, patches] = await Promise.all([
      fetchJson<BibleVerseRecord[]>('/bible/korean-bible-index.json', true),
      fetchJson<BibleVerseRecord[]>('/bible/korean-bible-patches.json', false),
    ]);
    const merged = mergeBibleIndex(base, patches);

    if (merged.length < 30_000) {
      console.warn(`[Sion Bible] Unexpected Bible verse count: ${merged.length}`);
    }
    const gaps = findInternalGaps(merged);
    if (gaps.length > 0) {
      console.warn(`[Sion Bible] Bible index has ${gaps.length} internal verse gaps.`, gaps.slice(0, 20));
    }

    bibleIndex = merged;
    return merged;
  } catch (error) {
    console.error('[Sion Bible] Failed to load Bible index:', error);
    const patches = await fetchJson<BibleVerseRecord[]>('/bible/korean-bible-patches.json', false).catch(() => []);
    bibleIndex = sortBibleIndex(patches);
    return bibleIndex;
  } finally {
    loadingPromise = null;
  }
}

export async function loadBibleVerseIndex(): Promise<BibleVerseRecord[]> {
  if (bibleIndex) return bibleIndex;
  if (!loadingPromise) loadingPromise = loadIndex();
  return loadingPromise;
}

export async function getBibleIndexMeta() {
  try {
    const response = await fetch('/bible/korean-bible-meta.json', { cache: 'no-store' });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

export function getCachedBibleIndex(): BibleVerseRecord[] | null {
  return bibleIndex;
}

export function clearBibleIndexCache() {
  bibleIndex = null;
  loadingPromise = null;
}
