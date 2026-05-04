import { useState, useMemo } from 'react';

type ThemeTokens = Record<string, string>;

export function MemoryFullBlankPractice({ text }: { text: string; T: ThemeTokens }) {
  const tokens = useMemo(() => text.split(/(\s+)/).filter(t => t.trim().length > 0), [text]);
  const [revealedIndexes, setRevealedIndexes] = useState<Set<number>>(new Set());
  const [allShown, setAllShown] = useState(false);

  const toggleReveal = (index: number) => {
    const next = new Set(revealedIndexes);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setRevealedIndexes(next);
  };

  const toggleAll = () => {
    if (allShown) {
      setRevealedIndexes(new Set());
      setAllShown(false);
    } else {
      setRevealedIndexes(new Set(tokens.map((_, i) => i)));
      setAllShown(true);
    }
  };

  return (
    <section className="space-y-4 p-5 rounded-[28px] bg-white border border-[#e8d8ce] shadow-sm">
      <header className="flex items-center justify-between">
        <div className="text-[10px] font-black text-[#8d95d8] uppercase tracking-widest">
          Level 3 · 전체 빈칸
        </div>
        <button 
          onClick={toggleAll}
          className="text-[10px] font-black text-[#A17C5B] bg-[#FFF8F1] px-3 py-1.5 rounded-full border border-[#e8d8ce]"
        >
          {allShown ? '모두 가리기' : '정답 확인'}
        </button>
      </header>

      <p className="text-lg leading-[2] text-[#3D3129] serif-verse font-medium text-justify">
        {tokens.map((token, index) => {
          const isHidden = !revealedIndexes.has(index);
          const blank = '　'.repeat(Math.max(2, Math.min(6, token.length)));
          return (
            <span 
              key={`${token}-${index}`} 
              onClick={() => toggleReveal(index)}
              className={`inline-block mx-0.5 px-1 rounded-md transition-all cursor-pointer ${
                isHidden 
                  ? 'bg-[#F5C292]/20 text-[#F5C292] border-b-2 border-[#F5C292]' 
                  : 'bg-[#8d95d8]/10 text-[#8d95d8] font-bold'
              }`}
            >
              {isHidden ? blank : token}
            </span>
          );
        })}
      </p>

      <div className="bg-[#FFF8F1] p-3 rounded-2xl border border-dashed border-[#e8d8ce]">
        <p className="text-[11px] text-[#A17C5B] font-bold text-center">
          💡 모든 단어가 숨겨져 있습니다. 빈칸을 눌러 확인해 보세요.
        </p>
      </div>
    </section>
  );
}
