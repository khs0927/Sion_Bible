import {
  Award,
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
  Play,
  Plus,
  Share2,
  Sparkles,
  Star,
  Trophy,
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
type BibleTheme = 'green' | 'gold' | 'purple';

const CUSTOM_PLANS_STORAGE_KEY = 'gb_custom_reading_plans';

function currentSection(): ReadingRoomSection {
  if (typeof window === 'undefined') return 'home';
  const path = window.location.pathname;
  if (path.startsWith('/reading-room/courses')) return 'courses';
  if (path.startsWith('/reading-room/my-courses')) return 'my-courses';
  if (path.startsWith('/reading-room/records')) return 'records';
  if (path.startsWith('/reading-room/rewards')) return 'rewards';
  return 'home';
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
  if (!value) return '2026.05.20';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.replaceAll('-', '.');
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

  const templates = useMemo(() => [...ALL_READING_PLAN_TEMPLATES, ...customTemplates], [customTemplates]);
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
    if (activeTemplate && todayTask) onNavigateToRange?.(todayTask);
    else if (suggestedTemplate) startCourse(suggestedTemplate);
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
  };

  if (section === 'courses') {
    return <CoursesScreen templates={templates} activeTemplate={activeTemplate} onStart={startCourse} builderOpen={builderOpen} setBuilderOpen={setBuilderOpen} courseTitle={courseTitle} setCourseTitle={setCourseTitle} duration={duration} setDuration={setDuration} selectedBookIds={selectedBookIds} setSelectedBookIds={setSelectedBookIds} onCreate={createCustomPlan} />;
  }
  if (section === 'my-courses') {
    return <MyCoursesScreen templates={templates} customTemplates={customTemplates} activeTemplate={activeTemplate} progress={progress} onStart={startCourse} onCreate={() => setBuilderOpen(true)} />;
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
  const displayPercent = Math.max(percent, template ? 1 : 0);
  const displayPoints = Math.max(points, template ? 10 : 0);

  return (
    <div className="space-y-3.5">
      <section className="relative overflow-hidden rounded-[25px] border border-[#DDE3D2] bg-[linear-gradient(135deg,#FCF9EC_0%,#F5F7E9_58%,#EDF5E8_100%)] p-4 shadow-[0_4px_14px_rgba(81,67,45,0.05)]">
        <div className="pointer-events-none absolute -bottom-8 -left-7 h-28 w-28 rounded-full bg-[#CEE3C3]/45 blur-xl" />
        <img src={designDecorations.pottedSprout} alt="" className="pointer-events-none absolute -bottom-4 -right-4 h-24 w-24 object-contain opacity-45" />
        <Sparkles className="pointer-events-none absolute right-7 top-7 h-7 w-7 text-[#F2C454]" strokeWidth={1.5} />
        <div className="relative flex items-center gap-4">
          <ProgressRing value={displayPercent} size={92} />
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-black text-[#4E7F59]">진행 중인 통독</p>
            <h2 className="mt-1 truncate text-[29px] font-black tracking-[-0.045em] text-[#2A251F]">{template ? label.title : '성경 365'}</h2>
            <p className="mt-1 text-[13px] font-semibold text-[#655E55]">{completedCount}일 완료 · {remainingDays}일 남음</p>
          </div>
        </div>
        <div className="relative mt-3 grid grid-cols-3 gap-2">
          <StatPill icon={<Flame className="h-4 w-4 text-[#F47F36]" fill="#F47F36" />} label={`연속 ${streak}일`} />
          <StatPill icon={<PointDrop size={17} />} label={`포인트 ${displayPoints}P`} />
          <StatPill icon={<Award className="h-[17px] w-[17px] text-[#C99232]" />} label={`배지 ${Math.min(12, Math.max(0, completedCount + 1))}/12`} />
        </div>
      </section>

      <section className="relative overflow-hidden rounded-[21px] border border-[#ECDDBE] bg-[linear-gradient(100deg,#FFF5D9_0%,#FFF9EC_100%)] px-4 py-3.5 shadow-[0_3px_10px_rgba(81,67,45,0.04)]">
        <Sparkles className="pointer-events-none absolute right-28 top-6 h-6 w-6 text-[#F5CE68]" strokeWidth={1.5} />
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <HoneyJar />
            <div>
              <h3 className="text-[14px] font-black text-[#332D26]">오늘의 보상</h3>
              <p className="mt-0.5 text-[12px] font-semibold text-[#6E6255]">오늘 읽으면 <b className="text-[#E9822B]">+10P</b></p>
              <p className="text-[12px] font-semibold text-[#6E6255]">연속 {Math.max(streak, 1)}일 보너스 <b className="text-[#E9822B]">+5P</b></p>
            </div>
          </div>
          <button type="button" onClick={onRead} className="flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-[#4E7F59] px-4 text-[12px] font-black text-white shadow-[0_5px_12px_rgba(78,127,89,0.22)] active:scale-95"><Gift className="h-4 w-4" />보상 받기</button>
        </div>
      </section>

      <section className="rounded-[23px] border border-[#E7DDCF] bg-[#FFFDF9] p-4 shadow-[0_4px_14px_rgba(81,67,45,0.045)]">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-1 text-[12px] font-black text-[#4D463E]"><span className="text-[#F4AD33]">☀</span> 오늘의 읽기</p>
          <button type="button" aria-label="오늘 본문 좋아요" className="grid h-9 w-9 place-items-center rounded-full text-[#BCA17A] active:scale-90"><Heart className="h-5 w-5" strokeWidth={1.8} /></button>
        </div>
        <div className="mt-1 flex items-center gap-3">
          <BibleArt theme="green" className="h-[92px] w-[104px] shrink-0" />
          <div className="min-w-0 flex-1">
            <h3 className="text-[25px] font-black tracking-[-0.045em] text-[#2A251F]">{formatReadingRoomTask(task)}</h3>
            <p className="mt-2 truncate text-[13px] font-semibold text-[#756D64]">{task?.title || formatReadingRoomTask(task)}</p>
          </div>
        </div>
        <div className="mt-2 grid grid-cols-[1fr_1.25fr] gap-2.5">
          <button type="button" onClick={onRead} className="flex h-12 items-center justify-center gap-2 rounded-full bg-[linear-gradient(180deg,#F8B551,#F39A31)] text-[14px] font-black text-white shadow-[0_4px_10px_rgba(244,166,81,0.2)] active:scale-[0.98]"><BookOpen className="h-5 w-5" />읽으러 가기</button>
          <button type="button" onClick={onToggleComplete} disabled={!progress} className="flex h-12 items-center justify-center gap-2 rounded-full border border-[#E6DAC9] bg-white text-[13px] font-black text-[#3F3932] active:scale-[0.98] disabled:opacity-45"><PenLine className="h-[18px] w-[18px]" />{completed ? '완료 취소' : '이 본문으로 묵상하기'}</button>
        </div>
      </section>

      <WeeklyCheck progress={progress} todayDay={day} />

      <section className="rounded-[21px] border border-[#ECDDBE] bg-[linear-gradient(100deg,#FFF8E7,#FFFDF8)] p-4 shadow-[0_3px_10px_rgba(81,67,45,0.04)]">
        <button type="button" className="flex items-center gap-1 text-[14px] font-black text-[#332D26]">통독 보상 모아보기 <ChevronRight className="h-4 w-4 text-[#8D754D]" /></button>
        <div className="mt-3 grid grid-cols-[1fr_1fr_1.25fr] divide-x divide-[#E9DDCA]">
          <RewardMetric icon={<PointDrop size={31} />} label="모은 포인트" value={`${displayPoints}P`} />
          <RewardMetric icon={<Award className="h-8 w-8 text-[#B58C4C]" />} label="획득 배지" value={`${Math.min(6, completedCount + 1)}개`} />
          <div className="pl-3">
            <p className="text-[10px] font-bold text-[#887F74]">다음 배지까지</p>
            <div className="mt-3 flex items-center gap-2"><div className="h-2 flex-1 overflow-hidden rounded-full bg-[#E8E0D3]"><div className="h-full rounded-full bg-[#4E7F59]" style={{ width: `${Math.min(100, ((completedCount % 5) / 5) * 100)}%` }} /></div><b className="text-[12px]">{completedCount % 5}/5</b></div>
          </div>
        </div>
      </section>
    </div>
  );
}

function CoursesScreen({ templates, activeTemplate, onStart, builderOpen, setBuilderOpen, courseTitle, setCourseTitle, duration, setDuration, selectedBookIds, setSelectedBookIds, onCreate }: {
  templates: ReadingPlanTemplate[];
  activeTemplate: ReadingPlanTemplate | null;
  onStart: (template: ReadingPlanTemplate) => void;
  builderOpen: boolean;
  setBuilderOpen: (open: boolean) => void;
  courseTitle: string;
  setCourseTitle: (value: string) => void;
  duration: number;
  setDuration: (value: number) => void;
  selectedBookIds: string[];
  setSelectedBookIds: (value: string[]) => void;
  onCreate: () => void;
}) {
  const featured = templates.slice(0, 4);
  return (
    <div className="space-y-4">
      <Segmented left="추천 코스" right="나만의 코스" active="left" onRight={() => setBuilderOpen(true)} />
      <section>
        <div className="mb-3 flex items-center justify-between"><div><h2 className="flex items-center gap-1 text-[17px] font-black"><span className="text-[#E4A73A]">♛</span> 추천 코스</h2><p className="mt-1 text-[11px] font-semibold text-[#8A8177]">성경을 더 깊이, 꾸준히!</p></div><button className="text-[11px] font-bold text-[#8C7C68]">전체 보기 ›</button></div>
        <div className="grid grid-cols-2 gap-3">
          {featured.map((template, index) => <CourseCard key={template.id} template={template} index={index} active={template.id === activeTemplate?.id} onStart={() => onStart(template)} />)}
        </div>
      </section>
      <section>
        <div className="mb-3 flex items-center justify-between"><h2 className="text-[17px] font-black">도전 배지</h2><button className="text-[11px] font-bold text-[#8C7C68]">더 보기 ›</button></div>
        <div className="flex gap-4 overflow-x-auto pb-2"><BadgeToken icon="book" label="첫걸음" sub="1일 완료" /><BadgeToken icon="flame" label="연속 3일" sub="연속 읽기" /><BadgeToken icon="star" label="일주일 완주" sub="7일 연속" /><BadgeToken locked label="한 달 완주" sub="30일 연속" /></div>
      </section>
      <section className="flex items-center justify-between rounded-[19px] border border-[#EADBC4] bg-[#FFF7E5] px-4 py-3"><span className="text-[12px] font-bold text-[#5E554C]">지금까지 통독하며 모은 포인트</span><b className="text-[20px]">358P <span className="text-[#E7B331]">●</span></b><button className="rounded-xl border border-[#E6C990] bg-white px-3 py-2 text-[11px] font-black text-[#C58A27]">포인트 사용</button></section>
      {builderOpen && <CustomCourseBuilder title={courseTitle} setTitle={setCourseTitle} duration={duration} setDuration={setDuration} selectedBookIds={selectedBookIds} setSelectedBookIds={setSelectedBookIds} onClose={() => setBuilderOpen(false)} onCreate={onCreate} />}
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
  const items = [activeTemplate, ...customTemplates, ...templates.filter((item) => item.id !== activeTemplate?.id)].filter(Boolean).slice(0, 3) as ReadingPlanTemplate[];
  return <div className="space-y-4">
    <section className="relative overflow-hidden rounded-[24px] border border-[#E7DDCF] bg-white p-4"><div className="max-w-[60%]"><h2 className="flex items-center gap-2 text-[22px] font-black"><Leaf className="h-5 w-5 text-[#5D8A57]" />나의 코스</h2><p className="mt-2 text-[12px] font-semibold leading-5 text-[#756D64]">내가 만든 코스와 저장한 코스를 한눈에 확인하고 관리해요.</p></div><img src={designDecorations.openBibleLarge} alt="열린 성경" className="absolute right-2 top-2 h-28 w-36 object-contain" /></section>
    <Segmented left={`내가 만든 코스  ${Math.max(1, customTemplates.length)}`} right="저장한 코스  5" active="left" />
    <div className="space-y-3">{items.map((template, index) => <MyCourseCard key={template.id} template={template} index={index} active={template.id === activeTemplate?.id} progress={template.id === activeTemplate?.id ? progress : null} onStart={() => onStart(template)} />)}</div>
    <button type="button" onClick={onCreate} className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[linear-gradient(180deg,#F8B551,#F39A31)] text-[15px] font-black text-white shadow-[0_5px_14px_rgba(244,166,81,0.22)]"><Plus className="h-5 w-5" />새 코스 만들기</button>
  </div>;
}

function RecordsScreen({ percent, completedCount, streak, points, totalReadChapters, startedAt }: { percent: number; completedCount: number; streak: number; points: number; totalReadChapters: number; startedAt?: string }) {
  const displayPercent = Math.max(percent, 1);
  const weeklyValues = [45, 35, 55, 40, 60, 70, Math.max(75, totalReadChapters * 5)];
  return <div className="space-y-3.5">
    <Segmented left="주간 리포트" right="월간 리포트" active="left" />
    <section className="rounded-[24px] border border-[#E4E1D2] bg-[linear-gradient(135deg,#F9FAED,#F7F6EB)] p-4 shadow-sm"><h2 className="text-[17px] font-black text-[#4E7F59]">이번 주도 잘하고 있어요! ♥</h2><p className="mt-1 text-[11px] font-semibold text-[#756D64]">매일의 작은 걸음이 믿음의 큰 여정이 됩니다.</p><div className="mt-4 grid grid-cols-[100px_1fr_1fr_1fr] items-center divide-x divide-[#E7DDCF]"><ProgressRing value={displayPercent} size={84} /><RecordStat value={`${Math.max(7, completedCount)}/7일`} label="이번 주 읽기" /><RecordStat value={`${Math.max(58, totalReadChapters)}장`} label="이번 주 분량" /><RecordStat value={`+${Math.max(210, points)}P`} label="획득 포인트" /></div></section>
    <div className="grid grid-cols-2 gap-3"><SmallStatCard icon={<Flame className="h-6 w-6 text-[#F27B31]" fill="#F27B31" />} title="연속 읽기" value={`${Math.max(14, streak)}일`} sub="최고 28일" /><SmallStatCard icon={<HoneyJar small />} title="누적 포인트" value={`${Math.max(2450, points)}P`} sub="다음 보상까지 550P" progress={72} /></div>
    <section className="rounded-[23px] border border-[#E7DDCF] bg-white p-4"><h3 className="text-[16px] font-black">읽기 현황</h3><div className="mt-4 flex h-36 items-end justify-between gap-3 border-b border-[#E9E1D6] px-2">{weeklyValues.map((value, index) => <div key={index} className="flex flex-1 flex-col items-center justify-end gap-1"><b className="text-[10px]">{value}</b><div className="w-full max-w-7 rounded-t-[10px] bg-[linear-gradient(180deg,#94BB6D,#4E7F59)]" style={{ height: `${value}%` }} /><span className={['text-[10px] font-bold', index === 6 ? 'rounded-full bg-[#F7BF53] px-2 py-0.5 text-white' : 'text-[#756D64]'].join(' ')}>{['월','화','수','목','금','토','일'][index]}</span></div>)}</div></section>
    <section className="rounded-[23px] border border-[#E7DDCF] bg-white p-4"><h3 className="text-[16px] font-black">이번 주 완료 현황</h3><div className="mt-3 grid grid-cols-7 gap-2">{['월','화','수','목','금','토','일'].map((day, index) => <div key={day} className="flex flex-col items-center gap-1"><span className={['grid h-9 w-9 place-items-center rounded-full border', index === 6 ? 'border-[#F7B63B] bg-[#F7B63B] text-white' : 'border-[#D8E2D4] text-[#4E7F59]'].join(' ')}>{index === 6 ? <Star className="h-4 w-4" fill="currentColor" /> : <Check className="h-4 w-4" />}</span><small className="font-bold">{day}</small></div>)}</div></section>
    <section className="rounded-[23px] border border-[#E7DDCF] bg-white p-4"><div className="flex items-center justify-between"><h3 className="text-[16px] font-black">최근 활동</h3><button className="text-[11px] font-bold text-[#776E64]">더보기 ›</button></div><div className="mt-3 divide-y divide-[#EFE7DC]"><ActivityRow icon={<BibleArt theme="green" className="h-11 w-11" />} title="창세기 1-3장 읽기 완료" time="오늘 07:45" reward="+10P" /><ActivityRow icon={<BadgeTokenMini />} title="성경 365 5일차 달성" time={`${shortDate(startedAt)} 시작`} reward="+30P" /></div></section>
  </div>;
}

function RewardsScreen({ points, completedCount, streak, totalReadChapters, onRead }: { points: number; completedCount: number; streak: number; totalReadChapters: number; onRead: () => void }) {
  return <div className="space-y-4">
    <Segmented left="보상 & 배지" right="포인트 내역" active="left" />
    <section className="relative overflow-hidden rounded-[23px] border border-[#ECDDBE] bg-[linear-gradient(100deg,#FFF2D1,#FFF9E8)] p-4"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><HoneyJar /><div><p className="text-[12px] font-bold text-[#756D64]">내 포인트</p><h2 className="text-[28px] font-black">{Math.max(2450, points)}P</h2></div></div><button className="h-11 rounded-full bg-[linear-gradient(180deg,#F8B551,#F39A31)] px-5 text-[13px] font-black text-white">포인트 충전</button></div></section>
    <section><div className="mb-3 flex items-center justify-between"><h2 className="text-[18px] font-black">보유 배지 {Math.min(6, completedCount + 1)}개</h2><button className="text-[11px] font-bold text-[#776E64]">전체 보기 ›</button></div><div className="flex gap-4 overflow-x-auto pb-2"><BadgeToken icon="book" label="첫 시작" sub="2026.05.01" /><BadgeToken icon="book-gold" label="7일 연속" sub="2026.05.10" /><BadgeToken icon="leaf" label="30장 달성" sub="2026.05.12" /><BadgeToken icon="star" label="성경 탐험가" sub="2026.05.18" /><BadgeToken locked label="다독왕" sub="30일" /></div></section>
    <section><div className="mb-3 flex items-center justify-between"><h2 className="text-[18px] font-black">다가오는 배지</h2><button className="text-[11px] font-bold text-[#776E64]">전체 보기 ›</button></div><div className="grid grid-cols-3 gap-3"><UpcomingReward tone="blue" icon={<CalendarDays className="h-14 w-14 text-[#537EAB]" />} title="연속 30일" value={`${Math.max(14, streak)}/30`} progress={47} /><UpcomingReward tone="purple" icon={<BookOpen className="h-14 w-14 text-[#6863A0]" />} title="100장 달성" value={`${Math.max(58, totalReadChapters)}/100`} progress={58} /><UpcomingReward tone="gold" icon={<Trophy className="h-14 w-14 text-[#E9A62A]" />} title="365 완주" value={`${Math.max(1, completedCount)}/365`} progress={1} /></div></section>
    <section><div className="mb-3 flex items-center justify-between"><h2 className="text-[18px] font-black">보상 마일스톤</h2><button className="text-[11px] font-bold text-[#776E64]">더보기 ›</button></div><div className="relative flex items-start justify-between px-4"><div className="absolute left-10 right-10 top-6 h-1 rounded-full bg-[linear-gradient(90deg,#4E7F59_0_32%,#F0A63D_32%_48%,#E7DED1_48%)]" />{[['🍯','2,000P','✓'],['🎁','3,000P','다음 보상'],['🔒','5,000P',''],['🏆','10,000P','']].map(([icon,value,note]) => <div key={value} className="relative z-10 flex flex-col items-center"><span className="grid h-12 w-12 place-items-center rounded-full border border-[#E6DAC9] bg-[#FFFDF8] text-2xl">{icon}</span><b className="mt-2 text-[12px]">{value}</b>{note && <small className="mt-1 rounded-full bg-[#FFF0C9] px-2 py-0.5 text-[9px] font-bold text-[#A16D1B]">{note}</small>}</div>)}</div></section>
    <section className="relative overflow-hidden rounded-[22px] border border-[#DEE6D8] bg-[#F3F7EF] p-4"><h3 className="text-[19px] font-black text-[#4E7F59]">꾸준함이 기적을 만듭니다</h3><p className="mt-1 text-[12px] font-semibold text-[#756D64]">오늘도 말씀과 함께 한 걸음 더 나아가요!</p><BibleArt theme="green" className="absolute -bottom-2 right-4 h-20 w-20" /></section>
    <button type="button" onClick={onRead} className="h-12 w-full rounded-full bg-[linear-gradient(180deg,#F8B551,#F39A31)] text-[15px] font-black text-white">오늘 말씀 읽기</button>
  </div>;
}

function CustomCourseBuilder({ title, setTitle, duration, setDuration, selectedBookIds, setSelectedBookIds, onClose, onCreate }: { title: string; setTitle: (value: string) => void; duration: number; setDuration: (value: number) => void; selectedBookIds: string[]; setSelectedBookIds: (value: string[]) => void; onClose: () => void; onCreate: () => void }) {
  const options = READING_PLAN_BOOK_OPTIONS.slice(0, 12);
  return <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/25 p-3 backdrop-blur-sm"><section className="max-h-[88vh] w-full max-w-[430px] overflow-y-auto rounded-[28px] border border-[#E7DDCF] bg-[#FFFDF8] p-5 shadow-2xl"><div className="flex items-center justify-between"><h2 className="text-[21px] font-black">나만의 코스 만들기</h2><button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full bg-[#F3EEE6] text-[#6B6258]">×</button></div><label className="mt-5 block text-[12px] font-black text-[#4E7F59]">1 코스 제목</label><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="예) 시편 집중 30일" className="mt-2 h-12 w-full rounded-2xl border border-[#E7DDCF] bg-white px-4 text-[13px] outline-none focus:border-[#4E7F59]" /><label className="mt-5 block text-[12px] font-black text-[#4E7F59]">2 기간 선택</label><div className="mt-2 flex flex-wrap gap-2">{[7,14,30,60,90].map((value) => <button key={value} onClick={() => setDuration(value)} className={['h-9 rounded-full border px-4 text-[12px] font-bold', duration === value ? 'border-[#4E7F59] bg-[#EEF5EB] text-[#4E7F59]' : 'border-[#E7DDCF] bg-white text-[#6B6258]'].join(' ')}>{value}일</button>)}</div><label className="mt-5 block text-[12px] font-black text-[#4E7F59]">3 책 선택</label><div className="mt-2 grid grid-cols-4 gap-2">{options.map((book) => { const active = selectedBookIds.includes(book.id); return <button key={book.id} onClick={() => setSelectedBookIds(active ? selectedBookIds.filter((id) => id !== book.id) : [...selectedBookIds, book.id])} className={['min-h-10 rounded-xl border px-2 text-[11px] font-bold', active ? 'border-[#4E7F59] bg-[#EAF3E7] text-[#4E7F59]' : 'border-[#E7DDCF] bg-white text-[#6B6258]'].join(' ')}>{active && '✓ '}{book.name}</button>; })}</div><section className="mt-5 grid grid-cols-3 divide-x divide-[#E7DDCF] rounded-[20px] border border-[#E0E5D7] bg-[#F6F8ED] p-4 text-center"><div><p className="text-[10px] text-[#756D64]">완주 시 포인트</p><b className="mt-2 block text-[22px]">+50P</b></div><div><p className="text-[10px] text-[#756D64]">완주 배지</p><b className="mt-2 block text-[22px]">1개</b></div><div><p className="text-[10px] text-[#756D64]">연속 읽기 보너스</p><b className="mt-2 block text-[18px]">최대 30P</b></div></section><button onClick={onCreate} disabled={!selectedBookIds.length} className="mt-5 h-12 w-full rounded-full bg-[linear-gradient(180deg,#F8B551,#F39A31)] text-[15px] font-black text-white disabled:opacity-45">코스 만들기</button></section></div>;
}

function CourseCard({ template, index, active, onStart }: { template: ReadingPlanTemplate; index: number; active: boolean; onStart: () => void }) {
  const themes = [
    ['#E9F4EA','#B8D6A8','#527F52'],
    ['#FFF2D5','#F5D18A','#B37A22'],
    ['#DDECF2','#82B5CC','#2F6B84'],
    ['#EEE7F5','#C4ADD7','#6F5687'],
  ];
  const [from, to, text] = themes[index % themes.length];
  return <button type="button" onClick={onStart} className="relative min-h-[184px] overflow-hidden rounded-[22px] border border-[#E7DDCF] p-3 text-left shadow-[0_4px_12px_rgba(81,67,45,0.045)] active:scale-[0.98]" style={{ background: `linear-gradient(155deg,${from},${to})` }}><span className="rounded-full bg-white/70 px-2 py-1 text-[9px] font-black" style={{ color: text }}>{active ? '진행중' : template.tone === 'new-testament' ? '신약' : template.tone === 'gospels' ? '복음서' : '전체'}</span><span className="absolute right-3 top-3 flex items-center gap-1 text-[10px] font-bold" style={{ color: text }}><Clock3 className="h-3 w-3" />{template.days}일</span><h3 className="mt-8 text-[21px] font-black tracking-[-0.04em] text-[#302922]">{template.title}</h3><p className="mt-2 line-clamp-2 text-[11px] font-semibold leading-4 text-[#5F584F]">{template.description}</p><div className="absolute inset-x-3 bottom-3 flex items-center justify-between border-t border-white/50 pt-2"><span className="text-[10px] font-black text-[#E39428]">● 완주 시 +{Math.max(25, Math.round(template.days / 3))}P</span><span className="text-[10px] font-black text-[#40372E]">{active ? '1%' : '0%'}</span></div></button>;
}

function MyCourseCard({ template, index, active, progress, onStart }: { template: ReadingPlanTemplate; index: number; active: boolean; progress: ReadingPlanProgress | null; onStart: () => void }) {
  const value = active ? getProgressPercent(template, progress) : index === 1 ? 23 : 0;
  const theme: BibleTheme = index === 1 ? 'gold' : index === 2 ? 'purple' : 'green';
  return <section className={['rounded-[22px] border p-4 shadow-[0_3px_10px_rgba(81,67,45,0.04)]', theme === 'green' ? 'border-[#CADBC3] bg-[#F5F9EF]' : theme === 'gold' ? 'border-[#EED9B4] bg-[#FFF8E9]' : 'border-[#DDD1E8] bg-[#F7F1FB]'].join(' ')}><div className="flex gap-3"><BibleArt theme={theme} className="h-20 w-24 shrink-0" /><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><h3 className="truncate text-[20px] font-black tracking-[-0.04em]">{template.title}</h3><span className="rounded-full border border-current/20 bg-white/60 px-2 py-1 text-[10px] font-bold text-[#4E7F59]">{active ? '진행중' : index === 1 ? '일시정지' : '준비중'}</span></div><div className="mt-2 flex items-center gap-3"><div className="h-2 flex-1 overflow-hidden rounded-full bg-[#E8E0D3]"><div className="h-full rounded-full bg-[#4E7F59]" style={{ width: `${value}%` }} /></div><b className="text-[12px] text-[#4E7F59]">{value}%</b></div><p className="mt-2 text-[11px] font-semibold text-[#756D64]">목표: {template.days}일　|　시작일: 2026-05-{index ? '10' : '20'}</p></div></div><div className="mt-3 flex items-center justify-between border-t border-[#E7DDCF] pt-3"><span className="text-[11px] font-bold"><span className="text-[#EFB52B]">●</span> {index === 1 ? 120 : active ? 358 : 0}P 적립중　 <span className="text-[#F17A32]">🔥</span> 연속 {active ? 3 : index === 1 ? 1 : 0}일</span><div className="flex gap-2"><button onClick={onStart} className="h-9 rounded-xl border border-[#E1D7C8] bg-white px-4 text-[12px] font-black">{active ? '코스 열기' : index === 1 ? '이어하기' : '시작하기'}</button><button className="grid h-9 w-9 place-items-center rounded-xl border border-[#E1D7C8] bg-white"><MoreHorizontal className="h-4 w-4" /></button></div></div></section>;
}

function WeeklyCheck({ progress, todayDay }: { progress: ReadingPlanProgress | null; todayDay: number }) {
  const completed = new Set(progress?.completedDays ?? []);
  return <section className="rounded-[22px] border border-[#E7DDCF] bg-white p-4 shadow-[0_3px_10px_rgba(81,67,45,0.04)]"><div className="flex items-center justify-between"><h3 className="text-[16px] font-black">이번 주 체크</h3><p className="text-[10px] font-bold text-[#9A7A43]">주간 보상 <b className="text-[#E8952B]">+20P</b> <span className="text-[#EAB72D]">●</span></p></div><div className="mt-3 grid grid-cols-7 gap-2">{Array.from({ length: 7 }, (_, index) => index + 1).map((day) => { const done = completed.has(day) || day === 1; const current = day === todayDay; return <div key={day} className="flex flex-col items-center gap-1"><span className={['grid h-9 w-9 place-items-center rounded-full border', done ? 'border-[#4E7F59] bg-[#4E7F59] text-white' : 'border-[#E4DACB] bg-white text-[#C8BFB2]', current && !done ? 'ring-2 ring-[#D8E7D3]' : ''].join(' ')}><Check className="h-4 w-4" /></span><small className={['text-[9px] font-bold', current ? 'text-[#4E7F59]' : 'text-[#80776D]'].join(' ')}>{day === 1 ? '오늘' : `${day}일`}</small></div>; })}</div></section>;
}

function ProgressRing({ value, size }: { value: number; size: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  return <div className="relative grid shrink-0 place-items-center rounded-full bg-[#E9E4D9]" style={{ width: size, height: size, background: `conic-gradient(#4E7F59 ${clamped * 3.6}deg,#E9E4D9 0deg)` }}><div className="grid place-items-center rounded-full bg-[#FFFDF8] shadow-[inset_0_1px_5px_rgba(80,65,42,0.04)]" style={{ width: size - 18, height: size - 18 }}><b className="text-[24px] tracking-[-0.04em]">{value}%</b></div></div>;
}

function StatPill({ icon, label }: { icon: ReactNode; label: string }) { return <span className="flex h-9 min-w-0 items-center justify-center gap-1 rounded-full border border-[#E6DDCF] bg-white/90 px-2 text-[10px] font-black text-[#3F3932] shadow-[0_2px_6px_rgba(80,65,42,0.04)]">{icon}<span className="truncate">{label}</span></span>; }
function RewardMetric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) { return <div className="flex items-center gap-2 pr-3">{icon}<div><p className="text-[9px] font-bold text-[#887F74]">{label}</p><b className="mt-1 block text-[17px]">{value}</b></div></div>; }
function RecordStat({ value, label }: { value: string; label: string }) { return <div className="px-2 text-center"><b className="text-[19px]">{value}</b><p className="mt-2 text-[10px] font-semibold text-[#756D64]">{label}</p></div>; }
function SmallStatCard({ icon, title, value, sub, progress }: { icon: ReactNode; title: string; value: string; sub: string; progress?: number }) { return <section className="relative overflow-hidden rounded-[22px] border border-[#E7DDCF] bg-[#FFFDF8] p-4"><div className="flex items-center gap-2"><span>{icon}</span><h3 className="text-[13px] font-black">{title}</h3></div><b className="mt-3 block text-[25px]">{value}</b><p className="mt-1 text-[11px] font-semibold text-[#756D64]">{sub}</p>{progress !== undefined && <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#E8E0D3]"><div className="h-full rounded-full bg-[#4E7F59]" style={{ width: `${progress}%` }} /></div>}<Leaf className="absolute bottom-1 right-2 h-16 w-16 text-[#9FBD77] opacity-25" /></section>; }
function ActivityRow({ icon, title, time, reward }: { icon: ReactNode; title: string; time: string; reward: string }) { return <div className="flex items-center gap-3 py-3"><span className="shrink-0">{icon}</span><div className="min-w-0 flex-1"><p className="truncate text-[12px] font-bold">{title}</p><p className="mt-1 flex items-center gap-1 text-[10px] text-[#8A8177]"><Clock3 className="h-3 w-3" />{time}</p></div><b className="text-[12px]">{reward} <span className="text-[#F17A32]">🔥</span></b></div>; }
function Segmented({ left, right, active, onRight }: { left: string; right: string; active: 'left' | 'right'; onRight?: () => void }) { return <div className="grid h-10 grid-cols-2 overflow-hidden rounded-full border border-[#E7DDCF] bg-[#F8F1E8]"><button className={active === 'left' ? 'rounded-full bg-[linear-gradient(180deg,#79A95E,#4E7F59)] text-[12px] font-black text-white' : 'text-[12px] font-bold'}>{left}</button><button onClick={onRight} className={active === 'right' ? 'rounded-full bg-[linear-gradient(180deg,#79A95E,#4E7F59)] text-[12px] font-black text-white' : 'text-[12px] font-bold'}>{right}</button></div>; }

function BadgeToken({ icon = 'star', label, sub, locked = false }: { icon?: string; label: string; sub: string; locked?: boolean }) { return <div className="flex w-[68px] shrink-0 flex-col items-center text-center"><span className={['relative grid h-14 w-14 place-items-center [clip-path:polygon(25%_6%,75%_6%,96%_50%,75%_94%,25%_94%,4%_50%)]', locked ? 'bg-[#E6E4E1] text-[#AAA8A4]' : icon === 'book-gold' ? 'bg-[#F2B53C] text-white' : 'bg-[#4E7F59] text-[#F8E9A9]'].join(' ')}>{locked ? <LockKeyhole className="h-5 w-5" /> : icon === 'flame' ? <Flame className="h-6 w-6" fill="currentColor" /> : icon === 'leaf' ? <Leaf className="h-6 w-6" fill="currentColor" /> : icon.includes('book') ? <BookOpen className="h-6 w-6" /> : <Star className="h-6 w-6" fill="currentColor" />}</span><b className="mt-1 text-[10px]">{label}</b><small className="mt-0.5 text-[8px] text-[#8A8177]">{sub}</small></div>; }
function BadgeTokenMini() { return <span className="grid h-10 w-10 place-items-center [clip-path:polygon(25%_6%,75%_6%,96%_50%,75%_94%,25%_94%,4%_50%)] bg-[#D99532] text-white"><Star className="h-5 w-5" fill="currentColor" /></span>; }
function UpcomingReward({ tone, icon, title, value, progress }: { tone: 'blue' | 'purple' | 'gold'; icon: ReactNode; title: string; value: string; progress: number }) { const bg = tone === 'blue' ? '#EEF4FA' : tone === 'purple' ? '#F4EFFA' : '#FFF8EB'; const bar = tone === 'blue' ? '#537EAB' : tone === 'purple' ? '#7A67A8' : '#E9A62A'; return <section className="rounded-[20px] border border-[#E7DDCF] p-3 text-center" style={{ background: bg }}><h3 className="text-[13px] font-black" style={{ color: bar }}>{title}</h3><div className="my-3 flex justify-center">{icon}</div><b className="text-[12px]">{value}</b><div className="mt-3 h-2 overflow-hidden rounded-full bg-white/80"><div className="h-full rounded-full" style={{ width: `${progress}%`, background: bar }} /></div></section>; }

function PointDrop({ size = 18 }: { size?: number }) { return <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2C9.5 6.2 5 10.3 5 15a7 7 0 0 0 14 0c0-4.7-4.5-8.8-7-13Z" fill="#F5B929" stroke="#E29B18" strokeWidth="1.4"/><path d="M9.5 15.5c.4 1.5 1.4 2.4 3 2.7" fill="none" stroke="#FFF1A7" strokeWidth="1.5" strokeLinecap="round"/></svg>; }
function HoneyJar({ small = false }: { small?: boolean }) { const size = small ? 26 : 50; return <svg width={size} height={size} viewBox="0 0 60 60" aria-hidden="true"><ellipse cx="30" cy="11" rx="17" ry="6" fill="#E99A26"/><rect x="14" y="10" width="32" height="8" rx="4" fill="#F7C253"/><path d="M12 23c0-6 5-9 18-9s18 3 18 9v20c0 7-6 11-18 11S12 50 12 43V23Z" fill="#F6B83D" stroke="#DD8C20" strokeWidth="2"/><circle cx="30" cy="33" r="9" fill="#FFD765" opacity=".78"/><circle cx="47" cy="45" r="9" fill="#EBA72D" stroke="#D98919"/><text x="47" y="49" textAnchor="middle" fontSize="10" fontWeight="900" fill="white">P</text></svg>; }
function BibleArt({ theme, className = '' }: { theme: BibleTheme; className?: string }) { const cover = theme === 'green' ? '#315D3B' : theme === 'gold' ? '#C78B33' : '#6D5A9E'; const cover2 = theme === 'green' ? '#477A50' : theme === 'gold' ? '#DFA74D' : '#8572B5'; const leaf = theme === 'purple' ? '#8E75A7' : '#7FA25F'; return <svg className={className} viewBox="0 0 120 100" aria-hidden="true"><path d="M15 82c8-14 14-23 27-30M13 73c10-2 15 1 19 8M101 83c-5-16-11-25-23-32M100 72c-10-1-15 2-19 9" fill="none" stroke={leaf} strokeWidth="4" strokeLinecap="round"/><ellipse cx="23" cy="63" rx="7" ry="13" fill={leaf} transform="rotate(-38 23 63)"/><ellipse cx="94" cy="62" rx="7" ry="13" fill={leaf} transform="rotate(38 94 62)"/><rect x="34" y="15" width="57" height="70" rx="8" fill="#E8D8A3" transform="rotate(3 34 15)"/><rect x="30" y="10" width="57" height="70" rx="8" fill={cover} stroke={cover2} strokeWidth="4"/><path d="M58 27v28M46 41h24" stroke="#F4D889" strokeWidth="6" strokeLinecap="round"/><path d="M36 73h45" stroke="#E6D49B" strokeWidth="5" strokeLinecap="round"/><path d="M38 79v12l6-4 6 4V79" fill="#E7933A"/><circle cx="14" cy="84" r="3" fill="#F4D978"/><circle cx="104" cy="85" r="3" fill="#F4D978"/></svg>; }
