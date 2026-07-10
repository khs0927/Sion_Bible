import type { BibleSearchResult, BibleVerseRecord } from '../types/bible';
import { BIBLE_BOOKS } from '../data/bibleBooks';

export function normalizeKoreanSearchText(text: string): string {
  return String(text || '')
    .normalize('NFC')
    .replace(/\s+/g, '')
    .replace(/[.,/#!$%^&*;:{}=\-_`~()[\]<>?"'“”‘’·…]/g, '')
    .trim()
    .toLowerCase();
}

export function searchInVerses(
  verses: { bookId: string; bookName: string; chapter: number; verse: number; text: string }[],
  query: string,
): BibleSearchResult[] {
  const normalizedQuery = normalizeKoreanSearchText(query);
  if (!normalizedQuery) return [];

  return verses
    .filter((verse) => normalizeKoreanSearchText(verse.text).includes(normalizedQuery))
    .map((verse) => ({
      ref: `${verse.bookName} ${verse.chapter}:${verse.verse}`,
      text: verse.text,
      bookId: verse.bookId,
      bookName: verse.bookName,
      chapter: verse.chapter,
      verse: verse.verse,
    }));
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function highlightKeyword(text: string, keyword: string): string {
  const safeText = escapeHtml(text);
  const trimmedKeyword = keyword.trim();
  if (!trimmedKeyword) return safeText;

  const isReference = /^[가-힣a-zA-Z\s]*\s*\d+\s*(?:장|[:：])\s*\d+/.test(trimmedKeyword);
  if (isReference) return safeText;

  const pattern = escapeRegExp(trimmedKeyword);
  if (!pattern) return safeText;
  return safeText.replace(
    new RegExp(`(${pattern})`, 'gi'),
    '<mark style="background-color:#ffe082;color:#3d3129;padding:0 2px;border-radius:4px">$1</mark>',
  );
}

function resolveBook(input: string) {
  const normalized = input.trim().toLowerCase();
  return BIBLE_BOOKS.find((book) =>
    book.name === input.trim()
    || book.abbr === input.trim()
    || book.id.toLowerCase() === normalized,
  );
}

function uniqueVerses(verses: BibleVerseRecord[]) {
  const seen = new Set<string>();
  return verses.filter((verse) => {
    if (seen.has(verse.id)) return false;
    seen.add(verse.id);
    return true;
  });
}

export async function searchBibleVerses(
  query: string,
  options: { limit?: number; offset?: number } = {},
): Promise<{ items: BibleVerseRecord[]; totalCount: number; hasMore: boolean }> {
  const { loadBibleVerseIndex } = await import('./bibleIndex');
  const index = await loadBibleVerseIndex();
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return { items: [], totalCount: 0, hasMore: false };

  const limit = Math.max(1, Math.min(options.limit || 100, 500));
  const offset = Math.max(0, options.offset || 0);
  const referenceRanges = parseMultiReferenceQuery(trimmedQuery);

  if (referenceRanges) {
    const matches: BibleVerseRecord[] = [];
    for (const reference of referenceRanges) {
      const book = resolveBook(reference.bookName);
      if (!book || reference.chapter < 1 || reference.chapter > book.chapters) continue;
      matches.push(...index.filter((verse) =>
        verse.bookId === book.id
        && verse.chapter === reference.chapter
        && verse.verse >= reference.startVerse
        && verse.verse <= reference.endVerse,
      ));
    }

    const uniqueMatches = uniqueVerses(matches);
    if (uniqueMatches.length > 0) {
      return {
        items: uniqueMatches.slice(offset, offset + limit),
        totalCount: uniqueMatches.length,
        hasMore: offset + limit < uniqueMatches.length,
      };
    }
  }

  const normalizedQuery = normalizeKoreanSearchText(trimmedQuery);
  if (!normalizedQuery) return { items: [], totalCount: 0, hasMore: false };

  const filtered = index
    .filter((verse) => normalizeKoreanSearchText(verse.searchText || verse.text).includes(normalizedQuery))
    .sort((left, right) => {
      if (left.bookOrder !== right.bookOrder) return left.bookOrder - right.bookOrder;
      if (left.chapter !== right.chapter) return left.chapter - right.chapter;
      return left.verse - right.verse;
    });

  return {
    items: filtered.slice(offset, offset + limit),
    totalCount: filtered.length,
    hasMore: offset + limit < filtered.length,
  };
}

export function parseMultiReferenceQuery(query: string) {
  const parts = query.split(/[,，]/);
  const results: { bookName: string; chapter: number; startVerse: number; endVerse: number }[] = [];
  let lastBook = '';
  let lastChapter = 0;

  for (const rawPart of parts) {
    const part = rawPart.trim();
    if (!part) continue;

    const fullPattern = /^([가-힣a-zA-Z\s]+?)\s*(\d+)\s*(?:장|[:：])\s*(\d+)\s*(?:절)?(?:\s*[-~–]\s*(\d+)(?:절)?)?$/;
    const fullMatch = part.replace(/\s+/g, ' ').match(fullPattern);
    if (fullMatch) {
      lastBook = fullMatch[1].trim();
      lastChapter = Number.parseInt(fullMatch[2], 10);
      const first = Number.parseInt(fullMatch[3], 10);
      const second = fullMatch[4] ? Number.parseInt(fullMatch[4], 10) : first;
      results.push({
        bookName: lastBook,
        chapter: lastChapter,
        startVerse: Math.min(first, second),
        endVerse: Math.max(first, second),
      });
      continue;
    }

    const versePattern = /^(\d+)\s*(?:절)?(?:\s*[-~–]\s*(\d+)(?:절)?)?$/;
    const verseMatch = part.match(versePattern);
    if (verseMatch && lastBook && lastChapter) {
      const first = Number.parseInt(verseMatch[1], 10);
      const second = verseMatch[2] ? Number.parseInt(verseMatch[2], 10) : first;
      results.push({
        bookName: lastBook,
        chapter: lastChapter,
        startVerse: Math.min(first, second),
        endVerse: Math.max(first, second),
      });
      continue;
    }

    const chapterVersePattern = /^(\d+)\s*(?:장|[:：])\s*(\d+)\s*(?:절)?(?:\s*[-~–]\s*(\d+)(?:절)?)?$/;
    const chapterVerseMatch = part.match(chapterVersePattern);
    if (chapterVerseMatch && lastBook) {
      lastChapter = Number.parseInt(chapterVerseMatch[1], 10);
      const first = Number.parseInt(chapterVerseMatch[2], 10);
      const second = chapterVerseMatch[3] ? Number.parseInt(chapterVerseMatch[3], 10) : first;
      results.push({
        bookName: lastBook,
        chapter: lastChapter,
        startVerse: Math.min(first, second),
        endVerse: Math.max(first, second),
      });
    }
  }

  return results.length > 0 ? results : null;
}

export function parseReferenceQuery(query: string) {
  const multi = parseMultiReferenceQuery(query);
  return multi ? multi[0] : null;
}

export function formatReference(bookName: string, chapter: number, verseNumbers: number[]): string {
  if (verseNumbers.length === 0) return `${bookName} ${chapter}`;
  const sorted = [...new Set(verseNumbers)].sort((left, right) => left - right);
  if (sorted.length === 1) return `${bookName} ${chapter}:${sorted[0]}`;

  const ranges: string[] = [];
  let start = sorted[0];
  let end = sorted[0];
  for (let index = 1; index <= sorted.length; index += 1) {
    if (index < sorted.length && sorted[index] === end + 1) {
      end = sorted[index];
      continue;
    }
    ranges.push(start === end ? `${start}` : `${start}-${end}`);
    if (index < sorted.length) {
      start = sorted[index];
      end = sorted[index];
    }
  }
  return `${bookName} ${chapter}:${ranges.join(',')}`;
}
