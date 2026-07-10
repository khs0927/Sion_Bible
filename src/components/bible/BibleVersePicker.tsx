import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { type BibleBook } from '../../data/bibleBooks';
import { loadBibleVerseIndex } from '../../services/bibleIndex';
import { sanitizeScriptureText } from '../../utils/textUtils';
import { BibleBookChapterSelector } from './BibleBookChapterSelector';
import { BibleVerseSelectableList } from './BibleVerseSelectableList';

interface Verse {
  verse: number;
  text: string;
}

interface ReadSelectedVerse {
  ref: string;
  text: string;
  verse: number;
}

type RangeChapter = {
  bookName: string;
  chapter: number;
  verses: Verse[];
};

interface BibleVersePickerProps {
  mode: 'read' | 'select';
  initialBook: BibleBook;
  initialChapter: number;
  onSelectVerses?: (data: {
    bookId: string;
    bookName: string;
    chapter: number;
    verses: { verse: number; text: string }[];
  }) => void;
  onVerseClick?: (verse: { ref: string; text: string }) => void;
  fontSize?: string;
  onToggleSave?: (verse: { ref: string; text: string }) => void;
  isSaved?: (ref: string) => boolean;
  onCopy?: (text: string) => void;
  readingRange?: import('../../types/bible').BibleReadRange | null;
  onExitRange?: () => void;
  onNavigate?: (book: BibleBook, chapter: number) => void;
  readSelectionMode?: boolean;
  readSelectionResetKey?: number;
  onReadSelectionChange?: (verses: ReadSelectedVerse[]) => void;
}

function formatVerseRange(numbers: number[]) {
  const sorted = [...new Set(numbers)].sort((a, b) => a - b);
  const ranges: string[] = [];

  for (let index = 0; index < sorted.length; index += 1) {
    const start = sorted[index];
    let end = start;
    while (sorted[index + 1] === end + 1) {
      index += 1;
      end = sorted[index];
    }
    ranges.push(start === end ? String(start) : `${start}-${end}`);
  }
  return ranges.join(', ');
}

function rangeVerseKey(bookName: string, chapter: number, verse: number) {
  return `${bookName}|${chapter}|${verse}`;
}

