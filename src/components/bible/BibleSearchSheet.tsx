import { useState, useEffect, useRef, type CSSProperties, type PointerEvent as ReactPointerEvent, type KeyboardEvent as ReactKeyboardEvent, type TouchEvent as ReactTouchEvent, type UIEvent as ReactUIEvent } from 'react';
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

interface BibleSearchSheetSession {
  query: string;
  results: BibleVerseRecord[];
  totalCount: number;
  loading: boolean;
  hasMore: boolean;
  offset: number;
  isExpanded: boolean;
  isResultsOnly: boolean;
  aiMode: boolean;
  aiMeta: AiBibleSearchMeta | null;
  scrollTop: number;
}

type PersistedBibleSearchState = Pick<BibleSearchSheetSession, 'query' | 'isExpanded' | 'aiMode' | 'scrollTop'>;

const SEARCH_SHEET_STORAGE_KEY = 'sion_bible_search_sheet_state';

const readPersistedSearchState = (): Partial<PersistedBibleSearchState> => {
  if (typeof window === 'undefined') return {};

  try {
    const rawValue = window.localStorage.getItem(SEARCH_SHEET_STORAGE_KEY);
    if (!rawValue) return {};

    const parsedValue = JSON.parse(rawValue) as Partial<PersistedBibleSearchState>;
    return {
      query: typeof parsedValue.query === 'string' ? parsedValue.query : '',
      isExpanded: typeof parsedValue.isExpanded === 'boolean' ? parsedValue.isExpanded : false,
      aiMode: typeof parsedValue.aiMode === 'boolean' ? parsedValue.aiMode : false,
      scrollTop: typeof parsedValue.scrollTop === 'number' ? parsedValue.scrollTop : 0,
    };
  } catch {
    return {};
  }
};

const writePersistedSearchState = (state: PersistedBibleSearchState) => {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(SEARCH_SHEET_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // 저장 공간 제한 등으로 실패해도 검색 기능은 그대로 동작합니다.
  }
};

const persistedSearchState = readPersistedSearchState();

let bibleSearchSheetSession: BibleSearchSheetSession = {
  query: persistedSearchState.query ?? '',
  results: [],
  totalCount: 0,
  loading: false,
  hasMore: false,
  offset: 0,
  isExpanded: persistedSearchState.isExpanded ?? false,
  isResultsOnly: false,
  aiMode: persistedSearchState.aiMode ?? false,
  aiMeta: null,
  scrollTop: persistedSearchState.scrollTop ?? 0,
};

