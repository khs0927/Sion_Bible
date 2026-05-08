import { BarChart3, BookOpen, CalendarCheck, ClipboardList, Gift } from 'lucide-react';

type ReadingRoomBottomNavigationProps = {
  onOpenBible: () => void;
};

const navItems = [
  { label: '오늘', href: '/reading-room', icon: CalendarCheck },
  { label: '성경', href: '/bible', icon: BookOpen },
  { label: '통독', href: '/reading-room', icon: ClipboardList, active: true, featured: true },
  { label: '기록', href: '/reading-room/records', icon: BarChart3 },
  { label: '보상', href: '/reading-room/rewards', icon: Gift },
];

export function ReadingRoomBottomNavigation({ onOpenBible }: ReadingRoomBottomNavigationProps) {
  return (
    <nav
      aria-label="통독방 하단 네비게이션"
      className="fixed inset-x-0 bottom-0 z-[120] mx-auto h-[calc(84px+env(safe-area-inset-bottom))] max-w-[430px] border-t border-[#E8DDCD] bg-white/95 px-3 pb-[calc(env(safe-area-inset-bottom)+8px)] pt-2 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] backdrop-blur"
    >
      <div className="grid grid-cols-5 items-end">
        {navItems.map((item) => {
          const Icon = item.icon;

          if (item.featured) {
            return (
              <a
                key={item.label}
                href={item.href}
                aria-label={item.label}
                aria-current="page"
                className="flex min-h-[66px] flex-col items-center justify-end gap-1 text-[#4E7F59]"
              >
                <div className="-mt-7 flex h-14 w-14 items-center justify-center rounded-[18px] border border-[#E3D8C8] bg-[#FFF7EE] shadow-[0_4px_14px_rgba(0,0,0,0.12)]">
                  <Icon className="h-7 w-7 text-[#4E7F59]" strokeWidth={2.2} />
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
              onClick={(event) => {
                if (item.label === '성경') {
                  event.preventDefault();
                  onOpenBible();
                  return;
                }
                if (item.href.startsWith('/reading-room')) {
                  event.preventDefault();
                }
              }}
              className="flex min-h-[66px] flex-col items-center justify-center gap-1 text-[#8A8175] transition active:scale-95"
            >
              <Icon className="h-5 w-5" strokeWidth={1.9} />
              <span className="text-[11px] font-medium leading-none">{item.label}</span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}
