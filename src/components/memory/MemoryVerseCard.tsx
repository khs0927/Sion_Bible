import { Trash2, BookOpen } from 'lucide-react';
import type { MemoryVerse } from '../../types/memory';

type ThemeTokens = Record<string, string>;

export function MemoryVerseCard({ verse, T, onPractice, onDelete }: { verse: MemoryVerse; T: ThemeTokens; onPractice: () => void; onDelete: () => void }) {
  return (
    <article 
      className="p-5 rounded-[28px] border transition-all shadow-sm"
      style={{ background: T.panel, borderColor: T.line }}
    >
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-3">
          <h3 className="title-font text-lg font-black" style={{ color: T.accent }}>
            {verse.ref}
          </h3>
          <button 
            onClick={onPractice} 
            className="px-3 h-8 rounded-full border flex items-center justify-center gap-1.5 font-bold text-xs shadow-sm active:scale-[0.98] transition-all"
            style={{ background: T.peach, borderColor: T.line, color: T.text }}
          >
            <BookOpen size={12} />
            <span>암송하기</span>
          </button>
        </div>
        <button 
          onClick={onDelete} 
          className="p-2 rounded-xl border transition-colors hover:bg-red-50 hover:text-red-500" 
          style={{ borderColor: T.line, background: T.solid, color: T.sub }}
        >
          <Trash2 size={13} />
        </button>
      </div>

      <p className="text-[15px] leading-relaxed serif-verse text-[#3D3129] line-clamp-3">
        "{verse.text}"
      </p>
    </article>
  );
}
