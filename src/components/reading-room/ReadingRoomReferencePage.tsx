import {
  Award,
  BarChart3,
  BellRing,
  BookOpen,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  Flame,
  Gift,
  Heart,
  Leaf,
  LockKeyhole,
  Medal,
  PenLine,
  Play,
  Plus,
  Sparkles,
  Star,
  Trophy,
  WalletCards,
  X,
} from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { designDecorations } from '../../assets/design';
import {
  ALL_READING_PLAN_TEMPLATES,
  createCustomReadingPlanTemplate,
  READING_PLAN_BOOK_OPTIONS,
} from '../../data/readingPlans';
import { getProgressPercent, getTodayReadingDay, isDayCompleted } from '../../services/readingPlanStats';
import type { ReadingDayTask, ReadingPlanProgress, ReadingPlanTemplate } from '../../types/readingPlan';
import { formatReadingRoomTask, getReadingRoomPlanLabel } from './readingRoomUtils';

type ReadingRoomPageProps = {
  progress: ReadingPlanProgress | null;
  userTemplates?: ReadingPlanTemplate[];
  onToggleToday?: (day: number) => boolean | void;
  onStartPlan?: (templateId: string, template?: ReadingPlanTemplate) => void;
  onStartPlanAndRead?: (template: ReadingPlanTemplate) => void;
  onNavigateToRange?: (task?: ReadingDayTask | null) => void;
};

type ReadingRoomSection = 'home' | 'courses' | 'my-courses' | 'records' | 'rewards';
type ReportMode = 'week' | 'month';
type CourseTab = 'created' | 'saved';

const CUSTOM_PLANS_STORAGE_KEY = 'gb_custom_reading_plans';
const SAVED_PLAN_IDS_KEY = 'gb_saved_reading_plan_ids';

function currentSection(): ReadingRoomSection {
  if (typeof window === 'undefined') return 'home';
  const path = window.location.pathname;
  if (path.startsWith('/reading-room/courses')) return 'courses';
  if (path.startsWith('/reading-room/my-courses')) return 'my-courses';
  if (path.startsWith('/reading-room/records')) return 'records';
  if (path.startsWith('/reading-room/rewards')) return 'rewards';
  return 'home';
}

function navigateReadingRoom(path: string) {
  if (typeof window === 'undefined') return;
  if (window.location.pathname !== path) window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key: string, value: unknown) {
  if (typeof window !== 'undefined') window.localStorage.setItem(key, JSON.stringify(value));
}

function getStreak(completedDays: number[]) {
  if (!completedDays.length) return 0;
  const completed = new Set(completedDays);
  let day = Math.max(...completedDays);
  let streak = 0;
  while (day > 0 && completed.has(day)) {
    streak += 1;
    day -= 1;
  }
  return streak;
}

function taskChapterCount(task: ReadingDayTask | null | undefined) {
  return task?.references.reduce(
    (sum, reference) => sum + ((reference.endChapter ?? reference.startChapter) - reference.startChapter + 1),
    0,
  ) ?? 0;
}

function shortDate(value: string | undefined) {
  if (!value) return '오늘 시작';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.replace(/-/g, '.');
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
}

