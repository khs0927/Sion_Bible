import { useEffect, useMemo, useRef, useState, type TouchEvent as ReactTouchEvent, type UIEvent as ReactUIEvent } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, BookOpen, Loader2, Search, Sparkles, X } from 'lucide-react';
import { searchBibleVerses } from '../../services/bibleSearch';
import { aiSearchBibleVerses, type AiBibleSearchMeta, type AiBibleSearchSection } from '../../services/aiBibleSearch';
import type { BibleVerseRecord } from '../../types/bible';
import { sanitizeScriptureText } from '../../utils/textUtils';

interface BibleSearchSheetProps {
  onClose: () => void;
  onNavigate: (verse: BibleVerseRecord) => void;
  T: Record<string, string>;
  fontSize?: string;
}

const LIMIT = 50;
const VERSE_ONLY_SCROLL_TOP = 24;
const STORAGE_KEY = 'sion_bible_search_sheet_state';

type StoredSearch = {
  query?: string;
  aiMode?: boolean;
  scrollTop?: number;
};

function readStoredSearch(): StoredSearch {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}') as StoredSearch;
  } catch {
    return {};
  }
}

function writeStoredSearch(value: StoredSearch) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // 저장 실패는 검색 동작에 영향을 주지 않습니다.
  }
}

const stored = readStoredSearch();

