export interface BibleVerseRecord {
  id: string; // gen-1-1
  bookId: string;
  bookName: string;
  bookOrder: number;
  testament: 'old' | 'new';
  chapter: number;
  verse: number;
  text: string;
  searchText: string;
}

export interface BibleSearchResult {
  ref: string;
  text: string;
  bookId: string;
  bookName: string;
  chapter: number;
  verse: number;
}

export interface SelectedVerseRange {
  bookId: string;
  bookName: string;
  chapter: number;
  startVerse: number;
  endVerse: number;
  text: string;
}

export interface BibleChapterRange {
  bookId: string;
  bookName: string;
  chapterStart: number;
  chapterEnd?: number; // End chapter (optional, default to chapterStart)
}

export interface BibleReadRange {
  label: string;
  ranges: BibleChapterRange[];
  source?: 'reading-plan' | 'search' | 'manual';
  planId?: string;
  day?: number;
}