export function ReadingRoomReferencePage({
  progress,
  userTemplates = [],
  onToggleToday,
  onStartPlan,
  onStartPlanAndRead,
  onNavigateToRange,
}: ReadingRoomPageProps) {
  const section = currentSection();
  const [localCustomTemplates, setLocalCustomTemplates] = useState<ReadingPlanTemplate[]>(() => readJson(CUSTOM_PLANS_STORAGE_KEY, []));
  const [savedPlanIds, setSavedPlanIds] = useState<string[]>(() => readJson(SAVED_PLAN_IDS_KEY, ['bible-365', 'john-21', 'psalms-30']));
  const [builderOpen, setBuilderOpen] = useState(false);
  const [courseTitle, setCourseTitle] = useState('');
  const [duration, setDuration] = useState(14);
  const [selectedBookIds, setSelectedBookIds] = useState<string[]>(['gen']);
  const [toast, setToast] = useState('');

  const customTemplates = useMemo(() => {
    const map = new Map<string, ReadingPlanTemplate>();
    [...userTemplates, ...localCustomTemplates].forEach((item) => map.set(item.id, item));
    return Array.from(map.values());
  }, [userTemplates, localCustomTemplates]);

  const templates = useMemo(() => {
    const map = new Map<string, ReadingPlanTemplate>();
    [...ALL_READING_PLAN_TEMPLATES, ...customTemplates].forEach((item) => map.set(item.id, item));
    return Array.from(map.values());
  }, [customTemplates]);

  const activeTemplate = templates.find((item) => item.id === progress?.templateId) ?? null;
  const suggestedTemplate = activeTemplate ?? templates[0] ?? null;
  const todayDay = activeTemplate ? getTodayReadingDay(activeTemplate, progress) : 1;
  const todayTask = activeTemplate?.tasks[todayDay - 1] ?? suggestedTemplate?.tasks[0] ?? null;
  const completedDays = progress?.completedDays ?? [];
  const completedCount = completedDays.length;
  const percent = activeTemplate ? getProgressPercent(activeTemplate, progress) : 0;
  const remainingDays = activeTemplate ? Math.max(0, activeTemplate.days - completedCount) : suggestedTemplate?.days ?? 0;
  const streak = getStreak(completedDays);
  const points = Math.max(0, completedCount * 10 + streak * 5);
  const totalReadChapters = activeTemplate
    ? completedDays.reduce((sum, day) => sum + taskChapterCount(activeTemplate.tasks[day - 1]), 0)
    : 0;
  const todayCompleted = isDayCompleted(progress, todayDay);

  const flash = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 1800);
  };

  const activateCourse = (template: ReadingPlanTemplate) => {
    onStartPlan?.(template.id, template);
    flash(`${template.title} 코스를 시작했습니다.`);
  };

  const startCourseAndRead = (template: ReadingPlanTemplate) => {
    if (onStartPlanAndRead) onStartPlanAndRead(template);
    else {
      onStartPlan?.(template.id, template);
      onNavigateToRange?.(template.tasks[0]);
    }
  };

  const readToday = () => {
    if (activeTemplate && todayTask) {
      onNavigateToRange?.(todayTask);
      return;
    }
    if (suggestedTemplate) startCourseAndRead(suggestedTemplate);
  };

  const toggleSavedPlan = (templateId: string) => {
    const next = savedPlanIds.includes(templateId)
      ? savedPlanIds.filter((id) => id !== templateId)
      : [templateId, ...savedPlanIds];
    setSavedPlanIds(next);
    saveJson(SAVED_PLAN_IDS_KEY, next);
    flash(savedPlanIds.includes(templateId) ? '저장한 코스에서 제거했습니다.' : '나의 코스에 저장했습니다.');
  };

  const createCustomPlan = () => {
    if (!selectedBookIds.length) return;
    const chosenBooks = READING_PLAN_BOOK_OPTIONS.filter((book) => selectedBookIds.includes(book.id));
    const template = createCustomReadingPlanTemplate({
      id: `user-${Date.now()}`,
      title: courseTitle.trim() || `${chosenBooks[0]?.name ?? '나만의'} ${duration}일 코스`,
      days: duration,
      bookIds: selectedBookIds,
    });
    const next = [template, ...customTemplates.filter((item) => item.id !== template.id)];
    setLocalCustomTemplates(next);
    saveJson(CUSTOM_PLANS_STORAGE_KEY, next);
    setBuilderOpen(false);
    setCourseTitle('');
    flash('나만의 코스를 만들었습니다.');
  };

  return (
    <>
      {section === 'courses' && (
        <CoursesScreen
          templates={templates}
          activeTemplate={activeTemplate}
          savedPlanIds={savedPlanIds}
          onActivate={activateCourse}
          onRead={startCourseAndRead}
          onToggleSaved={toggleSavedPlan}
          onCreate={() => setBuilderOpen(true)}
        />
      )}
      {section === 'my-courses' && (
        <MyCoursesScreen
          templates={templates}
          customTemplates={customTemplates}
          savedPlanIds={savedPlanIds}
          activeTemplate={activeTemplate}
          progress={progress}
          onActivate={activateCourse}
          onRead={startCourseAndRead}
          onToggleSaved={toggleSavedPlan}
          onCreate={() => setBuilderOpen(true)}
        />
      )}
      {section === 'records' && (
        <RecordsScreen
          percent={percent}
          completedCount={completedCount}
          streak={streak}
          points={points}
          totalReadChapters={totalReadChapters}
          startedAt={progress?.startedAt}
          onRead={readToday}
        />
      )}
      {section === 'rewards' && (
        <RewardsScreen
          points={points}
          completedCount={completedCount}
          streak={streak}
          totalReadChapters={totalReadChapters}
          onRead={readToday}
        />
      )}
      {section === 'home' && (
        <HomeScreen
          template={activeTemplate ?? suggestedTemplate}
          progress={progress}
          task={todayTask}
          day={todayDay}
          completed={todayCompleted}
          percent={percent}
          completedCount={completedCount}
          remainingDays={remainingDays}
          streak={streak}
          points={points}
          onRead={readToday}
          onToggleComplete={() => activeTemplate && onToggleToday?.(todayDay)}
        />
      )}

      {builderOpen && (
        <CustomCourseBuilder
          title={courseTitle}
          setTitle={setCourseTitle}
          duration={duration}
          setDuration={setDuration}
          selectedBookIds={selectedBookIds}
          setSelectedBookIds={setSelectedBookIds}
          onClose={() => setBuilderOpen(false)}
          onCreate={createCustomPlan}
        />
      )}
      {toast && <div className="fixed bottom-[calc(92px+env(safe-area-inset-bottom))] left-1/2 z-[260] -translate-x-1/2 rounded-full bg-[#29251F]/92 px-4 py-2 text-[12px] font-bold text-white shadow-xl">{toast}</div>}
    </>
  );
}

