import type { MemoryAutoReminder, MemoryReminderSettings, MemoryReviewResult, MemoryVerse, ReviewGrade } from '../types/memory';
import { scheduleNextReview } from './memoryScheduler';

const MEMORY_KEY = 'sion_memory_verses';
const REMINDER_KEY = 'sion_memory_reminders';
const AUTO_REMINDER_KEY = 'sion_memory_auto_reminders';

export function getMemoryVerses(): MemoryVerse[] {
  try {
    const raw = localStorage.getItem(MEMORY_KEY);
    return raw ? JSON.parse(raw) as MemoryVerse[] : [];
  } catch {
    return [];
  }
}

export function isVerseMemorized(ref: string, text: string): boolean {
  const verses = getMemoryVerses();
  const normalizedRef = ref.trim();
  const normalizedText = text.trim();
  return verses.some(v => v.ref === normalizedRef && v.text === normalizedText);
}

export function saveMemoryVerses(verses: MemoryVerse[]) {
  localStorage.setItem(MEMORY_KEY, JSON.stringify(verses));
}

export function addMemoryVerse(input: { 
  ref: string; 
  text: string; 
  note?: string;
  source?: 'bible-picker' | 'keyword-search' | 'saved' | 'manual' | 'today' | 'reading';
  verses?: { bookId: string; bookName: string; chapter: number; verse: number; text: string; }[];
}) {
  const now = new Date().toISOString();
  const verse: MemoryVerse = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ref: input.ref.trim(),
    text: input.text.trim(),
    note: input.note?.trim(),
    createdAt: now,
    updatedAt: now,
    box: 1,
    level: 1,
    nextReviewAt: now,
    reviewCount: 0,
    successCount: 0,
    failCount: 0,
    streak: 0,
    successInCurrentLevel: 0,
    source: input.source,
    verses: input.verses,
  };
  const next = [verse, ...getMemoryVerses()];
  saveMemoryVerses(next);
  return verse;
}

export function updateMemoryVerse(id: string, patch: Partial<Pick<MemoryVerse, 'ref' | 'text' | 'note'>>) {
  const next = getMemoryVerses().map((verse) => verse.id === id ? { ...verse, ...patch, updatedAt: new Date().toISOString() } : verse);
  saveMemoryVerses(next);
  return next.find((verse) => verse.id === id) ?? null;
}

export function deleteMemoryVerse(id: string) {
  saveMemoryVerses(getMemoryVerses().filter((verse) => verse.id !== id));
}

export function getDueMemoryVerses(now = new Date()) {
  return getMemoryVerses().filter((verse) => new Date(verse.nextReviewAt).getTime() <= now.getTime());
}

export function saveMemoryReviewResult(id: string, grade: ReviewGrade): MemoryReviewResult | null {
  const verses = getMemoryVerses();
  const target = verses.find((verse) => verse.id === id);
  if (!target) return null;
  const scheduled = scheduleNextReview(target, grade);
  saveMemoryVerses(verses.map((verse) => verse.id === id ? scheduled.verse : verse));
  return scheduled.result;
}

export function moveMemoryVerseLevel(id: string, delta: number) {
  const verses = getMemoryVerses();
  const next = verses.map((verse) => {
    if (verse.id !== id) return verse;
    const nextLevel = Math.min(5, Math.max(1, verse.level + delta));
    return { ...verse, level: nextLevel as any, updatedAt: new Date().toISOString() };
  });
  saveMemoryVerses(next);
  return next.find((v) => v.id === id) || null;
}

export function setMemoryVerseLevel(id: string, level: number) {
  const verses = getMemoryVerses();
  const next = verses.map((verse) => {
    if (verse.id !== id) return verse;
    const nextLevel = Math.min(5, Math.max(1, level));
    return { ...verse, level: nextLevel as any, updatedAt: new Date().toISOString() };
  });
  saveMemoryVerses(next);
  return next.find((v) => v.id === id) || null;
}

export function getMemoryReminderSettings(): MemoryReminderSettings {
  try {
    const raw = localStorage.getItem(REMINDER_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Migration: if old format, return default
      if (!parsed.mode) throw new Error('Old format');
      return parsed as MemoryReminderSettings;
    }
  } catch {}
  
  return {
    enabled: false,
    mode: 'time',
    auto: {
      enabled: false,
      preset: 'default',
      intervals: [1, 10, 30, 60, 1440],
    },
    time: {
      enabled: true,
      selectedTimes: ['07:00', '12:00', '21:00'],
    },
    count: {
      enabled: false,
      repeatCount: 3,
      activeStartTime: '07:00',
      activeEndTime: '22:00',
      generatedTimes: ['07:00', '14:30', '22:00'],
    },
    permission: typeof Notification === 'undefined' ? 'unsupported' : Notification.permission,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    updatedAt: new Date().toISOString(),
  };
}

export function saveMemoryReminderSettings(settings: MemoryReminderSettings) {
  localStorage.setItem(REMINDER_KEY, JSON.stringify({ ...settings, updatedAt: new Date().toISOString() }));
}

export function getAutoReminders(): MemoryAutoReminder[] {
  try {
    const raw = localStorage.getItem(AUTO_REMINDER_KEY);
    return raw ? JSON.parse(raw) as MemoryAutoReminder[] : [];
  } catch {
    return [];
  }
}

export function saveAutoReminders(reminders: MemoryAutoReminder[]) {
  localStorage.setItem(AUTO_REMINDER_KEY, JSON.stringify(reminders));
}
