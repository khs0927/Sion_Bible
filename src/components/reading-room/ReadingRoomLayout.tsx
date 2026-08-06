import type { ReactNode } from 'react';
import { appBookBackground } from '../../assets/design';
import { ReadingRoomBottomNavigation } from '../navigation/ReadingRoomBottomNavigation';
import { ReadingRoomHeader } from './ReadingRoomHeader';

type ReadingRoomLayoutProps = {
  children: ReactNode;
  onExit: () => void;
  onOpenBible: () => void;
};

function getLayoutMode() {
  if (typeof window === 'undefined') return { subpage: false, hideBottomNavigation: false };
  const path = window.location.pathname;
  const detail = path.startsWith('/reading-room/course-detail');
  const completion = path.startsWith('/reading-room/course-complete');
  const mission = path.startsWith('/reading-room/mission');
  return {
    subpage: detail || completion || mission,
    hideBottomNavigation: detail || completion,
  };
}

export function ReadingRoomLayout({ children, onExit, onOpenBible }: ReadingRoomLayoutProps) {
  const { subpage, hideBottomNavigation } = getLayoutMode();

  return (
    <div
      className="min-h-screen bg-[#EDE8DE] text-[#28231F]"
      style={{
        backgroundImage: `linear-gradient(180deg,rgba(241,237,228,.86),rgba(238,233,223,.94)),url(${appBookBackground})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
        backgroundAttachment: 'fixed',
      }}
    >
      <div className="relative mx-auto min-h-screen max-w-[430px] overflow-x-hidden bg-[linear-gradient(180deg,rgba(251,247,239,.94),rgba(255,252,246,.97))] shadow-[0_0_44px_rgba(84,68,42,.13)]">
        <div className="pointer-events-none absolute inset-0 opacity-[0.17]" style={{ backgroundImage: `url(${appBookBackground})`, backgroundSize: '760px auto', backgroundPosition: 'center top' }} />
        <div className="relative z-10">
          <ReadingRoomHeader onExit={onExit} onOpenBible={onOpenBible} />
          <main
            className={[
              'px-4',
              subpage ? 'pt-[calc(8px+env(safe-area-inset-top))]' : 'pt-3',
              hideBottomNavigation
                ? 'pb-[calc(28px+env(safe-area-inset-bottom))]'
                : 'pb-[calc(116px+env(safe-area-inset-bottom))]',
            ].join(' ')}
          >
            {children}
          </main>
          {!hideBottomNavigation && <ReadingRoomBottomNavigation />}
        </div>
      </div>
    </div>
  );
}
