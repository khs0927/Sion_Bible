import { useState } from 'react';
import { ArrowLeft, CheckCircle2, ChevronRight, Check, Bell, Info, BookOpen, EyeOff, Shuffle, Lightbulb, Grid } from 'lucide-react';
import type { MemoryVerse } from '../../types/memory';
import { MemoryClozePractice } from './MemoryClozePractice';
import { MemoryArrangePractice } from './MemoryArrangePractice';
import { MemoryInitialHintPractice } from './MemoryInitialHintPractice';
import { MemoryFullBlankPractice } from './MemoryFullBlankPractice';
import { sanitizeScriptureText } from '../../utils/textUtils';

type ThemeTokens = Record<string, string>;
type StageMeta = {
  level: number;
  label: string;
  Icon: typeof BookOpen;
};

const STAGES: StageMeta[] = [
  { level: 1, label: '전체 읽기', Icon: BookOpen },
  { level: 2, label: '부분 빈칸', Icon: EyeOff },
  { level: 3, label: '전체 빈칸', Icon: Grid },
  { level: 4, label: '순서 맞추기', Icon: Shuffle },
  { level: 5, label: '첫 글자 힌트', Icon: Lightbulb },
];

export function MemoryPracticePage({ 
  verse, 
  T, 
  onBack, 
  onMoveStage, 
  onFinish 
}: { 
  verse: MemoryVerse; 
  T: ThemeTokens; 
  onBack: () => void; 
  onMoveStage: (delta: number) => void;
  onFinish: () => void;
}) {
  const isLastStage = verse.level === 5;
  const scriptureText = sanitizeScriptureText(verse.text);
  const [showNotificationPopup, setShowNotificationPopup] = useState(false);
  const [autoNotificationEnabled, setAutoNotificationEnabled] = useState(true);

  const handleFinish = () => {
    if (autoNotificationEnabled) {
      setShowNotificationPopup(true);
      // Wait for 3 seconds before finishing to let the user see the popup
      setTimeout(() => {
        onFinish();
      }, 3000);
    } else {
      onFinish();
    }
  };

  return (
    <div className="space-y-6 pb-20 relative">
      {/* 알림 안내 팝업 (그라데이션으로 사라짐) */}
      {showNotificationPopup && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[200] w-[calc(100%-48px)] max-w-sm animate-in fade-in zoom-in slide-in-from-top-4 duration-700">
          <div className="relative p-5 rounded-[24px] shadow-2xl border border-white/50 backdrop-blur-md overflow-hidden" style={{ background: `linear-gradient(135deg, ${T.accent}EE, ${T.peach}EE)` }}>
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Bell size={64} />
            </div>
            <div className="relative flex gap-3 text-white">
              <Info size={20} className="shrink-0" />
              <div>
                <div className="font-black text-sm mb-1">자동 알림 설정 안내</div>
                <p className="text-[11px] leading-relaxed font-medium opacity-90">
                  암송 완료 시 기억 강화를 위한 자동 알림이 기본으로 설정되었습니다. 추가 설정은 '알림 설정' 탭에서 변경하실 수 있습니다.
                </p>
              </div>
            </div>
            <div className="absolute bottom-0 left-0 h-1 bg-white/30 animate-[progress_3s_linear]" />
          </div>
        </div>
      )}

      <section className="p-6 rounded-[32px] border shadow-sm" style={{ background: T.panel, borderColor: T.line }}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button 
              onClick={onBack} 
              className="w-10 h-10 rounded-2xl border flex items-center justify-center transition-all active:scale-90"
              style={{ borderColor: T.line, background: T.solid, color: T.text }}
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="title-font text-base font-black" style={{ color: T.accent }}>{verse.ref}</div>
              <div className="text-[10px] font-bold opacity-60" style={{ color: T.text }}>{verse.level} / 5 단계</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isLastStage ? (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setAutoNotificationEnabled(!autoNotificationEnabled)}
                  className={`w-10 h-10 rounded-2xl border flex items-center justify-center transition-all ${autoNotificationEnabled ? 'shadow-inner' : ''}`}
                  style={{ 
                    background: autoNotificationEnabled ? T.accent : 'white', 
                    borderColor: T.line,
                    color: autoNotificationEnabled ? 'white' : T.sub 
                  }}
                >
                  <Bell size={16} />
                </button>
                <button 
                  onClick={handleFinish}
                  className="px-5 h-10 rounded-2xl border flex items-center justify-center gap-1.5 font-black text-xs shadow-md transition-all active:scale-90"
                  style={{ background: T.accent, borderColor: T.line, color: 'white' }}
                >
                  <span>암송 완료</span>
                  <Check size={14} />
                </button>
              </div>
            ) : (
              <div className="px-3 py-1 rounded-full text-[10px] font-black" style={{ background: `${T.accent}15`, color: T.accent }}>
                암송 중
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-5 gap-1.5">
          {STAGES.map(({ level, label, Icon }) => {
            const active = verse.level === level;
            const done = verse.level > level;
            return (
              <button
                key={level}
                type="button"
                onClick={() => onMoveStage(level - verse.level)}
                disabled={active}
                className="min-w-0 rounded-[18px] border p-2 transition-all active:scale-[0.98] disabled:cursor-default"
                style={{
                  background: active ? `linear-gradient(145deg, ${T.peach}, ${T.butter})` : done ? T.solid : 'white',
                  borderColor: active || done ? T.accent : T.line,
                  color: active || done ? T.text : T.sub,
                  boxShadow: active ? T.soft : 'none',
                }}
              >
                <span
                  className="mx-auto mb-1 flex h-7 w-7 items-center justify-center rounded-full border"
                  style={{
                    background: active ? 'rgba(255,255,255,0.6)' : T.solid,
                    borderColor: active ? 'rgba(255,255,255,0.7)' : T.line,
                    color: active || done ? T.accent : T.sub,
                  }}
                >
                  <Icon size={14} strokeWidth={done ? 3 : 2.3} />
                </span>
                <span className="block truncate text-[10px] font-black">{level}단계</span>
                <span className="block truncate text-[8px] font-bold opacity-70">{label}</span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="min-h-[300px]">
        {verse.level === 1 && (
          <section className="p-8 rounded-[32px] border shadow-sm space-y-6" style={{ background: T.panel, borderColor: T.line }}>
            <div className="text-[10px] font-black uppercase tracking-widest" style={{ color: T.accent }}>1단계 · 전체 읽기</div>
            <div className="text-xl leading-[1.8] text-[#3D3129] serif-verse font-medium">
              {(() => {
                const keywords = ['하나님', '예수', '그리스도', '성령', '주님', '은혜', '사랑', '믿음', '진리', '생명', '구원', '평강', '소망', '말씀', '약속', '기도'];
                // Break lines at natural pauses: punctuation or specific Korean verb endings
                const lines = scriptureText
                  .replace(/([,;]|가로되|나이다|하소서|하노니|하시며|하시면|지니|지어다|이오니|이니이다|하옵소서|하리라)\s+/g, '$1\n')
                  .split('\n');

                return lines.map((line, i) => (
                  <p key={i} className="mb-2 last:mb-0">
                    {line.split(' ').map((word, j) => {
                      const hasKeyword = keywords.some(k => word.includes(k));
                      return (
                        <span 
                          key={j} 
                          className={hasKeyword ? "font-black" : ""} 
                          style={{ color: hasKeyword ? T.accent : 'inherit' }}
                        >
                          {word}{' '}
                        </span>
                      );
                    })}
                  </p>
                ));
              })()}
            </div>
            <div className="bg-[#FFF8F1] p-4 rounded-2xl border border-dashed border-[#e8d8ce]">
              <p className="text-xs text-[#A17C5B] font-bold text-center leading-relaxed">
                💡 말씀을 소리 내어 천천히 읽으며<br/>마음에 깊이 새겨보세요.
              </p>
            </div>
          </section>
        )}
        
        {verse.level === 2 && <MemoryClozePractice text={scriptureText} T={T} />}
        {verse.level === 3 && <MemoryFullBlankPractice text={scriptureText} T={T} />}
        {verse.level === 4 && <MemoryArrangePractice text={scriptureText} T={T} />}
        {verse.level === 5 && <MemoryInitialHintPractice text={scriptureText} T={T} />}
      </div>

      {!isLastStage && (
        <button 
          onClick={() => onMoveStage(1)}
          className="w-full py-5 rounded-[24px] font-black text-lg shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          style={{ background: T.accent, color: 'white' }}
        >
          <span>다음 단계</span>
          <ChevronRight size={20} />
        </button>
      )}

      <section className="p-5 rounded-[32px] border shadow-sm flex items-center justify-center gap-2" style={{ background: T.panel, borderColor: T.line }}>
        <CheckCircle2 size={14} style={{ color: T.accent }} />
        <span className="text-[11px] font-bold opacity-60" style={{ color: T.text }}>
          {isLastStage ? '마지막 단계입니다! 완벽히 외웠나요?' : '단계를 넘어가며 연습해 보세요.'}
        </span>
      </section>

      <style>{`
        @keyframes progress {
          from { width: 100%; }
          to { width: 0%; }
        }
        
      `}</style>
    </div>
  );
}
