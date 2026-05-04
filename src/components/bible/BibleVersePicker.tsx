import { useState, useEffect, useCallback } from 'react';
import { BibleVerseSelectableList } from './BibleVerseSelectableList';
import { type BibleBook } from '../../data/bibleBooks';
import { Loader2 } from 'lucide-react';

interface Verse {
  verse: number;
  text: string;
}

interface BibleVersePickerProps {
  mode: 'read' | 'select';
  initialBook: BibleBook;
  initialChapter: number;
  onSelectVerses?: (data: { 
    bookId: string; 
    bookName: string; 
    chapter: number; 
    verses: { verse: number; text: string }[] 
  }) => void;
  onVerseClick?: (verse: { ref: string; text: string }) => void;
  fontSize?: string;
  onToggleSave?: (verse: { ref: string; text: string }) => void;
  isSaved?: (ref: string) => boolean;
  onCopy?: (text: string) => void;
  readingRange?: import('../../types/bible').BibleReadRange | null;
  onExitRange?: () => void;
  onNavigate?: (book: BibleBook, chapter: number) => void;
  onOpenSelector?: () => void;
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
  onOpenSelector,
}: BibleVersePickerProps) {
  const [selBook, setSelBook] = useState(initialBook);
  const [selChap, setSelChap] = useState(initialChapter);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [selectedVerseNumbers, setSelectedVerseNumbers] = useState<number[]>([]);
  const [rangeChapters, setRangeChapters] = useState<{ bookName: string; chapter: number; verses: Verse[] }[]>([]);

  // Sync internal state ONLY when initial props change from outside (to avoid loop)
  useEffect(() => {
    if (initialBook.id !== selBook.id || initialChapter !== selChap) {
      setSelBook(initialBook);
      setSelChap(initialChapter);
    }
  }, [initialBook, initialChapter]);

  // Remove the automatic onNavigate sync that causes loops.
  // Instead, onNavigate will be called by explicit user actions if needed.

  const loadChapter = useCallback(async (bookNumber: string | number, chap: number) => {
    const res = await fetch(`https://api.getbible.net/v2/korean/${bookNumber}/${chap}.json`, { mode: 'cors' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data?.verses)) throw new Error('no verses');
    return data.verses.map((v: any) => ({
      verse: Number(v.verse),
      text: (v.text ?? '').replace(/\s+/g, ' ').replace(/\[[^\]]*\]/g, '').trim()
    }));
  }, []);

  const loadRangeChapters = useCallback(async (range: import('../../types/bible').BibleReadRange) => {
    setLoading(true);
    setErr('');
    setRangeChapters([]);
    try {
      const allChapters: { bookName: string; chapter: number; verses: Verse[] }[] = [];
      
      for (const r of range.ranges) {
        const start = r.chapterStart;
        const end = r.chapterEnd || r.chapterStart;
        
        // Find book number from BIBLE_BOOKS
        const book = (await import('../../data/bibleBooks')).BIBLE_BOOKS.find(b => b.id === r.bookId);
        if (!book) continue;

        for (let c = start; c <= end; c++) {
          const loadedVerses = await loadChapter(book.number, c);
          allChapters.push({
            bookName: book.name,
            chapter: c,
            verses: loadedVerses
          });
        }
      }
      setRangeChapters(allChapters);
    } catch {
      setErr('통독 본문을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [loadChapter]);

  useEffect(() => {
    if (readingRange) {
      loadRangeChapters(readingRange);
    } else {
      setRangeChapters([]);
      const load = async () => {
        setLoading(true);
        setErr('');
        try {
          const loaded = await loadChapter(selBook.number, selChap);
          setVerses(loaded);
        } catch {
          setErr('말씀을 불러오지 못했습니다.');
        } finally {
          setLoading(false);
        }
      };
      load();
    }
    setSelectedVerseNumbers([]);
  }, [selBook, selChap, readingRange, loadChapter, loadRangeChapters]);

  const handleToggleVerse = (vNum: number) => {
    const next = selectedVerseNumbers.includes(vNum)
      ? selectedVerseNumbers.filter(n => n !== vNum)
      : [...selectedVerseNumbers, vNum].sort((a, b) => a - b);
    
    setSelectedVerseNumbers(next);
    
    if (onSelectVerses) {
      onSelectVerses({
        bookId: selBook.id,
        bookName: selBook.name,
        chapter: selChap,
        verses: verses
          .filter(v => next.includes(v.verse))
          .map(v => ({ verse: v.verse, text: v.text }))
      });
    }
  };

  const handleVerseClick = (v: Verse) => {
    if (onVerseClick) {
      onVerseClick({
        ref: `${selBook.name} ${selChap}:${v.verse}`,
        text: v.text
      });
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {readingRange ? (
        <div className="flex items-center justify-between p-4 rounded-2xl bg-white border border-[#E8D8C8] shadow-sm">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-[#9A8FE3] uppercase tracking-widest">통독 본문 읽기</span>
            <h3 className="title-font text-lg font-black text-[#3D3129]">{readingRange.label}</h3>
          </div>
          <button 
            onClick={onExitRange}
            className="px-4 py-2 rounded-xl bg-[#FDF6F0] border border-[#E8D8C8] text-[#7B6A5D] text-xs font-black transition-all active:scale-95"
          >
            나가기
          </button>
        </div>
      ) : (
        <button
          onClick={onOpenSelector}
          className="flex items-center justify-between p-5 rounded-[22px] bg-white border border-[#E8D8C8] shadow-sm hover:bg-[#FDF2E7] transition-all active:scale-[0.98] group"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#FDF6F0] flex items-center justify-center text-[#A17C5B] group-hover:scale-110 transition-transform">
              <KawaiiBibleIcon size={24} />
            </div>
            <div className="flex flex-col items-start">
              <span className="text-[10px] font-black text-[#A17C5B] uppercase tracking-widest opacity-70">현재 위치</span>
              <h3 className="title-font text-lg font-black text-[#3D3129]">
                {selBook.name} {selChap}장
              </h3>
            </div>
          </div>
          <div className="px-3 py-1.5 rounded-full bg-[#FDF6F0] border border-[#E8D8C8] text-[10px] font-black text-[#A17C5B]">
            변경하기
          </div>
        </button>
      )}

      <div className="flex-1 min-h-[200px] space-y-8">
        {loading && (
          <div className="flex flex-col items-center justify-center p-12 text-[#8c786e] gap-3">
            <Loader2 size={32} className="animate-spin opacity-40" />
            <p className="text-sm font-bold">말씀을 불러오는 중...</p>
          </div>
        )}

        {err && (
          <div className="p-6 rounded-2xl bg-red-50 text-red-600 text-sm font-medium border border-red-100 text-center">
            {err}
          </div>
        )}

        {!loading && !err && readingRange && rangeChapters.map((chap, idx) => (
          <div key={`${chap.bookName}-${chap.chapter}-${idx}`} className="space-y-4">
            <div className="flex items-center gap-3 px-1">
              <div className="h-[1px] flex-1 bg-[#E8D8C8] opacity-50" />
              <div className="title-font text-sm font-black text-[#9A8FE3] px-3 py-1 rounded-full bg-[#FDF6F0] border border-[#E8D8C8]">
                {chap.bookName} {chap.chapter}{chap.bookName.includes('시편') ? '편' : '장'}
              </div>
              <div className="h-[1px] flex-1 bg-[#E8D8C8] opacity-50" />
            </div>
            <BibleVerseSelectableList
              verses={chap.verses}
              selectedVerses={[]}
              onToggleVerse={() => {}}
              mode="read"
              onVerseClick={(v) => onVerseClick?.({ ref: `${chap.bookName} ${chap.chapter}:${v.verse}`, text: v.text })}
              fontSize={fontSize}
              onToggleSave={onToggleSave ? (v) => onToggleSave({ ref: `${chap.bookName} ${chap.chapter}:${v.verse}`, text: v.text }) : undefined}
              isSaved={isSaved ? (vNum) => isSaved(`${chap.bookName} ${chap.chapter}:${vNum}`) : undefined}
              onCopy={onCopy ? (v) => onCopy(v.text) : undefined}
            />
          </div>
        ))}

        {!loading && !err && !readingRange && (
          <BibleVerseSelectableList
            verses={verses}
            selectedVerses={selectedVerseNumbers}
            onToggleVerse={handleToggleVerse}
            mode={mode}
            onVerseClick={handleVerseClick}
            fontSize={fontSize}
            onToggleSave={onToggleSave ? (v) => onToggleSave({ ref: `${selBook.name} ${selChap}:${v.verse}`, text: v.text }) : undefined}
            isSaved={isSaved ? (vNum) => isSaved(`${selBook.name} ${selChap}:${vNum}`) : undefined}
            onCopy={onCopy ? (v) => onCopy(v.text) : undefined}
          />
        )}

        {readingRange && !loading && !err && (
          <div className="pt-8 pb-12 flex justify-center">
            <button 
              onClick={onExitRange}
              className="px-8 py-4 rounded-2xl bg-[#F5C292] text-[#3D3129] font-black shadow-lg transition-all active:scale-95 flex items-center gap-2"
            >
              <span>통독 읽기 완료</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
