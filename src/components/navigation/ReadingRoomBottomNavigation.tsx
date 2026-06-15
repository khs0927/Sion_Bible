import { BarChart3, BookOpen, CalendarCheck, ClipboardList, Gift } from 'lucide-react';

const navItems = [
  { label: '오늘', href: '/reading-room', icon: CalendarCheck, section: 'today' },
  { label: '성경', href: '/bible', icon: BookOpen, section: 'bible' },
  { label: '통독', href: '/reading-room', icon: ClipboardList, section: 'plan', featured: true },
  { label: '기록', href: '/reading-room/records', icon: BarChart3, section: 'records' },
  { label: '보상', href: '/reading-room/rewards', icon: Gift, section: 'rewards' },
] as const;

type ReadingRoomBottomNavigationProps = {
  onOpenBible: () => void;
};

function getCurrentSection() {
  if (typeof window === 'undefined') return 'plan';
  if (window.location.pathname.startsWith('/reading-room/records')) return 'records';
  if (window.location.pathname.startsWith('/reading-room/rewards')) return 'rewards';
  return 'plan';
}

export function ReadingRoomBottomNavigation({ onOpenBible }: ReadingRoomBottomNavigationProps) {
  const currentSection = getCurrentSection();

  return (
    <nav
      aria-label="통독방 하단 네비게이션"
      className="fixed inset-x-0 bottom-0 z-[120] mx-auto h-[calc(84px+env(safe-area-inset-bottom))] max-w-[430px] border-t border-[#E8DDCD] bg-white/95 px-3 pb-[calc(env(safe-area-inset-bottom)+8px)] pt-2 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] backdrop-blur"
    >
      <div className="grid grid-cols-5 items-end">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = item.section === currentSection;

          if (item.featured) {
            return (
              <a
                key={item.label}
                href={item.href}
                aria-label={item.label}
                aria-current={active ? 'page' : undefined}
                className={[
                  'flex min-h-[66px] flex-col items-center justify-end gap-1 transition active:scale-95',
                  active ? 'text-[#4E7F59]' : 'text-[#8A8175]',
                ].join(' ')}
              >
                <div className={[
                  '-mt-7 flex h-14 w-14 items-center justify-center rounded-[18px] border shadow-[0_4px_14px_rgba(0,0,0,0.12)]',
                  active ? 'border-[#E3D8C8] bg-[#FFF7EE]' : 'border-[#E8DDCD] bg-white',
                ].join(' ')}>
                  <Icon className={['h-7 w-7', active ? 'text-[#4E7F59]' : 'text-[#8A8175]'].join(' ')} strokeWidth={2.2} />
                </div>
                <span className="text-[11px] font-bold leading-none">{item.label}</span>
              </a>
            );
          }

          return (
            <a
              key={item.label}
              href={item.href}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
              onClick={(event) => {
                if (item.label === '성경') {
                  event.preventDefault();
                  onOpenBible();
                }
              }}
              className={[
                'flex min-h-[66px] flex-col items-center justify-center gap-1 transition active:scale-95',
                active ? 'text-[#4E7F59]' : 'text-[#8A8175]',
              ].join(' ')}
            >
              <Icon className="h-5 w-5" strokeWidth={active ? 2.3 : 1.9} />
              <span className={['text-[11px] leading-none', active ? 'font-bold' : 'font-medium'].join(' ')}>{item.label}</span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}
