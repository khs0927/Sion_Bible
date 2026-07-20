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
      className="min-h-screen bg-[#ECE6DC] text-[#28231F]"
      style={{
        backgroundImage: `linear-gradient(180deg,rgba(244,239,231,.86),rgba(234,227,216,.94)),url(${appBookBackground})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
        backgroundAttachment: 'fixed',
      }}
    >
      <div
        className="relative mx-auto min-h-screen max-w-[430px] overflow-x-hidden border-x border-white/60 bg-[#FBF7EF]/94 shadow-[0_0_42px_rgba(84,68,42,.12)] backdrop-blur-[2px]"
        style={{
          backgroundImage: 'radial-gradient(circle at 8% 14%,rgba(126,166,102,.10),transparent 22%),radial-gradient(circle at 92% 38%,rgba(244,178,81,.10),transparent 24%),linear-gradient(180deg,rgba(255,252,246,.86),rgba(249,244,235,.94))',
        }}
      >
        <ReadingRoomHeader onExit={onExit} onOpenBible={onOpenBible} />
        <main className="relative z-10 px-4 pb-[calc(112px+env(safe-area-inset-bottom))] pt-3">{children}</main>
        <ReadingRoomBottomNavigation />
      </div>
    </div>
  );
}