function openReadingRoomToday() {
  if (typeof window === 'undefined') return;
  const path = '/reading-room/today';
  if (window.location.pathname !== path) window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

export function BibleVersePicker({
  mode,
  initialBook,
  initialChapter,
  onSelectVerses,
  onVerseClick,
  fontSize = '1rem',
  onToggleSave,
  isSaved,
  onCopy,
  readingRange,
  onExitRange,
  onNavigate,
  readSelectionMode = false,
  readSelectionResetKey = 0,
  onReadSelectionChange,
}: BibleVersePickerProps) {
  const [selBook, setSelBook] = useState(initialBook);
  const [selChap, setSelChap] = useState(initialChapter);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [selectedVerseNumbers, setSelectedVerseNumbers] = useState<number[]>([]);
  const [rangeChapters, setRangeChapters] = useState<RangeChapter[]>([]);
  const [rangeSelectedKeys, setRangeSelectedKeys] = useState<string[]>([]);

  useEffect(() => {
    if (initialBook.id !== selBook.id || initialChapter !== selChap) {
      setSelBook(initialBook);
      setSelChap(initialChapter);
    }
  }, [initialBook, initialChapter, selBook.id, selChap]);

  const loadChapter = useCallback(async (bookName: string, chapter: number) => {
    const fullIndex = await loadBibleVerseIndex();
    const chapterVerses = fullIndex.filter((verse) => verse.bookName === bookName && verse.chapter === chapter);
    if (chapterVerses.length === 0) throw new Error('해당 장의 말씀을 찾을 수 없습니다.');
    return chapterVerses
      .sort((left, right) => left.verse - right.verse)
      .map((verse) => ({ verse: verse.verse, text: sanitizeScriptureText(verse.text) }));
  }, []);

  const loadRangeChapters = useCallback(async (range: import('../../types/bible').BibleReadRange) => {
    setLoading(true);
    setErr('');
    setRangeChapters([]);
    try {
      const { BIBLE_BOOKS } = await import('../../data/bibleBooks');
      const allChapters: RangeChapter[] = [];
      for (const reference of range.ranges) {
        const book = BIBLE_BOOKS.find((item) => item.id === reference.bookId);
        if (!book) continue;
        const endChapter = reference.chapterEnd || reference.chapterStart;
        for (let chapter = reference.chapterStart; chapter <= endChapter; chapter += 1) {
          allChapters.push({
            bookName: book.name,
            chapter,
            verses: await loadChapter(book.name, chapter),
          });
        }
      }
      if (allChapters.length === 0) throw new Error('통독 본문이 비어 있습니다.');
      setRangeChapters(allChapters);
    } catch (error) {
      console.error('Failed to load reading range:', error);
      setErr('통독 본문을 불러오지 못했습니다. 성경 데이터 상태를 확인해주세요.');
    } finally {
      setLoading(false);
    }
  }, [loadChapter]);

  useEffect(() => {
    setSelectedVerseNumbers([]);
    setRangeSelectedKeys([]);
    onReadSelectionChange?.([]);
  }, [readSelectionMode, readSelectionResetKey, onReadSelectionChange]);

  useEffect(() => {
    setSelectedVerseNumbers([]);
    setRangeSelectedKeys([]);
    onReadSelectionChange?.([]);

    if (readingRange) {
      setVerses([]);
      void loadRangeChapters(readingRange);
      return;
    }

    setRangeChapters([]);
    let active = true;
    const load = async () => {
      setLoading(true);
      setErr('');
      setVerses([]);
      try {
        const loaded = await loadChapter(selBook.name, selChap);
        if (active) setVerses(loaded);
      } catch (error) {
        console.error('Failed to load Bible chapter:', error);
        if (active) setErr('말씀을 불러오지 못했습니다. 다시 시도해주세요.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [selBook, selChap, readingRange, loadChapter, loadRangeChapters, onReadSelectionChange]);

  const publishRegularSelection = (numbers: number[]) => {
    const selected = verses
      .filter((verse) => numbers.includes(verse.verse))
      .sort((left, right) => left.verse - right.verse);

    if (mode === 'select' && onSelectVerses) {
      onSelectVerses({
        bookId: selBook.id,
        bookName: selBook.name,
        chapter: selChap,
        verses: selected,
      });
      return;
    }

    if (mode === 'read') {
      if (selected.length === 0) {
        onReadSelectionChange?.([]);
        return;
      }
      onReadSelectionChange?.([{
        ref: `${selBook.name} ${selChap}:${formatVerseRange(selected.map((verse) => verse.verse))}`,
        text: selected.map((verse) => sanitizeScriptureText(verse.text)).join('\n'),
        verse: selected[0].verse,
      }]);
    }
  };

  const handleToggleVerse = (verseNumber: number) => {
    const next = selectedVerseNumbers.includes(verseNumber)
      ? selectedVerseNumbers.filter((number) => number !== verseNumber)
      : [...selectedVerseNumbers, verseNumber].sort((left, right) => left - right);
    setSelectedVerseNumbers(next);
    publishRegularSelection(next);
  };

  const publishRangeSelection = (keys: string[]) => {
    const groups = rangeChapters.map((chapter) => {
      const selected = chapter.verses.filter((verse) => keys.includes(rangeVerseKey(chapter.bookName, chapter.chapter, verse.verse)));
      if (selected.length === 0) return null;
      return {
        ref: `${chapter.bookName} ${chapter.chapter}:${formatVerseRange(selected.map((verse) => verse.verse))}`,
        text: selected.map((verse) => sanitizeScriptureText(verse.text)).join('\n'),
        verse: selected[0].verse,
      } satisfies ReadSelectedVerse;
    }).filter((item): item is ReadSelectedVerse => item !== null);
    onReadSelectionChange?.(groups);
  };

  const handleRangeToggle = (chapter: RangeChapter, verseNumber: number) => {
    const key = rangeVerseKey(chapter.bookName, chapter.chapter, verseNumber);
    const next = rangeSelectedKeys.includes(key)
      ? rangeSelectedKeys.filter((item) => item !== key)
      : [...rangeSelectedKeys, key];
    setRangeSelectedKeys(next);
    publishRangeSelection(next);
  };

  const handleVerseClick = (verse: Verse) => {
    onVerseClick?.({ ref: `${selBook.name} ${selChap}:${verse.verse}`, text: verse.text });
  };

  const cancelReadingRange = () => {
    openReadingRoomToday();
  };

  const completeReadingRange = () => {
    openReadingRoomToday();
    onExitRange?.();
  };

  return (
    <div className="flex flex-col gap-4">
      {readingRange ? (
        <div className="flex items-center justify-between rounded-2xl border border-[#E8D8C8] bg-white p-4 shadow-sm">
          <div className="flex min-w-0 flex-col">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#6F8F72]">통독 본문 읽기</span>
            <h3 className="title-font truncate text-lg font-black text-[#3D3129]">{readingRange.label}</h3>
          </div>
          <button
            type="button"
            onClick={cancelReadingRange}
            className="rounded-xl border border-[#E8D8C8] bg-[#FDF6F0] px-4 py-2 text-xs font-black text-[#7B6A5D] transition-all active:scale-95"
          >
            나가기
          </button>
        </div>
      ) : (
        <BibleBookChapterSelector
          selectedBook={selBook}
          selectedChapter={selChap}
          onSelectBook={(book) => {
            setSelBook(book);
            setSelChap(1);
            onNavigate?.(book, 1);
          }}
          onSelectChapter={(chapter) => {
            setSelChap(chapter);
            onNavigate?.(selBook, chapter);
          }}
        />
      )}

      <div className="min-h-[200px] flex-1 space-y-8">
        {loading && (
          <div className="flex flex-col items-center justify-center gap-3 p-12 text-[#8c786e]" role="status">
            <Loader2 size={32} className="animate-spin opacity-40" />
            <p className="text-sm font-bold">말씀을 불러오는 중...</p>
          </div>
        )}

        {err && (
          <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-center text-sm font-medium text-red-600" role="alert">
            {err}
          </div>
        )}

        {!loading && !err && readingRange && rangeChapters.map((chapter) => {
          const selectedNumbers = chapter.verses
            .filter((verse) => rangeSelectedKeys.includes(rangeVerseKey(chapter.bookName, chapter.chapter, verse.verse)))
            .map((verse) => verse.verse);
          return (
            <div key={`${chapter.bookName}-${chapter.chapter}`} className="space-y-4">
              <div className="flex items-center gap-3 px-1">
                <div className="h-px flex-1 bg-[#E8D8C8] opacity-50" />
                <div className="title-font rounded-full border border-[#E8D8C8] bg-[#FDF6F0] px-3 py-1 text-sm font-black text-[#6F8F72]">
                  {chapter.bookName} {chapter.chapter}{chapter.bookName.includes('시편') ? '편' : '장'}
                </div>
                <div className="h-px flex-1 bg-[#E8D8C8] opacity-50" />
              </div>
              <BibleVerseSelectableList
                verses={chapter.verses}
                selectedVerses={selectedNumbers}
                onToggleVerse={(verseNumber) => handleRangeToggle(chapter, verseNumber)}
                mode="read"
                selectionMode={readSelectionMode}
                onVerseClick={(verse) => onVerseClick?.({ ref: `${chapter.bookName} ${chapter.chapter}:${verse.verse}`, text: verse.text })}
                fontSize={fontSize}
                onToggleSave={onToggleSave ? (verse) => onToggleSave({ ref: `${chapter.bookName} ${chapter.chapter}:${verse.verse}`, text: verse.text }) : undefined}
                isSaved={isSaved ? (verseNumber) => isSaved(`${chapter.bookName} ${chapter.chapter}:${verseNumber}`) : undefined}
                onCopy={onCopy ? (verse) => onCopy(verse.text) : undefined}
              />
            </div>
          );
        })}

        {!loading && !err && !readingRange && (
          <BibleVerseSelectableList
            verses={verses}
            selectedVerses={selectedVerseNumbers}
            onToggleVerse={handleToggleVerse}
            mode={mode}
            selectionMode={readSelectionMode}
            onVerseClick={handleVerseClick}
            fontSize={fontSize}
            onToggleSave={onToggleSave ? (verse) => onToggleSave({ ref: `${selBook.name} ${selChap}:${verse.verse}`, text: verse.text }) : undefined}
            isSaved={isSaved ? (verseNumber) => isSaved(`${selBook.name} ${selChap}:${verseNumber}`) : undefined}
            onCopy={onCopy ? (verse) => onCopy(verse.text) : undefined}
          />
        )}

        {readingRange && !loading && !err && (
          <div className="flex justify-center pb-12 pt-8">
            <button
              type="button"
              onClick={completeReadingRange}
              className="flex items-center gap-2 rounded-2xl bg-[#6F8F72] px-8 py-4 font-black text-white shadow-lg transition-all active:scale-95"
            >
              <Check size={18} />
              <span>통독 읽기 완료</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
