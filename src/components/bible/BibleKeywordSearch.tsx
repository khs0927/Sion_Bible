import { useState, useMemo } from 'react';
import { Search, Info, X } from 'lucide-react';
import { BIBLE_VERSE_INDEX } from '../../data/generated/bibleVerseIndex';
import { normalizeKoreanSearchText, highlightKeyword } from '../../services/bibleSearch';
import { BibleSearchResult } from '../../types/bible';

interface BibleKeywordSearchProps {
  onSelectVerses: (verses: { ref: string; text: string }[]) => void;
  selectedRefs: string[];
}

export function BibleKeywordSearch({
  onSelectVerses,
  selectedRefs,
}: BibleKeywordSearchProps) {
  const [query, setQuery] = useState('');
  
  const results = useMemo(() => {
    const q = normalizeKoreanSearchText(query);
    if (q.length < 2) return [];

    return BIBLE_VERSE_INDEX.filter(v => 
      v.searchText.includes(q) || 
      normalizeKoreanSearchText(v.bookName).includes(q)
    ).map(v => ({
      ref: `${v.bookName} ${v.chapter}:${v.verse}`,
      text: v.text,
      bookId: v.bookId,
      bookName: v.bookName,
      chapter: v.chapter,
      verse: v.verse
    })) as BibleSearchResult[];
  }, [query]);

  const handleToggleResult = (res: BibleSearchResult) => {
    const isSelected = selectedRefs.includes(res.ref);
    if (isSelected) {
      onSelectVerses([]); // This logic will be handled by the parent
    } else {
      onSelectVerses([{ ref: res.ref, text: res.text }]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-[24px] border border-[#e8d8ce] px-5 py-4 flex items-center gap-3 shadow-sm focus-within:border-[#8d95d8] transition-all">
        <Search size={20} className="text-[#A17C5B]" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="단어 검색: 사랑, 소망, 평안..."
          className="flex-1 bg-transparent outline-none text-sm font-bold text-[#3D3129]"
        />
        {query && (
          <button onClick={() => setQuery('')} className="p-1 rounded-full bg-gray-100">
            <X size={14} className="text-gray-400" />
          </button>
        )}
      </div>

      <div className="flex-1">
        {query.length > 0 && query.length < 2 && (
          <div className="flex items-center gap-2 p-4 text-[#8c786e] bg-[#FFF8F1] rounded-2xl border border-[#e8d8ce] text-xs font-bold">
            <Info size={16} />
            <span>두 글자 이상 입력해 주세요.</span>
          </div>
        )}

        {query.length >= 2 && results.length === 0 && (
          <div className="text-center py-12">
            <p className="text-[#8c786e] font-bold">검색 결과가 없습니다 :(</p>
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-3 pb-8">
            <p className="text-[10px] font-black text-[#A17C5B] uppercase tracking-widest px-1">
              검색 결과 {results.length}건
            </p>
            {results.map(res => {
              const isSelected = selectedRefs.includes(res.ref);
              return (
                <button
                  key={res.ref}
                  onClick={() => handleToggleResult(res)}
                  className={`w-full text-left p-5 rounded-[22px] border transition-all ${
                    isSelected
                    ? 'bg-[#8d95d8]/10 border-[#8d95d8] shadow-sm'
                    : 'bg-white border-white shadow-sm hover:border-[#F5C292]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black text-[#8d95d8]">{res.ref}</span>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      isSelected ? 'bg-[#8d95d8] border-[#8d95d8]' : 'border-[#e8d8ce] bg-white'
                    }`}>
                      {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                  </div>
                  <p 
                    className="text-sm leading-relaxed text-[#3D3129] serif-verse"
                    dangerouslySetInnerHTML={{ __html: highlightKeyword(res.text, query) }}
                  />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

