import type { ReadingPlanProgress, ReadingPlanTemplate } from '../types/readingPlan';

const ACTIVE_PLAN_KEY = 'sion_reading_active_plan';

function normalize(progress: ReadingPlanProgress): ReadingPlanProgress {
  return {
    ...progress,
    completedDays: Array.from(new Set(progress.completedDays)).sort((a, b) => a - b),
  };
}

function notifyReadingPlanStarted(progress: ReadingPlanProgress, template: ReadingPlanTemplate) {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(new CustomEvent('sion-reading-plan-started', {
    detail: { progress: normalize(progress), template },
  }));
}

export function getActiveReadingPlan(): ReadingPlanProgress | null {
  try {
    const raw = localStorage.getItem(ACTIVE_PLAN_KEY);
    if (!raw) return null;
    const progress = JSON.parse(raw) as ReadingPlanProgress;
    if (!progress.templateId || !progress.startedAt || !Array.isArray(progress.completedDays)) return null;
    return normalize(progress);
  } catch {
    return null;
  }
}

export function saveActiveReadingPlan(progress: ReadingPlanProgress) {
  localStorage.setItem(ACTIVE_PLAN_KEY, JSON.stringify(normalize(progress)));
}

export function startReadingPlan(template: ReadingPlanTemplate) {
  const progress: ReadingPlanProgress = {
    templateId: template.id,
    startedAt: new Date().toISOString(),
    completedDays: [],
  };
  saveActiveReadingPlan(progress);
  notifyReadingPlanStarted(progress, template);
  return progress;
}

export function completeReadingDay(progress: ReadingPlanProgress, day: number) {
  const next = normalize({ ...progress, completedDays: [...progress.completedDays, day] });
  saveActiveReadingPlan(next);
  return next;
}

export function uncompleteReadingDay(progress: ReadingPlanProgress, day: number) {
  const next = normalize({ ...progress, completedDays: progress.completedDays.filter((value) => value !== day) });
  saveActiveReadingPlan(next);
  return next;
}

export function toggleReadingDay(progress: ReadingPlanProgress, day: number) {
  return progress.completedDays.includes(day) ? uncompleteReadingDay(progress, day) : completeReadingDay(progress, day);
}
