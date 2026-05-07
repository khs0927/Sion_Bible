import { useState, useEffect } from 'react';
import { Search, Info, X, Loader2 } from 'lucide-react';
import { searchBibleVerses, highlightKeyword } from '../../services/bibleSearch';
import { BibleSearchResult } from '../../types/bible';
import { sanitizeScriptureText } from '../../utils/textUtils';

interface BibleKeywordSearchProps {
  onSelectVerses: (verses: { ref: string; text: string }[]) => void;
  selectedRefs: string[];
}

export function BibleKeywordSearch({
  onSelectVerses,
  selectedRefs,
}: BibleKeywordSearchProps) {
  const pageSize = 50;
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<BibleSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim().length >= 2) {
        handleSearch();
      } else {
        setResults([]);
        setTotalCount(0);
        setHasMore(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [query]);

  const mapResult = (v: Awaited<ReturnType<typeof searchBibleVerses>>['items'][number]): BibleSearchResult => ({
    ref: `${v.bookName} ${v.chapter}:${v.verse}`,
    text: sanitizeScriptureText(v.text),
    bookId: v.bookId,
    bookName: v.bookName,
    chapter: v.chapter,
    verse: v.verse
  });

  const handleSearch = async (append = false) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const { items, totalCount: total, hasMore: more } = await searchBibleVerses(query, { 
        limit: pageSize, 
        offset: append ? results.length : 0 
      });
      const next = items.map(mapResult);
      setResults(append ? [...results, ...next] : next);
      setTotalCount(total);
      setHasMore(more);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleToggleResult = (res: BibleSearchResult) => {
    onSelectVerses([{ ref: res.ref, text: res.text }]);
  };

  return (
    <div className="space-y-3">
      <div className="sticky top-0 z-10 bg-white rounded-[16px] border border-[#e8d8ce] px-4 py-3 flex items-center gap-3 shadow-sm focus-within:border-[#8d95d8] transition-all">
        <Search size={18} className="text-[#A17C5B]" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="단어 검색: 사랑, 소망, 평안..."
          className="flex-1 bg-transparent outline-none text-sm font-bold text-[#3D3129]"
        />
        {query && (
          <button aria-label="검색어 지우기" onClick={() => setQuery('')} className="p-1 rounded-full bg-gray-100">
            <X size={14} className="text-gray-400" />
          </button>
        )}
      </div>

      <div className="flex-1">
        {loading && (
          <div className="flex flex-col items-center justify-center py-12 text-[#8c786e] gap-3">
            <Loader2 size={32} className="animate-spin opacity-40" />
            <p className="text-sm font-bold">검색 중...</p>
          </div>
        )}

        {!loading && query.length > 0 && query.trim().length < 2 && (
          <div className="flex items-center gap-2 p-4 text-[#8c786e] bg-[#FFF8F1] rounded-2xl border border-[#e8d8ce] text-xs font-bold">
            <Info size={16} />
            <span>두 글자 이상 입력해 주세요.</span>
          </div>
        )}

        {!loading && query.trim().length >= 2 && results.length === 0 && (
          <div className="text-center py-12">
            <p className="text-[#8c786e] font-bold">검색 결과가 없습니다 :(</p>
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className="space-y-2 pb-3">
            <p className="text-[10px] font-black text-[#A17C5B] uppercase tracking-widest px-1">
              검색 결과 {results.length}/{totalCount}건
            </p>
            {results.map(res => {
              const isSelected = selectedRefs.includes(res.ref);
              return (
                <button
                  key={res.ref}
                  onClick={() => handleToggleResult(res)}
                  className={`w-full text-left px-4 py-3 rounded-[16px] border transition-all ${
                    isSelected
                    ? 'bg-[#8d95d8]/10 border-[#8d95d8] shadow-sm'
                    : 'bg-white border-white shadow-sm hover:border-[#F5C292]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-black text-[#8d95d8]">{res.ref}</span>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      isSelected ? 'bg-[#8d95d8] border-[#8d95d8]' : 'border-[#e8d8ce] bg-white'
                    }`}>
                      {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                  </div>
                  <p 
                    className="text-sm leading-relaxed text-[#3D3129] serif-verse"
                    dangerouslySetInnerHTML={{ __html: highlightKeyword(sanitizeScriptureText(res.text), query) }}
                  />
                </button>
              );
            })}
            {hasMore && (
              <button
                onClick={() => handleSearch(true)}
                disabled={loadingMore}
                className="w-full min-h-[46px] rounded-[16px] border bg-white text-sm font-black shadow-sm disabled:opacity-60"
                style={{ borderColor: '#e8d8ce', color: '#3D3129' }}
              >
                {loadingMore ? '더 불러오는 중...' : `구절 더보기 (${totalCount - results.length}개 남음)`}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
