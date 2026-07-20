import {
  Award,
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
  MoreHorizontal,
  PenLine,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Star,
  Trophy,
} from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
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
type BibleTheme = 'green' | 'gold' | 'purple';
type CourseFilter = 'all' | 'full' | 'new-testament' | 'gospels' | 'wisdom' | 'custom';

type AiHealth = {
  ok: boolean;
  providers: { nvidia: boolean; gemini: boolean };
  message?: string;
};

const CUSTOM_PLANS_STORAGE_KEY = 'gb_custom_reading_plans';
const READING_ROOM_NOTIFICATIONS_KEY = 'gb_reading_room_notifications';

function currentSection(): ReadingRoomSection {
  if (typeof window === 'undefined') return 'home';
  const path = window.location.pathname;
  if (path.startsWith('/reading-room/courses')) return 'courses';
  if (path.startsWith('/reading-room/my-courses')) return 'my-courses';
  if (path.startsWith('/reading-room/records')) return 'records';
  if (path.startsWith('/reading-room/rewards')) return 'rewards';
  return 'home';
}

function navigateReadingRoom(path: string, hash = '') {
  if (typeof window === 'undefined') return;
  const next = `${path}${hash}`;
  if (`${window.location.pathname}${window.location.hash}` !== next) window.history.pushState({}, '', next);
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.setTimeout(() => {
    if (hash) document.querySelector(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  }, 50);
}

function readCustomPlans(): ReadingPlanTemplate[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(CUSTOM_PLANS_STORAGE_KEY);
    return raw ? JSON.parse(raw) as ReadingPlanTemplate[] : [];
  } catch {
    return [];
  }
}

function saveCustomPlans(items: ReadingPlanTemplate[]) {
  if (typeof window !== 'undefined') window.localStorage.setItem(CUSTOM_PLANS_STORAGE_KEY, JSON.stringify(items));
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
  return task?.references.reduce((sum, reference) => sum + ((reference.endChapter ?? reference.startChapter) - reference.startChapter + 1), 0) ?? 0;
}

function shortDate(value: string | undefined) {
  if (!value) return '오늘 시작';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.replaceAll('-', '.');
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
}

function filterLabel(template: ReadingPlanTemplate) {
  if (template.tone === 'new-testament') return '신약';
  if (template.tone === 'gospels') return '복음서';
  if (template.tone === 'wisdom') return '지혜서';
  if (template.tone === 'custom') return '나만의';
  return '전체';
}

function matchesFilter(template: ReadingPlanTemplate, filter: CourseFilter) {
  if (filter === 'all') return true;
  if (filter === 'full') return ['full', 'fast', 'pentateuch'].includes(template.tone);
  return template.tone === filter;
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
  const [localCustomTemplates, setLocalCustomTemplates] = useState<ReadingPlanTemplate[]>(readCustomPlans);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [courseTitle, setCourseTitle] = useState('');
  const [duration, setDuration] = useState(14);
  const [selectedBookIds, setSelectedBookIds] = useState<string[]>(['gen']);

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
  const points = completedCount * 10 + streak * 5;
  const totalReadChapters = activeTemplate
    ? completedDays.reduce((sum, day) => sum + taskChapterCount(activeTemplate.tasks[day - 1]), 0)
    : 0;
  const todayCompleted = isDayCompleted(progress, todayDay);

  const startCourse = (template: ReadingPlanTemplate) => {
    if (onStartPlanAndRead) onStartPlanAndRead(template);
    else onStartPlan?.(template.id, template);
  };

  const readToday = () => {
    if (activeTemplate && todayTask) {
      onNavigateToRange?.(todayTask);
      return;
    }
    if (suggestedTemplate) startCourse(suggestedTemplate);
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
    saveCustomPlans(next);
    setBuilderOpen(false);
    setCourseTitle('');
    navigateReadingRoom('/reading-room/my-courses');
  };

  const builder = builderOpen ? (
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
  ) : null;

  if (section === 'courses') {
    return <><CoursesScreen templates={templates} activeTemplate={activeTemplate} onStart={startCourse} onCreate={() => setBuilderOpen(true)} />{builder}</>;
  }
  if (section === 'my-courses') {
    return <><MyCoursesScreen templates={templates} customTemplates={customTemplates} activeTemplate={activeTemplate} progress={progress} onStart={startCourse} onCreate={() => setBuilderOpen(true)} />{builder}</>;
  }
  if (section === 'records') {
    return <RecordsScreen percent={percent} completedCount={completedCount} streak={streak} points={points} totalReadChapters={totalReadChapters} startedAt={progress?.startedAt} />;
  }
  if (section === 'rewards') {
    return <RewardsScreen points={points} completedCount={completedCount} streak={streak} totalReadChapters={totalReadChapters} onRead={readToday} />;
  }

  return (
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
  const displayPoints = Math.max(points, template ? 10 : 0);

  return (
    <div className="space-y-4">
      <section className="relative min-h-[206px] overflow-hidden rounded-[28px] border border-[#E0D8C8] bg-[linear-gradient(135deg,rgba(255,252,241,.97),rgba(239,246,226,.96))] p-5 shadow-[0_10px_26px_rgba(81,67,45,.08)]">
        <img src={designDecorations.courseLandscape} alt="말씀과 함께 걷는 풍경" className="pointer-events-none absolute inset-x-0 bottom-0 h-[142px] w-full object-cover object-bottom opacity-90" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,253,246,.96)_0%,rgba(255,253,246,.72)_48%,rgba(255,253,246,.05)_100%)]" />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <p className="text-[12px] font-black text-[#4E7F59]">오늘도 말씀과 함께</p>
            <h2 className="mt-1 text-[30px] font-black tracking-[-0.055em] text-[#29231E]">{template ? label.title : '성경 365'}</h2>
            <p className="mt-2 text-[13px] font-semibold text-[#665E55]">{completedCount}일 완료 · {remainingDays}일 남음</p>
          </div>
          <ProgressRing value={percent} size={84} />
        </div>
        <div className="relative mt-4 grid grid-cols-3 gap-2">
          <StatPill icon={<Flame className="h-4 w-4 text-[#F47F36]" fill="#F47F36" />} label={`연속 ${streak}일`} />
          <StatPill icon={<PointDrop size={17} />} label={`${displayPoints}P`} />
          <StatPill icon={<Award className="h-[17px] w-[17px] text-[#C99232]" />} label={`배지 ${Math.min(12, completedCount + 1)}/12`} />
        </div>
      </section>

      <section className="rounded-[25px] border border-[#E7DDCF] bg-white/92 p-4 shadow-[0_7px_20px_rgba(81,67,45,.06)] backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="flex items-center gap-1 text-[12px] font-black text-[#4E7F59]"><Sparkles className="h-4 w-4 text-[#EFB43D]" /> 오늘의 읽기</p>
            <h3 className="mt-1 text-[25px] font-black tracking-[-0.045em] text-[#2A251F]">{formatReadingRoomTask(task)}</h3>
            <p className="mt-1 text-[12px] font-semibold text-[#756D64]">{task?.reflectionPrompt || '오늘 마음에 남는 한 문장을 기록해보세요.'}</p>
          </div>
          <img src={designDecorations.rewardBible} alt="성경 일러스트" className="h-24 w-24 object-contain" />
        </div>
        <div className="mt-3 grid grid-cols-[1.2fr_1fr] gap-2.5">
          <button type="button" onClick={onRead} className="flex h-12 items-center justify-center gap-2 rounded-full bg-[linear-gradient(180deg,#F8B551,#F39A31)] text-[14px] font-black text-white shadow-[0_5px_13px_rgba(244,166,81,.25)] active:scale-[.98]"><BookOpen className="h-5 w-5" />오늘 말씀 읽기</button>
          <button type="button" onClick={onToggleComplete} disabled={!progress} className="flex h-12 items-center justify-center gap-2 rounded-full border border-[#E2D7C6] bg-[#FFFDF8] text-[13px] font-black text-[#454039] active:scale-[.98] disabled:opacity-45"><Check className="h-[18px] w-[18px]" />{completed ? '완료 취소' : '읽기 완료'}</button>
        </div>
      </section>

      <WeeklyCheck progress={progress} todayDay={day} />

      <section className="relative overflow-hidden rounded-[24px] border border-[#ECDDBE] bg-[linear-gradient(105deg,#FFF2D2,#FFF9E9)] p-4 shadow-[0_5px_14px_rgba(81,67,45,.05)]">
        <img src={designDecorations.pottedSprout} alt="" className="absolute -bottom-5 right-2 h-24 w-24 object-contain opacity-55" />
        <div className="relative flex items-center justify-between gap-3">
          <div className="flex items-center gap-3"><HoneyJar /><div><h3 className="text-[15px] font-black">통독 보상</h3><p className="mt-1 text-[11px] font-semibold text-[#756D64]">오늘 읽으면 +10P · 연속 보너스 +5P</p></div></div>
          <button type="button" onClick={() => navigateReadingRoom('/reading-room/rewards')} className="flex h-10 items-center gap-1 rounded-full border border-[#E4CA95] bg-white/85 px-4 text-[11px] font-black text-[#B7771F]">보상 보기<ChevronRight className="h-4 w-4" /></button>
        </div>
      </section>
    </div>
  );
}

