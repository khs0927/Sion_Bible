import { BarChart3, BriefcaseBusiness, Home, LogOut, MoreHorizontal } from 'lucide-react';

type ReadingRoomBottomNavigationProps = {
  onExit: () => void;
};

const navItems = [
  { label: '홈', href: '/reading-room', icon: Home, section: 'home' },
  { label: '코스', href: '/reading-room/courses', icon: BriefcaseBusiness, section: 'courses' },
  { label: '기록', href: '/reading-room/records', icon: BarChart3, section: 'records' },
  { label: '더보기', href: '/reading-room/rewards', icon: MoreHorizontal, section: 'rewards' },
] as const;

function getCurrentSection() {
  if (typeof window === 'undefined') return 'home';
  const path = window.location.pathname;
  if (
    path.startsWith('/reading-room/courses')
    || path.startsWith('/reading-room/my-courses')
    || path.startsWith('/reading-room/course-detail')
    || path.startsWith('/reading-room/mission')
    || path.startsWith('/reading-room/course-complete')
  ) return 'courses';
  if (path.startsWith('/reading-room/records')) return 'records';
  if (path.startsWith('/reading-room/rewards')) return 'rewards';
  return 'home';
}

function navigate(path: string) {
  if (window.location.pathname !== path) window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

export function ReadingRoomBottomNavigation({ onExit }: ReadingRoomBottomNavigationProps) {
  const currentSection = getCurrentSection();

  return (
    <div role="navigation" aria-label="통독 하단 네비게이션" className="reading-room-bottom-nav fixed inset-x-0 bottom-0 z-[120] mx-auto max-w-[430px] border-t border-[#E9DFD2] bg-white/96 px-3 pb-[calc(env(safe-area-inset-bottom)+7px)] pt-2 shadow-[0_-8px_26px_rgba(80,65,42,.07)] backdrop-blur-xl">
      <div className="grid grid-cols-5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = currentSection === item.section;
          return (
            <button
              key={item.label}
              type="button"
              onClick={() => navigate(item.href)}
              aria-label={`${item.label} 페이지`}
              aria-current={active ? 'page' : undefined}
              className={['flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-2xl bg-transparent transition active:scale-90', active ? 'text-[#4E7F59]' : 'text-[#8F877D]'].join(' ')}
            >
              <span className={['grid h-7 w-8 place-items-center rounded-xl transition', active ? 'bg-[#EEF5EB]' : 'bg-transparent'].join(' ')}>
                <Icon className="h-[21px] w-[21px]" strokeWidth={active ? 2.4 : 1.9} fill={active && item.section === 'home' ? 'currentColor' : 'none'} />
              </span>
              <span className={['whitespace-nowrap text-[10px] leading-none tracking-[-.03em]', active ? 'font-black' : 'font-semibold'].join(' ')}>{item.label}</span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={onExit}
          aria-label="통독방 나가기"
          className="flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-2xl bg-transparent text-[#725F51] transition active:scale-90"
        >
          <span className="grid h-7 w-8 place-items-center rounded-xl bg-transparent">
            <LogOut className="h-[21px] w-[21px]" strokeWidth={2.1} />
          </span>
          <span className="whitespace-nowrap text-[10px] font-bold leading-none tracking-[-.03em]">나가기</span>
        </button>
      </div>
    </div>
  );
}
