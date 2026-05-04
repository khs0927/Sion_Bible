import { useState, useEffect, useRef } from 'react';
import { X, Search, Loader2, BookOpen, ArrowRight } from 'lucide-react';
import { searchBibleVerses, highlightKeyword } from '../../services/bibleSearch';
import type { BibleVerseRecord } from '../../types/bible';

interface BibleSearchSheetProps {
  onClose: () => void;
  onNavigate: (verse: BibleVerseRecord) => void;
  T: Record<string, string>;
  fontSize?: string;
}

export function BibleSearchSheet({ onClose, onNavigate, T, fontSize = '0.875rem' }: BibleSearchSheetProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<BibleVerseRecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const LIMIT = 50;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim().length >= 2) {
        handleSearch(true);
      } else {
        setResults([]);
        setTotalCount(0);
        setHasMore(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSearch = async (reset = false) => {
    setLoading(true);
    try {
      const currentOffset = reset ? 0 : offset + LIMIT;
      const { items, totalCount: total, hasMore: more } = await searchBibleVerses(query, { 
        limit: LIMIT, 
        offset: currentOffset 
      });
      
      if (reset) {
        setResults(items);
      } else {
        setResults(prev => [...prev, ...items]);
      }
      
      setTotalCount(total);
      setHasMore(more);
      setOffset(currentOffset);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full h-[92vh] bg-[#FDF6F0] rounded-t-[40px] flex flex-col shadow-2xl overflow-hidden border-t" style={{ borderColor: T.line }}>
        <div className="w-10 h-1.5 bg-gray-300/40 rounded-full mx-auto my-4 flex-shrink-0" />
        
        <header className="px-7 pb-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-2xl bg-white border shadow-sm" style={{ borderColor: T.line }}>
              <Search size={20} style={{ color: T.accent }} />
            </div>
            <h2 className="title-font text-2xl font-black" style={{ color: T.text }}>성경 검색</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-black/5 transition-colors">
            <X size={24} style={{ color: T.text }} />
          </button>
        </header>

        <div className="px-7 mb-6 flex-shrink-0">
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="단어 검색: 사랑, 평안, 요한복음 3:16"
              className="w-full h-14 pl-12 pr-4 rounded-2xl border-2 focus:outline-none transition-all text-base font-bold"
              style={{ 
                borderColor: T.line,
                background: 'white',
                color: T.text
              }}
            />
            <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30" />
            {loading && <Loader2 size={20} className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin opacity-40" />}
          </div>
          {query.trim().length > 0 && query.trim().length < 2 && (
            <p className="mt-2 text-xs font-bold opacity-40 px-1">두 글자 이상 입력해 주세요.</p>
          )}
          {totalCount > 0 && (
            <p className="mt-2 text-xs font-black px-1" style={{ color: T.accent }}>검색 결과 {totalCount.toLocaleString()}건</p>
          )}
        </div>

        <main className="flex-1 overflow-y-auto px-7 pb-10">
          {results.length > 0 ? (
            <div className="space-y-3">
              {results.map((v) => (
                <button
                  key={v.id}
                  onClick={() => onNavigate(v)}
                  className="w-full text-left p-5 rounded-3xl bg-white border border-transparent hover:border-[#E8D8C8] transition-all shadow-sm active:scale-[0.98] group"
                  style={{ borderColor: T.line }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="title-font text-xs font-black px-2 py-1 rounded-lg bg-[#FDF6F0]" style={{ color: T.accent }}>
                        {v.bookName} {v.chapter}:{v.verse}
                      </span>
                    </div>
                    <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: T.accent }} />
                  </div>
                  <p 
                    className="leading-relaxed serif-verse line-clamp-3"
                    style={{ color: T.text, fontSize }}
                    dangerouslySetInnerHTML={{ __html: highlightKeyword(v.text, query) }}
                  />
                </button>
              ))}
              
              {hasMore && (
                <button
                  onClick={() => handleSearch()}
                  disabled={loading}
                  className="w-full py-4 rounded-2xl font-black text-sm bg-white border-2 border-dashed transition-all active:scale-95"
                  style={{ borderColor: T.line, color: T.sub }}
                >
                  {loading ? '불러오는 중...' : '검색 결과 더 보기'}
                </button>
              )}
            </div>
          ) : !loading && query.trim().length >= 2 ? (
            <div className="flex flex-col items-center justify-center py-20 opacity-40">
              <Search size={48} className="mb-4" />
              <p className="text-sm font-black">검색 결과가 없습니다.</p>
            </div>
          ) : !loading && (
            <div className="flex flex-col items-center justify-center py-20 opacity-40">
              <BookOpen size={48} className="mb-4" />
              <p className="text-sm font-black">찾고 싶은 단어나 구절을 입력해보세요.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
