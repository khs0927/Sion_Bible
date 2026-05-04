import type { MemoryLevel, MemoryReviewResult, MemoryVerse, ReviewGrade } from '../types/memory';

const BOX_INTERVAL_DAYS: Record<number, number> = {
  1: 1,
  2: 2,
  3: 4,
  4: 7,
  5: 14,
  6: 30,
  7: 60,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function clampLevel(value: number): MemoryLevel {
  return clamp(value, 1, 5) as MemoryLevel;
}

function addDays(days: number, from = new Date()) {
  const next = new Date(from);
  next.setDate(next.getDate() + Math.max(1, Math.ceil(days)));
  return next.toISOString();
}

export function scheduleNextReview(verse: MemoryVerse, grade: ReviewGrade, now = new Date()): { verse: MemoryVerse; result: MemoryReviewResult } {
  const previousBox = verse.box;
  const previousLevel = verse.level;
  let nextBox = verse.box;
  let nextLevel = verse.level;
  let nextSuccessInCurrentLevel = verse.successInCurrentLevel;
  let nextStreak = verse.streak;
  let successCount = verse.successCount;
  let failCount = verse.failCount;
  let interval = BOX_INTERVAL_DAYS[verse.box] ?? 1;

  if (grade === 'again') {
    nextBox = 1;
    nextLevel = clampLevel(verse.level - 1);
    nextSuccessInCurrentLevel = 0;
    nextStreak = 0;
    failCount += 1;
    interval = 1;
  }

  if (grade === 'hard') {
    nextBox = verse.box;
    nextLevel = verse.level;
    nextSuccessInCurrentLevel = 0;
    nextStreak = 0;
    failCount += 1;
    interval = Math.max(1, (BOX_INTERVAL_DAYS[verse.box] ?? 1) * 0.5);
  }

  if (grade === 'good') {
    nextBox = clamp(verse.box + 1, 1, 7);
    nextSuccessInCurrentLevel += 1;
    nextLevel = nextSuccessInCurrentLevel >= 2 ? clampLevel(verse.level + 1) : verse.level;
    if (nextLevel !== verse.level) nextSuccessInCurrentLevel = 0;
    nextStreak += 1;
    successCount += 1;
    interval = BOX_INTERVAL_DAYS[nextBox] ?? 1;
  }

  if (grade === 'easy') {
    nextBox = clamp(verse.box + 2, 1, 7);
    nextLevel = clampLevel(verse.level + 1);
    nextSuccessInCurrentLevel = 0;
    nextStreak += 1;
    successCount += 1;
    interval = BOX_INTERVAL_DAYS[nextBox] ?? 1;
  }

  const nextReviewAt = addDays(interval, now);
  const nextVerse: MemoryVerse = {
    ...verse,
    box: nextBox,
    level: nextLevel,
    nextReviewAt,
    lastReviewedAt: now.toISOString(),
    reviewCount: verse.reviewCount + 1,
    successCount,
    failCount,
    streak: nextStreak,
    successInCurrentLevel: nextSuccessInCurrentLevel,
    updatedAt: now.toISOString(),
  };

  return {
    verse: nextVerse,
    result: {
      verseId: verse.id,
      grade,
      reviewedAt: now.toISOString(),
      previousBox,
      nextBox,
      previousLevel,
      nextLevel,
      nextReviewAt,
    },
  };
}
