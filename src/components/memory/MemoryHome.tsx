import { useEffect, useMemo, useState } from 'react';
import { BellRing, BookHeart, Brain, CalendarCheck2, Plus, Settings2, Sparkles, X } from 'lucide-react';
import { designDecorations } from '../../assets/design';
import type { MemoryAutoReminder, MemoryVerse, ReviewGrade } from '../../types/memory';
import {
  deleteMemoryVerse,
  getDueMemoryVerses,
  getMemoryReminderSettings,
  getMemoryVerses,
  moveMemoryVerseLevel,
  saveMemoryReviewResult,
} from '../../services/memoryStorage';
import {
  createAutoReminderSchedule,
  getDueAutoReminders,
  markAutoReminderCompleted,
  scheduleNextInAppReminder,
} from '../../services/memoryReminder';
import { MemoryPracticePage } from './MemoryPracticePage';
import { MemoryReminderSettings } from './MemoryReminderSettings';
import { MemoryVerseCard } from './MemoryVerseCard';
import { MemoryAddVerseSheet } from './MemoryAddVerseSheet';

type ThemeTokens = Record<string, string>;
type SavedVerseLike = { ref: string; text: string };

export function MemoryHome({ T, savedVerses }: { T: ThemeTokens; savedVerses: SavedVerseLike[] }) {
  const [verses, setVerses] = useState<MemoryVerse[]>([]);
  const [practiceVerseId, setPracticeVerseId] = useState<string | null>(null);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [showReminderSheet, setShowReminderSheet] = useState(false);
  const [dueAutoReminders, setDueAutoReminders] = useState<MemoryAutoReminder[]>([]);

  const due = useMemo(() => getDueMemoryVerses(), [verses]);
  const mastered = useMemo(() => verses.filter((verse) => verse.level >= 5).length, [verses]);
  const active = Math.max(0, verses.length - mastered);

  const refresh = () => {
    setVerses(getMemoryVerses());
    setDueAutoReminders(getDueAutoReminders());
  };

  useEffect(() => {
    refresh();
    scheduleNextInAppReminder();
  }, []);

  const practiceVerse = useMemo(
    () => verses.find((verse) => verse.id === practiceVerseId) || null,
    [verses, practiceVerseId],
  );

  const review = (grade: ReviewGrade) => {
    if (!practiceVerseId) return;
    const settings = getMemoryReminderSettings();
    if (settings.enabled && settings.mode === 'auto') createAutoReminderSchedule(practiceVerseId, settings.auto.preset);
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
    <div className="space-y-4 pb-24">
      {dueAutoReminders.length > 0 && (
        <section className="animate-in fade-in slide-in-from-top-3 rounded-[22px] border border-[#EED9C7] bg-[#FFF9F1] p-4 shadow-[0_6px_18px_rgba(81,67,45,.07)]">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-[#E5963D] shadow-sm"><BellRing className="h-5 w-5 animate-bounce" /></span>
            <div className="min-w-0 flex-1"><h2 className="text-[14px] font-black text-[#3D3129]">잊으신 말씀이 있어요</h2><p className="mt-1 text-[10px] font-semibold text-[#81766C]">{dueAutoReminders.length}개의 복습 알림이 기다리고 있습니다.</p></div>
            <button type="button" onClick={() => handleCompleteAutoReminder(dueAutoReminders[0].id)} className="h-9 rounded-full bg-[#EFA34B] px-4 text-[11px] font-black text-white">확인</button>
          </div>
        </section>
      )}

      <section className="relative min-h-[224px] overflow-hidden rounded-[29px] border border-[#E3D8C9] bg-[linear-gradient(145deg,#FFFDF8,#F8F0E7)] p-5 shadow-[0_12px_28px_rgba(76,60,42,.10)]">
        <div className="relative z-10 max-w-[64%]">
          <p className="flex items-center gap-1 text-[11px] font-black text-[#8072D4]"><Sparkles className="h-4 w-4" /> 오늘 복습할 말씀</p>
          <h2 className="mt-3 text-[29px] font-black leading-[1.14] tracking-[-.055em] text-[#332C27]">
            {due.length > 0 ? `${due.length}개의 말씀이\n기다려요` : '오늘은 복습할\n말씀이 없습니다'}
          </h2>
          <p className="mt-3 text-[11px] font-semibold leading-5 text-[#81766C]">말씀을 자주 꺼내어 읽을수록 마음에 더 오래 새겨집니다.</p>
        </div>
        <img src={designDecorations.prayerGirl} alt="기도하며 말씀을 기억하는 아이" className="absolute -bottom-5 -right-5 h-[205px] w-[190px] object-contain" />
      </section>

      <section className="grid grid-cols-2 gap-3">
        <button type="button" onClick={() => setShowAddSheet(true)} className="flex h-[62px] items-center justify-center gap-2 rounded-[19px] border border-[#E1D7C9] bg-white/95 text-[#332C27] shadow-[0_5px_14px_rgba(76,60,42,.08)] transition active:scale-[.98]">
          <Plus className="h-5 w-5 text-[#8072D4]" strokeWidth={2.7} /><span className="text-[13px] font-black">구절 추가</span>
        </button>
        <button type="button" onClick={() => setShowReminderSheet(true)} className="flex h-[62px] items-center justify-center gap-2 rounded-[19px] border border-[#E1D7C9] bg-white/95 text-[#332C27] shadow-[0_5px_14px_rgba(76,60,42,.08)] transition active:scale-[.98]">
          <Settings2 className="h-5 w-5 text-[#6E655C]" /><span className="text-[13px] font-black">알림 설정</span>
        </button>
      </section>

      {verses.length > 0 && (
        <section className="grid grid-cols-3 gap-2">
          <MemoryStat icon={<Brain className="h-5 w-5 text-[#6C63B5]" />} label="암송 중" value={`${active}개`} />
          <MemoryStat icon={<BookHeart className="h-5 w-5 text-[#D47A63]" />} label="오늘 복습" value={`${due.length}개`} />
          <MemoryStat icon={<CalendarCheck2 className="h-5 w-5 text-[#4E7F59]" />} label="완료" value={`${mastered}개`} />
        </section>
      )}

      <section className="space-y-3">
        <div className="flex items-end justify-between px-1">
          <div><h3 className="text-[21px] font-black tracking-[-.04em] text-[#332C27]">암송 목록</h3><p className="mt-1 text-[10px] font-semibold text-[#8B8177]">복습 주기에 맞춰 자동으로 정리됩니다.</p></div>
          <span className="text-[10px] font-bold text-[#9A9188]">총 {verses.length}개</span>
        </div>

        {verses.length === 0 ? (
          <div className="flex min-h-[245px] flex-col items-center justify-center rounded-[26px] border-2 border-dashed border-[#E1D4C5] bg-white/38 px-6 py-7 text-center">
            <img src={designDecorations.memoryEmpty} alt="열린 성경" className="h-32 w-44 object-contain" />
            <h4 className="mt-1 text-[16px] font-black text-[#51483F]">아직 암송 구절이 없어요</h4>
            <p className="mt-2 text-[11px] font-semibold leading-5 text-[#8B8177]">구절 추가를 눌러 마음에 새길 말씀을 시작해보세요.</p>
            <button type="button" onClick={() => setShowAddSheet(true)} className="mt-4 flex h-10 items-center gap-1 rounded-full bg-[#8072D4] px-5 text-[11px] font-black text-white"><Plus className="h-4 w-4" />첫 구절 추가</button>
          </div>
        ) : (
          <div className="grid gap-3">
            {verses.map((verse) => (
              <div key={verse.id} className="overflow-hidden rounded-[23px] border border-[#E4DACD] bg-white/88 shadow-[0_5px_14px_rgba(76,60,42,.06)]">
                <MemoryVerseCard
                  verse={verse}
                  T={T}
                  onPractice={() => setPracticeVerseId(verse.id)}
                  onDelete={() => { deleteMemoryVerse(verse.id); refresh(); }}
                />
              </div>
            ))}
          </div>
        )}
      </section>

      {showReminderSheet && (
        <div className="fixed inset-0 z-[180] flex flex-col bg-[#FFF9F3] animate-in fade-in slide-in-from-bottom-8 duration-300">
          <header className="flex items-center justify-between border-b border-[#E8DDD0] px-5 pb-4 pt-[calc(14px+env(safe-area-inset-top))]">
            <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-[#8072D4] shadow-sm"><Settings2 className="h-5 w-5" /></span><div><p className="text-[10px] font-bold text-[#8B8177]">시온성경 암송</p><h2 className="text-[20px] font-black text-[#332C27]">알림 설정</h2></div></div>
            <button type="button" onClick={() => { setShowReminderSheet(false); refresh(); }} aria-label="알림 설정 닫기" className="grid h-10 w-10 place-items-center rounded-full border border-[#E3D7C8] bg-white text-[#6B6258]"><X className="h-5 w-5" /></button>
          </header>
          <div className="flex-1 overflow-y-auto px-5 py-5 pb-12"><MemoryReminderSettings T={T} /></div>
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

function MemoryStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="rounded-[19px] border border-[#E5DBCE] bg-white/88 p-3 text-center shadow-[0_3px_9px_rgba(76,60,42,.04)]"><span className="mx-auto grid h-9 w-9 place-items-center rounded-2xl bg-[#F6F1EA]">{icon}</span><p className="mt-2 text-[9px] font-bold text-[#887F76]">{label}</p><b className="mt-1 block text-[17px] text-[#332C27]">{value}</b></div>;
}
