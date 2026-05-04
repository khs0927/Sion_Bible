import { useState } from 'react';
import { ArrowLeft, CheckCircle2, ChevronRight, Check, Bell, Info } from 'lucide-react';
import type { MemoryVerse } from '../../types/memory';
import { MemoryClozePractice } from './MemoryClozePractice';
import { MemoryFullBlankPractice } from './MemoryFullBlankPractice';
import { MemoryArrangePractice } from './MemoryArrangePractice';
import { MemoryInitialHintPractice } from './MemoryInitialHintPractice';

type ThemeTokens = Record<string, string>;

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
                  <Bell size={16} className={autoNotificationEnabled ? 'animate-wiggle' : ''} />
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
      </section>

      <div className="min-h-[300px]">
        {verse.level === 1 && (
          <section className="p-8 rounded-[32px] border shadow-sm space-y-6" style={{ background: T.panel, borderColor: T.line }}>
            <div className="text-[10px] font-black uppercase tracking-widest" style={{ color: T.accent }}>1단계 · 전체 읽기</div>
            <p className="text-xl leading-[2] text-[#3D3129] serif-verse font-medium text-justify">
              "{verse.text}"
            </p>
            <div className="bg-[#FFF8F1] p-4 rounded-2xl border border-dashed border-[#e8d8ce]">
              <p className="text-xs text-[#A17C5B] font-bold text-center leading-relaxed">
                💡 말씀을 소리 내어 천천히 읽으며<br/>마음에 깊이 새겨보세요.
              </p>
            </div>
          </section>
        )}
        
        {verse.level === 2 && <MemoryClozePractice text={verse.text} T={T} />}
        {verse.level === 3 && <MemoryArrangePractice text={verse.text} T={T} />}
        {verse.level === 4 && <MemoryFullBlankPractice text={verse.text} T={T} />}
        {verse.level === 5 && <MemoryInitialHintPractice text={verse.text} T={T} />}
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
        .animate-wiggle {
          animation: wiggle 1s ease-in-out infinite;
        }
        @keyframes wiggle {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-10deg); }
          75% { transform: rotate(10deg); }
        }
      `}</style>
    </div>
  );
}
