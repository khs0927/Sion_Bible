import type { MemoryAutoReminder, MemoryReminderSettings } from '../types/memory';
import {
  getAutoReminders,
  getMemoryReminderSettings,
  saveAutoReminders,
  saveMemoryReminderSettings,
} from './memoryStorage';

const REMINDER_TITLE = '암송 복습 시간입니다';
const REMINDER_BODY = '기억이 흐려지기 전에 말씀을 다시 확인해보세요!';
const MAX_TIMER_DELAY = 2_147_000_000;

let nextReminderTimeout: ReturnType<typeof setTimeout> | null = null;
let engineInitialized = false;

export function isNotificationSupported() {
  return typeof Notification !== 'undefined';
}

export function getNotificationPermissionState(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!isNotificationSupported()) return 'unsupported';

  const permission = await Notification.requestPermission();
  const settings = getMemoryReminderSettings();
  saveMemoryReminderSettings({
    ...settings,
    enabled: permission === 'granted' ? true : settings.enabled,
    permission,
  });

  if (permission === 'granted') syncMemoryReminderSchedule();
  return permission;
}

/**
 * Prefer the registered service worker because it is the most reliable
 * notification surface for installed/mobile PWAs. Fall back to the page
 * Notification API when a service worker is not available.
 */
export async function showMemoryNotification(title = REMINDER_TITLE, body = REMINDER_BODY) {
  if (getNotificationPermissionState() !== 'granted') return false;

  const options: NotificationOptions = {
    body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'sion-memory-reminder',
    data: { url: '/?open=memory' },
  };

  try {
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, options);
      return true;
    }

    const notification = new Notification(title, options);
    notification.onclick = () => {
      window.focus();
      window.location.assign('/?open=memory');
      notification.close();
    };
    return true;
  } catch (error) {
    console.error('Memory notification error:', error);
    return false;
  }
}

export function calculateDistributedReminderTimes(
  startTime: string,
  endTime: string,
  count: 1 | 3 | 5,
): string[] {
  const parse = (value: string) => {
    const [hour = 0, minute = 0] = value.split(':').map(Number);
    return (hour * 60) + minute;
  };
  const format = (minutes: number) => {
    const normalized = ((Math.round(minutes) % 1440) + 1440) % 1440;
    const hour = Math.floor(normalized / 60);
    const minute = normalized % 60;
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  };

  const startMinutes = parse(startTime);
  let endMinutes = parse(endTime);
  if (endMinutes <= startMinutes) endMinutes += 1440;
  const duration = endMinutes - startMinutes;

  if (count === 1) return [format(startMinutes + (duration / 2))];

  const step = duration / (count - 1);
  return Array.from({ length: count }, (_, index) => format(startMinutes + (index * step)));
}

const PRESETS: Record<MemoryReminderSettings['auto']['preset'], number[]> = {
  default: [1, 10, 30, 60, 1440],
  intensive: [1, 5, 15, 30, 60],
  relaxed: [10, 30, 120, 1440],
};

export function createAutoReminderSchedule(
  verseId: string,
  presetKey: MemoryReminderSettings['auto']['preset'] = 'default',
) {
  const intervals = PRESETS[presetKey];
  const now = new Date();
  const reminders: MemoryAutoReminder[] = intervals.map((minutes, index) => ({
    id: `${verseId}-${index}-${Date.now()}`,
    verseId,
    dueAt: new Date(now.getTime() + (minutes * 60_000)).toISOString(),
    intervalMinutes: minutes,
    completed: false,
    createdAt: now.toISOString(),
  }));

  saveAutoReminders([...getAutoReminders(), ...reminders]);
  syncMemoryReminderSchedule();
  return reminders;
}

function reminderTimesForSettings(settings: MemoryReminderSettings) {
  if (settings.mode === 'time') {
    return [...new Set(settings.time.selectedTimes)].sort();
  }
  if (settings.mode === 'count') {
    return calculateDistributedReminderTimes(
      settings.count.activeStartTime,
      settings.count.activeEndTime,
      settings.count.repeatCount,
    );
  }
  return [];
}

function dateAtTime(base: Date, value: string) {
  const [hour = 0, minute = 0] = value.split(':').map(Number);
  const date = new Date(base);
  date.setHours(hour, minute, 0, 0);
  return date;
}

