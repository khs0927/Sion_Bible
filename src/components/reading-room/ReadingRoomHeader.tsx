import { Bell, BookOpenCheck, ClipboardList, Gift, Leaf, Settings } from 'lucide-react';

type ReadingRoomHeaderProps = {
  onExit: () => void;
  onOpenBible: () => void;
};

function getHeaderMeta() {
  if (typeof window === 'undefined') return { title: '통독', icon: ClipboardList };
  const path = window.location.pathname;
  if (path.startsWith('/reading-room/courses')) return { title: '코스', icon: Leaf };
  if (path.startsWith('/reading-room/my-courses')) return { title: '나의 코스', icon: ClipboardList };
  if (path.startsWith('/reading-room/records')) return { title: '읽기 기록', icon: Leaf };
  if (path.startsWith('/reading-room/rewards')) return { title: '보상', icon: Gift };
  return { title: '통독', icon: ClipboardList };
}

function navigate(path: string) {
  if (typeof window === 'undefined') return;
  if (window.location.pathname !== path) window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

export function ReadingRoomHeader({ onExit, onOpenBible }: ReadingRoomHeaderProps) {
  const meta = getHeaderMeta();
  const HeaderIcon = meta.icon;

  return (
    <header className="sticky top-0 z-40 border-b border-[#EDE3D5]/80 bg-[#FBF7EF]/92 px-5 pb-3 pt-[calc(12px+env(safe-area-inset-top))] backdrop-blur-xl">
      <div className="flex h-12 items-center justify-between gap-3">
        <button type="button" onClick={onExit} aria-label="통독방 홈으로 나가기" className="flex min-w-0 items-center gap-3 text-left active:scale-[0.98]">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] border border-[#E6DDCF] bg-white text-[#4E7F59] shadow-[0_4px_12px_rgba(80,65,42,0.06)]">
            <HeaderIcon className="h-[23px] w-[23px]" strokeWidth={2} />
          </span>
          <span className="min-w-0">
            {meta.title === '통독' && <span className="block text-[10px] font-bold leading-none text-[#81786E]">시온성경</span>}
            <span className="mt-1 block truncate text-[21px] font-black leading-none tracking-[-0.03em] text-[#28231F]">{meta.title}</span>
          </span>
        </button>

        <div className="flex shrink-0 items-center gap-1.5">
          <button type="button" onClick={() => navigate('/reading-room/records')} aria-label="통독 알림과 기록" className="relative grid h-10 w-10 place-items-center rounded-full text-[#3D3934] transition active:scale-90">
            <Bell className="h-[22px] w-[22px]" strokeWidth={1.9} />
            <span className="absolute right-[7px] top-[7px] h-2 w-2 rounded-full border border-[#FBF7EF] bg-[#F06D45]" />
          </button>
          <button type="button" onClick={() => navigate('/reading-room/rewards')} aria-label="통독 설정과 보상" className="grid h-10 w-10 place-items-center rounded-full text-[#3D3934] transition active:scale-90">
            <Settings className="h-[22px] w-[22px]" strokeWidth={1.9} />
          </button>
          <button type="button" onClick={onOpenBible} aria-label="성경 본문 열기" title="성경 본문 열기" className="grid h-10 w-10 place-items-center rounded-full border border-[#D8E2D4] bg-[#F7FBF5] text-[#4E7F59] transition active:scale-90">
            <BookOpenCheck className="h-[20px] w-[20px]" strokeWidth={2} />
          </button>
        </div>
      </div>
    </header>
  );
}
