import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  BellRing,
  BookOpen,
  Brain,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Flame,
  Plus,
  Settings2,
  Sparkles,
  Star,
  Target,
  Trophy,
  X,
} from 'lucide-react';
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
import { sanitizeScriptureText } from '../../utils/textUtils';
import { MemoryPracticePage } from './MemoryPracticePage';
import { MemoryReminderSettings } from './MemoryReminderSettings';
import { MemoryVerseCard } from './MemoryVerseCard';
import { MemoryAddVerseSheet } from './MemoryAddVerseSheet';

type ThemeTokens = Record<string, string>;
type SavedVerseLike = { ref: string; text: string };
type MemoryFilter = 'all' | 'due' | 'learning' | 'mastered';

const PRACTICE_MODES = [
  { level: 1, label: '전체 읽기', description: '말씀의 흐름 익히기', icon: BookOpen },
  { level: 2, label: '빈칸 연습', description: '핵심 단어 떠올리기', icon: Brain },
  { level: 4, label: '순서 맞추기', description: '문장 순서 기억하기', icon: Target },
] as const;

export function MemoryHome({ T, savedVerses }: { T: ThemeTokens; savedVerses: SavedVerseLike[] }) {
  const [verses, setVerses] = useState<MemoryVerse[]>([]);
  const [practiceVerseId, setPracticeVerseId] = useState<string | null>(null);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [showReminderSheet, setShowReminderSheet] = useState(false);
  const [dueAutoReminders, setDueAutoReminders] = useState<MemoryAutoReminder[]>([]);
  const [filter, setFilter] = useState<MemoryFilter>('all');

  const due = useMemo(() => getDueMemoryVerses(), [verses]);
  const masteredCount = useMemo(() => verses.filter((verse) => Number(verse.level || 0) >= 5).length, [verses]);
  const learningCount = Math.max(0, verses.length - masteredCount);
  const featuredVerse = due[0] ?? verses[0] ?? null;
  const masteryPercent = verses.length ? Math.round((masteredCount / verses.length) * 100) : 0;
  const todayProgress = due.length === 0 && verses.length > 0 ? 100 : Math.max(0, Math.round(((verses.length - due.length) / Math.max(1, verses.length)) * 100));

  const filteredVerses = useMemo(() => {
    if (filter === 'due') {
      const dueIds = new Set(due.map((verse) => verse.id));
      return verses.filter((verse) => dueIds.has(verse.id));
    }
    if (filter === 'mastered') return verses.filter((verse) => Number(verse.level || 0) >= 5);
    if (filter === 'learning') return verses.filter((verse) => Number(verse.level || 0) < 5);
    return verses;
  }, [due, filter, verses]);

  const refresh = () => {
    setVerses(getMemoryVerses());
    setDueAutoReminders(getDueAutoReminders());
  };

  useEffect(() => {
    refresh();
    scheduleNextInAppReminder();
  }, []);

  const practiceVerse = useMemo(() => verses.find((verse) => verse.id === practiceVerseId) || null, [verses, practiceVerseId]);

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

  const startAtLevel = (verse: MemoryVerse, level: number) => {
    const current = Math.max(1, Number(verse.level || 1));
    if (current !== level) moveMemoryVerseLevel(verse.id, level - current);
    refresh();
    setPracticeVerseId(verse.id);
  };

  if (practiceVerse) {
    return <MemoryPracticePage verse={practiceVerse} T={T} onBack={() => setPracticeVerseId(null)} onMoveStage={moveStage} onFinish={() => review('good')} />;
  }

  return (
    <div className="space-y-4 pb-24">
      <section className="relative min-h-[220px] overflow-hidden rounded-[29px] border border-[#DFE7D9] bg-[linear-gradient(135deg,#FFF9E8,#EEF7EB)] p-5 shadow-[0_12px_28px_rgba(70,58,39,.08)]">
        <img src={designDecorations.sunriseHills} alt="" className="pointer-events-none absolute inset-x-0 bottom-0 h-28 w-full object-cover object-bottom opacity-30" />
        <img src={designDecorations.childBible} alt="성경을 읽는 아이" className="pointer-events-none absolute -bottom-5 right-0 h-44 w-36 object-contain" />
        <div className="relative max-w-[66%]">
          <p className="flex items-center gap-1 text-[11px] font-black text-[#4E7F59]"><Sparkles className="h-4 w-4" />말씀 암송</p>
          <h2 className="mt-2 text-[30px] font-black tracking-[-.055em] text-[#2F2923]">말씀을 마음에<br />새겨요</h2>
          <p className="mt-2 text-[12px] font-semibold leading-5 text-[#756D64]">고운바탕으로 말씀을 천천히 읽고, 짧게 자주 복습해 오래 기억해요.</p>
          <button type="button" onClick={() => featuredVerse ? setPracticeVerseId(featuredVerse.id) : setShowAddSheet(true)} className="mt-4 flex h-11 items-center gap-2 rounded-full bg-[#4E7F59] px-5 text-[13px] font-black text-white shadow-lg active:scale-95"><Brain className="h-5 w-5" />{featuredVerse ? '오늘 복습 시작' : '첫 구절 추가하기'}</button>
        </div>
      </section>

      {dueAutoReminders.length > 0 && (
        <section className="rounded-[22px] border border-[#F0D6B6] bg-[#FFF5DF] p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-[#E58E28]"><BellRing className="h-5 w-5 animate-bounce" /></span><div><h3 className="text-[13px] font-black">복습 알림이 도착했어요</h3><p className="mt-1 text-[10px] font-semibold text-[#7D7163]">{dueAutoReminders.length}개의 말씀을 다시 떠올려보세요.</p></div></div><button type="button" onClick={() => { markAutoReminderCompleted(dueAutoReminders[0].id); refresh(); }} className="rounded-full bg-[#E99B31] px-4 py-2 text-[11px] font-black text-white">확인</button></div>
        </section>
      )}

      <section className="relative overflow-hidden rounded-[26px] border border-[#E5DBCE] bg-[linear-gradient(145deg,#FFFDF8,#F8F1E9)] p-4 shadow-[0_8px_22px_rgba(76,60,42,.06)]">
        <img src={designDecorations.bookmarks} alt="" className="pointer-events-none absolute -right-2 -top-2 h-24 w-24 object-contain opacity-45" />
        <div className="relative flex items-center justify-between"><div><p className="text-[11px] font-black text-[#8072D4]">오늘의 암송 말씀</p><h3 className="mt-1 text-[20px] font-black">{featuredVerse?.ref || '마음에 새길 말씀을 골라보세요'}</h3></div>{featuredVerse && <span className="rounded-full bg-[#F1EDFA] px-3 py-1 text-[10px] font-black text-[#6C63A5]">{Math.max(1, Number(featuredVerse.level || 1))}/5 단계</span>}</div>
        {featuredVerse ? <blockquote data-scripture="true" className="serif-verse relative mt-4 rounded-[20px] border border-[#E8DED1] bg-white/82 p-4 text-[17px] leading-[1.9] text-[#3D342D]">{sanitizeScriptureText(featuredVerse.text)}</blockquote> : <div className="relative mt-4 rounded-[20px] border-2 border-dashed border-[#E5D9CA] bg-white/50 p-5 text-center"><p className="text-[12px] font-semibold text-[#81786E]">저장한 말씀이나 성경 검색에서 암송 구절을 추가해보세요.</p></div>}
        <div className="relative mt-3 grid grid-cols-2 gap-2.5"><button type="button" onClick={() => featuredVerse ? setPracticeVerseId(featuredVerse.id) : setShowAddSheet(true)} className="flex h-11 items-center justify-center gap-2 rounded-full bg-[linear-gradient(180deg,#8A7BD8,#6C63B5)] text-[12px] font-black text-white"><Brain className="h-4 w-4" />암송 연습</button><button type="button" onClick={() => setShowAddSheet(true)} className="flex h-11 items-center justify-center gap-2 rounded-full border border-[#E5DBCE] bg-white text-[12px] font-black"><Plus className="h-4 w-4" />구절 추가</button></div>
      </section>

      <section className="grid grid-cols-3 gap-2.5">
        <MemoryStat icon={<BookOpen className="h-5 w-5 text-[#4E7F59]" />} value={`${verses.length}`} label="전체 구절" tone="green" />
        <MemoryStat icon={<CalendarClock className="h-5 w-5 text-[#E39A2B]" />} value={`${due.length}`} label="오늘 복습" tone="gold" />
        <MemoryStat icon={<CheckCircle2 className="h-5 w-5 text-[#6C63A5]" />} value={`${masteredCount}`} label="암송 완료" tone="purple" />
      </section>

      <section className="rounded-[25px] border border-[#E5DBCE] bg-white/94 p-4 shadow-sm">
        <div className="flex items-center justify-between"><div><h3 className="text-[18px] font-black">오늘의 복습 진행</h3><p className="mt-1 text-[10px] font-semibold text-[#81786E]">복습할 말씀을 하나씩 완료해보세요.</p></div><ProgressBadge value={todayProgress} /></div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#EEE7DD]"><div className="h-full rounded-full bg-[linear-gradient(90deg,#8B7CD6,#4E7F59)]" style={{ width: `${todayProgress}%` }} /></div>
        <div className="mt-4 grid grid-cols-3 gap-2">{PRACTICE_MODES.map(({ level, label, description, icon: Icon }) => <button key={level} type="button" onClick={() => featuredVerse ? startAtLevel(featuredVerse, level) : setShowAddSheet(true)} className="rounded-[18px] border border-[#E7DDCF] bg-[#FFFDF8] p-3 text-left active:scale-[.98]"><span className="grid h-9 w-9 place-items-center rounded-2xl bg-[#F3EFE8] text-[#6C63A5]"><Icon className="h-5 w-5" /></span><b className="mt-2 block text-[11px]">{label}</b><small className="mt-1 block text-[8px] font-semibold leading-3 text-[#8A8177]">{description}</small></button>)}</div>
      </section>

      <section className="rounded-[25px] border border-[#E1E7DA] bg-[#F4F8F1] p-4">
        <div className="flex items-center justify-between"><div><h3 className="flex items-center gap-2 text-[18px] font-black text-[#4E7F59]"><Trophy className="h-5 w-5" />암송 성장 현황</h3><p className="mt-1 text-[10px] font-semibold text-[#756D64]">5단계까지 완성하면 암송 완료로 기록돼요.</p></div><b className="text-[22px] text-[#4E7F59]">{masteryPercent}%</b></div>
        <div className="mt-4 grid grid-cols-5 gap-2">{['읽기','빈칸','전체 빈칸','순서','첫 글자'].map((label, index) => { const reached = verses.some((verse) => Number(verse.level || 1) >= index + 1); return <div key={label} className="flex flex-col items-center gap-1"><span className={['grid h-10 w-10 place-items-center rounded-full border text-[11px] font-black', reached ? 'border-[#4E7F59] bg-[#4E7F59] text-white' : 'border-[#DCE3D7] bg-white text-[#AAA197]'].join(' ')}>{reached ? <CheckCircle2 className="h-5 w-5" /> : index + 1}</span><small className="text-center text-[8px] font-bold text-[#766E65]">{label}</small></div>; })}</div>
      </section>

      <section>
        <div className="flex items-center justify-between px-1"><div><h3 className="text-[21px] font-black">암송 목록</h3><p className="mt-1 text-[10px] font-semibold text-[#8B8278]">말씀 카드를 눌러 복습을 시작하세요.</p></div><button type="button" onClick={() => setShowReminderSheet(true)} className="flex h-9 items-center gap-1 rounded-full border border-[#E7DDCF] bg-white px-3 text-[10px] font-black text-[#766A5C]"><Settings2 className="h-4 w-4" />알림 설정</button></div>
        <div className="mt-3 grid grid-cols-4 rounded-full border border-[#E4D8CA] bg-[#F8F1E7] p-1">{([['all','전체'],['due','오늘'],['learning','학습 중'],['mastered','완료']] as Array<[MemoryFilter, string]>).map(([value, label]) => <button type="button" key={value} onClick={() => setFilter(value)} className={['h-9 rounded-full text-[10px] font-black', filter === value ? 'bg-[#4E7F59] text-white shadow-sm' : 'text-[#746B62]'].join(' ')}>{label}</button>)}</div>

        {filteredVerses.length === 0 ? <div className="mt-3 rounded-[25px] border-2 border-dashed border-[#E2D8CA] bg-white/70 px-5 py-10 text-center"><img src={designDecorations.childResting} alt="" className="mx-auto h-28 w-28 object-contain" /><h4 className="mt-3 text-[17px] font-black">표시할 암송 구절이 없습니다</h4><p className="mt-1 text-[11px] font-semibold text-[#81786E]">저장한 말씀이나 직접 찾은 말씀을 추가해보세요.</p><button type="button" onClick={() => setShowAddSheet(true)} className="mt-4 rounded-full bg-[#F4A23A] px-5 py-2.5 text-[12px] font-black text-white">구절 추가하기</button></div> : <div className="mt-3 grid gap-3">{filteredVerses.map((verse, index) => <div key={verse.id} className="overflow-hidden rounded-[24px] border border-[#E5DBCE] bg-white/92 shadow-sm"><MemoryVerseCard verse={verse} T={T} index={index} onPractice={() => setPracticeVerseId(verse.id)} onDelete={() => { deleteMemoryVerse(verse.id); refresh(); }} /></div>)}</div>}
      </section>

      <section className="relative overflow-hidden rounded-[23px] border border-[#DFE8D8] bg-[#F1F7EE] p-4"><h3 className="scripture-font text-[19px] font-bold text-[#4E7F59]">“주의 말씀을 내 마음에 두었나이다”</h3><p className="mt-2 max-w-[68%] text-[11px] font-semibold text-[#756D64]">매일 한 구절씩 천천히 마음에 새겨보세요.</p><img src={designDecorations.homeCross} alt="성경과 십자가" className="absolute -bottom-3 right-2 h-24 w-24 object-contain" /></section>

      {showReminderSheet && <div className="fixed inset-0 z-[220] flex items-end justify-center bg-black/30 p-3 backdrop-blur-sm"><section className="max-h-[90vh] w-full max-w-[430px] overflow-y-auto rounded-[30px] border border-[#E7DDCF] bg-[#FFFDF8] shadow-2xl"><header className="sticky top-0 z-10 flex items-center justify-between border-b border-[#E7DDCF] bg-[#FFFDF8]/95 p-5 backdrop-blur-xl"><div className="flex items-center gap-3"><Settings2 className="h-5 w-5 text-[#4E7F59]" /><h2 className="text-[20px] font-black">암송 알림 설정</h2></div><button type="button" onClick={() => { setShowReminderSheet(false); refresh(); }} className="grid h-10 w-10 place-items-center rounded-full bg-[#F3EEE6]"><X className="h-5 w-5" /></button></header><div className="p-5 pb-10"><MemoryReminderSettings T={T} /></div></section></div>}
      {showAddSheet && <MemoryAddVerseSheet onClose={() => { setShowAddSheet(false); refresh(); }} savedVerses={savedVerses} theme={T} fontSize="1rem" />}
    </div>
  );
}

function MemoryStat({ icon, value, label, tone }: { icon: ReactNode; value: string; label: string; tone: 'green' | 'gold' | 'purple' }) {
  const backgrounds = { green: '#EEF6EB', gold: '#FFF5DD', purple: '#F3EFFA' };
  return <section className="rounded-[20px] border border-[#E7DDCF] p-3 text-center shadow-sm" style={{ background: backgrounds[tone] }}><span className="mx-auto grid h-9 w-9 place-items-center rounded-2xl bg-white/75">{icon}</span><b className="mt-2 block text-[20px] text-[#332C27]">{value}</b><p className="mt-1 text-[9px] font-bold text-[#887F76]">{label}</p></section>;
}

function ProgressBadge({ value }: { value: number }) {
  return <span className="relative grid h-16 w-16 place-items-center rounded-full" style={{ background: `conic-gradient(#8072D4 ${value * 3.6}deg,#E8E2F1 0deg)` }}><span className="grid h-12 w-12 place-items-center rounded-full bg-[#FFFDF8] text-[14px] font-black text-[#6C63A5]">{value}%</span></span>;
}
