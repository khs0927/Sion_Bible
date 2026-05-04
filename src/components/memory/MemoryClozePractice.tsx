import { useMemo, useState } from 'react';
import { createClozeText } from '../../services/memoryPractice';
import { RefreshCw } from 'lucide-react';

type ThemeTokens = Record<string, string>;

export function MemoryClozePractice({ text }: { text: string; T: ThemeTokens }) {
  const [shuffleKey, setShuffleKey] = useState(0);
  const cloze = useMemo(() => createClozeText(text, 0.4), [text, shuffleKey]);
  const [revealedIndexes, setRevealedIndexes] = useState<Set<number>>(new Set());
  const [allShown, setAllShown] = useState(false);

  const shuffle = () => {
    setShuffleKey(k => k + 1);
    setRevealedIndexes(new Set());
    setAllShown(false);
  };

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
      setRevealedIndexes(new Set(cloze.hiddenIndexes));
      setAllShown(true);
    }
  };

  return (
    <section className="space-y-4 p-5 rounded-[28px] bg-white border border-[#e8d8ce] shadow-sm">
      <header className="flex items-center justify-between">
        <div className="text-[10px] font-black text-[#8d95d8] uppercase tracking-widest">
          Level 2 · 빈칸 채우기
        </div>
        <div className="flex gap-2">
          <button 
            onClick={shuffle}
            className="p-1.5 rounded-full bg-[#FFF8F1] text-[#A17C5B] border border-[#e8d8ce] active:rotate-180 transition-transform duration-500"
          >
            <RefreshCw size={14} />
          </button>
          <button 
            onClick={toggleAll}
            className="text-[10px] font-black text-[#A17C5B] bg-[#FFF8F1] px-3 py-1.5 rounded-full border border-[#e8d8ce]"
          >
            {allShown ? '모두 가리기' : '정답 확인'}
          </button>
        </div>
      </header>

      <p className="text-lg leading-[2] text-[#3D3129] serif-verse font-medium text-justify">
        {cloze.parts.map((part, index) => {
          const isHidden = part.hidden && !revealedIndexes.has(index);
          return (
            <span 
              key={`${part.token}-${index}`} 
              onClick={() => part.hidden && toggleReveal(index)}
              className={`inline-block mx-0.5 px-1 rounded-md transition-all cursor-pointer ${
                part.hidden 
                  ? isHidden 
                    ? 'bg-[#F5C292]/20 text-[#F5C292] border-b-2 border-[#F5C292]' 
                    : 'bg-[#8d95d8]/10 text-[#8d95d8] font-bold'
                  : ''
              }`}
            >
              {isHidden ? part.blank : part.token}
            </span>
          );
        })}
      </p>

      <div className="bg-[#FFF8F1] p-3 rounded-2xl border border-dashed border-[#e8d8ce]">
        <p className="text-[11px] text-[#A17C5B] font-bold text-center">
          💡 빈칸을 누르면 내용을 확인할 수 있습니다.
        </p>
      </div>
    </section>
  );
}
