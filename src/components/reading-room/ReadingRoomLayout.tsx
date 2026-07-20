import type { ReactNode } from 'react';
import { appBookBackground } from '../../assets/design';
import { ReadingRoomBottomNavigation } from '../navigation/ReadingRoomBottomNavigation';
import { ReadingRoomHeader } from './ReadingRoomHeader';

type ReadingRoomLayoutProps = {
  children: ReactNode;
  onExit: () => void;
  onOpenBible: () => void;
};

export function ReadingRoomLayout({ children, onExit, onOpenBible }: ReadingRoomLayoutProps) {
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
      <div className="relative mx-auto min-h-screen max-w-[430px] overflow-x-hidden bg-[linear-gradient(180deg,rgba(251,247,239,.94),rgba(255,252,246,.97))] shadow-[0_0_44px_rgba(84,68,42,0.13)]">
        <div className="pointer-events-none absolute inset-0 opacity-[0.17]" style={{ backgroundImage: `url(${appBookBackground})`, backgroundSize: '760px auto', backgroundPosition: 'center top' }} />
        <div className="relative z-10">
          <ReadingRoomHeader onExit={onExit} onOpenBible={onOpenBible} />
          <main className="px-4 pb-[calc(116px+env(safe-area-inset-bottom))] pt-3">{children}</main>
          <ReadingRoomBottomNavigation />
        </div>
      </div>
    </div>
  );
}
