import { BarChart3, CalendarCheck, ClipboardList, Gift } from 'lucide-react';

const navItems = [
  { label: '오늘', href: '/reading-room/today', icon: CalendarCheck, section: 'today' },
  { label: '통독', href: '/reading-room', icon: ClipboardList, section: 'plan', featured: true },
  { label: '기록', href: '/reading-room/records', icon: BarChart3, section: 'records' },
  { label: '보상', href: '/reading-room/rewards', icon: Gift, section: 'rewards' },
] as const;

type ReadingRoomBottomNavigationProps = {
  onOpenBible: () => void;
};

function getCurrentSection() {
  if (typeof window === 'undefined') return 'plan';
  const path = window.location.pathname;
  if (path.startsWith('/reading-room/today')) return 'today';
  if (path.startsWith('/reading-room/records')) return 'records';
  if (path.startsWith('/reading-room/rewards')) return 'rewards';
  return 'plan';
}

function navigate(path: string) {
  if (window.location.pathname !== path) {
    window.history.pushState({}, '', path);
  }
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

export function ReadingRoomBottomNavigation({ onOpenBible }: ReadingRoomBottomNavigationProps) {
  void onOpenBible;
  const currentSection = getCurrentSection();

  return (
    <nav
      aria-label="통독방 하단 네비게이션"
      className="fixed inset-x-0 bottom-0 z-[120] mx-auto h-[calc(84px+env(safe-area-inset-bottom))] max-w-[430px] border-t border-[#E8DDCD] bg-white/95 px-3 pb-[calc(env(safe-area-inset-bottom)+8px)] pt-2 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] backdrop-blur"
    >
      <div className="grid grid-cols-4 items-end">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = item.section === currentSection;
          return (
            <button
              key={item.label}
              type="button"
              onClick={() => navigate(item.href)}
              aria-label={`${item.label} 페이지`}
              aria-current={active ? 'page' : undefined}
              className={[
                'flex min-h-[66px] flex-col items-center gap-1 bg-transparent transition active:scale-95',
                item.featured ? 'justify-end' : 'justify-center',
                active ? 'text-[#4E7F59]' : 'text-[#8A8175]',
              ].join(' ')}
            >
              {item.featured ? (
                <div className={[
                  '-mt-7 flex h-14 w-14 items-center justify-center rounded-[18px] border shadow-[0_4px_14px_rgba(0,0,0,0.12)]',
                  active ? 'border-[#D5E6D1] bg-[#F3F7EF]' : 'border-[#E8DDCD] bg-white',
                ].join(' ')}>
                  <Icon className="h-7 w-7" strokeWidth={2.2} />
                </div>
              ) : (
                <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 1.9} />
              )}
              <span className={['text-[11px] leading-none', active ? 'font-extrabold' : 'font-medium'].join(' ')}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
