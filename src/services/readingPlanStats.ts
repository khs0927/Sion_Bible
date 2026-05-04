import type { ReadingPlanProgress, ReadingPlanTemplate } from '../types/readingPlan';

const DAY_MS = 24 * 60 * 60 * 1000;

export function getProgressPercent(template: ReadingPlanTemplate, progress: ReadingPlanProgress | null) {
  if (!progress) return 0;
  if (progress.completedDays.length === 0) return 0;
  return Math.min(100, Math.max(1, Math.round((progress.completedDays.length / template.days) * 100)));
}

export function getTodayReadingDay(template: ReadingPlanTemplate, progress: ReadingPlanProgress | null, now = new Date()) {
  if (!progress) return 1;
  const started = new Date(progress.startedAt);
  if (Number.isNaN(started.getTime())) return 1;
  const elapsed = Math.floor((startOfDay(now).getTime() - startOfDay(started).getTime()) / DAY_MS);
  return Math.min(template.days, Math.max(1, elapsed + 1));
}

export function isDayCompleted(progress: ReadingPlanProgress | null, day: number) {
  return Boolean(progress?.completedDays.includes(day));
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
