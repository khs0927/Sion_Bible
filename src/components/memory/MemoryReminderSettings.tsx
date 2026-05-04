import { useEffect, useState, useMemo } from 'react';
import type { MemoryReminderSettings, MemoryReminderMode } from '../../types/memory';
import { getMemoryReminderSettings, saveMemoryReminderSettings } from '../../services/memoryStorage';
import { calculateDistributedReminderTimes, getNotificationPermissionState, requestNotificationPermission } from '../../services/memoryReminder';
import { Bell, Clock, Zap, Repeat, Plus, Trash2, Check, AlertCircle } from 'lucide-react';

type ThemeTokens = Record<string, string>;

export function MemoryReminderSettings({ T }: { T: ThemeTokens }) {
  const [settings, setSettings] = useState<MemoryReminderSettings>(() => getMemoryReminderSettings());
  const [activeTab, setActiveTab] = useState<MemoryReminderMode>(settings.mode);
  const [permission, setPermission] = useState(getNotificationPermissionState());

  useEffect(() => {
    saveMemoryReminderSettings({ ...settings, mode: activeTab });
  }, [settings, activeTab]);

  const handleRequestPermission = async () => {
    const res = await requestNotificationPermission();
    setPermission(res);
  };

  const addTime = () => {
    const newTime = "09:00"; // Default
    if (!settings.time.selectedTimes.includes(newTime)) {
      setSettings(s => ({
        ...s,
        time: { ...s.time, selectedTimes: [...s.time.selectedTimes, newTime].sort() }
      }));
    }
  };

  const removeTime = (time: string) => {
    setSettings(s => ({
      ...s,
      time: { ...s.time, selectedTimes: s.time.selectedTimes.filter(t => t !== time) }
    }));
  };

  const updateTime = (index: number, value: string) => {
    const next = [...settings.time.selectedTimes];
    next[index] = value;
    setSettings(s => ({
      ...s,
      time: { ...s.time, selectedTimes: next.sort() }
    }));
  };

  const autoPresetFlow = useMemo(() => {
    const preset = settings.auto.preset;
    if (preset === 'intensive') return ['1분', '5분', '15분', '30분', '1시간'];
    if (preset === 'relaxed') return ['10분', '30분', '2시간', '내일'];
    return ['1분', '10분', '30분', '1시간', '내일'];
  }, [settings.auto.preset]);

  const countPreview = useMemo(() => {
    return calculateDistributedReminderTimes(
      settings.count.activeStartTime,
      settings.count.activeEndTime,
      settings.count.repeatCount
    );
  }, [settings.count]);

  const statusBadge = () => {
    if (permission === 'unsupported') return { label: '알림 미지원', color: T.sub, bg: T.line };
    if (permission === 'denied') return { label: '권한 거부', color: '#D9685F', bg: '#FFF1F0' };
    if (permission === 'default') return { label: '권한 필요', color: T.accent, bg: T.pill };
    return settings.enabled ? { label: '알림 켜짐', color: 'white', bg: T.accent } : { label: '알림 꺼짐', color: T.sub, bg: T.line };
  };

  const badge = statusBadge();

  return (
    <section 
      className="p-6 rounded-[32px] border shadow-sm space-y-6"
      style={{ background: T.panel, borderColor: T.line }}
    >
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl" style={{ background: T.pill }}>
            <Bell size={18} style={{ color: T.accent }} />
          </div>
          <div>
            <h4 className="title-font text-sm font-black" style={{ color: T.text }}>암송 알림 설정</h4>
            <p className="text-[10px] opacity-60" style={{ color: T.text }}>원하는 방식으로 말씀을 기억하세요</p>
          </div>
        </div>
        <button 
          onClick={() => setSettings(s => ({ ...s, enabled: !s.enabled }))}
          className="text-[10px] font-black px-3 py-1.5 rounded-full border transition-all"
          style={{ background: badge.bg, borderColor: settings.enabled && permission === 'granted' ? T.accent : T.line, color: badge.color }}
        >
          {badge.label}
        </button>
      </header>

      {/* 모드 탭 */}
      <div className="grid grid-cols-3 gap-2 p-1 rounded-2xl" style={{ background: T.solid }}>
        {(['auto', 'time', 'count'] as const).map(m => {
          const isActive = activeTab === m;
          const icons = { auto: Zap, time: Clock, count: Repeat };
          const labels = { auto: '자동', time: '시간', count: '횟수' };
          const Icon = icons[m];
          return (
            <button
              key={m}
              onClick={() => setActiveTab(m)}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-black transition-all"
              style={{ 
                background: isActive ? 'white' : 'transparent',
                color: isActive ? T.accent : T.sub,
                boxShadow: isActive ? T.soft : 'none'
              }}
            >
              <Icon size={14} />
              <span>{labels[m]}</span>
            </button>
          );
        })}
      </div>

      <div className="min-h-[140px]">
        {activeTab === 'auto' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
            <div>
              <h5 className="text-xs font-black mb-1" style={{ color: T.text }}>자동 복습 알림</h5>
              <p className="text-[11px] leading-relaxed opacity-60" style={{ color: T.text }}>말씀을 외운 직후 기억이 흐려지기 전에 다시 알려드려요.</p>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              {(['default', 'intensive', 'relaxed'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setSettings(s => ({ ...s, auto: { ...s.auto, preset: p } }))}
                  className="py-3 rounded-xl border text-[11px] font-black transition-all"
                  style={{ 
                    background: settings.auto.preset === p ? T.pill : 'white',
                    borderColor: settings.auto.preset === p ? T.accent : T.line,
                    color: settings.auto.preset === p ? T.accent : T.sub
                  }}
                >
                  {p === 'default' ? '기본' : p === 'intensive' ? '집중' : '여유'}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {autoPresetFlow.map((step, idx) => (
                <div key={idx} className="flex items-center gap-1.5">
                  <span className="px-2 py-1 rounded-lg text-[10px] font-bold" style={{ background: T.solid, color: T.sub }}>{step}</span>
                  {idx < autoPresetFlow.length - 1 && <span className="text-[10px] opacity-30" style={{ color: T.text }}>→</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'time' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
            <div>
              <h5 className="text-xs font-black mb-1" style={{ color: T.text }}>지정 시간 알림</h5>
              <p className="text-[11px] leading-relaxed opacity-60" style={{ color: T.text }}>매일 정해진 시간에 말씀을 복습할 수 있게 알려드려요.</p>
            </div>

            <div className="flex flex-wrap gap-2">
              {settings.time.selectedTimes.map((time, idx) => (
                <div key={idx} className="group relative flex items-center gap-2 px-3 py-2 rounded-xl bg-white border" style={{ borderColor: T.line }}>
                  <input 
                    type="time" 
                    value={time}
                    onChange={(e) => updateTime(idx, e.target.value)}
                    className="text-xs font-black bg-transparent outline-none"
                    style={{ color: T.text }}
                  />
                  <button onClick={() => removeTime(time)} className="text-[#D9685F] opacity-40 hover:opacity-100 transition-opacity">
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
              <button 
                onClick={addTime}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-dashed transition-all active:scale-95"
                style={{ borderColor: T.accent, color: T.accent }}
              >
                <Plus size={14} />
                <span className="text-xs font-black">추가</span>
              </button>
            </div>
          </div>
        )}

        {activeTab === 'count' && (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2">
            <div>
              <h5 className="text-xs font-black mb-1" style={{ color: T.text }}>하루 반복 횟수</h5>
              <p className="text-[11px] leading-relaxed opacity-60" style={{ color: T.text }}>하루에 몇 번 말씀을 다시 볼지 정하면 시간을 배분해드려요.</p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {([1, 3, 5] as const).map(c => (
                <button
                  key={c}
                  onClick={() => setSettings(s => ({ ...s, count: { ...s.count, repeatCount: c } }))}
                  className="py-3 rounded-xl border text-[11px] font-black transition-all"
                  style={{ 
                    background: settings.count.repeatCount === c ? T.pill : 'white',
                    borderColor: settings.count.repeatCount === c ? T.accent : T.line,
                    color: settings.count.repeatCount === c ? T.accent : T.sub
                  }}
                >
                  하루 {c}회
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl" style={{ background: T.solid }}>
              <div>
                <label className="block text-[10px] font-black mb-1.5 opacity-50">시작 시간</label>
                <input 
                  type="time" 
                  value={settings.count.activeStartTime} 
                  onChange={(e) => setSettings(s => ({ ...s, count: { ...s.count, activeStartTime: e.target.value } }))}
                  className="w-full bg-white px-3 py-2 rounded-xl text-xs font-black outline-none border"
                  style={{ borderColor: T.line }}
                />
              </div>
              <div>
                <label className="block text-[10px] font-black mb-1.5 opacity-50">종료 시간</label>
                <input 
                  type="time" 
                  value={settings.count.activeEndTime}
                  onChange={(e) => setSettings(s => ({ ...s, count: { ...s.count, activeEndTime: e.target.value } }))}
                  className="w-full bg-white px-3 py-2 rounded-xl text-xs font-black outline-none border"
                  style={{ borderColor: T.line }}
                />
              </div>
            </div>

            <div className="px-1">
              <div className="text-[10px] font-black mb-2 opacity-50">미리보기</div>
              <div className="flex flex-wrap gap-2">
                {countPreview.map(t => (
                  <span key={t} className="px-2 py-1 rounded-lg text-[10px] font-bold bg-white border" style={{ borderColor: T.line, color: T.sub }}>{t}</span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="pt-2 border-t" style={{ borderColor: T.line }}>
        {permission !== 'granted' ? (
          <button 
            onClick={handleRequestPermission}
            className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 font-black text-sm shadow-md transition-all active:scale-[0.98]"
            style={{ background: T.accent, color: 'white' }}
          >
            <Zap size={18} />
            <span>알림 권한 허용하기</span>
          </button>
        ) : (
          <div className="flex items-center justify-center gap-2 py-2 text-[11px] font-black" style={{ color: T.accent }}>
            <Check size={14} />
            <span>알림 서비스가 활성화되었습니다</span>
          </div>
        )}

        {permission === 'denied' && (
          <div className="mt-4 p-4 rounded-2xl flex gap-3" style={{ background: '#FFF1F0', border: '1px solid #FFE7E6' }}>
            <AlertCircle size={16} className="shrink-0" style={{ color: '#D9685F' }} />
            <p className="text-[11px] leading-relaxed font-medium" style={{ color: '#8C4B47' }}>
              브라우저 설정에서 알림 권한이 거부되어 있습니다. 사이트 설정에서 알림을 다시 허용해 주세요.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