export function BibleSearchSheet({ onClose, onNavigate, T, fontSize = '0.875rem' }: BibleSearchSheetProps) {
  const [query, setQuery] = useState(() => bibleSearchSheetSession.query);
  const [results, setResults] = useState<BibleVerseRecord[]>(() => bibleSearchSheetSession.results);
  const [totalCount, setTotalCount] = useState(() => bibleSearchSheetSession.totalCount);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(() => bibleSearchSheetSession.hasMore);
  const [offset, setOffset] = useState(() => bibleSearchSheetSession.offset);
  const [isExpanded, setIsExpanded] = useState(() => bibleSearchSheetSession.isExpanded);
  const [isResultsOnly, setIsResultsOnly] = useState(() => bibleSearchSheetSession.isResultsOnly);
  const [aiMode, setAiMode] = useState(() => bibleSearchSheetSession.aiMode);
  const [aiMeta, setAiMeta] = useState<AiBibleSearchMeta | null>(() => bibleSearchSheetSession.aiMeta);
  const inputRef = useRef<HTMLInputElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const dragStartYRef = useRef<number | null>(null);
  const dragLastYRef = useRef<number | null>(null);
  const resultsTouchStartYRef = useRef<number | null>(null);
  const resultsTouchStartScrollTopRef = useRef(0);
  const didRestoreScrollRef = useRef(false);

  const LIMIT = 50;
  const DRAG_THRESHOLD = 28;
  const RESULTS_ONLY_SCROLL_THRESHOLD = 18;
  const CLOSE_PULL_THRESHOLD = 72;

  const saveSearchSession = (overrides: Partial<BibleSearchSheetSession> = {}) => {
    const nextState: BibleSearchSheetSession = {
      query,
      results,
      totalCount,
      loading,
      hasMore,
      offset,
      isExpanded,
      isResultsOnly,
      aiMode,
      aiMeta,
      scrollTop: mainRef.current?.scrollTop ?? bibleSearchSheetSession.scrollTop,
      ...overrides,
    };

    bibleSearchSheetSession = nextState;
    writePersistedSearchState({
      query: nextState.query,
      isExpanded: nextState.isExpanded,
      aiMode: nextState.aiMode,
      scrollTop: nextState.scrollTop,
    });
  };

  const closeSheet = () => {
    saveSearchSession();
    onClose();
  };

  const expandSheet = () => {
    setIsExpanded(true);
    saveSearchSession({ isExpanded: true });
  };

  const showResultOnlyMode = () => {
    setIsExpanded(true);
    setIsResultsOnly(true);
    saveSearchSession({ isExpanded: true, isResultsOnly: true });
  };

  const showSearchControls = () => {
    setIsResultsOnly(false);
    saveSearchSession({ isResultsOnly: false });
  };

  useEffect(() => {
    const setViewportHeight = () => {
      document.documentElement.style.setProperty('--sion-search-sheet-vh', `${window.innerHeight * 0.01}px`);
    };

    setViewportHeight();
    window.addEventListener('resize', setViewportHeight);
    window.addEventListener('orientationchange', setViewportHeight);

    return () => {
      window.removeEventListener('resize', setViewportHeight);
      window.removeEventListener('orientationchange', setViewportHeight);
    };
  }, []);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    saveSearchSession();
  }, [query, results, totalCount, loading, hasMore, offset, isExpanded, isResultsOnly, aiMode, aiMeta]);

  useEffect(() => {
    if (didRestoreScrollRef.current) return;
    if (results.length === 0) return;

    const scrollTop = bibleSearchSheetSession.scrollTop;
    if (scrollTop <= 0) {
      didRestoreScrollRef.current = true;
      return;
    }

    window.requestAnimationFrame(() => {
      mainRef.current?.scrollTo({ top: scrollTop });
      if (scrollTop > RESULTS_ONLY_SCROLL_THRESHOLD) {
        setIsExpanded(true);
        setIsResultsOnly(true);
      }
      didRestoreScrollRef.current = true;
    });
  }, [results.length]);

  useEffect(() => {
    const trimmedQuery = query.trim();

    const timer = window.setTimeout(() => {
      if (trimmedQuery.length >= 2) {
        handleSearch(true);
      } else {
        setResults([]);
        setTotalCount(0);
        setHasMore(false);
        setOffset(0);
        setAiMeta(null);
        setIsResultsOnly(false);
      }
    }, aiMode ? 650 : 400);

    return () => window.clearTimeout(timer);
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

  const resetSearchPosition = () => {
    didRestoreScrollRef.current = true;
    mainRef.current?.scrollTo({ top: 0 });
    setIsResultsOnly(false);
    saveSearchSession({ scrollTop: 0, offset: 0, isResultsOnly: false });
  };

  const handleQueryChange = (nextQuery: string) => {
    setQuery(nextQuery);
    setResults([]);
    setTotalCount(0);
    setHasMore(false);
    setOffset(0);
    setAiMeta(null);
    resetSearchPosition();
  };

  const handleModeChange = (nextAiMode: boolean) => {
    if (nextAiMode === aiMode) return;
    setAiMode(nextAiMode);
    setAiMeta(null);
    setResults([]);
    setTotalCount(0);
    setHasMore(false);
    setOffset(0);
    resetSearchPosition();
  };

  const resetDrag = () => {
    dragStartYRef.current = null;
    dragLastYRef.current = null;
  };

  const finishDrag = (lastY: number) => {
    if (dragStartYRef.current === null) return;

    const deltaY = lastY - dragStartYRef.current;
    resetDrag();

    if (deltaY <= -DRAG_THRESHOLD) {
      expandSheet();
      return;
    }

    if (deltaY >= DRAG_THRESHOLD) {
      closeSheet();
      return;
    }

    if (Math.abs(deltaY) < 8) {
      const nextExpanded = !isExpanded;
      setIsExpanded(nextExpanded);
      saveSearchSession({ isExpanded: nextExpanded });
    }
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

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    finishDrag(lastY);
  };

  const handleTouchStart = (event: ReactTouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    if (!touch) return;

    dragStartYRef.current = touch.clientY;
    dragLastYRef.current = touch.clientY;
  };

  const handleTouchMove = (event: ReactTouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    if (!touch || dragStartYRef.current === null) return;

    event.preventDefault();
    dragLastYRef.current = touch.clientY;
  };

  const handleTouchEnd = (event: ReactTouchEvent<HTMLDivElement>) => {
    const touch = event.changedTouches[0];
    if (!touch) {
      resetDrag();
      return;
    }

    finishDrag(touch.clientY);
  };

  const handleDragKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      expandSheet();
    }

    if (event.key === 'ArrowDown' || event.key === 'Escape') {
      event.preventDefault();
      closeSheet();
    }
  };

  const handleResultsScroll = (event: ReactUIEvent<HTMLElement>) => {
    const scrollTop = event.currentTarget.scrollTop;
    bibleSearchSheetSession.scrollTop = scrollTop;

    if (results.length > 0 && scrollTop > RESULTS_ONLY_SCROLL_THRESHOLD && !isResultsOnly) {
      showResultOnlyMode();
    }

    if (scrollTop <= 0 && isResultsOnly) {
      showSearchControls();
    }

    writePersistedSearchState({
      query,
      isExpanded: scrollTop > RESULTS_ONLY_SCROLL_THRESHOLD ? true : isExpanded,
      aiMode,
      scrollTop,
    });
  };

  const handleResultsTouchStart = (event: ReactTouchEvent<HTMLElement>) => {
    const touch = event.touches[0];
    if (!touch) return;
    resultsTouchStartYRef.current = touch.clientY;
    resultsTouchStartScrollTopRef.current = mainRef.current?.scrollTop ?? 0;
  };

  const handleResultsTouchEnd = (event: ReactTouchEvent<HTMLElement>) => {
    const touch = event.changedTouches[0];
    const startY = resultsTouchStartYRef.current;
    if (!touch || startY === null) return;

    const deltaY = touch.clientY - startY;
    const startedAtTop = resultsTouchStartScrollTopRef.current <= 2;
    resultsTouchStartYRef.current = null;

    if (deltaY < -DRAG_THRESHOLD && results.length > 0) {
      showResultOnlyMode();
      return;
    }

    if (startedAtTop && deltaY > CLOSE_PULL_THRESHOLD) {
      if (isResultsOnly) {
        showSearchControls();
        return;
      }

      closeSheet();
    }
  };

  const getHighlightTerm = () => {
    if (aiMode) return aiMeta?.terms?.[0] || '';
    return query;
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeSheet} />
      <div
        className="fixed inset-x-0 bottom-0 z-[201] w-full bg-[#FDF6F0] flex flex-col shadow-2xl overflow-hidden border-t transition-[height,border-radius] duration-300 ease-out"
        style={{
          borderColor: T.line,
          height: isExpanded ? 'calc(var(--sion-search-sheet-vh, 1vh) * 100)' : '92vh',
          maxHeight: 'calc(var(--sion-search-sheet-vh, 1vh) * 100)',
          borderTopLeftRadius: isExpanded ? 0 : 40,
          borderTopRightRadius: isExpanded ? 0 : 40,
          paddingTop: isExpanded ? 'env(safe-area-inset-top)' : 0,
        }}
      >
        <div className={`flex justify-center flex-shrink-0 transition-all duration-300 ${isResultsOnly ? 'pt-1 pb-1' : 'pt-4 pb-2'}`}>
          <div
            role="button"
            tabIndex={0}
            aria-label="검색 창 크기 조절"
            aria-expanded={isExpanded}
            title="위로 드래그하면 전체창, 아래로 드래그하면 닫기"
            onPointerDown={handleDragStart}
            onPointerMove={handleDragMove}
            onPointerUp={handleDragEnd}
            onPointerCancel={resetDrag}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={resetDrag}
            onKeyDown={handleDragKeyDown}
            className={`flex items-center justify-center cursor-grab active:cursor-grabbing touch-none rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-300 ${isResultsOnly ? 'h-6 w-24' : 'h-10 w-32'}`}
            style={{ '--tw-ring-color': T.accent } as CSSProperties}
          >
            <span className={`block bg-gray-300/70 rounded-full transition-all duration-300 ${isResultsOnly ? 'w-10 h-1' : 'w-14 h-1.5'}`} />
          </div>
        </div>

        <header className={`px-7 flex items-center justify-between flex-shrink-0 transition-all duration-300 overflow-hidden ${isResultsOnly ? 'max-h-0 pb-0 opacity-0 pointer-events-none' : 'max-h-24 pb-4 opacity-100'}`}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-2xl bg-white border shadow-sm" style={{ borderColor: T.line }}>
              {aiMode ? <Sparkles size={20} style={{ color: T.accent }} /> : <Search size={20} style={{ color: T.accent }} />}
            </div>
            <div>
              <h2 className="title-font text-2xl font-black" style={{ color: T.text }}>성경 검색</h2>
              {aiMode && <p className="text-[11px] font-black mt-0.5" style={{ color: T.accent }}>AI 질문 검색 모드</p>}
            </div>
          </div>
          <button onClick={closeSheet} className="p-2 rounded-full hover:bg-black/5 transition-colors">
            <X size={24} style={{ color: T.text }} />
          </button>
        </header>

        <div className={`px-7 flex-shrink-0 transition-all duration-300 overflow-hidden ${isResultsOnly ? 'max-h-0 mb-0 opacity-0 pointer-events-none' : 'max-h-[520px] mb-5 opacity-100'}`}>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <button
              type="button"
              onClick={() => handleModeChange(false)}
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
              onClick={() => handleModeChange(true)}
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
              onChange={(e) => handleQueryChange(e.target.value)}
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

        <main
          ref={mainRef}
          onScroll={handleResultsScroll}
          onTouchStart={handleResultsTouchStart}
          onTouchEnd={handleResultsTouchEnd}
          className={`flex-1 overflow-y-auto pb-10 transition-all duration-300 ${isResultsOnly ? 'px-4 pt-1' : 'px-7'}`}
        >
          {isResultsOnly && totalCount > 0 && (
            <div className="sticky top-0 z-10 mb-3 rounded-2xl bg-[#FDF6F0]/95 py-2 backdrop-blur">
              <button
                type="button"
                onClick={() => {
                  mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                  showSearchControls();
                }}
                className="w-full rounded-2xl border bg-white px-4 py-3 text-left text-xs font-black shadow-sm active:scale-[0.99]"
                style={{ borderColor: T.line, color: T.accent }}
              >
                ↑ 검색 메뉴 보기 · {aiMode ? 'AI 검색 결과' : '검색 결과'} {totalCount.toLocaleString()}건
              </button>
            </div>
          )}

          {results.length > 0 ? (
            <div className="space-y-3">
              {results.map((v) => (
                <button
                  key={v.id}
                  onClick={() => {
                    saveSearchSession();
                    onNavigate(v);
                  }}
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
