import { useEffect, useMemo, useState } from 'react';
import type { MemoryReminderMode, MemoryReminderSettings as ReminderSettings } from '../../types/memory';
import { getMemoryReminderSettings, saveMemoryReminderSettings } from '../../services/memoryStorage';
import {
  calculateDistributedReminderTimes,
  getNotificationPermissionState,
  getReminderSchedulePreview,
  requestNotificationPermission,
  showMemoryNotification,
  syncMemoryReminderSchedule,
} from '../../services/memoryReminder';
import { AlertCircle, Bell, Check, Clock, Plus, Repeat, Trash2, Zap } from 'lucide-react';

type ThemeTokens = Record<string, string>;

function formatNextReminder(value: string | null) {
  if (!value) return '예약된 알림 없음';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '예약 시간 확인 필요';
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();
  return `${sameDay ? '오늘' : '다음'} ${date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`;
}

export function MemoryReminderSettings({ T }: { T: ThemeTokens }) {
  const [settings, setSettings] = useState<ReminderSettings>(() => getMemoryReminderSettings());
  const [activeTab, setActiveTab] = useState<MemoryReminderMode>(settings.mode);
  const [permission, setPermission] = useState(getNotificationPermissionState());
  const [testStatus, setTestStatus] = useState('');

  const effectiveSettings = useMemo<ReminderSettings>(() => ({
    ...settings,
    mode: activeTab,
    permission,
    auto: { ...settings.auto, enabled: activeTab === 'auto' },
    time: { ...settings.time, enabled: activeTab === 'time' },
    count: {
      ...settings.count,
      enabled: activeTab === 'count',
      generatedTimes: calculateDistributedReminderTimes(
        settings.count.activeStartTime,
        settings.count.activeEndTime,
        settings.count.repeatCount,
      ),
    },
  }), [activeTab, permission, settings]);

  useEffect(() => {
    saveMemoryReminderSettings(effectiveSettings);
    syncMemoryReminderSchedule();
  }, [effectiveSettings]);

  const schedulePreview = useMemo(
    () => getReminderSchedulePreview(effectiveSettings),
    [effectiveSettings],
  );

  const handleRequestPermission = async () => {
    setTestStatus('');
    const result = await requestNotificationPermission();
    setPermission(result);
    if (result === 'granted') {
      setSettings((current) => ({ ...current, enabled: true, permission: result }));
    }
  };

  const handleToggle = async () => {
    if (settings.enabled) {
      setSettings((current) => ({ ...current, enabled: false }));
      return;
    }
    if (permission === 'default') {
      await handleRequestPermission();
      return;
    }
    if (permission !== 'granted') return;
    setSettings((current) => ({ ...current, enabled: true }));
  };

  const handleTestNotification = async () => {
    setTestStatus('보내는 중...');
    const delivered = await showMemoryNotification(
      '시온바이블 알림 테스트',
      '암송 알림이 정상적으로 연결되었습니다.',
    );
    setTestStatus(delivered ? '테스트 알림을 보냈습니다.' : '알림을 보내지 못했습니다. 권한을 확인해주세요.');
  };

  const addTime = () => {
    const date = new Date(Date.now() + 3_600_000);
    const newTime = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    setSettings((current) => ({
      ...current,
      time: {
        ...current.time,
        selectedTimes: [...new Set([...current.time.selectedTimes, newTime])].sort(),
      },
    }));
  };

  const removeTime = (time: string) => {
    setSettings((current) => ({
      ...current,
      time: {
        ...current.time,
        selectedTimes: current.time.selectedTimes.filter((item) => item !== time),
      },
    }));
  };

  const updateTime = (index: number, value: string) => {
    setSettings((current) => {
      const next = [...current.time.selectedTimes];
      next[index] = value;
      return {
        ...current,
        time: { ...current.time, selectedTimes: [...new Set(next.filter(Boolean))].sort() },
      };
    });
  };

  const autoPresetFlow = useMemo(() => {
    const preset = settings.auto.preset;
    if (preset === 'intensive') return ['1분', '5분', '15분', '30분', '1시간'];
    if (preset === 'relaxed') return ['10분', '30분', '2시간', '내일'];
    return ['1분', '10분', '30분', '1시간', '내일'];
  }, [settings.auto.preset]);

  const countPreview = useMemo(() => calculateDistributedReminderTimes(
    settings.count.activeStartTime,
    settings.count.activeEndTime,
    settings.count.repeatCount,
  ), [settings.count.activeEndTime, settings.count.activeStartTime, settings.count.repeatCount]);

  const statusBadge = () => {
    if (permission === 'unsupported') return { label: '알림 미지원', color: T.sub, bg: T.line };
    if (permission === 'denied') return { label: '권한 거부', color: '#D9685F', bg: '#FFF1F0' };
    if (permission === 'default') return { label: '권한 필요', color: T.accent, bg: T.pill };
    return settings.enabled
      ? { label: '알림 켜짐', color: 'white', bg: T.accent }
      : { label: '알림 꺼짐', color: T.sub, bg: T.line };
  };

  const badge = statusBadge();

  return (
    <section
      className="space-y-6 rounded-[32px] border p-6 shadow-sm"
      style={{ background: T.panel, borderColor: T.line }}
    >
      <header className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="rounded-xl p-2" style={{ background: T.pill }}>
            <Bell size={18} style={{ color: T.accent }} />
          </div>
          <div className="min-w-0">
            <h4 className="title-font text-sm font-black" style={{ color: T.text }}>암송 알림 설정</h4>
            <p className="truncate text-[10px] opacity-60" style={{ color: T.text }}>원하는 방식으로 말씀을 기억하세요</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void handleToggle()}
          disabled={permission === 'denied' || permission === 'unsupported'}
          className="shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-black transition-all disabled:cursor-not-allowed disabled:opacity-60"
          style={{
            background: badge.bg,
            borderColor: settings.enabled && permission === 'granted' ? T.accent : T.line,
            color: badge.color,
          }}
        >
          {badge.label}
        </button>
      </header>

      <div className="grid grid-cols-3 gap-2 rounded-2xl p-1" style={{ background: T.solid }}>
        {(['auto', 'time', 'count'] as const).map((mode) => {
          const isActive = activeTab === mode;
          const icons = { auto: Zap, time: Clock, count: Repeat };
          const labels = { auto: '자동', time: '시간', count: '횟수' };
          const Icon = icons[mode];
          return (
            <button
              key={mode}
              type="button"
              onClick={() => setActiveTab(mode)}
              className="flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-black transition-all"
              style={{
                background: isActive ? 'white' : 'transparent',
                color: isActive ? T.accent : T.sub,
                boxShadow: isActive ? T.soft : 'none',
              }}
            >
              <Icon size={14} />
              <span>{labels[mode]}</span>
            </button>
          );
        })}
      </div>

      <div className="min-h-[140px]">
        {activeTab === 'auto' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
            <div>
              <h5 className="mb-1 text-xs font-black" style={{ color: T.text }}>자동 복습 알림</h5>
              <p className="text-[11px] leading-relaxed opacity-60" style={{ color: T.text }}>암송 말씀을 추가한 뒤 기억이 흐려지는 간격에 맞춰 다시 알려드려요.</p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {(['default', 'intensive', 'relaxed'] as const).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setSettings((current) => ({ ...current, auto: { ...current.auto, preset } }))}
                  className="rounded-xl border py-3 text-[11px] font-black transition-all"
                  style={{
                    background: settings.auto.preset === preset ? T.pill : 'white',
                    borderColor: settings.auto.preset === preset ? T.accent : T.line,
                    color: settings.auto.preset === preset ? T.accent : T.sub,
                  }}
                >
                  {preset === 'default' ? '기본' : preset === 'intensive' ? '집중' : '여유'}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {autoPresetFlow.map((step, index) => (
                <div key={step} className="flex items-center gap-1.5">
                  <span className="rounded-lg px-2 py-1 text-[10px] font-bold" style={{ background: T.solid, color: T.sub }}>{step}</span>
                  {index < autoPresetFlow.length - 1 && <span className="text-[10px] opacity-30" style={{ color: T.text }}>→</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'time' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
            <div>
              <h5 className="mb-1 text-xs font-black" style={{ color: T.text }}>지정 시간 알림</h5>
              <p className="text-[11px] leading-relaxed opacity-60" style={{ color: T.text }}>매일 정해진 시간에 암송 복습 알림을 예약합니다.</p>
            </div>

            <div className="flex flex-wrap gap-2">
              {settings.time.selectedTimes.map((time, index) => (
                <div key={`${time}-${index}`} className="group relative flex items-center gap-2 rounded-xl border bg-white px-3 py-2" style={{ borderColor: T.line }}>
                  <input
                    type="time"
                    value={time}
                    onChange={(event) => updateTime(index, event.target.value)}
                    className="bg-transparent text-xs font-black outline-none"
                    style={{ color: T.text }}
                    aria-label={`${index + 1}번째 알림 시간`}
                  />
                  <button type="button" onClick={() => removeTime(time)} aria-label={`${time} 알림 삭제`} className="text-[#D9685F] opacity-50 transition-opacity hover:opacity-100">
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addTime}
                className="flex items-center gap-1.5 rounded-xl border border-dashed px-4 py-2 transition-all active:scale-95"
                style={{ borderColor: T.accent, color: T.accent }}
              >
                <Plus size={14} />
                <span className="text-xs font-black">추가</span>
              </button>
            </div>
            {settings.time.selectedTimes.length === 0 && (
              <p className="rounded-xl border border-dashed p-3 text-center text-[11px] font-bold" style={{ borderColor: T.line, color: T.sub }}>알림 시간을 하나 이상 추가해주세요.</p>
            )}
          </div>
        )}

        {activeTab === 'count' && (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2">
            <div>
              <h5 className="mb-1 text-xs font-black" style={{ color: T.text }}>하루 반복 횟수</h5>
              <p className="text-[11px] leading-relaxed opacity-60" style={{ color: T.text }}>활동 시간 사이에 알림을 균등하게 배분합니다. 종료 시간이 더 이르면 다음 날로 계산합니다.</p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {([1, 3, 5] as const).map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => setSettings((current) => ({ ...current, count: { ...current.count, repeatCount: count } }))}
                  className="rounded-xl border py-3 text-[11px] font-black transition-all"
                  style={{
                    background: settings.count.repeatCount === count ? T.pill : 'white',
                    borderColor: settings.count.repeatCount === count ? T.accent : T.line,
                    color: settings.count.repeatCount === count ? T.accent : T.sub,
                  }}
                >
                  하루 {count}회
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3 rounded-2xl p-4" style={{ background: T.solid }}>
              <div>
                <label className="mb-1.5 block text-[10px] font-black opacity-50">시작 시간</label>
                <input
                  type="time"
                  value={settings.count.activeStartTime}
                  onChange={(event) => setSettings((current) => ({ ...current, count: { ...current.count, activeStartTime: event.target.value } }))}
                  className="w-full rounded-xl border bg-white px-3 py-2 text-xs font-black outline-none"
                  style={{ borderColor: T.line }}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[10px] font-black opacity-50">종료 시간</label>
                <input
                  type="time"
                  value={settings.count.activeEndTime}
                  onChange={(event) => setSettings((current) => ({ ...current, count: { ...current.count, activeEndTime: event.target.value } }))}
                  className="w-full rounded-xl border bg-white px-3 py-2 text-xs font-black outline-none"
                  style={{ borderColor: T.line }}
                />
              </div>
            </div>

            <div className="px-1">
              <div className="mb-2 text-[10px] font-black opacity-50">자동 배분 미리보기</div>
              <div className="flex flex-wrap gap-2">
                {countPreview.map((time) => (
                  <span key={time} className="rounded-lg border bg-white px-2 py-1 text-[10px] font-bold" style={{ borderColor: T.line, color: T.sub }}>{time}</span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl border p-4" style={{ borderColor: T.line, background: T.solid }}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black" style={{ color: T.sub }}>다음 알림</p>
            <p className="mt-1 text-sm font-black" style={{ color: T.text }}>{formatNextReminder(schedulePreview.nextAt)}</p>
          </div>
          <span className="rounded-full bg-white px-3 py-1 text-[10px] font-bold" style={{ color: T.sub }}>
            {activeTab === 'auto' ? `${schedulePreview.times.length}단계` : `${schedulePreview.times.length}회`}
          </span>
        </div>
        <p className="mt-3 text-[10px] leading-relaxed" style={{ color: T.sub }}>
          앱이 열려 있거나 다시 활성화될 때 예약을 자동 복구합니다. 앱이 완전히 종료된 동안의 확정 발송은 서버 Web Push 연결이 필요합니다.
        </p>
      </div>

      <div className="border-t pt-2" style={{ borderColor: T.line }}>
        {permission !== 'granted' ? (
          <button
            type="button"
            onClick={() => void handleRequestPermission()}
            disabled={permission === 'unsupported'}
            className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm font-black shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
            style={{ background: T.accent, color: 'white' }}
          >
            <Zap size={18} />
            <span>{permission === 'denied' ? '브라우저 설정에서 권한을 다시 허용해주세요' : '알림 권한 허용하기'}</span>
          </button>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2 py-1 text-[11px] font-black" style={{ color: T.accent }}>
              <Check size={14} />
              <span>알림 서비스가 연결되었습니다</span>
            </div>
            <button
              type="button"
              onClick={() => void handleTestNotification()}
              className="w-full rounded-2xl border bg-white py-3 text-xs font-black transition-all active:scale-[0.98]"
              style={{ borderColor: T.line, color: T.accent }}
            >
              테스트 알림 보내기
            </button>
            {testStatus && <p className="text-center text-[10px] font-bold" style={{ color: T.sub }}>{testStatus}</p>}
          </div>
        )}

        {permission === 'denied' && (
          <div className="mt-4 flex gap-3 rounded-2xl p-4" style={{ background: '#FFF1F0', border: '1px solid #FFE7E6' }}>
            <AlertCircle size={16} className="shrink-0" style={{ color: '#D9685F' }} />
            <p className="text-[11px] font-medium leading-relaxed" style={{ color: '#8C4B47' }}>
              브라우저 설정에서 알림 권한이 거부되어 있습니다. 주소창의 사이트 설정에서 알림을 허용한 뒤 이 페이지를 다시 열어주세요.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