function HomeScreen({ template, progress, task, day, completed, percent, completedCount, remainingDays, streak, points, onRead, onToggleComplete }: {
  template: ReadingPlanTemplate | null;
  progress: ReadingPlanProgress | null;
  task: ReadingDayTask | null;
  day: number;
  completed: boolean;
  percent: number;
  completedCount: number;
  remainingDays: number;
  streak: number;
  points: number;
  onRead: () => void;
  onToggleComplete: () => void;
}) {
  const label = getReadingRoomPlanLabel(template);
  const displayPercent = Math.max(percent, template ? 1 : 0);
  const displayPoints = Math.max(points, template ? 10 : 0);

  return (
    <div className="space-y-4">
      <section className="relative overflow-hidden rounded-[28px] border border-[#DCE4D5] bg-[linear-gradient(135deg,rgba(255,252,239,.96),rgba(239,247,232,.95))] p-5 shadow-[0_12px_28px_rgba(83,70,48,0.08)]">
        <img src={designDecorations.sunriseHills} alt="" className="pointer-events-none absolute inset-x-0 bottom-0 h-28 w-full object-cover object-bottom opacity-35" />
        <img src={designDecorations.childBible} alt="성경을 읽는 아이" className="pointer-events-none absolute -bottom-4 right-0 h-36 w-28 object-contain opacity-95" />
        <div className="relative max-w-[72%]">
          <p className="text-[12px] font-black text-[#4E7F59]">진행 중인 통독</p>
          <h2 className="mt-1 text-[28px] font-black tracking-[-0.045em] text-[#2A251F]">{template ? label.title : '성경 365'}</h2>
          <p className="mt-1 text-[12px] font-semibold text-[#655E55]">{completedCount}일 완료 · {remainingDays}일 남음</p>
          <div className="mt-4 flex items-center gap-3">
            <ProgressRing value={displayPercent} size={78} />
            <div className="grid flex-1 gap-2">
              <StatPill icon={<Flame className="h-4 w-4 text-[#F47F36]" fill="#F47F36" />} label={`연속 ${streak}일`} />
              <StatPill icon={<PointDrop size={17} />} label={`포인트 ${displayPoints}P`} />
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden rounded-[22px] border border-[#ECDDBE] bg-[linear-gradient(100deg,#FFF3CE,#FFF9E9)] px-4 py-3.5 shadow-sm">
        <img src={designDecorations.sparkles} alt="" className="pointer-events-none absolute right-24 top-1 h-14 w-14 object-contain opacity-70" />
        <div className="relative flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <HoneyJar />
            <div>
              <h3 className="text-[14px] font-black">오늘의 보상</h3>
              <p className="text-[12px] font-semibold text-[#6E6255]">오늘 읽으면 <b className="text-[#E9822B]">+10P</b></p>
              <p className="text-[12px] font-semibold text-[#6E6255]">연속 보너스 <b className="text-[#E9822B]">+5P</b></p>
            </div>
          </div>
          <button type="button" onClick={onRead} className="flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-[#4E7F59] px-4 text-[12px] font-black text-white shadow-lg active:scale-95"><Gift className="h-4 w-4" />보상 받기</button>
        </div>
      </section>

      <section className="relative overflow-hidden rounded-[25px] border border-[#E6DCCE] bg-white/94 p-4 shadow-[0_8px_22px_rgba(81,67,45,0.07)]">
        <img src={designDecorations.leafSprig} alt="" className="pointer-events-none absolute -right-5 -top-4 h-24 w-24 rotate-12 object-contain opacity-25" />
        <div className="relative flex items-center justify-between">
          <p className="flex items-center gap-1 text-[12px] font-black"><span className="text-[#F4AD33]">☀</span> 오늘의 읽기</p>
          <button type="button" aria-label="오늘 본문 좋아요" className="grid h-9 w-9 place-items-center rounded-full text-[#BCA17A] active:scale-90"><Heart className="h-5 w-5" /></button>
        </div>
        <div className="relative mt-1 flex items-center gap-3">
          <BibleArt className="h-[92px] w-[104px] shrink-0" />
          <div className="min-w-0 flex-1">
            <h3 className="text-[25px] font-black tracking-[-0.045em]">{formatReadingRoomTask(task)}</h3>
            <p className="mt-2 line-clamp-2 text-[12px] font-semibold text-[#756D64]">{task?.reflectionPrompt || '오늘의 말씀을 천천히 읽고 마음에 남는 한 문장을 기록해보세요.'}</p>
          </div>
        </div>
        <div className="relative mt-3 grid grid-cols-[1.15fr_1fr] gap-2.5">
          <button type="button" onClick={onRead} className="flex h-12 items-center justify-center gap-2 rounded-full bg-[linear-gradient(180deg,#FFB44A,#F39A31)] text-[14px] font-black text-white shadow-lg active:scale-[0.98]"><BookOpen className="h-5 w-5" />오늘 말씀 읽기</button>
          <button type="button" onClick={onToggleComplete} disabled={!progress} className="flex h-12 items-center justify-center gap-2 rounded-full border border-[#E6DAC9] bg-white text-[12px] font-black text-[#3F3932] active:scale-[0.98] disabled:opacity-45"><PenLine className="h-[18px] w-[18px]" />{completed ? '완료 취소' : '읽기 완료'}</button>
        </div>
      </section>

      <WeeklyCheck progress={progress} todayDay={day} />

      <button type="button" onClick={() => navigateReadingRoom('/reading-room/rewards')} className="relative flex w-full items-center justify-between overflow-hidden rounded-[22px] border border-[#E0E7D8] bg-[#F3F8EF] p-4 text-left shadow-sm active:scale-[0.99]">
        <div className="relative z-10"><p className="text-[12px] font-bold text-[#6D7567]">통독 보상</p><h3 className="mt-1 text-[18px] font-black text-[#4E7F59]">포인트와 배지를 확인해보세요</h3><p className="mt-1 text-[11px] font-semibold text-[#756D64]">현재 {displayPoints}P · 배지 {Math.min(8, completedCount + 1)}개</p></div>
        <img src={designDecorations.bookmarks} alt="책갈피" className="h-20 w-20 object-contain" />
      </button>
    </div>
  );
}

function CoursesScreen({ templates, activeTemplate, savedPlanIds, onActivate, onRead, onToggleSaved, onCreate }: {
  templates: ReadingPlanTemplate[];
  activeTemplate: ReadingPlanTemplate | null;
  savedPlanIds: string[];
  onActivate: (template: ReadingPlanTemplate) => void;
  onRead: (template: ReadingPlanTemplate) => void;
  onToggleSaved: (templateId: string) => void;
  onCreate: () => void;
}) {
  const [badgesExpanded, setBadgesExpanded] = useState(false);
  return (
    <div className="space-y-5">
      <Segmented left="추천 코스" right="나만의 코스" active="left" onRight={() => navigateReadingRoom('/reading-room/my-courses')} />

      <section>
        <div className="mb-3 flex items-center justify-between">
          <div><h2 className="text-[22px] font-black tracking-[-0.04em]">도전 배지</h2><p className="mt-1 text-[11px] font-semibold text-[#8A8177]">코스를 읽을수록 새로운 배지가 열려요.</p></div>
          <button type="button" onClick={() => setBadgesExpanded((value) => !value)} className="text-[12px] font-black text-[#7B705F]">{badgesExpanded ? '접기' : '더 보기'} ›</button>
        </div>
        <div className={badgesExpanded ? 'grid grid-cols-4 gap-3' : 'flex gap-4 overflow-x-auto pb-2'}>
          <BadgeToken icon="book" label="첫걸음" sub="1일 완료" />
          <BadgeToken icon="flame" label="연속 3일" sub="연속 읽기" />
          <BadgeToken icon="star" label="일주일 완주" sub="7일 연속" />
          <BadgeToken icon="leaf" label="30장 달성" sub="말씀 탐험" />
          {badgesExpanded && <><BadgeToken icon="book-gold" label="성경 탐험가" sub="100장 달성" /><BadgeToken locked label="한 달 완주" sub="30일 연속" /><BadgeToken locked label="신약 완주" sub="신약 전체" /><BadgeToken locked label="성경 완독" sub="365일" /></>}
        </div>
      </section>

      <section className="relative overflow-hidden rounded-[25px] border border-[#DFE8D8] bg-[linear-gradient(120deg,#F2F8EC,#FFF9E8)] p-4">
        <img src={designDecorations.pathMeadow} alt="" className="pointer-events-none absolute bottom-0 right-0 h-24 w-44 object-contain opacity-45" />
        <div className="relative max-w-[70%]"><p className="text-[11px] font-black text-[#4E7F59]">추천 코스</p><h2 className="mt-1 text-[23px] font-black">성경을 더 깊이, 꾸준히!</h2><p className="mt-1 text-[11px] font-semibold leading-5 text-[#756D64]">기존에 만들어 둔 모든 추천 코스를 아래로 스크롤하며 바로 확인할 수 있습니다.</p></div>
      </section>

      <section>
        <div className="grid grid-cols-2 gap-3">
          {templates.map((template, index) => (
            <CourseCard
              key={template.id}
              template={template}
              index={index}
              active={template.id === activeTemplate?.id}
              saved={savedPlanIds.includes(template.id)}
              onActivate={() => onActivate(template)}
              onRead={() => onRead(template)}
              onToggleSaved={() => onToggleSaved(template.id)}
            />
          ))}
        </div>
      </section>

      <button type="button" onClick={onCreate} className="flex h-13 w-full items-center justify-center gap-2 rounded-full border border-[#E6C78E] bg-[#FFF7E5] py-3 text-[14px] font-black text-[#B9771E] active:scale-[0.99]"><Plus className="h-5 w-5" />나만의 코스 만들기</button>
    </div>
  );
}

function MyCoursesScreen({ templates, customTemplates, savedPlanIds, activeTemplate, progress, onActivate, onRead, onToggleSaved, onCreate }: {
  templates: ReadingPlanTemplate[];
  customTemplates: ReadingPlanTemplate[];
  savedPlanIds: string[];
  activeTemplate: ReadingPlanTemplate | null;
  progress: ReadingPlanProgress | null;
  onActivate: (template: ReadingPlanTemplate) => void;
  onRead: (template: ReadingPlanTemplate) => void;
  onToggleSaved: (templateId: string) => void;
  onCreate: () => void;
}) {
  const [tab, setTab] = useState<CourseTab>('created');
  const created = useMemo(() => {
    const map = new Map<string, ReadingPlanTemplate>();
    if (activeTemplate) map.set(activeTemplate.id, activeTemplate);
    customTemplates.forEach((item) => map.set(item.id, item));
    return Array.from(map.values());
  }, [activeTemplate, customTemplates]);
  const saved = templates.filter((item) => savedPlanIds.includes(item.id));
  const items = tab === 'created' ? created : saved;

  return <div className="space-y-4">
    <section className="relative overflow-hidden rounded-[26px] border border-[#E7DDCF] bg-[linear-gradient(120deg,#FFFDF7,#F2F8EC)] p-5 shadow-sm">
      <div className="max-w-[62%]"><h2 className="flex items-center gap-2 text-[24px] font-black"><Leaf className="h-5 w-5 text-[#5D8A57]" />나의 코스</h2><p className="mt-2 text-[12px] font-semibold leading-5 text-[#756D64]">내가 만든 코스와 저장한 추천 코스를 한눈에 확인하고 바로 이어 읽을 수 있어요.</p></div>
      <img src={designDecorations.openBibleLarge} alt="열린 성경" className="absolute -right-2 bottom-0 h-32 w-40 object-contain" />
    </section>
    <Segmented left={`내가 만든 코스 ${created.length}`} right={`저장한 코스 ${saved.length}`} active={tab === 'created' ? 'left' : 'right'} onLeft={() => setTab('created')} onRight={() => setTab('saved')} />
    {items.length === 0 ? (
      <section className="rounded-[24px] border-2 border-dashed border-[#E6DAC9] bg-white/70 px-5 py-12 text-center"><img src={designDecorations.childResting} alt="" className="mx-auto h-28 w-28 object-contain" /><h3 className="mt-3 text-[18px] font-black">아직 코스가 없습니다</h3><p className="mt-1 text-[12px] font-semibold text-[#756D64]">추천 코스를 저장하거나 나만의 코스를 만들어보세요.</p></section>
    ) : (
      <div className="space-y-3">{items.map((template, index) => <MyCourseCard key={template.id} template={template} index={index} active={template.id === activeTemplate?.id} progress={template.id === activeTemplate?.id ? progress : null} saved={savedPlanIds.includes(template.id)} onActivate={() => onActivate(template)} onRead={() => onRead(template)} onToggleSaved={() => onToggleSaved(template.id)} />)}</div>
    )}
    <button type="button" onClick={onCreate} className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[linear-gradient(180deg,#FFB44A,#F39A31)] text-[15px] font-black text-white shadow-lg active:scale-[0.99]"><Plus className="h-5 w-5" />새 코스 만들기</button>
  </div>;
}

function RecordsScreen({ percent, completedCount, streak, points, totalReadChapters, startedAt, onRead }: { percent: number; completedCount: number; streak: number; points: number; totalReadChapters: number; startedAt?: string; onRead: () => void }) {
  const [mode, setMode] = useState<ReportMode>('week');
  const [showAll, setShowAll] = useState(false);
  const multiplier = mode === 'week' ? 1 : 4;
  const values = [45, 35, 55, 40, 60, 70, Math.max(75, totalReadChapters * 5)].map((value) => Math.min(100, value));
  return <div className="space-y-4">
    <Segmented left="주간 리포트" right="월간 리포트" active={mode === 'week' ? 'left' : 'right'} onLeft={() => setMode('week')} onRight={() => setMode('month')} />
    <section className="relative overflow-hidden rounded-[25px] border border-[#DFE6D6] bg-[linear-gradient(135deg,#F9FAED,#F3F8EF)] p-4 shadow-sm">
      <img src={designDecorations.churchHill} alt="" className="pointer-events-none absolute bottom-0 right-0 h-28 w-32 object-contain opacity-35" />
      <h2 className="relative text-[18px] font-black text-[#4E7F59]">{mode === 'week' ? '이번 주도 잘하고 있어요!' : '이번 달 말씀 습관이 자라고 있어요!'} ♥</h2>
      <p className="relative mt-1 text-[11px] font-semibold text-[#756D64]">매일의 작은 걸음이 믿음의 큰 여정이 됩니다.</p>
      <div className="relative mt-4 grid grid-cols-[90px_1fr_1fr] items-center divide-x divide-[#E7DDCF]"><ProgressRing value={Math.max(percent, 1)} size={78} /><RecordStat value={`${Math.max(1, completedCount * multiplier)}일`} label="읽은 날" /><RecordStat value={`${Math.max(1, totalReadChapters * multiplier)}장`} label="읽은 분량" /></div>
    </section>
    <div className="grid grid-cols-2 gap-3"><SmallStatCard icon={<Flame className="h-6 w-6 text-[#F27B31]" fill="#F27B31" />} title="연속 읽기" value={`${streak}일`} sub="꾸준히 이어가요" /><SmallStatCard icon={<PointDrop size={28} />} title="누적 포인트" value={`${points}P`} sub="읽을 때마다 쌓여요" progress={Math.min(100, points / 30)} /></div>
    <section className="rounded-[23px] border border-[#E7DDCF] bg-white/94 p-4"><h3 className="text-[16px] font-black">읽기 현황</h3><div className="mt-4 flex h-36 items-end justify-between gap-3 border-b border-[#E9E1D6] px-2">{values.map((value, index) => <div key={index} className="flex flex-1 flex-col items-center justify-end gap-1"><b className="text-[10px]">{value}</b><div className="w-full max-w-7 rounded-t-[10px] bg-[linear-gradient(180deg,#94BB6D,#4E7F59)]" style={{ height: `${value}%` }} /><span className={['text-[10px] font-bold', index === 6 ? 'rounded-full bg-[#F7BF53] px-2 py-0.5 text-white' : 'text-[#756D64]'].join(' ')}>{mode === 'week' ? ['월','화','수','목','금','토','일'][index] : `${index + 1}주`}</span></div>)}</div></section>
    <section className="rounded-[23px] border border-[#E7DDCF] bg-white/94 p-4"><div className="flex items-center justify-between"><h3 className="text-[16px] font-black">최근 활동</h3><button type="button" onClick={() => setShowAll((value) => !value)} className="text-[11px] font-bold text-[#776E64]">{showAll ? '접기' : '더보기'} ›</button></div><div className="mt-3 divide-y divide-[#EFE7DC]"><ActivityRow icon={<BibleArt className="h-11 w-11" />} title="오늘의 통독 본문 확인" time="오늘" reward="+10P" /><ActivityRow icon={<BadgeTokenMini />} title="통독 코스 진행" time={`${shortDate(startedAt)} 시작`} reward={`+${points}P`} />{showAll && <><ActivityRow icon={<Medal className="h-8 w-8 text-[#E7A32E]" />} title="도전 배지 확인" time="최근" reward="배지" /><ActivityRow icon={<BarChart3 className="h-8 w-8 text-[#557CA8]" />} title="읽기 기록 업데이트" time="자동 저장" reward="완료" /></>}</div></section>
    <button type="button" onClick={onRead} className="h-12 w-full rounded-full bg-[linear-gradient(180deg,#FFB44A,#F39A31)] text-[15px] font-black text-white shadow-lg">오늘 말씀 읽기</button>
  </div>;
}

function RewardsScreen({ points, completedCount, streak, totalReadChapters, onRead }: { points: number; completedCount: number; streak: number; totalReadChapters: number; onRead: () => void }) {
  const [badgeExpanded, setBadgeExpanded] = useState(false);
  const [pointHistory, setPointHistory] = useState(false);
  const [storeOpen, setStoreOpen] = useState(false);
  const displayPoints = Math.max(points, 0);
  return <div className="space-y-5">
    <Segmented left="보상 & 배지" right="포인트 내역" active={pointHistory ? 'right' : 'left'} onLeft={() => setPointHistory(false)} onRight={() => setPointHistory(true)} />
    <section className="relative overflow-hidden rounded-[25px] border border-[#ECDDBE] bg-[linear-gradient(100deg,#FFF1C8,#FFF9E8)] p-5">
      <img src={designDecorations.flowerBunch} alt="" className="pointer-events-none absolute -bottom-5 right-24 h-20 w-20 object-contain opacity-35" />
      <div className="relative flex items-center justify-between"><div className="flex items-center gap-3"><HoneyJar /><div><p className="text-[12px] font-bold text-[#756D64]">내 포인트</p><h2 className="text-[32px] font-black">{displayPoints}P</h2></div></div><button type="button" onClick={() => setStoreOpen(true)} className="h-12 rounded-full bg-[linear-gradient(180deg,#FFB44A,#F39A31)] px-5 text-[13px] font-black text-white shadow-lg">포인트 사용</button></div>
    </section>

    {pointHistory ? (
      <section className="rounded-[23px] border border-[#E7DDCF] bg-white/95 p-4"><h2 className="text-[19px] font-black">포인트 내역</h2><div className="mt-3 divide-y divide-[#EFE7DC]"><PointHistoryRow title="오늘 말씀 읽기" date="오늘" value="+10P" /><PointHistoryRow title="연속 읽기 보너스" date={`${streak}일 연속`} value="+5P" /><PointHistoryRow title="코스 진행 보상" date={`${completedCount}일 완료`} value={`+${completedCount * 10}P`} /></div></section>
    ) : (
      <>
        <section><div className="mb-3 flex items-center justify-between"><h2 className="text-[20px] font-black">보유 배지 {Math.min(8, completedCount + 1)}개</h2><button type="button" onClick={() => setBadgeExpanded((value) => !value)} className="text-[12px] font-bold text-[#776E64]">{badgeExpanded ? '접기' : '전체 보기'} ›</button></div><div className={badgeExpanded ? 'grid grid-cols-4 gap-3' : 'flex gap-4 overflow-x-auto pb-2'}><BadgeToken icon="book" label="첫 시작" sub="1일 완료" /><BadgeToken icon="book-gold" label="7일 연속" sub="꾸준함" /><BadgeToken icon="leaf" label="30장 달성" sub="말씀 탐험" /><BadgeToken icon="star" label="성경 탐험가" sub="100장" /><BadgeToken locked label="다독왕" sub="30일" />{badgeExpanded && <><BadgeToken locked label="신약 완주" sub="신약 전체" /><BadgeToken locked label="구약 완주" sub="구약 전체" /><BadgeToken locked label="성경 완독" sub="365일" /></>}</div></section>
        <section><h2 className="mb-3 text-[20px] font-black">다가오는 배지</h2><div className="grid grid-cols-3 gap-3"><UpcomingReward tone="blue" icon={<CalendarDays className="h-14 w-14 text-[#537EAB]" />} title="연속 30일" value={`${streak}/30`} progress={(streak / 30) * 100} /><UpcomingReward tone="purple" icon={<BookOpen className="h-14 w-14 text-[#6863A0]" />} title="100장 달성" value={`${totalReadChapters}/100`} progress={totalReadChapters} /><UpcomingReward tone="gold" icon={<Trophy className="h-14 w-14 text-[#E9A62A]" />} title="365 완주" value={`${completedCount}/365`} progress={(completedCount / 365) * 100} /></div></section>
        <section><h2 className="mb-3 text-[20px] font-black">보상 마일스톤</h2><div className="relative flex items-start justify-between px-2"><div className="absolute left-8 right-8 top-6 h-1 rounded-full bg-[linear-gradient(90deg,#4E7F59_0_26%,#F0A63D_26%_40%,#E7DED1_40%)]" />{[['🍯','2,000P','✓'],['🎁','3,000P','다음 보상'],['🔒','5,000P',''],['🏆','10,000P','']].map(([icon,value,note]) => <div key={value} className="relative z-10 flex flex-col items-center"><span className="grid h-12 w-12 place-items-center rounded-full border border-[#E6DAC9] bg-[#FFFDF8] text-2xl">{icon}</span><b className="mt-2 text-[12px]">{value}</b>{note && <small className="mt-1 rounded-full bg-[#FFF0C9] px-2 py-0.5 text-[9px] font-bold text-[#A16D1B]">{note}</small>}</div>)}</div></section>
      </>
    )}

    <section className="relative overflow-hidden rounded-[24px] border border-[#DEE6D8] bg-[#F1F7EE] p-5"><h3 className="text-[21px] font-black text-[#4E7F59]">꾸준함이 기적을 만듭니다</h3><p className="mt-1 max-w-[70%] text-[12px] font-semibold text-[#756D64]">오늘도 말씀과 함께 한 걸음 더 나아가요!</p><img src={designDecorations.homeCross} alt="십자가 성경" className="absolute -bottom-2 right-2 h-24 w-24 object-contain" /></section>
    <button type="button" onClick={onRead} className="h-13 w-full rounded-full bg-[linear-gradient(180deg,#FFB44A,#F39A31)] py-3 text-[16px] font-black text-white shadow-lg">오늘 말씀 읽기</button>

    {storeOpen && <SimpleModal title="포인트 사용" onClose={() => setStoreOpen(false)}><div className="grid gap-3"><StoreItem icon="🎁" title="감사 카드 배경" points="500P" /><StoreItem icon="📖" title="통독 테마 꾸미기" points="1,000P" /><StoreItem icon="🏆" title="특별 완주 배지" points="3,000P" /></div><p className="mt-4 rounded-2xl bg-[#FFF5D7] p-3 text-center text-[12px] font-bold text-[#A16D1B]">보유 포인트 {displayPoints}P · 결제 기능은 다음 단계에서 연결됩니다.</p></SimpleModal>}
  </div>;
}

function CustomCourseBuilder({ title, setTitle, duration, setDuration, selectedBookIds, setSelectedBookIds, onClose, onCreate }: { title: string; setTitle: (value: string) => void; duration: number; setDuration: (value: number) => void; selectedBookIds: string[]; setSelectedBookIds: (value: string[]) => void; onClose: () => void; onCreate: () => void }) {
  return <div className="fixed inset-0 z-[220] flex items-end justify-center bg-black/30 p-3 backdrop-blur-sm"><section className="max-h-[90vh] w-full max-w-[430px] overflow-y-auto rounded-[30px] border border-[#E7DDCF] bg-[#FFFDF8] p-5 shadow-2xl"><div className="flex items-center justify-between"><div><p className="text-[11px] font-black text-[#4E7F59]">CUSTOM COURSE</p><h2 className="text-[22px] font-black">나만의 코스 만들기</h2></div><button type="button" onClick={onClose} aria-label="닫기" className="grid h-10 w-10 place-items-center rounded-full bg-[#F3EEE6] text-[#6B6258]"><X className="h-5 w-5" /></button></div><label className="mt-5 block text-[12px] font-black text-[#4E7F59]">1. 코스 제목</label><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="예) 시편 집중 30일" className="mt-2 h-12 w-full rounded-2xl border border-[#E7DDCF] bg-white px-4 text-[13px] outline-none focus:border-[#4E7F59]" /><label className="mt-5 block text-[12px] font-black text-[#4E7F59]">2. 기간 선택</label><div className="mt-2 flex flex-wrap gap-2">{[7,14,21,30,60,90,180,365].map((value) => <button type="button" key={value} onClick={() => setDuration(value)} className={['h-9 rounded-full border px-4 text-[12px] font-bold', duration === value ? 'border-[#4E7F59] bg-[#EEF5EB] text-[#4E7F59]' : 'border-[#E7DDCF] bg-white text-[#6B6258]'].join(' ')}>{value}일</button>)}</div><label className="mt-5 block text-[12px] font-black text-[#4E7F59]">3. 성경 책 선택</label><div className="mt-2 grid grid-cols-4 gap-2">{READING_PLAN_BOOK_OPTIONS.map((book) => { const active = selectedBookIds.includes(book.id); return <button type="button" key={book.id} onClick={() => setSelectedBookIds(active ? selectedBookIds.filter((id) => id !== book.id) : [...selectedBookIds, book.id])} className={['min-h-10 rounded-xl border px-2 text-[10px] font-bold', active ? 'border-[#4E7F59] bg-[#EAF3E7] text-[#4E7F59]' : 'border-[#E7DDCF] bg-white text-[#6B6258]'].join(' ')}>{active && '✓ '}{book.name}</button>; })}</div><section className="mt-5 grid grid-cols-3 divide-x divide-[#E7DDCF] rounded-[20px] border border-[#E0E5D7] bg-[#F6F8ED] p-4 text-center"><div><p className="text-[10px] text-[#756D64]">완주 포인트</p><b className="mt-2 block text-[22px]">+{Math.max(30, Math.round(duration / 2))}P</b></div><div><p className="text-[10px] text-[#756D64]">완주 배지</p><b className="mt-2 block text-[22px]">1개</b></div><div><p className="text-[10px] text-[#756D64]">선택한 책</p><b className="mt-2 block text-[18px]">{selectedBookIds.length}권</b></div></section><button type="button" onClick={onCreate} disabled={!selectedBookIds.length} className="mt-5 h-12 w-full rounded-full bg-[linear-gradient(180deg,#FFB44A,#F39A31)] text-[15px] font-black text-white disabled:opacity-45">코스 만들기</button></section></div>;
}

function CourseCard({ template, index, active, saved, onActivate, onRead, onToggleSaved }: { template: ReadingPlanTemplate; index: number; active: boolean; saved: boolean; onActivate: () => void; onRead: () => void; onToggleSaved: () => void }) {
  const themes = [
    ['#E9F4EA','#B8D6A8','#527F52'],
    ['#FFF2D5','#F5D18A','#B37A22'],
    ['#DDECF2','#82B5CC','#2F6B84'],
    ['#EEE7F5','#C4ADD7','#6F5687'],
  ];
  const [from, to, text] = themes[index % themes.length];
  return <article className="relative min-h-[224px] overflow-hidden rounded-[24px] border border-[#E7DDCF] p-3 shadow-[0_5px_14px_rgba(81,67,45,0.07)]" style={{ background: `linear-gradient(155deg,${from},${to})` }}>
    <div className="flex items-start justify-between gap-2"><span className="rounded-full bg-white/75 px-2 py-1 text-[9px] font-black" style={{ color: text }}>{active ? '진행중' : template.tone === 'new-testament' ? '신약' : template.tone === 'gospels' ? '복음서' : template.tone === 'custom' ? '나만의' : '전체'}</span><button type="button" onClick={onToggleSaved} aria-label="코스 저장" className="grid h-7 w-7 place-items-center rounded-full bg-white/65 text-[#5E554C] active:scale-90"><Heart className="h-4 w-4" fill={saved ? '#F08A62' : 'none'} stroke={saved ? '#F08A62' : 'currentColor'} /></button></div>
    <span className="mt-2 flex items-center gap-1 text-[10px] font-bold" style={{ color: text }}><Clock3 className="h-3 w-3" />{template.days}일</span>
    <h3 className="mt-4 text-[21px] font-black tracking-[-0.04em] text-[#302922]">{template.title}</h3>
    <p className="mt-2 line-clamp-3 text-[11px] font-semibold leading-[1.55] text-[#5F584F]">{template.description}</p>
    <div className="absolute bottom-3 left-3 right-3 grid grid-cols-2 gap-2"><button type="button" onClick={onActivate} className="h-9 rounded-full border border-white/70 bg-white/55 text-[10px] font-black text-[#40382F]">코스 선택</button><button type="button" onClick={onRead} className="flex h-9 items-center justify-center gap-1 rounded-full bg-[#2E2B26]/82 text-[10px] font-black text-white"><Play className="h-3 w-3" fill="currentColor" />바로 읽기</button></div>
  </article>;
}

function MyCourseCard({ template, index, active, progress, saved, onActivate, onRead, onToggleSaved }: { template: ReadingPlanTemplate; index: number; active: boolean; progress: ReadingPlanProgress | null; saved: boolean; onActivate: () => void; onRead: () => void; onToggleSaved: () => void }) {
  const value = active ? getProgressPercent(template, progress) : 0;
  const arts = [designDecorations.childBible, designDecorations.openBibleFlowers, designDecorations.churchHill];
  return <section className="relative overflow-hidden rounded-[23px] border border-[#E7DDCF] bg-white/95 p-4 shadow-sm"><img src={arts[index % arts.length]} alt="" className="absolute -right-1 bottom-0 h-24 w-28 object-contain opacity-80" /><div className="relative max-w-[72%]"><div className="flex items-center gap-2"><span className="rounded-full bg-[#EDF5E9] px-2 py-1 text-[9px] font-black text-[#4E7F59]">{active ? '진행중' : `${template.days}일`}</span><button type="button" onClick={onToggleSaved} className="text-[#E98565]"><Heart className="h-4 w-4" fill={saved ? 'currentColor' : 'none'} /></button></div><h3 className="mt-2 text-[20px] font-black">{template.title}</h3><p className="mt-1 line-clamp-2 text-[11px] font-semibold leading-4 text-[#756D64]">{template.description}</p><div className="mt-3 flex items-center gap-2"><div className="h-2 flex-1 overflow-hidden rounded-full bg-[#EEE6DB]"><div className="h-full rounded-full bg-[#4E7F59]" style={{ width: `${Math.max(value, active ? 1 : 0)}%` }} /></div><b className="text-[10px]">{value}%</b></div><div className="mt-3 flex gap-2"><button type="button" onClick={onActivate} className="h-9 rounded-full border border-[#E6DAC9] px-3 text-[10px] font-black">선택</button><button type="button" onClick={onRead} className="h-9 rounded-full bg-[#4E7F59] px-4 text-[10px] font-black text-white">이어 읽기</button></div></div></section>;
}

function Segmented({ left, right, active, onLeft, onRight }: { left: string; right: string; active: 'left' | 'right'; onLeft?: () => void; onRight?: () => void }) {
  return <div className="grid grid-cols-2 rounded-full border border-[#E5D8C8] bg-[#F9F1E7] p-1"><button type="button" onClick={onLeft} className={['h-10 rounded-full text-[13px] font-black transition', active === 'left' ? 'bg-[linear-gradient(180deg,#72A760,#4E7F59)] text-white shadow-md' : 'text-[#332D26]'].join(' ')}>{left}</button><button type="button" onClick={onRight} className={['h-10 rounded-full text-[13px] font-black transition', active === 'right' ? 'bg-[linear-gradient(180deg,#72A760,#4E7F59)] text-white shadow-md' : 'text-[#332D26]'].join(' ')}>{right}</button></div>;
}

function ProgressRing({ value, size }: { value: number; size: number }) {
  const safe = Math.min(100, Math.max(0, value));
  return <div className="relative grid shrink-0 place-items-center rounded-full" style={{ width: size, height: size, background: `conic-gradient(#4E7F59 ${safe * 3.6}deg,#E5EBDD 0deg)` }}><div className="grid h-[76%] w-[76%] place-items-center rounded-full bg-[#FFFDF6]"><b className="text-[17px]">{Math.round(safe)}%</b></div></div>;
}

function WeeklyCheck({ progress, todayDay }: { progress: ReadingPlanProgress | null; todayDay: number }) {
  const start = Math.max(1, todayDay - 3);
  const days = Array.from({ length: 7 }, (_, index) => start + index);
  return <section className="rounded-[23px] border border-[#E7DDCF] bg-white/94 p-4 shadow-sm"><div className="flex items-center justify-between"><h3 className="text-[15px] font-black">이번 주 읽기</h3><button type="button" onClick={() => navigateReadingRoom('/reading-room/records')} className="text-[11px] font-bold text-[#776E64]">기록 보기 ›</button></div><div className="mt-4 grid grid-cols-7 gap-2">{days.map((day, index) => { const completed = progress?.completedDays.includes(day); return <div key={day} className="flex flex-col items-center gap-1"><span className={['grid h-9 w-9 place-items-center rounded-full border text-[11px] font-black', completed ? 'border-[#4E7F59] bg-[#4E7F59] text-white' : day === todayDay ? 'border-[#F3A735] bg-[#FFF3D0] text-[#C77A1C]' : 'border-[#DFE3D8] bg-[#FAFBF7] text-[#8C8379]'].join(' ')}>{completed ? <Check className="h-4 w-4" /> : day}</span><small className="text-[9px] font-bold text-[#82796F]">{['월','화','수','목','금','토','일'][index]}</small></div>; })}</div></section>;
}

function StatPill({ icon, label }: { icon: ReactNode; label: string }) { return <div className="flex h-8 items-center justify-center gap-1 rounded-full border border-white/70 bg-white/72 px-2 text-[10px] font-black text-[#5B534B] shadow-sm">{icon}{label}</div>; }
function RecordStat({ value, label }: { value: string; label: string }) { return <div className="px-2 text-center"><b className="block text-[16px]">{value}</b><span className="mt-1 block text-[9px] font-bold text-[#887F74]">{label}</span></div>; }
function RewardMetric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) { return <div className="flex flex-col items-center gap-1 px-2 text-center">{icon}<small className="text-[9px] font-bold text-[#887F74]">{label}</small><b className="text-[16px]">{value}</b></div>; }

function SmallStatCard({ icon, title, value, sub, progress }: { icon: ReactNode; title: string; value: string; sub: string; progress?: number }) { return <section className="rounded-[22px] border border-[#E7DDCF] bg-white/94 p-4 shadow-sm"><div className="flex items-center gap-2">{icon}<h3 className="text-[12px] font-black">{title}</h3></div><b className="mt-3 block text-[24px]">{value}</b><p className="text-[10px] font-semibold text-[#887F74]">{sub}</p>{progress !== undefined && <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#EEE7DD]"><div className="h-full rounded-full bg-[#E9A634]" style={{ width: `${Math.min(100, progress)}%` }} /></div>}</section>; }

function ActivityRow({ icon, title, time, reward }: { icon: ReactNode; title: string; time: string; reward: string }) { return <div className="flex items-center gap-3 py-3"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#F5F7EF]">{icon}</span><div className="min-w-0 flex-1"><h4 className="truncate text-[12px] font-black">{title}</h4><p className="mt-1 text-[10px] font-semibold text-[#8C8379]">{time}</p></div><b className="text-[11px] text-[#E49428]">{reward}</b></div>; }
function PointHistoryRow({ title, date, value }: { title: string; date: string; value: string }) { return <div className="flex items-center gap-3 py-4"><span className="grid h-10 w-10 place-items-center rounded-full bg-[#FFF0C9] text-[#E19B26]"><WalletCards className="h-5 w-5" /></span><div className="flex-1"><h4 className="text-[12px] font-black">{title}</h4><p className="mt-1 text-[10px] font-semibold text-[#8C8379]">{date}</p></div><b className="text-[13px] text-[#E49428]">{value}</b></div>; }

function UpcomingReward({ tone, icon, title, value, progress }: { tone: 'blue' | 'purple' | 'gold'; icon: ReactNode; title: string; value: string; progress: number }) { const colors = { blue: '#EDF4FB', purple: '#F2EDFA', gold: '#FFF8E9' }; return <section className="rounded-[22px] border border-[#E7DDCF] p-3 text-center" style={{ background: colors[tone] }}><h3 className="text-[12px] font-black">{title}</h3><div className="mt-3 flex justify-center">{icon}</div><b className="mt-3 block text-[14px]">{value}</b><div className="mt-3 h-2 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-current" style={{ width: `${Math.min(100, Math.max(1, progress))}%`, color: tone === 'blue' ? '#537EAB' : tone === 'purple' ? '#6863A0' : '#E9A62A' }} /></div></section>; }

function BadgeToken({ icon = 'lock', label, sub, locked = false }: { icon?: 'book' | 'book-gold' | 'flame' | 'star' | 'leaf' | 'lock'; label: string; sub: string; locked?: boolean }) {
  const node = icon === 'flame' ? <Flame className="h-7 w-7" fill="currentColor" /> : icon === 'star' ? <Star className="h-7 w-7" fill="currentColor" /> : icon === 'leaf' ? <Leaf className="h-7 w-7" fill="currentColor" /> : locked ? <LockKeyhole className="h-6 w-6" /> : <BookOpen className="h-7 w-7" />;
  return <div className="flex min-w-[70px] flex-col items-center text-center"><span className={['grid h-16 w-[70px] place-items-center text-[#FFF0A6] [clip-path:polygon(25%_6.7%,75%_6.7%,100%_50%,75%_93.3%,25%_93.3%,0_50%)]', locked ? 'bg-[#E1E0DD] text-[#AAA8A5]' : icon === 'book-gold' ? 'bg-[#F4B52E]' : 'bg-[#4E7F59]'].join(' ')}>{node}</span><b className="mt-2 text-[10px]">{label}</b><small className="mt-1 text-[9px] font-semibold text-[#91887E]">{sub}</small></div>;
}
function BadgeTokenMini() { return <span className="grid h-10 w-11 place-items-center bg-[#4E7F59] text-[#FFF0A6] [clip-path:polygon(25%_6.7%,75%_6.7%,100%_50%,75%_93.3%,25%_93.3%,0_50%)]"><Star className="h-5 w-5" fill="currentColor" /></span>; }

function PointDrop({ size }: { size: number }) { return <span className="inline-grid place-items-center rounded-full bg-[#E8B72F] text-[8px] font-black text-white" style={{ width: size, height: size }}>P</span>; }
function HoneyJar({ small = false }: { small?: boolean }) { const size = small ? 34 : 50; return <span className="relative grid shrink-0 place-items-center rounded-[40%_40%_45%_45%] border-2 border-[#E69A22] bg-[#FFC553]" style={{ width: size, height: size }}><span className="absolute -top-1 h-2 w-[70%] rounded-full bg-[#F3A42B]" /><span className="rounded-full bg-[#FFD978]" style={{ width: size * 0.45, height: size * 0.45 }} /><small className="absolute -bottom-1 -right-1 grid h-4 w-4 place-items-center rounded-full bg-[#EAA52B] text-[8px] font-black text-white">P</small></span>; }
function BibleArt({ className }: { className?: string }) { return <div className={['relative', className].filter(Boolean).join(' ')}><img src={designDecorations.openBibleFlowers} alt="열린 성경 일러스트" className="h-full w-full object-contain" /></div>; }

function SimpleModal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) { return <div className="fixed inset-0 z-[240] flex items-end justify-center bg-black/30 p-3 backdrop-blur-sm"><section className="w-full max-w-[430px] rounded-[28px] border border-[#E7DDCF] bg-[#FFFDF8] p-5 shadow-2xl"><div className="flex items-center justify-between"><h2 className="text-[21px] font-black">{title}</h2><button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full bg-[#F3EEE6]"><X className="h-5 w-5" /></button></div><div className="mt-4">{children}</div></section></div>; }
function StoreItem({ icon, title, points }: { icon: string; title: string; points: string }) { return <button type="button" className="flex items-center gap-3 rounded-2xl border border-[#E7DDCF] bg-white p-3 text-left"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#FFF5D7] text-2xl">{icon}</span><b className="flex-1 text-[13px]">{title}</b><span className="rounded-full bg-[#FFF0C9] px-3 py-1 text-[11px] font-black text-[#A16D1B]">{points}</span></button>; }
