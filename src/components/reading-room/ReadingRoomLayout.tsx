import type { ReactNode } from 'react';
import { ReadingRoomBottomNavigation } from '../navigation/ReadingRoomBottomNavigation';
import { ReadingRoomHeader } from './ReadingRoomHeader';

type ReadingRoomLayoutProps = {
  children: ReactNode;
  onExit: () => void;
  onOpenBible: () => void;
};

export function ReadingRoomLayout({ children, onExit, onOpenBible }: ReadingRoomLayoutProps) {
  return (
    <div className="min-h-screen bg-[#FAF5EC] text-[#2B2B2B]">
      <div className="relative mx-auto min-h-screen max-w-[430px] bg-[#FAF5EC]">
        <ReadingRoomHeader onExit={onExit} />
        <main className="px-4 pb-[calc(124px+env(safe-area-inset-bottom))] pt-3">{children}</main>
        <ReadingRoomBottomNavigation onOpenBible={onOpenBible} />
      </div>
    </div>
  );
}
