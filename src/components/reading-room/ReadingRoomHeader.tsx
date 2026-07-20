import { Bell, BookOpen, ClipboardList, DoorOpen, Gift, Leaf, Settings } from 'lucide-react';
import { useState } from 'react';

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
  if (window.location.pathname !== path || window.location.hash !== '#settings') window.history.pushState({}, '', `${path}#settings`);
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.setTimeout(() => document.querySelector('#settings')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
}

export function ReadingRoomHeader({ onExit, onOpenBible }: ReadingRoomHeaderProps) {
  const meta = getHeaderMeta();
  const HeaderIcon = meta.icon;
  const [showNotification, setShowNotification] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-[#EDE3D5]/80 bg-[#FBF7EF]/94 px-5 pb-3 pt-[calc(12px+env(safe-area-inset-top))] backdrop-blur-xl">
      <div className="flex h-12 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] border border-[#E6DDCF] bg-white text-[#4E7F59] shadow-[0_4px_12px_rgba(80,65,42,.06)]">
            <HeaderIcon className="h-[23px] w-[23px]" strokeWidth={2} />
          </span>
          <div className="min-w-0">
            {meta.title === '통독' && <p className="text-[10px] font-bold leading-none text-[#81786E]">시온성경</p>}
            <h1 className="mt-1 truncate text-[21px] font-black leading-none tracking-[-.03em] text-[#28231F]">{meta.title}</h1>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button type="button" onClick={() => setShowNotification((value) => !value)} aria-label="통독 알림 확인" className="relative grid h-10 w-10 place-items-center rounded-full text-[#3D3934] transition active:scale-90">
            <Bell className="h-[22px] w-[22px]" strokeWidth={1.9} />
            <span className="absolute right-[7px] top-[7px] h-2 w-2 rounded-full border border-[#FBF7EF] bg-[#F06D45]" />
          </button>
          <button type="button" onClick={() => navigate('/reading-room/rewards')} aria-label="통독 설정 열기" className="grid h-10 w-10 place-items-center rounded-full text-[#3D3934] transition active:scale-90">
            <Settings className="h-[22px] w-[22px]" strokeWidth={1.9} />
          </button>
          <button type="button" onClick={onOpenBible} aria-label="성경 읽기 열기" className="grid h-10 w-10 place-items-center rounded-full text-[#4E7F59] transition active:scale-90">
            <BookOpen className="h-[21px] w-[21px]" strokeWidth={2} />
          </button>
          <button type="button" onClick={onExit} aria-label="통독방 나가기" title="통독방 나가기" className="grid h-9 w-9 place-items-center rounded-full border border-[#D8E2D4] bg-[#F7FBF5] text-[#4E7F59] transition active:scale-90">
            <DoorOpen className="h-[18px] w-[18px]" strokeWidth={2} />
          </button>
        </div>
      </div>
      {showNotification && (
        <div className="absolute right-4 top-[calc(72px+env(safe-area-inset-top))] w-[250px] rounded-[20px] border border-[#E5DACB] bg-[#FFFDF8] p-4 shadow-[0_14px_34px_rgba(69,55,39,.18)]">
          <p className="text-[13px] font-black text-[#3C352E]">오늘의 통독 알림</p>
          <p className="mt-1 text-[11px] font-semibold leading-5 text-[#756D64]">오늘 읽을 분량이 준비되어 있습니다. 알림 사용 여부는 설정에서 바꿀 수 있어요.</p>
          <button type="button" onClick={() => { setShowNotification(false); navigate('/reading-room/rewards'); }} className="mt-3 h-9 w-full rounded-full bg-[#4E7F59] text-[11px] font-black text-white">알림 설정 보기</button>
        </div>
      )}
    </header>
  );
}
