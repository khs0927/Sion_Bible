import type { ReactNode } from 'react';
import { ReadingRoomBottomNavigation } from '../navigation/ReadingRoomBottomNavigation';
import { ReadingRoomHeader } from './ReadingRoomHeader';

type ReadingRoomLayoutProps = {
  children: ReactNode;
  onExit: () => void;
  onOpenBible: () => void;
};

export function ReadingRoomLayout({ children, onExit, onOpenBible }: ReadingRoomLayoutProps) {
  void onOpenBible;

  return (
    <div className="min-h-screen bg-[#F2EDE4] text-[#28231F]">
      <div className="relative mx-auto min-h-screen max-w-[430px] overflow-x-hidden bg-[#FBF7EF] shadow-[0_0_42px_rgba(84,68,42,0.08)]">
        <ReadingRoomHeader onExit={onExit} />
        <main className="px-4 pb-[calc(112px+env(safe-area-inset-bottom))] pt-3">{children}</main>
        <ReadingRoomBottomNavigation />
      </div>
    </div>
  );
}
