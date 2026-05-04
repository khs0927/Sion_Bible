export type MemoryLevel = 1 | 2 | 3 | 4 | 5;
export type ReviewGrade = 'again' | 'hard' | 'good' | 'easy';

export interface MemoryVerse {
  id: string;
  ref: string;
  text: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
  box: number;
  level: MemoryLevel;
  nextReviewAt: string;
  lastReviewedAt?: string;
  reviewCount: number;
  successCount: number;
  failCount: number;
  streak: number;
  successInCurrentLevel: number;
  source?: 'bible-picker' | 'keyword-search' | 'saved' | 'manual' | 'today' | 'reading';
  verses?: { bookId: string; bookName: string; chapter: number; verse: number; text: string; }[];
}

export interface MemoryReviewResult {
  verseId: string;
  grade: ReviewGrade;
  reviewedAt: string;
  previousBox: number;
  nextBox: number;
  previousLevel: MemoryLevel;
  nextLevel: MemoryLevel;
  nextReviewAt: string;
}

export type MemoryReminderMode = 'auto' | 'time' | 'count';

export interface MemoryReminderSettings {
  enabled: boolean;
  mode: MemoryReminderMode;

  auto: {
    enabled: boolean;
    preset: 'default' | 'intensive' | 'relaxed';
    intervals: number[]; // minutes
  };

  time: {
    enabled: boolean;
    selectedTimes: string[]; // HH:mm
  };

  count: {
    enabled: boolean;
    repeatCount: 1 | 3 | 5;
    activeStartTime: string; // HH:mm
    activeEndTime: string; // HH:mm
    generatedTimes: string[];
  };

  permission: NotificationPermission | 'unsupported';
  timezone: string;
  updatedAt: string;
}

export interface MemoryAutoReminder {
  id: string;
  verseId: string;
  dueAt: string;
  intervalMinutes: number;
  completed: boolean;
  createdAt: string;
}
