import { useMemo, useState } from 'react';
import { compareTokenOrder, shuffleTokens, splitVerseIntoChunks } from '../../services/memoryPractice';
import { RotateCcw, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';

type ThemeTokens = Record<string, string>;

export function MemoryArrangePractice({ text }: { text: string; T: ThemeTokens }) {
  const correct = useMemo(() => splitVerseIntoChunks(text), [text]);
  const [answer, setAnswer] = useState<string[]>([]);
  const [bank, setBank] = useState(() => shuffleTokens(correct));
  const [result, setResult] = useState<ReturnType<typeof compareTokenOrder> | null>(null);

  const moveToAnswer = (token: string) => {
    setBank(items => items.filter(item => item !== token));
    setAnswer(items => [...items, token]);
    setResult(null);
  };

  const moveToBank = (token: string) => {
    setAnswer(items => items.filter(item => item !== token));
    setBank(items => [...items, token]);
    setResult(null);
  };

  const handleCheck = () => {
    const res = compareTokenOrder(answer, correct);
    setResult(res);
    if (res.correct) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  };

  const handleReset = () => {
    setAnswer([]);
    setBank(shuffleTokens(correct));
    setResult(null);
  };

  return (
    <section className="space-y-6 p-5 rounded-[28px] bg-white border border-[#e8d8ce] shadow-sm">
      <header className="flex items-center justify-between">
        <div className="text-[10px] font-black text-[#8d95d8] uppercase tracking-widest">
          Level 3 · 순서 맞추기
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleReset}
            className="p-2 rounded-full bg-[#FFF8F1] text-[#A17C5B] border border-[#e8d8ce] hover:bg-[#FDF2E7] transition-colors"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </header>

      <div className="space-y-3">
        <label className="text-[10px] font-black text-[#A17C5B] px-1">조합된 말씀</label>
        <div className="min-h-[120px] p-4 rounded-2xl bg-[#FFF8F1] border-2 border-dashed border-[#e8d8ce] flex flex-wrap gap-2 content-start transition-all">
          {answer.length === 0 && (
            <div className="w-full h-full flex items-center justify-center py-4">
              <span className="text-xs font-bold text-[#8c786e]/40 italic">아래 단어들을 순서대로 선택하세요.</span>
            </div>
          )}
          {answer.map((token, i) => (
            <button
              key={`${token}-${i}`}
              onClick={() => moveToBank(token)}
              className="px-4 py-2 rounded-xl bg-white border border-[#e8d8ce] text-sm font-bold text-[#3D3129] shadow-sm hover:border-[#8d95d8] transition-all"
            >
              {token}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <label className="text-[10px] font-black text-[#A17C5B] px-1">단어 보관함</label>
        <div className="flex flex-wrap gap-2">
          {bank.map((token, i) => (
            <button
              key={`${token}-${i}`}
              onClick={() => moveToAnswer(token)}
              className="px-4 py-2 rounded-xl bg-[#8d95d8]/5 border border-[#8d95d8]/20 text-sm font-bold text-[#8d95d8] hover:bg-[#8d95d8]/10 transition-all"
            >
              {token}
            </button>
          ))}
        </div>
      </div>

      <div className="pt-2">
        {result ? (
          <div className={`p-4 rounded-2xl border flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 ${
            result.correct 
              ? 'bg-[#8d95d8] border-[#8d95d8] text-white' 
              : 'bg-[#FFF8F1] border-[#F5C292] text-[#3D3129]'
          }`}>
            <CheckCircle2 size={20} className={result.correct ? 'text-white' : 'text-[#F5C292]'} />
            <div className="flex-1">
              <p className="text-sm font-black">{result.correct ? '참 잘하셨습니다!' : '조금만 더 힘내세요!'}</p>
              <p className="text-[11px] font-medium opacity-80">
                {result.correct ? '말씀이 마음에 온전히 새겨졌습니다.' : `현재 ${result.percent}% 맞았습니다. 다시 시도해볼까요?`}
              </p>
            </div>
            {!result.correct && (
               <button onClick={handleReset} className="text-xs font-black px-3 py-1.5 rounded-full bg-white text-[#A17C5B] shadow-sm">재시도</button>
            )}
          </div>
        ) : (
          <button
            onClick={handleCheck}
            disabled={bank.length > 0}
            className="w-full py-4 rounded-2xl bg-[#F5C292] text-[#3D3129] font-black text-sm shadow-md hover:bg-[#F3B070] transition-all disabled:opacity-50 disabled:grayscale"
          >
            정답 확인하기
          </button>
        )}
      </div>
    </section>
  );
}
