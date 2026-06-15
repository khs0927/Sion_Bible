import { useState, useEffect, useRef, type UIEvent as ReactUIEvent } from 'react';
import { createPortal } from 'react-dom';
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

interface BibleSearchSession {
  query: string;
  results: BibleVerseRecord[];
  totalCount: number;
  loading: boolean;
  hasMore: boolean;
  offset: number;
  aiMode: boolean;
  aiMeta: AiBibleSearchMeta | null;
  scrollTop: number;
}

type PersistedBibleSearchState = Pick<BibleSearchSession, 'query' | 'aiMode' | 'scrollTop'>;

const SEARCH_SHEET_STORAGE_KEY = 'sion_bible_search_sheet_state';

const readPersistedSearchState = (): Partial<PersistedBibleSearchState> => {
  if (typeof window === 'undefined') return {};

  try {
    const rawValue = window.localStorage.getItem(SEARCH_SHEET_STORAGE_KEY);
    if (!rawValue) return {};

    const parsedValue = JSON.parse(rawValue) as Partial<PersistedBibleSearchState> & { isExpanded?: boolean };
    return {
      query: typeof parsedValue.query === 'string' ? parsedValue.query : '',
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

let bibleSearchSession: BibleSearchSession = {
  query: persistedSearchState.query ?? '',
  results: [],
  totalCount: 0,
  loading: false,
  hasMore: false,
  offset: 0,
  aiMode: persistedSearchState.aiMode ?? false,
  aiMeta: null,
  scrollTop: persistedSearchState.scrollTop ?? 0,
};

export function BibleSearchSheet({ onClose, onNavigate, T, fontSize = '0.875rem' }: BibleSearchSheetProps) {
  const [query, setQuery] = useState(() => bibleSearchSession.query);
  const [results, setResults] = useState<BibleVerseRecord[]>(() => bibleSearchSession.results);
  const [totalCount, setTotalCount] = useState(() => bibleSearchSession.totalCount);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(() => bibleSearchSession.hasMore);
  const [offset, setOffset] = useState(() => bibleSearchSession.offset);
  const [aiMode, setAiMode] = useState(() => bibleSearchSession.aiMode);
  const [aiMeta, setAiMeta] = useState<AiBibleSearchMeta | null>(() => bibleSearchSession.aiMeta);
  const inputRef = useRef<HTMLInputElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const didRestoreScrollRef = useRef(false);

  const LIMIT = 50;

  const saveSearchSession = (overrides: Partial<BibleSearchSession> = {}) => {
    const nextState: BibleSearchSession = {
      query,
      results,
      totalCount,
      loading,
      hasMore,
      offset,
      aiMode,
      aiMeta,
      scrollTop: mainRef.current?.scrollTop ?? bibleSearchSession.scrollTop,
      ...overrides,
    };

    bibleSearchSession = nextState;
    writePersistedSearchState({
      query: nextState.query,
      aiMode: nextState.aiMode,
      scrollTop: nextState.scrollTop,
    });
  };

  const closeSearchPage = () => {
    saveSearchSession();
    onClose();
  };

  useEffect(() => {
    const setViewportHeight = () => {
      document.documentElement.style.setProperty('--sion-search-page-vh', `${window.innerHeight * 0.01}px`);
    };

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    setViewportHeight();
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    window.addEventListener('resize', setViewportHeight);
    window.addEventListener('orientationchange', setViewportHeight);

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      window.removeEventListener('resize', setViewportHeight);
      window.removeEventListener('orientationchange', setViewportHeight);
    };
  }, []);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    saveSearchSession();
  }, [query, results, totalCount, loading, hasMore, offset, aiMode, aiMeta]);

  useEffect(() => {
    if (didRestoreScrollRef.current) return;
    if (results.length === 0) return;

    const scrollTop = bibleSearchSession.scrollTop;
    if (scrollTop <= 0) {
      didRestoreScrollRef.current = true;
      return;
    }

    window.requestAnimationFrame(() => {
      mainRef.current?.scrollTo({ top: scrollTop });
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
    saveSearchSession({ scrollTop: 0, offset: 0 });
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

  const handleResultsScroll = (event: ReactUIEvent<HTMLElement>) => {
    const scrollTop = event.currentTarget.scrollTop;
    bibleSearchSession.scrollTop = scrollTop;
    writePersistedSearchState({
      query,
      aiMode,
      scrollTop,
    });
  };

  const getHighlightTerm = () => {
    if (aiMode) return aiMeta?.terms?.[0] || '';
    return query;
  };

  const searchPage = (
    <div
      className="fixed inset-0 z-[9999] flex flex-col bg-[#FDF6F0]"
      style={{
        width: '100vw',
        maxWidth: '100vw',
        height: 'calc(var(--sion-search-page-vh, 1vh) * 100)',
        minHeight: '100dvh',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        overscrollBehavior: 'contain',
        borderRadius: 0,
        transform: 'none',
      }}
    >
      <header className="flex-shrink-0 px-6 pt-5 pb-4 bg-[#FDF6F0]">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="p-2 rounded-2xl bg-white border shadow-sm" style={{ borderColor: T.line }}>
              {aiMode ? <Sparkles size={20} style={{ color: T.accent }} /> : <Search size={20} style={{ color: T.accent }} />}
            </div>
            <div className="min-w-0">
              <h2 className="title-font text-2xl font-black leading-tight" style={{ color: T.text }}>성경 검색</h2>
              {aiMode && <p className="text-[11px] font-black mt-0.5" style={{ color: T.accent }}>AI 질문 검색 모드</p>}
            </div>
          </div>
          <button onClick={closeSearchPage} className="p-2 rounded-full hover:bg-black/5 transition-colors flex-shrink-0" aria-label="검색 닫기">
            <X size={24} style={{ color: T.text }} />
          </button>
        </div>
      </header>

      <section className="flex-shrink-0 px-6 pb-5 bg-[#FDF6F0]">
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
      </section>

      <main
        ref={mainRef}
        onScroll={handleResultsScroll}
        className="flex-1 overflow-y-auto px-6 pb-10"
        style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}
      >
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
  );

  return typeof document === 'undefined' ? searchPage : createPortal(searchPage, document.body);
}
