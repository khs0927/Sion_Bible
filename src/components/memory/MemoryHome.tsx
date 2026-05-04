import { useEffect, useMemo, useState } from 'react';
import type { MemoryVerse, ReviewGrade, MemoryAutoReminder } from '../../types/memory';
import { deleteMemoryVerse, getDueMemoryVerses, getMemoryVerses, saveMemoryReviewResult, moveMemoryVerseLevel, getMemoryReminderSettings } from '../../services/memoryStorage';
import { MemoryPracticePage } from './MemoryPracticePage';
import { MemoryReminderSettings } from './MemoryReminderSettings';
import { MemoryVerseCard } from './MemoryVerseCard';
import { MemoryAddVerseSheet } from './MemoryAddVerseSheet';
import { Plus, BellRing, Settings2, X } from 'lucide-react';
import { createAutoReminderSchedule, scheduleNextInAppReminder, getDueAutoReminders, markAutoReminderCompleted } from '../../services/memoryReminder';

type ThemeTokens = Record<string, string>;
type SavedVerseLike = { ref: string; text: string };

export function MemoryHome({ T, savedVerses }: { T: ThemeTokens; savedVerses: SavedVerseLike[] }) {
  const [verses, setVerses] = useState<MemoryVerse[]>([]);
  const [practiceVerseId, setPracticeVerseId] = useState<string | null>(null);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [showReminderSheet, setShowReminderSheet] = useState(false);
  const [dueAutoReminders, setDueAutoReminders] = useState<MemoryAutoReminder[]>([]);
  
  const due = useMemo(() => getDueMemoryVerses(), [verses]);

  const refresh = () => {
    setVerses(getMemoryVerses());
    setDueAutoReminders(getDueAutoReminders());
  };

  useEffect(() => {
    refresh();
    scheduleNextInAppReminder();
  }, []);

  const practiceVerse = useMemo(() => 
    verses.find(v => v.id === practiceVerseId) || null, 
    [verses, practiceVerseId]
  );

  const review = (grade: ReviewGrade) => {
    if (!practiceVerseId) return;
    
    // 알림 스케줄링
    const settings = getMemoryReminderSettings();
    if (settings.enabled && settings.mode === 'auto') {
      createAutoReminderSchedule(practiceVerseId, settings.auto.preset);
    }
    
    saveMemoryReviewResult(practiceVerseId, grade);
    refresh();
    setPracticeVerseId(null);
  };

  const moveStage = (delta: number) => {
    if (!practiceVerseId) return;
    moveMemoryVerseLevel(practiceVerseId, delta);
    refresh();
  };


  const handleCompleteAutoReminder = (reminderId: string) => {
    markAutoReminderCompleted(reminderId);
    refresh();
  };

  if (practiceVerse) {
    return (
      <MemoryPracticePage 
        verse={practiceVerse} 
        T={T} 
        onBack={() => setPracticeVerseId(null)} 
        onMoveStage={moveStage}
        onFinish={() => review('good')}
      />
    );
  }

  return (
    <div className="space-y-6 pb-24">
      {/* 0. 자동 복습 알림 대기 (지나간 알림) */}
      {dueAutoReminders.length > 0 && (
        <section className="animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="p-5 rounded-[32px] border bg-white flex items-center justify-between gap-4 shadow-lg border-[#F5C292]">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-[#FFF8F1]">
                <BellRing size={22} className="animate-bounce" style={{ color: T.accent }} />
              </div>
              <div>
                <div className="title-font text-sm font-black" style={{ color: T.text }}>잊으신 말씀이 있어요!</div>
                <div className="text-[10px] opacity-60" style={{ color: T.text }}>{dueAutoReminders.length}개의 복습 알림이 도착했습니다</div>
              </div>
            </div>
            <button 
              onClick={() => handleCompleteAutoReminder(dueAutoReminders[0].id)}
              className="px-4 py-2.5 rounded-xl font-black text-xs shadow-sm transition-all active:scale-95"
              style={{ background: T.accent, color: 'white' }}
            >
              확인하기
            </button>
          </div>
        </section>
      )}

      {/* 1. 오늘 복습 카드 */}
      <section 
        className="p-7 rounded-[32px] border transition-all shadow-sm"
        style={{ background: T.panel, borderColor: T.line }}
      >
        <div className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: T.accent }}>
          오늘 복습할 말씀
        </div>
        <h2 className="title-font text-3xl mb-6" style={{ color: T.text }}>
          {due.length > 0 ? `${due.length}개의 말씀이 기다려요` : '오늘은 복습할 말씀이 없습니다'}
        </h2>
        {due[0] && (
          <button 
            onClick={() => setPracticeVerseId(due[0].id)} 
            className="w-full py-4 rounded-2xl font-black text-sm shadow-md transition-all active:scale-[0.98]"
            style={{ background: T.peach, color: T.text }}
          >
            오늘 복습 시작
          </button>
        )}
      </section>

      {/* 2. 관리 버튼 (암송 구절 추가 + 알림 설정) */}
      <section className="grid grid-cols-2 gap-3">
        <button 
          onClick={() => setShowAddSheet(true)}
          className="h-14 rounded-2xl border flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition-all bg-white"
          style={{ borderColor: T.line, color: T.text }}
        >
          <Plus size={18} strokeWidth={3} style={{ color: T.accent }} />
          <span className="title-font text-sm font-black">구절 추가</span>
        </button>
        <button 
          onClick={() => setShowReminderSheet(true)}
          className="h-14 rounded-2xl border flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition-all bg-white"
          style={{ borderColor: T.line, color: T.text }}
        >
          <Settings2 size={18} strokeWidth={2} style={{ color: T.sub }} />
          <span className="title-font text-sm font-black">알림 설정</span>
        </button>
      </section>

      {/* 3. 암송 목록 섹션 */}

      {/* 3. 암송 목록 섹션 */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="title-font text-xl font-black" style={{ color: T.text }}>암송 목록</h3>
          <span className="text-[10px] font-bold opacity-40" style={{ color: T.text }}>총 {verses.length}개</span>
        </div>
        
        {verses.length === 0 && (
          <div className="py-12 text-center rounded-[28px] border-2 border-dashed" style={{ borderColor: T.line, color: T.sub }}>
            <p className="text-sm font-bold">아직 암송 구절이 없습니다.</p>
          </div>
        )}

        <div className="grid gap-3">
          {verses.map(verse => (
            <MemoryVerseCard 
              key={verse.id} 
              verse={verse} 
              T={T} 
              onPractice={() => setPracticeVerseId(verse.id)} 
              onDelete={() => { deleteMemoryVerse(verse.id); refresh(); }} 
            />
          ))}
        </div>
      </section>

      {showReminderSheet && (
        <div className="fixed inset-0 z-[100] flex flex-col animate-in fade-in slide-in-from-bottom-10 duration-500" style={{ background: T.panel }}>
          <header className="p-6 flex items-center justify-between border-b" style={{ borderColor: T.line }}>
            <div className="flex items-center gap-3">
              <Settings2 size={20} style={{ color: T.accent }} />
              <h2 className="title-font text-xl font-black" style={{ color: T.text }}>알림 설정</h2>
            </div>
            <button 
              onClick={() => { setShowReminderSheet(false); refresh(); }}
              className="w-10 h-10 rounded-2xl border flex items-center justify-center transition-all active:scale-90"
              style={{ borderColor: T.line, background: T.solid, color: T.sub }}
            >
              <X size={20} />
            </button>
          </header>
          <div className="flex-1 overflow-y-auto p-6 pb-12">
            <MemoryReminderSettings T={T} />
          </div>
        </div>
      )}

      {showAddSheet && (
        <MemoryAddVerseSheet
          onClose={() => {
            setShowAddSheet(false);
            refresh();
          }}
          savedVerses={savedVerses}
          theme={T}
          fontSize="1rem"
        />
      )}
    </div>
  );
}