function CoursesScreen({ templates, activeTemplate, onStart, onCreate }: {
  templates: ReadingPlanTemplate[];
  activeTemplate: ReadingPlanTemplate | null;
  onStart: (template: ReadingPlanTemplate) => void;
  onCreate: () => void;
}) {
  const [filter, setFilter] = useState<CourseFilter>('all');
  const [query, setQuery] = useState('');
  const visible = templates.filter((template) => matchesFilter(template, filter) && `${template.title} ${template.description}`.toLowerCase().includes(query.trim().toLowerCase()));
  const filters: Array<[CourseFilter, string]> = [['all','전체'],['full','성경 전체'],['new-testament','신약'],['gospels','복음서'],['wisdom','지혜서'],['custom','나만의']];

  return (
    <div className="space-y-4">
      <Segmented left="추천 코스" right="나만의 코스" active="left" onRight={() => navigateReadingRoom('/reading-room/my-courses')} />

      <section className="rounded-[24px] border border-[#E5DDCF] bg-white/90 p-4 shadow-[0_7px_18px_rgba(81,67,45,.05)]">
        <div className="flex items-center justify-between"><div><h2 className="text-[18px] font-black">도전 배지</h2><p className="mt-1 text-[11px] font-semibold text-[#847A70]">읽기 시작과 연속 기록을 한눈에 확인해요.</p></div><button type="button" onClick={() => navigateReadingRoom('/reading-room/rewards')} className="flex items-center text-[11px] font-black text-[#8C7C68]">보상 보기<ChevronRight className="h-4 w-4" /></button></div>
        <div className="mt-3 flex justify-between gap-2 overflow-x-auto pb-1"><BadgeToken icon="book" label="첫걸음" sub="1일 완료" /><BadgeToken icon="flame" label="연속 3일" sub="연속 읽기" /><BadgeToken icon="star" label="일주일 완주" sub="7일 연속" /><BadgeToken locked label="한 달 완주" sub="30일 연속" /></div>
      </section>

      <section className="relative min-h-[176px] overflow-hidden rounded-[28px] border border-[#E7DDCF] bg-[#F8F3E8] p-5 shadow-[0_8px_22px_rgba(81,67,45,.06)]">
        <img src={designDecorations.courseLandscape} alt="말씀 통독 풍경" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,253,247,.98)_0%,rgba(255,253,247,.87)_54%,rgba(255,253,247,.12)_100%)]" />
        <div className="relative max-w-[62%]"><p className="text-[11px] font-black text-[#6E63B6]">통독 시작하기</p><h2 className="mt-1 text-[25px] font-black leading-[1.2] tracking-[-.05em]">말씀의 큰 흐름을<br />나에게 맞는 속도로</h2><p className="mt-2 text-[11px] font-semibold leading-5 text-[#756D64]">준비된 모든 추천 코스를 아래로 스크롤하며 바로 선택할 수 있어요.</p><button type="button" onClick={onCreate} className="mt-3 flex h-9 items-center gap-1 rounded-full bg-white/90 px-4 text-[11px] font-black text-[#4E7F59] shadow-sm"><Plus className="h-4 w-4" />나만의 코스 만들기</button></div>
      </section>

      <section>
        <div className="flex items-center justify-between"><div><h2 className="flex items-center gap-1 text-[20px] font-black"><span className="text-[#E4A73A]">♛</span> 추천 코스</h2><p className="mt-1 text-[11px] font-semibold text-[#8A8177]">총 {visible.length}개 코스 · 아래로 스크롤하면 모두 보여요.</p></div></div>
        <label className="mt-3 flex h-11 items-center gap-2 rounded-full border border-[#E5DACB] bg-white/90 px-4 shadow-sm"><Search className="h-4 w-4 text-[#8B8175]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="코스 이름 또는 성경 범위 검색" className="min-w-0 flex-1 bg-transparent text-[12px] font-semibold outline-none placeholder:text-[#AAA197]" /></label>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-2">{filters.map(([value,label]) => <button key={value} type="button" onClick={() => setFilter(value)} className={['h-9 shrink-0 rounded-full border px-4 text-[11px] font-black', filter === value ? 'border-[#4E7F59] bg-[#4E7F59] text-white' : 'border-[#E4D9C9] bg-white/80 text-[#6D655D]'].join(' ')}>{label}</button>)}</div>
        {visible.length > 0 ? <div className="mt-2 grid grid-cols-2 gap-3">{visible.map((template, index) => <CourseCard key={template.id} template={template} index={index} active={template.id === activeTemplate?.id} onStart={() => onStart(template)} />)}</div> : <EmptyPanel title="검색 결과가 없습니다" description="검색어를 줄이거나 다른 분류를 선택해보세요." />}
      </section>
    </div>
  );
}

