import { BookOpen, ClipboardList } from 'lucide-react';
import { ReadingRoomExitButton } from './ReadingRoomExitButton';

type ReadingRoomHeaderProps = {
  onExit: () => void;
  onOpenBible: () => void;
};

function sectionTitle() {
  if (typeof window === 'undefined') return '통독';
  const path = window.location.pathname;
  if (path.startsWith('/reading-room/today')) return '오늘 읽기';
  if (path.startsWith('/reading-room/records')) return '읽기 기록';
  if (path.startsWith('/reading-room/rewards')) return '보상';
  return '통독';
}

export function ReadingRoomHeader({ onExit, onOpenBible }: ReadingRoomHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-[#E8DDCD]/70 bg-[#FAF5EC]/95 px-4 py-3 backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm">
            <ClipboardList className="h-5 w-5 text-[#4E7F59]" strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold leading-none text-[#6B6B6B]">시온성경</p>
            <h1 className="mt-1 truncate text-[18px] font-bold leading-tight text-[#2B2B2B]">{sectionTitle()}</h1>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={onOpenBible}
            aria-label="성경 읽기 열기"
            className="flex h-9 items-center justify-center gap-1.5 rounded-full border border-[#E8DDCD] bg-white px-3 text-[12px] font-bold text-[#4E7F59] shadow-sm transition active:scale-95"
          >
            <BookOpen className="h-[17px] w-[17px]" strokeWidth={2} />
            성경
          </button>
          <ReadingRoomExitButton onExit={onExit} />
        </div>
      </div>
    </header>
  );
}
