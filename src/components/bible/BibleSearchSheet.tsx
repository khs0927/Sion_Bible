import { useState, useEffect, useRef, type CSSProperties, type PointerEvent as ReactPointerEvent, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { X, Search, Loader2, BookOpen, ArrowRight, Sparkles } from 'lucide-react';
import { searchBibleVerses, highlightKeyword } from '../../services/bibleSearch';
import { aiSearchBibleVerses, type AiBibleSearchMeta } from '../../services/aiBibleSearch';
import type { BibleVerseRecord } from '../../types/bible';
import { sanitizeScriptureText } from '../../utils/textUtils';

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
  const [isExpanded, setIsExpanded] = useState(false);
  const [aiMode, setAiMode] = useState(false);
  const [aiMeta, setAiMeta] = useState<AiBibleSearchMeta | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragStartYRef = useRef<number | null>(null);
  const dragLastYRef = useRef<number | null>(null);

  const LIMIT = 50;
  const DRAG_THRESHOLD = 56;

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
        setAiMeta(null);
      }
    }, aiMode ? 650 : 400);

    return () => clearTimeout(timer);
  }, [query, aiMode]);

  const handleSearch = async (reset = false) => {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 2) return;

    setLoading(true);
    try {
      const currentOffset = reset ? 0 : offset + LIMIT;
      if (aiMode) {
        const { items, totalCount: total, hasMore: more, meta } = await aiSearchBibleVerses(trimmedQuery, {
          limit: LIMIT,
          offset: currentOffset,
        });

        if (reset) {
          setResults(items);
        } else {
          setResults(prev => [...prev, ...items]);
        }
        setAiMeta(meta);
        setTotalCount(total);
        setHasMore(more);
        setOffset(currentOffset);
        return;
      }

      const { items, totalCount: total, hasMore: more } = await searchBibleVerses(trimmedQuery, {
        limit: LIMIT,
        offset: currentOffset,
      });

      if (reset) {
        setResults(items);
      } else {
        setResults(prev => [...prev, ...items]);
      }

      setAiMeta(null);
      setTotalCount(total);
      setHasMore(more);
      setOffset(currentOffset);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetDrag = () => {
    dragStartYRef.current = null;
    dragLastYRef.current = null;
  };

  const handleDragStart = (event: ReactPointerEvent<HTMLDivElement>) => {
    dragStartYRef.current = event.clientY;
    dragLastYRef.current = event.clientY;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleDragMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragStartYRef.current === null) return;
    event.preventDefault();
    dragLastYRef.current = event.clientY;
  };

  const handleDragEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragStartYRef.current === null) return;

    const lastY = dragLastYRef.current ?? event.clientY;
    const deltaY = lastY - dragStartYRef.current;
    resetDrag();

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (deltaY <= -DRAG_THRESHOLD) {
      setIsExpanded(true);
      return;
    }

    if (deltaY >= DRAG_THRESHOLD) {
      onClose();
    }
  };

  const handleDragKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setIsExpanded(true);
    }

    if (event.key === 'ArrowDown' || event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
  };

  const getHighlightTerm = () => {
    if (aiMode) return aiMeta?.terms?.[0] || '';
    return query;
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full bg-[#FDF6F0] flex flex-col shadow-2xl overflow-hidden border-t transition-all duration-300 ease-out"
        style={{
          borderColor: T.line,
          height: isExpanded ? '100dvh' : '92vh',
          borderTopLeftRadius: isExpanded ? 0 : 40,
          borderTopRightRadius: isExpanded ? 0 : 40,
        }}
      >
        <div className="flex justify-center pt-4 pb-2 flex-shrink-0">
          <div
            role="button"
            tabIndex={0}
            aria-label="검색 창 크기 조절"
            title="위로 드래그하면 전체창, 아래로 드래그하면 닫기"
            onPointerDown={handleDragStart}
            onPointerMove={handleDragMove}
            onPointerUp={handleDragEnd}
            onPointerCancel={resetDrag}
            onKeyDown={handleDragKeyDown}
            className="h-6 w-24 flex items-center justify-center cursor-grab active:cursor-grabbing touch-none rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2"
            style={{ '--tw-ring-color': T.accent } as CSSProperties}
          >
            <span className="block w-12 h-1.5 bg-gray-300/60 rounded-full" />
          </div>
        </div>

        <header className="px-7 pb-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-2xl bg-white border shadow-sm" style={{ borderColor: T.line }}>
              {aiMode ? <Sparkles size={20} style={{ color: T.accent }} /> : <Search size={20} style={{ color: T.accent }} />}
            </div>
            <div>
              <h2 className="title-font text-2xl font-black" style={{ color: T.text }}>성경 검색</h2>
              {aiMode && <p className="text-[11px] font-black mt-0.5" style={{ color: T.accent }}>AI 질문 검색 모드</p>}
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-black/5 transition-colors">
            <X size={24} style={{ color: T.text }} />
          </button>
        </header>

        <div className="px-7 mb-5 flex-shrink-0">
          <div className="grid grid-cols-2 gap-2 mb-3">
            <button
              type="button"
              onClick={() => {
                setAiMode(false);
                setAiMeta(null);
                if (query.trim().length >= 2) window.setTimeout(() => handleSearch(true), 0);
              }}
              className="h-11 rounded-2xl border-2 text-xs font-black transition-all active:scale-95"
              style={{
                borderColor: !aiMode ? 'transparent' : T.line,
                background: !aiMode ? T.accent : 'white',
                color: !aiMode ? 'white' : T.sub,
              }}
            >
              일반 검색
            </button>
            <button
              type="button"
              onClick={() => {
                setAiMode(true);
                if (query.trim().length >= 2) window.setTimeout(() => handleSearch(true), 0);
              }}
              className="h-11 rounded-2xl border-2 text-xs font-black transition-all active:scale-95 flex items-center justify-center gap-1.5"
              style={{
                borderColor: aiMode ? 'transparent' : T.line,
                background: aiMode ? 'linear-gradient(145deg, #6F8F72, #86B7AD)' : 'white',
                color: aiMode ? 'white' : T.sub,
              }}
            >
              <Sparkles size={15} />
              AI 검색
            </button>
          </div>

          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={aiMode ? '질문 검색: 사랑을 문맥적이고 순차적으로 보여줘' : '단어 검색: 사랑, 평안, 요한복음 3:16'}
              className="w-full h-14 pl-12 pr-4 rounded-2xl border-2 focus:outline-none transition-all text-base font-bold"
              style={{
                borderColor: aiMode ? T.accent : T.line,
                background: 'white',
                color: T.text,
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') handleSearch(true);
              }}
            />
            {aiMode ? <Sparkles size={20} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40" /> : <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30" />}
            {loading && <Loader2 size={20} className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin opacity-40" />}
          </div>

          {aiMode && (
            <button
              type="button"
              onClick={() => handleSearch(true)}
              disabled={loading || query.trim().length < 2}
              className="mt-3 w-full h-12 rounded-2xl font-black text-sm transition-all active:scale-95 disabled:opacity-40 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(145deg, #6F8F72, #86B7AD)', color: 'white' }}
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={17} />}
              AI 검색 실행
            </button>
          )}

          {query.trim().length > 0 && query.trim().length < 2 && (
            <p className="mt-2 text-xs font-bold opacity-40 px-1">두 글자 이상 입력해 주세요.</p>
          )}
          {aiMode && aiMeta && totalCount > 0 && (
            <div className="mt-3 rounded-2xl border bg-white/80 p-3" style={{ borderColor: T.line }}>
              <p className="text-xs font-black" style={{ color: T.accent }}>{aiMeta.summary}</p>
              <p className="mt-1 text-[11px] leading-relaxed font-bold" style={{ color: T.sub }}>{aiMeta.guide}</p>
              {aiMeta.terms.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {aiMeta.terms.slice(0, 7).map(term => (
                    <span key={term} className="px-2 py-1 rounded-full bg-[#FDF6F0] text-[10px] font-black" style={{ color: T.sub }}>
                      {term}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
          {totalCount > 0 && (
            <p className="mt-2 text-xs font-black px-1" style={{ color: T.accent }}>
              {aiMode ? 'AI 검색 결과' : '검색 결과'} {totalCount.toLocaleString()}건
            </p>
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
                      {aiMode && (
                        <span className="text-[10px] font-black px-2 py-1 rounded-lg bg-[#EEF6F0]" style={{ color: T.accent }}>
                          AI 관련
                        </span>
                      )}
                    </div>
                    <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: T.accent }} />
                  </div>
                  <p
                    className="leading-relaxed serif-verse whitespace-pre-wrap break-keep"
                    style={{ color: T.text, fontSize }}
                    dangerouslySetInnerHTML={{ __html: highlightKeyword(sanitizeScriptureText(v.text), getHighlightTerm()) }}
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
                  {loading ? '불러오는 중...' : aiMode ? 'AI 검색 결과 더 보기' : '검색 결과 더 보기'}
                </button>
              )}
            </div>
          ) : !loading && query.trim().length >= 2 ? (
            <div className="flex flex-col items-center justify-center py-20 opacity-40">
              {aiMode ? <Sparkles size={48} className="mb-4" /> : <Search size={48} className="mb-4" />}
              <p className="text-sm font-black">검색 결과가 없습니다.</p>
            </div>
          ) : !loading && (
            <div className="flex flex-col items-center justify-center py-20 opacity-40">
              <BookOpen size={48} className="mb-4" />
              <p className="text-sm font-black">
                {aiMode ? '질문으로 관련 구절을 찾아보세요.' : '찾고 싶은 단어나 구절을 입력해보세요.'}
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