function MyCoursesScreen({ templates, customTemplates, activeTemplate, progress, onStart, onCreate }: {
  templates: ReadingPlanTemplate[];
  customTemplates: ReadingPlanTemplate[];
  activeTemplate: ReadingPlanTemplate | null;
  progress: ReadingPlanProgress | null;
  onStart: (template: ReadingPlanTemplate) => void;
  onCreate: () => void;
}) {
  const [tab, setTab] = useState<'mine' | 'saved'>('mine');
  const mine = [activeTemplate, ...customTemplates].filter((item, index, list): item is ReadingPlanTemplate => Boolean(item) && list.findIndex((candidate) => candidate?.id === item?.id) === index);
  const saved = templates.filter((item) => item.id !== activeTemplate?.id && !customTemplates.some((custom) => custom.id === item.id));
  const items = tab === 'mine' ? mine : saved;

  return <div className="space-y-4">
    <Segmented left={`내가 만든 코스 ${mine.length}`} right={`저장한 코스 ${saved.length}`} active={tab === 'mine' ? 'left' : 'right'} onLeft={() => setTab('mine')} onRight={() => setTab('saved')} />
    <section className="relative min-h-[154px] overflow-hidden rounded-[26px] border border-[#E7DDCF] bg-[linear-gradient(105deg,#F7F9EE,#FFF9EB)] p-5 shadow-[0_7px_20px_rgba(81,67,45,.06)]"><div className="relative z-10 max-w-[64%]"><h2 className="flex items-center gap-2 text-[24px] font-black"><Leaf className="h-6 w-6 text-[#5D8A57]" />나의 코스</h2><p className="mt-2 text-[12px] font-semibold leading-5 text-[#756D64]">진행 중인 코스와 직접 만든 코스를 끝까지 관리할 수 있어요.</p><button type="button" onClick={onCreate} className="mt-3 flex h-9 items-center gap-1 rounded-full bg-[#4E7F59] px-4 text-[11px] font-black text-white"><Plus className="h-4 w-4" />새 코스 만들기</button></div><img src={designDecorations.openBibleLarge} alt="열린 성경" className="absolute -right-1 bottom-0 h-36 w-40 object-contain" /></section>
    {items.length > 0 ? <div className="space-y-3">{items.map((template, index) => <MyCourseCard key={template.id} template={template} index={index} active={template.id === activeTemplate?.id} progress={template.id === activeTemplate?.id ? progress : null} onStart={() => onStart(template)} />)}</div> : <EmptyPanel title="아직 만든 코스가 없습니다" description="새 코스 만들기를 눌러 읽고 싶은 성경과 기간을 직접 선택해보세요." actionLabel="새 코스 만들기" onAction={onCreate} illustration={designDecorations.memoryEmpty} />}
  </div>;
}