function getNextDailyReminder(settings: MemoryReminderSettings, now = new Date()) {
  const times = reminderTimesForSettings(settings);
  if (times.length === 0) return null;

  const minimum = now.getTime() + 1000;
  for (const time of times) {
    const candidate = dateAtTime(now, time);
    if (candidate.getTime() >= minimum) return candidate;
  }

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return dateAtTime(tomorrow, times[0]);
}

function getNextAutoReminder(now = new Date()) {
  return getAutoReminders()
    .filter((reminder) => !reminder.completed && new Date(reminder.dueAt).getTime() > now.getTime())
    .sort((left, right) => new Date(left.dueAt).getTime() - new Date(right.dueAt).getTime())[0] ?? null;
}

async function deliverDueAutoReminders() {
  const now = Date.now();
  const all = getAutoReminders();
  const due = all.filter((reminder) => !reminder.completed && new Date(reminder.dueAt).getTime() <= now);
  if (due.length === 0) return false;

  const delivered = await showMemoryNotification();
  if (delivered) {
    const dueIds = new Set(due.map((reminder) => reminder.id));
    saveAutoReminders(all.map((reminder) => (
      dueIds.has(reminder.id) ? { ...reminder, completed: true } : reminder
    )));
  }
  return delivered;
}

function clearScheduledTimer() {
  if (nextReminderTimeout) clearTimeout(nextReminderTimeout);
  nextReminderTimeout = null;
}

function scheduleAt(date: Date, callback: () => void | Promise<void>) {
  clearScheduledTimer();
  const delay = Math.max(1000, Math.min(MAX_TIMER_DELAY, date.getTime() - Date.now()));
  nextReminderTimeout = setTimeout(() => {
    void Promise.resolve(callback()).finally(() => syncMemoryReminderSchedule());
  }, delay);
}

/**
 * Synchronize the active reminder mode with one live timer.
 * Browser timers work while the app is alive. When the app is reopened or
 * becomes visible, initializeMemoryReminderEngine recalculates missed work.
 */
export function syncMemoryReminderSchedule() {
  clearScheduledTimer();

  if (typeof window === 'undefined') return null;
  const settings = getMemoryReminderSettings();
  if (!settings.enabled || getNotificationPermissionState() !== 'granted') return null;

  if (settings.mode === 'auto') {
    void deliverDueAutoReminders().then(() => {
      const next = getNextAutoReminder();
      if (next) scheduleAt(new Date(next.dueAt), deliverDueAutoReminders);
    });
    return getNextAutoReminder()?.dueAt ?? null;
  }

  const next = getNextDailyReminder(settings);
  if (!next) return null;
  scheduleAt(next, () => showMemoryNotification());
  return next.toISOString();
}

export function getReminderSchedulePreview(settings = getMemoryReminderSettings()) {
  if (!settings.enabled) return { times: [] as string[], nextAt: null as string | null };

  if (settings.mode === 'auto') {
    const next = getNextAutoReminder();
    return {
      times: PRESETS[settings.auto.preset].map((minutes) => `${minutes}분 후`),
      nextAt: next?.dueAt ?? null,
    };
  }

  const times = reminderTimesForSettings(settings);
  return {
    times,
    nextAt: getNextDailyReminder(settings)?.toISOString() ?? null,
  };
}

export function initializeMemoryReminderEngine() {
  if (typeof window === 'undefined') return;

  syncMemoryReminderSchedule();
  if (engineInitialized) return;
  engineInitialized = true;

  const resync = () => syncMemoryReminderSchedule();
  window.addEventListener('focus', resync);
  window.addEventListener('storage', (event) => {
    if (event.key === 'sion_memory_reminders' || event.key === 'sion_memory_auto_reminders') resync();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') resync();
  });
}

// Backward-compatible name used by existing callers.
export function scheduleNextInAppReminder() {
  return syncMemoryReminderSchedule();
}

export function getDueAutoReminders() {
  const now = Date.now();
  return getAutoReminders().filter(
    (reminder) => !reminder.completed && new Date(reminder.dueAt).getTime() <= now,
  );
}

export function markAutoReminderCompleted(reminderId: string) {
  saveAutoReminders(getAutoReminders().map((reminder) => (
    reminder.id === reminderId ? { ...reminder, completed: true } : reminder
  )));
  syncMemoryReminderSchedule();
}

export function clearExpiredAutoReminders() {
  const oneDayAgo = Date.now() - 86_400_000;
  saveAutoReminders(getAutoReminders().filter(
    (reminder) => reminder.completed || new Date(reminder.dueAt).getTime() > oneDayAgo,
  ));
}
