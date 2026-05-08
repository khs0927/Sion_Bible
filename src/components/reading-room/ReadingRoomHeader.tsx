import { Bell, ClipboardList, Settings } from 'lucide-react';
import { ReadingRoomExitButton } from './ReadingRoomExitButton';

type ReadingRoomHeaderProps = {
  onExit: () => void;
};

export function ReadingRoomHeader({ onExit }: ReadingRoomHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-[#E8DDCD]/70 bg-[#FAF5EC]/95 px-4 py-3 backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
            <ClipboardList className="h-5 w-5 text-[#4E7F59]" strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold leading-none text-[#6B6B6B]">시온성경</p>
            <h1 className="mt-1 truncate text-[18px] font-bold leading-tight text-[#2B2B2B]">통독</h1>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            aria-label="알림"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E8DDCD] bg-white text-[#6B6B6B] shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition active:scale-95"
          >
            <Bell className="h-[18px] w-[18px]" strokeWidth={1.9} />
          </button>
          <button
            type="button"
            aria-label="설정"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E8DDCD] bg-white text-[#6B6B6B] shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition active:scale-95"
          >
            <Settings className="h-[18px] w-[18px]" strokeWidth={1.9} />
          </button>
          <ReadingRoomExitButton onExit={onExit} />
        </div>
      </div>
    </header>
  );
}