function RecordsScreen({ percent, completedCount, streak, points, totalReadChapters, startedAt }: { percent: number; completedCount: number; streak: number; points: number; totalReadChapters: number; startedAt?: string }) {
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const base = Math.max(1, totalReadChapters);
  const weeklyValues = [Math.max(1, base - 5), Math.max(1, base - 8), Math.max(2, base - 3), Math.max(2, base - 6), Math.max(3, base - 2), Math.max(4, base), Math.max(5, base + 2)];
  const monthlyValues = [Math.max(3, base), Math.max(5, base + 3), Math.max(6, base + 5), Math.max(8, base + 8)];
  const values = period === 'week' ? weeklyValues : monthlyValues;
  const labels = period === 'week' ? ['월','화','수','목','금','토','일'] : ['1주','2주','3주','4주'];
  const max = Math.max(...values, 1);

  return <div className="space-y-4">
    <Segmented left="주간 리포트" right="월간 리포트" active={period === 'week' ? 'left' : 'right'} onLeft={() => setPeriod('week')} onRight={() => setPeriod('month')} />
    <section className="relative overflow-hidden rounded-[26px] border border-[#E4E1D2] bg-[linear-gradient(135deg,#F9FAED,#F7F4E9)] p-5 shadow-[0_7px_20px_rgba(81,67,45,.06)]"><img src={designDecorations.pottedSprout} alt="" className="absolute -right-2 -top-3 h-24 w-24 object-contain opacity-30" /><h2 className="text-[18px] font-black text-[#4E7F59]">이번 {period === 'week' ? '주' : '달'}도 잘하고 있어요! ♥</h2><p className="mt-1 text-[11px] font-semibold text-[#756D64]">매일의 작은 걸음이 믿음의 큰 여정이 됩니다.</p><div className="mt-5 grid grid-cols-[92px_1fr_1fr_1fr] items-center divide-x divide-[#E7DDCF]"><ProgressRing value={Math.max(percent, completedCount ? 1 : 0)} size={78} /><RecordStat value={`${completedCount}${period === 'week' ? '/7일' : '일'}`} label="완료 일수" /><RecordStat value={`${totalReadChapters}장`} label="읽은 분량" /><RecordStat value={`+${points}P`} label="획득 포인트" /></div></section>
    <div className="grid grid-cols-2 gap-3"><SmallStatCard icon={<Flame className="h-6 w-6 text-[#F27B31]" fill="#F27B31" />} title="연속 읽기" value={`${streak}일`} sub={`시작일 ${shortDate(startedAt)}`} /><SmallStatCard icon={<HoneyJar small />} title="누적 포인트" value={`${points}P`} sub="다음 보상까지 꾸준히" progress={Math.min(100, (points % 500) / 5)} /></div>
    <section className="rounded-[24px] border border-[#E7DDCF] bg-white/92 p-4 shadow-[0_5px_15px_rgba(81,67,45,.05)]"><div className="flex items-center justify-between"><h3 className="text-[17px] font-black">읽기 현황</h3><span className="text-[10px] font-bold text-[#8A8177]">최대 {max}장</span></div><div className="mt-4 flex h-40 items-end justify-between gap-3 border-b border-[#E9E1D6] px-2">{values.map((value, index) => <div key={`${labels[index]}-${value}`} className="flex h-full flex-1 flex-col items-center justify-end gap-1"><b className="text-[10px]">{value}</b><div className="w-full max-w-8 rounded-t-[10px] bg-[linear-gradient(180deg,#9CC079,#4E7F59)]" style={{ height: `${Math.max(12, (value / max) * 105)}px` }} /><span className={['text-[10px] font-bold', index === values.length - 1 ? 'rounded-full bg-[#F7BF53] px-2 py-0.5 text-white' : 'text-[#756D64]'].join(' ')}>{labels[index]}</span></div>)}</div></section>
    <section className="rounded-[24px] border border-[#E7DDCF] bg-white/92 p-4"><h3 className="text-[17px] font-black">완료 현황</h3><div className="mt-3 grid grid-cols-7 gap-2">{['월','화','수','목','금','토','일'].map((day, index) => <div key={day} className="flex flex-col items-center gap-1"><span className={['grid h-9 w-9 place-items-center rounded-full border', index < Math.min(7, completedCount) ? 'border-[#4E7F59] bg-[#4E7F59] text-white' : index === 6 ? 'border-[#F7B63B] bg-[#F7B63B] text-white' : 'border-[#D8E2D4] text-[#9CB095]'].join(' ')}>{index === 6 ? <Star className="h-4 w-4" fill="currentColor" /> : <Check className="h-4 w-4" />}</span><small className="font-bold">{day}</small></div>)}</div></section>
    <section className="rounded-[24px] border border-[#E7DDCF] bg-white/92 p-4"><h3 className="text-[17px] font-black">최근 활동</h3><div className="mt-2 divide-y divide-[#EFE7DC]"><ActivityRow icon={<BibleArt theme="green" className="h-11 w-11" />} title="오늘의 통독 본문 확인" time="오늘" reward="+10P" /><ActivityRow icon={<BadgeTokenMini />} title="읽기 기록이 업데이트됨" time={shortDate(startedAt)} reward={`+${Math.max(0, points)}P`} /><ActivityRow icon={<CalendarDays className="h-10 w-10 rounded-xl bg-[#EDF4E9] p-2 text-[#4E7F59]" />} title="주간 리포트 생성" time="자동 집계" reward="완료" /></div></section>
  </div>;
}