export function BibleSearchSheet({ onClose, onNavigate, T, fontSize = '0.875rem' }: BibleSearchSheetProps) {
  const [query, setQuery] = useState(stored.query || '');
  const [aiMode, setAiMode] = useState(Boolean(stored.aiMode));
  const [results, setResults] = useState<BibleVerseRecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [aiMeta, setAiMeta] = useState<AiBibleSearchMeta | null>(null);
  const [verseOnly, setVerseOnly] = useState((stored.scrollTop || 0) > VERSE_ONLY_SCROLL_TOP);
  const mainRef = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const startYRef = useRef<number | null>(null);
  const startTopRef = useRef(0);

  useEffect(() => {
    const setVh = () => document.documentElement.style.setProperty('--sion-search-page-vh', `${window.innerHeight * 0.01}px`);
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    setVh();
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    window.addEventListener('resize', setVh);
    window.addEventListener('orientationchange', setVh);
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      window.removeEventListener('resize', setVh);
      window.removeEventListener('orientationchange', setVh);
    };
  }, []);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (query.trim().length >= 2) searchNow(true);
      else {
        setResults([]);
        setTotalCount(0);
        setHasMore(false);
        setAiMeta(null);
        setOffset(0);
        setVerseOnly(false);
      }
    }, aiMode ? 650 : 400);
    return () => window.clearTimeout(timer);
  }, [query, aiMode]);

  const sectionByVerseId = useMemo(() => {
    const map = new Map<string, AiBibleSearchSection>();
    if (!aiMode || !aiMeta?.sections) return map;
    aiMeta.sections.forEach(section => {
      section.verseIds.forEach(verseId => {
        if (!map.has(verseId)) map.set(verseId, section);
      });
    });
    return map;
  }, [aiMode, aiMeta]);

  const persist = (scrollTop = mainRef.current?.scrollTop || 0) => {
    writeStoredSearch({ query, aiMode, scrollTop });
  };

  const close = () => {
    persist();
    onClose();
  };

  const searchNow = async (reset = false) => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return;
    setLoading(true);
    try {
      const nextOffset = reset ? 0 : offset + LIMIT;
      if (aiMode) {
        const response = await aiSearchBibleVerses(trimmed, { limit: LIMIT, offset: nextOffset });
        setResults(reset ? response.items : prev => [...prev, ...response.items]);
        setTotalCount(response.totalCount);
        setHasMore(response.hasMore);
        setAiMeta(response.meta);
        setOffset(nextOffset);
      } else {
        const response = await searchBibleVerses(trimmed, { limit: LIMIT, offset: nextOffset });
        setResults(reset ? response.items : prev => [...prev, ...response.items]);
        setTotalCount(response.totalCount);
        setHasMore(response.hasMore);
        setAiMeta(null);
        setOffset(nextOffset);
      }
      if (reset) {
        mainRef.current?.scrollTo({ top: 0 });
        setVerseOnly(false);
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetSearch = () => {
    setResults([]);
    setTotalCount(0);
    setHasMore(false);
    setAiMeta(null);
    setOffset(0);
    setVerseOnly(false);
    mainRef.current?.scrollTo({ top: 0 });
  };

  const onScroll = (event: ReactUIEvent<HTMLElement>) => {
    const scrollTop = event.currentTarget.scrollTop;
    setVerseOnly(results.length > 0 && scrollTop > VERSE_ONLY_SCROLL_TOP);
    persist(scrollTop);
  };

  const onTouchStart = (event: ReactTouchEvent<HTMLElement>) => {
    const touch = event.touches[0];
    if (!touch) return;
    startYRef.current = touch.clientY;
    startTopRef.current = mainRef.current?.scrollTop || 0;
  };

  const onTouchEnd = (event: ReactTouchEvent<HTMLElement>) => {
    const touch = event.changedTouches[0];
    const startY = startYRef.current;
    if (!touch || startY === null) return;
    const delta = touch.clientY - startY;
    startYRef.current = null;

    if (delta < -28 && results.length > 0) {
      setVerseOnly(true);
      return;
    }

    if (startTopRef.current <= 2 && delta > 74) {
      if (verseOnly) setVerseOnly(false);
      else close();
    }
  };

  const page = (
    <div
      className="fixed inset-0 z-[9999] flex flex-col bg-[#FDF6F0]"
      style={{
        height: 'calc(var(--sion-search-page-vh, 1vh) * 100)',
        minHeight: '100dvh',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        overscrollBehavior: 'contain',
      }}
    >
      <header className={`flex-shrink-0 bg-[#FDF6F0] px-6 overflow-hidden transition-all duration-300 ${verseOnly ? 'max-h-0 pb-0 pt-0 opacity-0 pointer-events-none' : 'max-h-28 pb-4 pt-5 opacity-100'}`}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="rounded-2xl border bg-white p-2 shadow-sm" style={{ borderColor: T.line }}>
              {aiMode ? <Sparkles size={20} style={{ color: T.accent }} /> : <Search size={20} style={{ color: T.accent }} />}
            </div>
            <div className="min-w-0">
              <h2 className="title-font text-2xl font-black leading-tight" style={{ color: T.text }}>성경 검색</h2>
              {aiMode && <p className="mt-0.5 text-[11px] font-black" style={{ color: T.accent }}>AI 질문 검색 모드</p>}
            </div>
          </div>
          <button onClick={close} className="flex-shrink-0 rounded-full p-2 transition-colors hover:bg-black/5" aria-label="검색 닫기">
            <X size={24} style={{ color: T.text }} />
          </button>
        </div>
      </header>

      <section className={`flex-shrink-0 bg-[#FDF6F0] px-6 overflow-hidden transition-all duration-300 ${verseOnly ? 'max-h-0 pb-0 opacity-0 pointer-events-none' : 'max-h-[600px] pb-5 opacity-100'}`}>
        <div className="mb-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              setAiMode(false);
              resetSearch();
            }}
            className="h-11 rounded-2xl border-2 text-xs font-black transition-all active:scale-95"
            style={{ borderColor: !aiMode ? 'transparent' : T.line, background: !aiMode ? T.accent : 'white', color: !aiMode ? 'white' : T.sub }}
          >
            일반 검색
          </button>
          <button
            type="button"
            onClick={() => {
              setAiMode(true);
              resetSearch();
            }}
            className="flex h-11 items-center justify-center gap-1.5 rounded-2xl border-2 text-xs font-black transition-all active:scale-95"
            style={{ borderColor: aiMode ? 'transparent' : T.line, background: aiMode ? 'linear-gradient(145deg, #6F8F72, #86B7AD)' : 'white', color: aiMode ? 'white' : T.sub }}
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
            onChange={(event) => {
              setQuery(event.target.value);
              resetSearch();
            }}
            placeholder={aiMode ? '질문 검색: 사랑을 문맥적이고 순차적으로 보여줘' : '단어 검색: 사랑, 평안, 요한복음 3:16'}
            className="h-14 w-full rounded-2xl border-2 bg-white pl-12 pr-4 text-base font-bold transition-all focus:outline-none"
            style={{ borderColor: aiMode ? T.accent : T.line, color: T.text }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') searchNow(true);
            }}
          />
          {aiMode ? <Sparkles size={20} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40" /> : <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30" />}
          {loading && <Loader2 size={20} className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin opacity-40" />}
        </div>

        {aiMode && (
          <button
            type="button"
            onClick={() => searchNow(true)}
            disabled={loading || query.trim().length < 2}
            className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-black text-white transition-all active:scale-95 disabled:opacity-40"
            style={{ background: 'linear-gradient(145deg, #6F8F72, #86B7AD)' }}
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={17} />}
            AI 검색 실행
          </button>
        )}

        {aiMode && aiMeta && totalCount > 0 && (
          <div className="mt-3 rounded-2xl border bg-white/80 p-3" style={{ borderColor: T.line }}>
            <p className="text-xs font-black" style={{ color: T.accent }}>{aiMeta.summary}</p>
            <p className="mt-1 text-[11px] font-bold leading-relaxed" style={{ color: T.sub }}>{aiMeta.guide}</p>
            {aiMeta.sections.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {aiMeta.sections.slice(0, 5).map(section => (
                  <span key={section.id} className="rounded-full bg-[#EEF6F0] px-2 py-1 text-[10px] font-black" style={{ color: T.accent }}>{section.title}</span>
                ))}
              </div>
            )}
          </div>
        )}

        {totalCount > 0 && <p className="mt-2 px-1 text-xs font-black" style={{ color: T.accent }}>{aiMode ? 'AI 검색 결과' : '검색 결과'} {totalCount.toLocaleString()}건</p>}
      </section>

      <main
        ref={mainRef}
        onScroll={onScroll}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className={`flex-1 overflow-y-auto pb-10 transition-all duration-300 ${verseOnly ? 'px-4 pt-3' : 'px-6'}`}
        style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}
      >
        {verseOnly && totalCount > 0 && (
          <div className="sticky top-0 z-10 mb-3 rounded-2xl bg-[#FDF6F0]/95 py-2 backdrop-blur">
            <button
              type="button"
              onClick={() => {
                mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                setVerseOnly(false);
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
            {results.map((verse, index) => {
              const section = sectionByVerseId.get(verse.id);
              const previousSection = index > 0 ? sectionByVerseId.get(results[index - 1].id) : null;
              const showSection = aiMode && section && section.id !== previousSection?.id;

              return (
                <div key={verse.id} className="space-y-3">
                  {showSection && (
                    <div className="pt-2 pb-1">
                      <div className="rounded-2xl border bg-white/80 px-4 py-3 shadow-sm" style={{ borderColor: T.line }}>
                        <p className="title-font text-sm font-black" style={{ color: T.accent }}>{section.title}</p>
                        <p className="mt-1 text-[11px] font-bold leading-relaxed" style={{ color: T.sub }}>{section.description}</p>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      persist();
                      onNavigate(verse);
                    }}
                    className="group w-full rounded-3xl border bg-white p-5 text-left shadow-sm transition-all active:scale-[0.98]"
                    style={{ borderColor: T.line }}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="title-font rounded-lg bg-[#FDF6F0] px-2 py-1 text-xs font-black" style={{ color: T.accent }}>
                        {verse.bookName} {verse.chapter}:{verse.verse}
                      </span>
                      <ArrowRight size={14} className="opacity-0 transition-opacity group-hover:opacity-100" style={{ color: T.accent }} />
                    </div>
                    <p className="serif-verse whitespace-pre-wrap break-keep leading-relaxed" style={{ color: T.text, fontSize }}>
                      {sanitizeScriptureText(verse.text)}
                    </p>
                  </button>
                </div>
              );
            })}

            {hasMore && (
              <button
                onClick={() => searchNow()}
                disabled={loading}
                className="w-full rounded-2xl border-2 border-dashed bg-white py-4 text-sm font-black transition-all active:scale-95"
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
            <p className="text-sm font-black">{aiMode ? '질문으로 관련 구절을 찾아보세요.' : '찾고 싶은 단어나 구절을 입력해보세요.'}</p>
          </div>
        )}
      </main>
    </div>
  );

  return typeof document === 'undefined' ? page : createPortal(page, document.body);
}
