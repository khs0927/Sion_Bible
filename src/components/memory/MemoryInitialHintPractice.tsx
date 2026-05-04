import { useState } from 'react';
import { getKoreanInitials } from '../../services/memoryPractice';
import { Eye, EyeOff } from 'lucide-react';

type ThemeTokens = Record<string, string>;

export function MemoryInitialHintPractice({ text }: { text: string; T: ThemeTokens }) {
  const [revealed, setRevealed] = useState(false);
  const initials = getKoreanInitials(text);

  return (
    <section className="space-y-4 p-6 rounded-[28px] bg-white border border-[#e8d8ce] shadow-sm relative overflow-hidden">
      <header className="flex items-center justify-between relative z-10">
        <div className="text-[10px] font-black text-[#8d95d8] uppercase tracking-widest">
          Level 4 · 초성 힌트
        </div>
        <button 
          onClick={() => setRevealed(!revealed)}
          className="p-2 rounded-full bg-[#FFF8F1] text-[#A17C5B] border border-[#e8d8ce] hover:bg-[#FDF2E7] transition-colors"
        >
          {revealed ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </header>

      <div className="relative z-10">
        <p className={`text-xl leading-[2] text-[#3D3129] serif-verse font-black tracking-widest text-justify transition-all duration-500 ${revealed ? 'opacity-30 blur-[1px]' : 'opacity-100'}`}>
          {initials}
        </p>
        
        {revealed && (
          <div className="absolute inset-0 flex items-center justify-center animate-in fade-in zoom-in-95">
            <p className="text-lg leading-relaxed text-[#3D3129] serif-verse font-bold text-center bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-[#e8d8ce] shadow-xl">
              {text}
            </p>
          </div>
        )}
      </div>

      <div className="bg-[#FFF8F1] p-3 rounded-2xl border border-dashed border-[#e8d8ce] relative z-10">
        <p className="text-[11px] text-[#A17C5B] font-bold text-center">
          💡 초성만 보고 말씀을 떠올려보세요. 눈 아이콘을 누르면 본문이 보입니다.
        </p>
      </div>
      
      {/* Decorative background element */}
      <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-[#8d95d8]/5 rounded-full blur-2xl" />
    </section>
  );
}