function RewardsScreen({ points, completedCount, streak, totalReadChapters, onRead }: { points: number; completedCount: number; streak: number; totalReadChapters: number; onRead: () => void }) {
  const [tab, setTab] = useState<'rewards' | 'history'>('rewards');
  const [notifications, setNotifications] = useState(() => typeof window !== 'undefined' && window.localStorage.getItem(READING_ROOM_NOTIFICATIONS_KEY) === '1');
  const [aiHealth, setAiHealth] = useState<AiHealth | null>(null);
  const [checkingAi, setCheckingAi] = useState(false);

  const checkAi = async () => {
    setCheckingAi(true);
    try {
      const response = await fetch('/api/ai-health', { cache: 'no-store' });
      const data = await response.json() as AiHealth;
      setAiHealth(data);
    } catch {
      setAiHealth({ ok: false, providers: { nvidia: false, gemini: false }, message: '상태를 확인하지 못했습니다.' });
    } finally {
      setCheckingAi(false);
    }
  };

  useEffect(() => { void checkAi(); }, []);
  useEffect(() => {
    if (window.location.hash === '#settings') window.setTimeout(() => document.querySelector('#settings')?.scrollIntoView({ behavior: 'smooth' }), 80);
  }, []);

  const toggleNotifications = () => {
    const next = !notifications;
    setNotifications(next);
    window.localStorage.setItem(READING_ROOM_NOTIFICATIONS_KEY, next ? '1' : '0');
  };

  return <div className="space-y-4">
    <Segmented left="보상 & 배지" right="포인트 내역" active={tab === 'rewards' ? 'left' : 'right'} onLeft={() => setTab('rewards')} onRight={() => setTab('history')} />
    <section className="relative overflow-hidden rounded-[26px] border border-[#ECDDBE] bg-[linear-gradient(105deg,#FFF0C9,#FFF9E9)] p-5 shadow-[0_7px_20px_rgba(81,67,45,.06)]"><img src={designDecorations.rewardBible} alt="보상 성경" className="absolute -bottom-8 -left-4 h-36 w-36 object-contain opacity-65" /><div className="relative ml-24 flex items-center justify-between gap-3"><div><p className="text-[12px] font-bold text-[#756D64]">내 포인트</p><h2 className="mt-1 text-[34px] font-black">{points}P</h2></div><button type="button" onClick={() => setTab('history')} className="h-11 rounded-full bg-[linear-gradient(180deg,#F8B551,#F39A31)] px-5 text-[13px] font-black text-white shadow-sm">포인트 내역</button></div></section>

    {tab === 'history' ? <PointHistory points={points} completedCount={completedCount} /> : <>
      <section><h2 className="text-[20px] font-black">보유 배지 {Math.min(12, completedCount + 1)}개</h2><div className="mt-3 grid grid-cols-4 gap-x-2 gap-y-5"><BadgeToken icon="book" label="첫 시작" sub="첫 읽기" /><BadgeToken icon="book-gold" label="7일 연속" sub={`${streak}/7일`} /><BadgeToken icon="leaf" label="30장 달성" sub={`${totalReadChapters}/30장`} /><BadgeToken icon="star" label="성경 탐험가" sub="코스 시작" /><BadgeToken locked={completedCount < 30} icon="flame" label="다독왕" sub="30일" /><BadgeToken locked={totalReadChapters < 100} icon="book" label="100장 달성" sub="100장" /><BadgeToken locked={streak < 30} icon="leaf" label="연속 30일" sub="30일" /><BadgeToken locked={completedCount < 365} icon="star" label="365 완주" sub="1년" /></div></section>
      <section><h2 className="text-[20px] font-black">다가오는 배지</h2><div className="mt-3 grid grid-cols-3 gap-3"><UpcomingReward tone="blue" icon={<CalendarDays className="h-14 w-14 text-[#537EAB]" />} title="연속 30일" value={`${streak}/30`} progress={Math.min(100, (streak / 30) * 100)} /><UpcomingReward tone="purple" icon={<BookOpen className="h-14 w-14 text-[#6863A0]" />} title="100장 달성" value={`${totalReadChapters}/100`} progress={Math.min(100, totalReadChapters)} /><UpcomingReward tone="gold" icon={<Trophy className="h-14 w-14 text-[#E9A62A]" />} title="365 완주" value={`${completedCount}/365`} progress={Math.min(100, (completedCount / 365) * 100)} /></div></section>
      <section><h2 className="text-[20px] font-black">보상 마일스톤</h2><div className="relative mt-4 flex items-start justify-between px-2"><div className="absolute left-8 right-8 top-6 h-1 rounded-full bg-[linear-gradient(90deg,#4E7F59_0_30%,#F0A63D_30%_45%,#E7DED1_45%)]" />{[['🍯','2,000P','완료'],['🎁','3,000P','다음 보상'],['🔒','5,000P',''],['🏆','10,000P','']].map(([icon,value,note]) => <div key={value} className="relative z-10 flex flex-col items-center"><span className="grid h-12 w-12 place-items-center rounded-full border border-[#E6DAC9] bg-[#FFFDF8] text-2xl">{icon}</span><b className="mt-2 text-[12px]">{value}</b>{note && <small className="mt-1 rounded-full bg-[#FFF0C9] px-2 py-0.5 text-[9px] font-bold text-[#A16D1B]">{note}</small>}</div>)}</div></section>
    </>}

    <section id="settings" className="scroll-mt-28 rounded-[24px] border border-[#DEE6D8] bg-[#F4F8F0] p-4 shadow-[0_4px_12px_rgba(81,67,45,.04)]"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><BellRing className="h-5 w-5 text-[#4E7F59]" /><div><h3 className="text-[16px] font-black">통독 알림</h3><p className="mt-0.5 text-[10px] font-semibold text-[#756D64]">매일 읽기 습관을 앱 안에서 기억해요.</p></div></div><button type="button" onClick={toggleNotifications} role="switch" aria-checked={notifications} className={['relative h-7 w-12 rounded-full transition', notifications ? 'bg-[#4E7F59]' : 'bg-[#D9D4CB]'].join(' ')}><span className={['absolute top-1 h-5 w-5 rounded-full bg-white shadow transition', notifications ? 'left-6' : 'left-1'].join(' ')} /></button></div></section>

    <section className="rounded-[24px] border border-[#E5DDCF] bg-white/90 p-4"><div className="flex items-center justify-between gap-3"><div><div className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-[#E1A637]" /><h3 className="text-[16px] font-black">AI 말씀 도우미 상태</h3></div><p className="mt-1 text-[10px] font-semibold text-[#756D64]">NVIDIA 또는 Gemini 연결 상태를 안전하게 확인합니다.</p></div><button type="button" onClick={checkAi} disabled={checkingAi} className="grid h-10 w-10 place-items-center rounded-full border border-[#E5DACB] bg-[#FFFDF8] text-[#4E7F59] disabled:opacity-50"><RefreshCw className={['h-4 w-4', checkingAi ? 'animate-spin' : ''].join(' ')} /></button></div><div className="mt-3 grid grid-cols-2 gap-2"><StatusPill label="NVIDIA" active={Boolean(aiHealth?.providers.nvidia)} /><StatusPill label="Gemini" active={Boolean(aiHealth?.providers.gemini)} /></div>{aiHealth && !aiHealth.ok && <p className="mt-2 rounded-xl bg-[#FFF1EE] px-3 py-2 text-[10px] font-bold text-[#B45D4E]">{aiHealth.message || 'AI 제공자 환경변수를 확인해주세요.'}</p>}</section>

    <section className="relative overflow-hidden rounded-[24px] border border-[#DEE6D8] bg-[#F3F7EF] p-5"><h3 className="text-[21px] font-black text-[#4E7F59]">꾸준함이 기적을 만듭니다</h3><p className="mt-1 text-[12px] font-semibold text-[#756D64]">오늘도 말씀과 함께 한 걸음 더 나아가요!</p><img src={designDecorations.rewardBible} alt="" className="absolute -bottom-5 right-2 h-24 w-24 object-contain" /></section>
    <button type="button" onClick={onRead} className="h-13 w-full rounded-full bg-[linear-gradient(180deg,#F8B551,#F39A31)] py-4 text-[16px] font-black text-white shadow-[0_7px_18px_rgba(244,166,81,.24)] active:scale-[.98]">오늘 말씀 읽기</button>
  </div>;
}

function PointHistory({ points, completedCount }: { points: number; completedCount: number }) {
  const entries = [
    { title: '오늘의 말씀 읽기', date: '오늘', value: '+10P' },
    { title: '연속 읽기 보너스', date: '최근 기록', value: '+5P' },
    { title: '코스 진행 보상', date: `${completedCount}일 완료`, value: `+${completedCount * 10}P` },
    { title: '현재 사용 가능 포인트', date: '누적', value: `${points}P` },
  ];
  return <section className="rounded-[24px] border border-[#E7DDCF] bg-white/92 p-4"><h2 className="text-[19px] font-black">포인트 내역</h2><div className="mt-3 divide-y divide-[#EFE7DC]">{entries.map((entry) => <div key={entry.title} className="flex items-center gap-3 py-4"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#FFF2CF]"><PointDrop size={24} /></span><div className="min-w-0 flex-1"><p className="text-[13px] font-black">{entry.title}</p><p className="mt-1 text-[10px] font-semibold text-[#8A8177]">{entry.date}</p></div><b className="text-[14px] text-[#C98022]">{entry.value}</b></div>)}</div></section>;
}

function CustomCourseBuilder({ title, setTitle, duration, setDuration, selectedBookIds, setSelectedBookIds, onClose, onCreate }: { title: string; setTitle: (value: string) => void; duration: number; setDuration: (value: number) => void; selectedBookIds: string[]; setSelectedBookIds: (value: string[]) => void; onClose: () => void; onCreate: () => void }) {
  return <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/30 p-3 backdrop-blur-sm"><section className="max-h-[90vh] w-full max-w-[430px] overflow-y-auto rounded-[30px] border border-[#E7DDCF] bg-[#FFFDF8] p-5 shadow-2xl"><div className="flex items-center justify-between"><div><p className="text-[10px] font-black text-[#4E7F59]">CUSTOM READING COURSE</p><h2 className="mt-1 text-[22px] font-black">나만의 코스 만들기</h2></div><button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full bg-[#F3EEE6] text-xl text-[#6B6258]">×</button></div><label className="mt-5 block text-[12px] font-black text-[#4E7F59]">1. 코스 제목</label><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="예) 시편 집중 30일" className="mt-2 h-12 w-full rounded-2xl border border-[#E7DDCF] bg-white px-4 text-[13px] outline-none focus:border-[#4E7F59]" /><label className="mt-5 block text-[12px] font-black text-[#4E7F59]">2. 기간 선택</label><div className="mt-2 flex flex-wrap gap-2">{[7,14,21,30,60,90,180,365].map((value) => <button type="button" key={value} onClick={() => setDuration(value)} className={['h-9 rounded-full border px-4 text-[12px] font-bold', duration === value ? 'border-[#4E7F59] bg-[#EEF5EB] text-[#4E7F59]' : 'border-[#E7DDCF] bg-white text-[#6B6258]'].join(' ')}>{value}일</button>)}</div><label className="mt-5 block text-[12px] font-black text-[#4E7F59]">3. 성경 선택 <span className="ml-1 text-[#9B9288]">{selectedBookIds.length}권</span></label><div className="mt-2 grid grid-cols-4 gap-2">{READING_PLAN_BOOK_OPTIONS.map((book) => { const active = selectedBookIds.includes(book.id); return <button type="button" key={book.id} onClick={() => setSelectedBookIds(active ? selectedBookIds.filter((id) => id !== book.id) : [...selectedBookIds, book.id])} className={['min-h-10 rounded-xl border px-2 text-[10px] font-bold', active ? 'border-[#4E7F59] bg-[#EAF3E7] text-[#4E7F59]' : 'border-[#E7DDCF] bg-white text-[#6B6258]'].join(' ')}>{active && '✓ '}{book.name}</button>; })}</div><section className="mt-5 grid grid-cols-3 divide-x divide-[#E7DDCF] rounded-[20px] border border-[#E0E5D7] bg-[#F6F8ED] p-4 text-center"><div><p className="text-[10px] text-[#756D64]">완주 포인트</p><b className="mt-2 block text-[22px]">+{Math.max(30, Math.round(duration / 2))}P</b></div><div><p className="text-[10px] text-[#756D64]">선택 성경</p><b className="mt-2 block text-[22px]">{selectedBookIds.length}권</b></div><div><p className="text-[10px] text-[#756D64]">읽기 기간</p><b className="mt-2 block text-[18px]">{duration}일</b></div></section><button type="button" onClick={onCreate} disabled={!selectedBookIds.length} className="mt-5 h-13 w-full rounded-full bg-[linear-gradient(180deg,#F8B551,#F39A31)] py-4 text-[15px] font-black text-white disabled:opacity-45">코스 만들기</button></section></div>;
}

function CourseCard({ template, index, active, onStart }: { template: ReadingPlanTemplate; index: number; active: boolean; onStart: () => void }) {
  const themes = [
    ['#EAF4E7','#B8D6A8','#527F52'],
    ['#FFF1D0','#F4CE7E','#B37A22'],
    ['#DCECF2','#82B5CC','#2F6B84'],
    ['#EEE6F5','#C4ADD7','#6F5687'],
  ];
  const [from, to, text] = themes[index % themes.length];
  return <button type="button" onClick={onStart} className="relative min-h-[208px] overflow-hidden rounded-[24px] border border-[#E7DDCF] p-3 text-left shadow-[0_6px_15px_rgba(81,67,45,.06)] transition active:scale-[.98]" style={{ background: `linear-gradient(155deg,${from},${to})` }}><img src={index % 3 === 0 ? designDecorations.openBibleLarge : index % 3 === 1 ? designDecorations.pottedSprout : designDecorations.rewardBible} alt="" className="pointer-events-none absolute -bottom-4 -right-3 h-24 w-24 object-contain opacity-28" /><span className="rounded-full bg-white/75 px-2 py-1 text-[9px] font-black" style={{ color: text }}>{active ? '진행중' : filterLabel(template)}</span><span className="absolute right-3 top-3 flex items-center gap-1 text-[10px] font-bold" style={{ color: text }}><Clock3 className="h-3 w-3" />{template.days}일</span><h3 className="mt-8 line-clamp-2 text-[21px] font-black leading-[1.16] tracking-[-.045em] text-[#302922]">{template.title}</h3><p className="mt-2 line-clamp-3 text-[11px] font-semibold leading-4 text-[#5F584F]">{template.description}</p><div className="absolute inset-x-3 bottom-3 flex items-center justify-between border-t border-white/55 pt-2"><span className="text-[10px] font-black text-[#E39428]">● 완주 +{Math.max(25, Math.round(template.days / 3))}P</span><span className="text-[10px] font-black text-[#40372E]">{active ? '진행' : '시작'}</span></div></button>;
}

function MyCourseCard({ template, index, active, progress, onStart }: { template: ReadingPlanTemplate; index: number; active: boolean; progress: ReadingPlanProgress | null; onStart: () => void }) {
  const value = active ? getProgressPercent(template, progress) : 0;
  const theme: BibleTheme = index % 3 === 1 ? 'gold' : index % 3 === 2 ? 'purple' : 'green';
  return <section className={['rounded-[24px] border p-4 shadow-[0_5px_14px_rgba(81,67,45,.05)]', theme === 'green' ? 'border-[#CADBC3] bg-[#F5F9EF]' : theme === 'gold' ? 'border-[#EED9B4] bg-[#FFF8E9]' : 'border-[#DDD1E8] bg-[#F7F1FB]'].join(' ')}><div className="flex gap-3"><BibleArt theme={theme} className="h-20 w-24 shrink-0" /><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><h3 className="line-clamp-2 text-[20px] font-black tracking-[-.04em]">{template.title}</h3><span className="shrink-0 rounded-full border border-current/20 bg-white/60 px-2 py-1 text-[9px] font-bold text-[#4E7F59]">{active ? '진행중' : '준비됨'}</span></div><div className="mt-2 flex items-center gap-3"><div className="h-2 flex-1 overflow-hidden rounded-full bg-[#E8E0D3]"><div className="h-full rounded-full bg-[#4E7F59]" style={{ width: `${value}%` }} /></div><b className="text-[12px] text-[#4E7F59]">{value}%</b></div><p className="mt-2 text-[10px] font-semibold text-[#756D64]">목표 {template.days}일 · {template.bookIds?.length ?? 1}권 구성</p></div></div><div className="mt-3 flex items-center justify-between border-t border-[#E7DDCF] pt-3"><span className="text-[10px] font-bold"><span className="text-[#EFB52B]">●</span> 완주 보상 +{Math.max(25, Math.round(template.days / 3))}P</span><button type="button" onClick={onStart} className="h-9 rounded-xl border border-[#E1D7C8] bg-white px-4 text-[12px] font-black">{active ? '오늘 읽기' : '시작하기'}</button></div></section>;
}

function WeeklyCheck({ progress, todayDay }: { progress: ReadingPlanProgress | null; todayDay: number }) {
  const completed = new Set(progress?.completedDays ?? []);
  return <section className="rounded-[24px] border border-[#E7DDCF] bg-white/92 p-4 shadow-[0_5px_14px_rgba(81,67,45,.05)]"><div className="flex items-center justify-between"><h3 className="text-[17px] font-black">이번 주 체크</h3><p className="text-[10px] font-bold text-[#9A7A43]">주간 보상 <b className="text-[#E8952B]">+20P</b></p></div><div className="mt-3 grid grid-cols-7 gap-2">{Array.from({ length: 7 }, (_, index) => index + 1).map((day) => { const done = completed.has(day); const current = day === todayDay; return <div key={day} className="flex flex-col items-center gap-1"><span className={['grid h-9 w-9 place-items-center rounded-full border', done ? 'border-[#4E7F59] bg-[#4E7F59] text-white' : current ? 'border-[#F3B43C] bg-[#F3B43C] text-white' : 'border-[#E4DACB] bg-white text-[#C8BFB2]'].join(' ')}>{done ? <Check className="h-4 w-4" /> : current ? <Star className="h-4 w-4" fill="currentColor" /> : day}</span><small className={['text-[9px] font-bold', current ? 'text-[#4E7F59]' : 'text-[#80776D]'].join(' ')}>{['월','화','수','목','금','토','일'][day - 1]}</small></div>; })}</div></section>;
}

function EmptyPanel({ title, description, actionLabel, onAction, illustration }: { title: string; description: string; actionLabel?: string; onAction?: () => void; illustration?: string }) {
  return <section className="mt-3 flex flex-col items-center rounded-[24px] border-2 border-dashed border-[#E3D8C9] bg-white/45 px-6 py-8 text-center">{illustration && <img src={illustration} alt="" className="mb-2 h-28 w-36 object-contain" />}<h3 className="text-[16px] font-black">{title}</h3><p className="mt-2 text-[11px] font-semibold leading-5 text-[#81786F]">{description}</p>{actionLabel && onAction && <button type="button" onClick={onAction} className="mt-4 h-10 rounded-full bg-[#4E7F59] px-5 text-[11px] font-black text-white">{actionLabel}</button>}</section>;
}

function ProgressRing({ value, size }: { value: number; size: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  return <div className="relative grid shrink-0 place-items-center rounded-full bg-[#E9E4D9]" style={{ width: size, height: size, background: `conic-gradient(#4E7F59 ${clamped * 3.6}deg,#E9E4D9 0deg)` }}><div className="grid place-items-center rounded-full bg-[#FFFDF8] shadow-[inset_0_1px_5px_rgba(80,65,42,.04)]" style={{ width: size - 16, height: size - 16 }}><b className="text-[21px] tracking-[-.04em]">{value}%</b></div></div>;
}

function StatPill({ icon, label }: { icon: ReactNode; label: string }) { return <span className="flex h-9 min-w-0 items-center justify-center gap-1 rounded-full border border-[#E6DDCF] bg-white/90 px-2 text-[10px] font-black text-[#3F3932] shadow-sm">{icon}<span className="truncate">{label}</span></span>; }
function RecordStat({ value, label }: { value: string; label: string }) { return <div className="px-2 text-center"><b className="text-[17px]">{value}</b><p className="mt-2 text-[9px] font-semibold text-[#756D64]">{label}</p></div>; }
function SmallStatCard({ icon, title, value, sub, progress }: { icon: ReactNode; title: string; value: string; sub: string; progress?: number }) { return <section className="relative overflow-hidden rounded-[23px] border border-[#E7DDCF] bg-[#FFFDF8] p-4"><div className="flex items-center gap-2"><span>{icon}</span><h3 className="text-[13px] font-black">{title}</h3></div><b className="mt-3 block text-[25px]">{value}</b><p className="mt-1 text-[10px] font-semibold text-[#756D64]">{sub}</p>{progress !== undefined && <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#E8E0D3]"><div className="h-full rounded-full bg-[#4E7F59]" style={{ width: `${progress}%` }} /></div>}<Leaf className="absolute bottom-1 right-2 h-16 w-16 text-[#9FBD77] opacity-20" /></section>; }
function ActivityRow({ icon, title, time, reward }: { icon: ReactNode; title: string; time: string; reward: string }) { return <div className="flex items-center gap-3 py-3"><span className="shrink-0">{icon}</span><div className="min-w-0 flex-1"><p className="truncate text-[12px] font-bold">{title}</p><p className="mt-1 flex items-center gap-1 text-[10px] text-[#8A8177]"><Clock3 className="h-3 w-3" />{time}</p></div><b className="text-[11px]">{reward}</b></div>; }
function Segmented({ left, right, active, onLeft, onRight }: { left: string; right: string; active: 'left' | 'right'; onLeft?: () => void; onRight?: () => void }) { return <div className="grid h-11 grid-cols-2 overflow-hidden rounded-full border border-[#E7DDCF] bg-[#F8F1E8]"><button type="button" onClick={onLeft} className={active === 'left' ? 'rounded-full bg-[linear-gradient(180deg,#79A95E,#4E7F59)] text-[12px] font-black text-white shadow-sm' : 'text-[12px] font-bold'}>{left}</button><button type="button" onClick={onRight} className={active === 'right' ? 'rounded-full bg-[linear-gradient(180deg,#79A95E,#4E7F59)] text-[12px] font-black text-white shadow-sm' : 'text-[12px] font-bold'}>{right}</button></div>; }
function BadgeToken({ icon = 'star', label, sub, locked = false }: { icon?: string; label: string; sub: string; locked?: boolean }) { return <div className="flex min-w-[66px] flex-col items-center text-center"><span className={['relative grid h-14 w-14 place-items-center [clip-path:polygon(25%_6%,75%_6%,96%_50%,75%_94%,25%_94%,4%_50%)]', locked ? 'bg-[#E6E4E1] text-[#AAA8A4]' : icon === 'book-gold' ? 'bg-[#F2B53C] text-white' : 'bg-[#4E7F59] text-[#F8E9A9]'].join(' ')}>{locked ? <LockKeyhole className="h-5 w-5" /> : icon === 'flame' ? <Flame className="h-6 w-6" fill="currentColor" /> : icon === 'leaf' ? <Leaf className="h-6 w-6" fill="currentColor" /> : icon.includes('book') ? <BookOpen className="h-6 w-6" /> : <Star className="h-6 w-6" fill="currentColor" />}</span><b className="mt-1 text-[10px]">{label}</b><small className="mt-0.5 text-[8px] text-[#8A8177]">{sub}</small></div>; }
function BadgeTokenMini() { return <span className="grid h-10 w-10 place-items-center [clip-path:polygon(25%_6%,75%_6%,96%_50%,75%_94%,25%_94%,4%_50%)] bg-[#D99532] text-white"><Star className="h-5 w-5" fill="currentColor" /></span>; }
function UpcomingReward({ tone, icon, title, value, progress }: { tone: 'blue' | 'purple' | 'gold'; icon: ReactNode; title: string; value: string; progress: number }) { const bg = tone === 'blue' ? '#EEF4FA' : tone === 'purple' ? '#F4EFFA' : '#FFF8EB'; const bar = tone === 'blue' ? '#537EAB' : tone === 'purple' ? '#7A67A8' : '#E9A62A'; return <section className="rounded-[20px] border border-[#E7DDCF] p-3 text-center" style={{ background: bg }}><h3 className="text-[12px] font-black" style={{ color: bar }}>{title}</h3><div className="my-3 flex justify-center">{icon}</div><b className="text-[11px]">{value}</b><div className="mt-3 h-2 overflow-hidden rounded-full bg-white/80"><div className="h-full rounded-full" style={{ width: `${progress}%`, background: bar }} /></div></section>; }
function StatusPill({ label, active }: { label: string; active: boolean }) { return <span className={['flex h-10 items-center justify-center gap-2 rounded-2xl border text-[11px] font-black', active ? 'border-[#C9DDC4] bg-[#EEF6EA] text-[#477551]' : 'border-[#E5D9D0] bg-[#F8F3EF] text-[#9A746C]'].join(' ')}><span className={['h-2.5 w-2.5 rounded-full', active ? 'bg-[#56A065]' : 'bg-[#CC8B80]'].join(' ')} />{label} {active ? '연결됨' : '미설정'}</span>; }
function PointDrop({ size = 18 }: { size?: number }) { return <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2C9.5 6.2 5 10.3 5 15a7 7 0 0 0 14 0c0-4.7-4.5-8.8-7-13Z" fill="#F5B929" stroke="#E29B18" strokeWidth="1.4"/><path d="M9.5 15.5c.4 1.5 1.4 2.4 3 2.7" fill="none" stroke="#FFF1A7" strokeWidth="1.5" strokeLinecap="round"/></svg>; }
function HoneyJar({ small = false }: { small?: boolean }) { const size = small ? 28 : 52; return <svg width={size} height={size} viewBox="0 0 60 60" aria-hidden="true"><ellipse cx="30" cy="11" rx="17" ry="6" fill="#E99A26"/><rect x="14" y="10" width="32" height="8" rx="4" fill="#F7C253"/><path d="M12 23c0-6 5-9 18-9s18 3 18 9v20c0 7-6 11-18 11S12 50 12 43V23Z" fill="#F6B83D" stroke="#DD8C20" strokeWidth="2"/><circle cx="30" cy="33" r="9" fill="#FFD765" opacity=".78"/><circle cx="47" cy="45" r="9" fill="#EBA72D" stroke="#D98919"/><text x="47" y="49" textAnchor="middle" fontSize="10" fontWeight="900" fill="white">P</text></svg>; }
function BibleArt({ theme, className = '' }: { theme: BibleTheme; className?: string }) { const cover = theme === 'green' ? '#315D3B' : theme === 'gold' ? '#B9782F' : '#6F5A91'; const page = theme === 'green' ? '#F5E8B8' : theme === 'gold' ? '#FFF0C8' : '#EEE7F8'; return <svg className={className} viewBox="0 0 120 100" aria-hidden="true"><ellipse cx="60" cy="88" rx="43" ry="7" fill="#D9D0C4" opacity=".5"/><path d="M22 24c19-12 31-9 38 0v55c-12-8-26-8-38 0Z" fill={page} stroke={cover} strokeWidth="4"/><path d="M60 24c13-12 26-12 39 0v55c-13-8-26-8-39 0Z" fill={page} stroke={cover} strokeWidth="4"/><path d="M60 24v55" stroke={cover} strokeWidth="3"/><path d="M18 79c17-5 31-3 42 4 13-7 27-9 43-4" fill="none" stroke={cover} strokeWidth="7" strokeLinecap="round"/><path d="M80 15v30l8-6 8 6V13c-5-2-11-1-16 2Z" fill="#EFA535"/><path d="M40 41h11M40 50h13M69 41h8M69 50h12" stroke="#D8C795" strokeWidth="2" strokeLinecap="round"/></svg>; }
