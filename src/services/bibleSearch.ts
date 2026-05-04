import { BibleSearchResult, BibleVerseRecord } from '../types/bible';
import { BIBLE_BOOKS } from '../data/bibleBooks';

export function normalizeKoreanSearchText(text: string): string {
  return text
    .replace(/\s+/g, '')
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()\[\]]/g, '')
    .trim();
}

/**
 * Note: Full Bible search usually requires a pre-built index.
 * For now, we provide the logic to search through a provided array of verses.
 */
export function searchInVerses(
  verses: { bookId: string; bookName: string; chapter: number; verse: number; text: string }[],
  query: string
): BibleSearchResult[] {
  const normalizedQuery = normalizeKoreanSearchText(query);
  if (!normalizedQuery) return [];

  return verses
    .filter((v) => normalizeKoreanSearchText(v.text).includes(normalizedQuery))
    .map((v) => ({
      ref: `${v.bookName} ${v.chapter}:${v.verse}`,
      text: v.text,
      bookId: v.bookId,
      bookName: v.bookName,
      chapter: v.chapter,
      verse: v.verse,
    }));
}

export function highlightKeyword(text: string, keyword: string): string {
  if (!keyword.trim()) return text;
  // If it's a reference search, keyword might be a reference string, which we don't want to highlight in the text
  // unless the text actually contains it. But usually keyword search highlights the keyword.
  // For reference searches, we might not highlight anything or highlight the whole text.
  // Let's check if the keyword is likely a reference.
  const isRef = /^[가-힣a-zA-Z\s]*\s*\d+\s*(?:장|[:：])\s*\d+/.test(keyword);
  if (isRef) return text;

  const parts = text.split(new RegExp(`(${keyword})`, 'gi'));
  return parts
    .map((part) =>
      part.toLowerCase() === keyword.toLowerCase()
        ? `<mark style="background-color: #ffe082; color: #3d3129; padding: 0 2px; border-radius: 4px;">${part}</mark>`
        : part
    )
    .join('');
}

export async function searchBibleVerses(
  query: string, 
  options: { limit?: number; offset?: number } = {}
): Promise<{ items: BibleVerseRecord[]; totalCount: number; hasMore: boolean }> {
  const { loadBibleVerseIndex } = await import('./bibleIndex');
  const index = await loadBibleVerseIndex();
  
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return { items: [], totalCount: 0, hasMore: false };

  const limit = options.limit || 100;
  const offset = options.offset || 0;

  // 1. Check for complex reference search (e.g., "요 1:1-2, 막 1:2-5", "레 3:2-4, 7-9")
  const refRanges = parseMultiReferenceQuery(trimmedQuery);
  if (refRanges) {
    let allMatches: BibleVerseRecord[] = [];
    
    for (const ref of refRanges) {
      const book = BIBLE_BOOKS.find(b => 
        b.name === ref.bookName || b.abbr === ref.bookName || b.id === ref.bookName.toLowerCase()
      );
      
      if (book) {
        const filtered = index.filter(v => 
          v.bookId === book.id && 
          v.chapter === ref.chapter && 
          v.verse >= ref.startVerse && 
          v.verse <= ref.endVerse
        );
        allMatches = [...allMatches, ...filtered];
      }
    }

    if (allMatches.length > 0) {
      // Aggregate results from multiple ranges
      const items = allMatches.slice(offset, offset + limit);
      return { items, totalCount: allMatches.length, hasMore: offset + limit < allMatches.length };
    }
  }

  // 2. Fallback to keyword search
  const normalizedQuery = normalizeKoreanSearchText(trimmedQuery);
  if (!normalizedQuery) return { items: [], totalCount: 0, hasMore: false };

  const filtered = index.filter(v => v.searchText.includes(normalizedQuery));
  
  filtered.sort((a, b) => {
    if (a.bookOrder !== b.bookOrder) return a.bookOrder - b.bookOrder;
    if (a.chapter !== b.chapter) return a.chapter - b.chapter;
    return a.verse - b.verse;
  });

  const items = filtered.slice(offset, offset + limit);
  const totalCount = filtered.length;
  const hasMore = offset + limit < totalCount;

  return { items, totalCount, hasMore };
}

