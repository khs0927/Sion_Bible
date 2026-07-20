import { BookOpen, CalendarClock, Flame, Trash2 } from 'lucide-react';
import { designDecorations } from '../../assets/design';
import type { MemoryVerse } from '../../types/memory';
import { sanitizeScriptureText } from '../../utils/textUtils';

type ThemeTokens = Record<string, string>;

export function MemoryVerseCard({ verse, T, index = 0, onPractice, onDelete }: { verse: MemoryVerse; T: ThemeTokens; index?: number; onPractice: () => void; onDelete: () => void }) {
  const illustrations = [
    designDecorations.openBibleFlowers,
    designDecorations.leafSprig,
    designDecorations.doveBranch,
    designDecorations.flowerBunch,
  ];
  const levelPercent = Math.min(100, (Number(verse.level || 1) / 5) * 100);
  const nextReview = new Date(verse.nextReviewAt);
  const reviewLabel = Number.isNaN(nextReview.getTime())
    ? '복습 예정'
    : nextReview.getTime() <= Date.now()
      ? '오늘 복습'
      : `${nextReview.getMonth() + 1}.${nextReview.getDate()} 복습`;

  return (
    <article className="relative overflow-hidden rounded-[24px] border border-[#E7DDCF] bg-white/95 p-4 shadow-[0_7px_18px_rgba(70,58,39,.06)]">
      <img src={illustrations[index % illustrations.length]} alt="" className="pointer-events-none absolute -bottom-3 -right-2 h-24 w-24 object-contain opacity-24" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[17px] font-black text-[#4E7F59]">{verse.ref}</h3>
            <span className="flex items-center gap-1 rounded-full bg-[#FFF2D5] px-2 py-1 text-[9px] font-black text-[#B67620]"><CalendarClock className="h-3 w-3" />{reviewLabel}</span>
          </div>
          <p className="serif-verse mt-3 line-clamp-4 text-[14px] leading-7 text-[#3D3129]">{sanitizeScriptureText(verse.text)}</p>
          <div className="mt-3 flex items-center gap-2"><div className="h-2 flex-1 overflow-hidden rounded-full bg-[#EEE7DD]"><div className="h-full rounded-full bg-[linear-gradient(90deg,#78A96C,#4E7F59)]" style={{ width: `${levelPercent}%` }} /></div><b className="text-[10px] text-[#4E7F59]">Lv.{verse.level}</b></div>
          <div className="mt-3 flex items-center gap-2 text-[9px] font-bold text-[#81786E]"><span className="flex items-center gap-1"><Flame className="h-3.5 w-3.5 text-[#F08B35]" fill="currentColor" />연속 {verse.streak}회</span><span>복습 {verse.reviewCount}회</span></div>
        </div>
        <button type="button" onClick={onDelete} aria-label="암송 구절 삭제" className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[#E7DDCF] bg-[#FFF9F4] text-[#A58E7D] active:scale-90"><Trash2 className="h-4 w-4" /></button>
      </div>
      <button type="button" onClick={onPractice} className="relative mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#4E7F59] text-[12px] font-black text-white shadow-md active:scale-[0.99]"><BookOpen className="h-4 w-4" />암송 연습하기</button>
    </article>
  );
}
