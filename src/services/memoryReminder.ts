import type { MemoryAutoReminder } from '../types/memory';
import { getAutoReminders, getMemoryReminderSettings, saveAutoReminders, saveMemoryReminderSettings } from './memoryStorage';

/**
 * 1단계: 브라우저 알림 권한 상태 확인
 */
export function isNotificationSupported() {
  return typeof Notification !== 'undefined';
}

export function getNotificationPermissionState(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

/**
 * 2단계: 알림 권한 요청
 */
export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!isNotificationSupported()) return 'unsupported';
  
  const permission = await Notification.requestPermission();
  const settings = getMemoryReminderSettings();
  saveMemoryReminderSettings({ ...settings, permission });
  return permission;
}

/**
 * 3단계: 알림 표시 (앱이 켜져 있을 때)
 */
export function showMemoryNotification(title: string, body: string) {
  if (getNotificationPermissionState() !== 'granted') return;
  
  try {
    const n = new Notification(title, {
      body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
    });
    n.onclick = () => {
      window.focus();
      n.close();
    };
  } catch (err) {
    console.error('Notification error:', err);
    // TODO: Service Worker registration.showNotification() fallback for mobile PWA
  }
}

/**
 * 4단계: 하루 횟수 기반 알림 시간 자동 분배
 */
export function calculateDistributedReminderTimes(startTime: string, endTime: string, count: 1 | 3 | 5): string[] {
  const parse = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };
  const format = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const startMins = parse(startTime);
  const endMins = parse(endTime);
  const duration = endMins - startMins;

  if (count === 1) return [format(startMins + duration / 2)];
  
  const intervals = count - 1;
  const step = duration / intervals;
  const times: string[] = [];
  
  for (let i = 0; i < count; i++) {
    times.push(format(Math.round(startMins + i * step)));
  }
  
  return times;
}

/**
 * 5단계: 자동 복습 스케줄 생성 (암송 직후)
 */
const PRESETS = {
  default: [1, 10, 30, 60, 1440],
  intensive: [1, 5, 15, 30, 60],
  relaxed: [10, 30, 120, 1440],
};

export function createAutoReminderSchedule(verseId: string, presetKey: 'default' | 'intensive' | 'relaxed' = 'default') {
  const intervals = PRESETS[presetKey];
  const now = new Date();
  const newReminders: MemoryAutoReminder[] = intervals.map((mins, idx) => ({
    id: `${verseId}-${idx}-${Date.now()}`,
    verseId,
    dueAt: new Date(now.getTime() + mins * 60000).toISOString(),
    intervalMinutes: mins,
    completed: false,
    createdAt: now.toISOString(),
  }));

  const existing = getAutoReminders();
  saveAutoReminders([...existing, ...newReminders]);
  
  // 첫 번째 알림 예약
  scheduleNextInAppReminder();
}

/**
 * 6단계: 인앱 알림 예약 (setTimeout)
 */
let nextReminderTimeout: any = null;

export function scheduleNextInAppReminder() {
  if (nextReminderTimeout) clearTimeout(nextReminderTimeout);
  
  const reminders = getAutoReminders().filter(r => !r.completed);
  if (reminders.length === 0) return;

  // 가장 가까운 알림 찾기
  const sorted = [...reminders].sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
  const next = sorted[0];
  const delay = new Date(next.dueAt).getTime() - Date.now();

  if (delay <= 0) {
    // 이미 지남 -> 즉시 알림 또는 대기 상태 표시
    return;
  }

  nextReminderTimeout = setTimeout(() => {
    showMemoryNotification('암송 복습 시간입니다', '기억이 흐려지기 전에 말씀을 다시 확인해보세요!');
    // TODO: UI에 복습 대기 팝업 표시 유도
    scheduleNextInAppReminder();
  }, delay);
}

/**
 * 7단계: 지난 알림 확인 (앱 다시 열었을 때)
 */
export function getDueAutoReminders() {
  const now = new Date();
  return getAutoReminders().filter(r => !r.completed && new Date(r.dueAt) <= now);
}

export function markAutoReminderCompleted(reminderId: string) {
  const all = getAutoReminders();
  saveAutoReminders(all.map(r => r.id === reminderId ? { ...r, completed: true } : r));
}

export function clearExpiredAutoReminders() {
  const oneDayAgo = new Date(Date.now() - 86400000);
  const all = getAutoReminders();
  saveAutoReminders(all.filter(r => r.completed || new Date(r.dueAt) > oneDayAgo));
}

/**
 * TODO: Web Push 확장 경로
 * 
 * 1. Service Worker에 'push' 이벤트 핸들러 추가
 * 2. PushManager.subscribe()로 엔드포인트 획득
 * 3. 서버(Vercel/Supabase 등)에 구독 정보 저장
 * 4. 서버 측 스케줄러(Cron)에서 시간 체크 후 Web Push 발송
 * 5. PWA 라이프사이클에 맞춰 백그라운드 동기화
 */