/**
 * Parses complex reference queries like "요 1:2-4, 7-9" or "요 1:1, 막 1:2"
 */
export function parseMultiReferenceQuery(query: string) {
  const parts = query.split(/[,，]/);
  const results: { bookName: string; chapter: number; startVerse: number; endVerse: number }[] = [];
  let lastBook = '';
  let lastChapter = 0;

  for (let part of parts) {
    part = part.trim();
    if (!part) continue;

    // 1. Full pattern: "Book Chapter:Verse-Verse"
    const fullPattern = /^([가-힣a-zA-Z\s]+?)\s*(\d+)\s*(?:장|[:：])\s*(\d+)\s*(?:절)?(?:\s*-\s*(\d+)(?:절)?)?$/;
    const fullMatch = part.replace(/\s+/g, ' ').match(fullPattern);
    if (fullMatch) {
      lastBook = fullMatch[1].trim();
      lastChapter = parseInt(fullMatch[2]);
      const start = parseInt(fullMatch[3]);
      const end = fullMatch[4] ? parseInt(fullMatch[4]) : start;
      results.push({ bookName: lastBook, chapter: lastChapter, startVerse: start, endVerse: end });
      continue;
    }

    // 2. Partial pattern: "Verse-Verse" (inherits book and chapter)
    const versePattern = /^(\d+)\s*(?:절)?(?:\s*-\s*(\d+)(?:절)?)?$/;
    const verseMatch = part.match(versePattern);
    if (verseMatch && lastBook && lastChapter) {
      const start = parseInt(verseMatch[1]);
      const end = verseMatch[2] ? parseInt(verseMatch[2]) : start;
      results.push({ bookName: lastBook, chapter: lastChapter, startVerse: start, endVerse: end });
      continue;
    }

    // 3. Chapter:Verse pattern within multi-parts (optional enhancement)
    const chapVersePattern = /^(\d+)\s*(?:장|[:：])\s*(\d+)\s*(?:절)?(?:\s*-\s*(\d+)(?:절)?)?$/;
    const cvMatch = part.match(chapVersePattern);
    if (cvMatch && lastBook) {
      lastChapter = parseInt(cvMatch[1]);
      const start = parseInt(cvMatch[2]);
      const end = cvMatch[3] ? parseInt(cvMatch[3]) : start;
      results.push({ bookName: lastBook, chapter: lastChapter, startVerse: start, endVerse: end });
      continue;
    }
  }

  return results.length > 0 ? results : null;
}

/**
 * Kept for backward compatibility if needed, though parseMultiReferenceQuery is more powerful.
 */
export function parseReferenceQuery(query: string) {
  const multi = parseMultiReferenceQuery(query);
  return multi ? multi[0] : null;
}

export function formatReference(bookName: string, chapter: number, verseNumbers: number[]): string {
  if (verseNumbers.length === 0) return `${bookName} ${chapter}`;
  if (verseNumbers.length === 1) return `${bookName} ${chapter}:${verseNumbers[0]}`;

  const sorted = [...verseNumbers].sort((a, b) => a - b);
  const ranges: string[] = [];
  let start = sorted[0];
  let end = sorted[0];

  for (let i = 1; i <= sorted.length; i++) {
    if (i < sorted.length && sorted[i] === end + 1) {
      end = sorted[i];
    } else {
      if (start === end) {
        ranges.push(`${start}`);
      } else {
        ranges.push(`${start}-${end}`);
      }
      if (i < sorted.length) {
        start = sorted[i];
        end = sorted[i];
      }
    }
  }

  return `${bookName} ${chapter}:${ranges.join(',')}`;
}
