import {
  Award,
  BookOpen,
  Check,
  CheckCircle,
  ClipboardList,
  Droplet,
  Flame,
  Gift,
  Leaf,
  MoreHorizontal,
  SlidersHorizontal,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import {
  ALL_READING_PLAN_TEMPLATES,
  createCustomReadingPlanTemplate,
  READING_PLAN_BOOK_OPTIONS,
} from '../../data/readingPlans';
import { designDecorations } from '../../assets/design';
import { getProgressPercent, getTodayReadingDay, isDayCompleted } from '../../services/readingPlanStats';
import type { ReadingPlanProgress, ReadingPlanTemplate } from '../../types/readingPlan';
import {
  formatReadingRoomReference,
  formatReadingRoomTask,
  getReadingRoomPlanLabel,
} from './readingRoomUtils';

type ReadingRoomPageProps = {
  progress: ReadingPlanProgress | null;
  userTemplates?: ReadingPlanTemplate[];
  onToggleToday?: (day: number) => void;
  onStartPlan?: (templateId: string, template?: ReadingPlanTemplate) => void;
  onStartPlanAndRead?: (template: ReadingPlanTemplate) => void;
  onNavigateToRange?: (task?: import('../../types/readingPlan').ReadingDayTask | null) => void;
};

type CourseFilter = 'all' | ReadingPlanTemplate['tone'];

type ReadingRoomSection = 'plan' | 'records' | 'rewards';

const CUSTOM_PLANS_STORAGE_KEY = 'gb_custom_reading_plans';
const DEFAULT_WEEK_LABELS = ['오늘', '2일', '3일', '4일', '5일', '6일', '7일'];
const COURSE_PAGE_SIZE = 8;
const COURSE_FILTERS: Array<{ key: CourseFilter; label: string }> = [
  { key: 'all', label: '전체' },
  { key: 'custom', label: '나만의' },
  { key: 'full', label: '전체성경' },
  { key: 'fast', label: '집중' },
  { key: 'new-testament', label: '신약' },
  { key: 'gospels', label: '복음서' },
  { key: 'wisdom', label: '지혜서' },
  { key: 'pentateuch', label: '오경' },
];

const DURATION_PRESETS = [
  { label: '직접', value: 0 },
  { label: '5일', value: 5 },
  { label: '10일', value: 10 },
  { label: '한주', value: 7 },
  { label: '한달', value: 30 },
  { label: '세달', value: 90 },
];

const BOOK_GROUPS: Array<{ title: string; ids: string[] }> = [
  { title: '모세오경', ids: ['gen', 'exo', 'lev', 'num', 'deu'] },
  { title: '역사서', ids: ['jos', 'jdg', 'rut', '1sa', '2sa', '1ki', '2ki', '1ch', '2ch', 'ezr', 'neh', 'est'] },
  { title: '시가서', ids: ['job', 'psa', 'pro', 'ecc', 'sng'] },
  { title: '대선지서', ids: ['isa', 'jer', 'lam', 'ezk', 'dan'] },
  { title: '소선지서', ids: ['hos', 'jol', 'amo', 'oba', 'jon', 'mic', 'nam', 'hab', 'zep', 'hag', 'zec', 'mal'] },
  { title: '복음서', ids: ['mat', 'mrk', 'luk', 'jhn'] },
  { title: '역사서(신약)', ids: ['act'] },
  { title: '바울서신', ids: ['rom', '1co', '2co', 'gal', 'eph', 'php', 'col', '1th', '2th', '1ti', '2ti', 'tit', 'phm'] },
  { title: '공동서신', ids: ['heb', 'jas', '1pe', '2pe', '1jn', '2jn', '3jn', 'jud'] },
  { title: '예언서(신약)', ids: ['rev'] },
];

const GOSPEL_BOOK_IDS = ['mat', 'mrk', 'luk', 'jhn'];
const OLD_TESTAMENT_BOOK_IDS = READING_PLAN_BOOK_OPTIONS.slice(0, 39).map((book) => book.id);
const NEW_TESTAMENT_BOOK_IDS = READING_PLAN_BOOK_OPTIONS.slice(39).map((book) => book.id);
const ALL_BOOK_IDS = READING_PLAN_BOOK_OPTIONS.map((book) => book.id);

function sameIds(left: string[], right: string[]) {
  if (left.length !== right.length) return false;
  const rightSet = new Set(right);
  return left.every((id) => rightSet.has(id));
}

function getReadingRoomSection(): ReadingRoomSection {
  if (typeof window === 'undefined') return 'plan';
  if (window.location.pathname.startsWith('/reading-room/records')) return 'records';
  if (window.location.pathname.startsWith('/reading-room/rewards')) return 'rewards';
  return 'plan';
}

function readStoredCustomPlans(): ReadingPlanTemplate[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(CUSTOM_PLANS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStoredCustomPlans(templates: ReadingPlanTemplate[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(CUSTOM_PLANS_STORAGE_KEY, JSON.stringify(templates));
}

function getStreak(completedDays: number[]) {
  if (completedDays.length === 0) return 0;
  const set = new Set(completedDays);
  let day = Math.max(...completedDays);
  let streak = 0;
  while (set.has(day) && day > 0) {
    streak += 1;
    day -= 1;
  }
  return streak;
}

export function ReadingRoomPage({
  progress,
  userTemplates = [],
  onToggleToday,
  onStartPlan,
  onStartPlanAndRead,
  onNavigateToRange,
}: ReadingRoomPageProps) {
  const section = getReadingRoomSection();
  const [courseFilter, setCourseFilter] = useState<CourseFilter>('all');
  const [visibleCourseCount, setVisibleCourseCount] = useState(4);
  const [isCustomBuilderOpen, setIsCustomBuilderOpen] = useState(false);
  const [selectedBookIds, setSelectedBookIds] = useState<string[]>(['jhn']);
  const [durationPreset, setDurationPreset] = useState(10);
  const [manualDays, setManualDays] = useState(14);
  const [courseTitle, setCourseTitle] = useState('');
  const [localCustomTemplates, setLocalCustomTemplates] = useState<ReadingPlanTemplate[]>(() => readStoredCustomPlans());
  const [claimedToday, setClaimedToday] = useState(false);

  const mergedCustomTemplates = useMemo(() => {
    const map = new Map<string, ReadingPlanTemplate>();
    [...userTemplates, ...localCustomTemplates].forEach((template) => map.set(template.id, template));
    return Array.from(map.values());
  }, [userTemplates, localCustomTemplates]);

  const templates = useMemo(() => [...ALL_READING_PLAN_TEMPLATES, ...mergedCustomTemplates], [mergedCustomTemplates]);
  const activeTemplate = templates.find((template) => template.id === progress?.templateId) ?? null;
  const displayTemplate = activeTemplate ?? templates[0] ?? null;
  const todayDay = activeTemplate ? getTodayReadingDay(activeTemplate, progress) : 1;
  const todayTask = activeTemplate?.tasks[todayDay - 1] ?? displayTemplate?.tasks[0] ?? null;
  const completed = isDayCompleted(progress, todayDay);
  const percent = displayTemplate ? getProgressPercent(displayTemplate, progress) : 0;
  const completedCount = progress?.completedDays.length ?? 0;
  const remainingDays = displayTemplate ? Math.max(0, displayTemplate.days - completedCount) : 21;
  const streak = getStreak(progress?.completedDays ?? []);
  const points = completedCount * 10 + streak * 5;
  const badgeCount = Number(completedCount >= 1) + Number(streak >= 3) + Number(completedCount >= 7) + Number(percent >= 50) + Number(percent >= 100);
  const planLabel = getReadingRoomPlanLabel(displayTemplate);
  const todayTitle = formatReadingRoomTask(todayTask);
  const selectedDays = durationPreset === 0 ? manualDays : durationPreset;
  const selectedBooks = READING_PLAN_BOOK_OPTIONS.filter((book) => selectedBookIds.includes(book.id));

  const isAllSelected = selectedBookIds.length === READING_PLAN_BOOK_OPTIONS.length;
  const isOldSelected = sameIds(selectedBookIds, OLD_TESTAMENT_BOOK_IDS);
  const isNewSelected = sameIds(selectedBookIds, NEW_TESTAMENT_BOOK_IDS);
  const isGospelsSelected = sameIds(selectedBookIds, GOSPEL_BOOK_IDS);

  const filteredTemplates = useMemo(() => {
    if (courseFilter === 'all') return templates;
    if (courseFilter === 'custom') return mergedCustomTemplates;
    return templates.filter((template) => template.tone === courseFilter);
  }, [courseFilter, templates, mergedCustomTemplates]);
  const visibleTemplates = filteredTemplates.slice(0, visibleCourseCount);
  const hasMoreCourses = visibleCourseCount < filteredTemplates.length;

  const courseCards = visibleTemplates.map((template) => {
    const label = getReadingRoomPlanLabel(template);
    return {
      key: template.id,
      title: label.title,
      description: label.description,
      days: `${template.days}일`,
      template,
    };
  });

  const completedTasks = useMemo(() => {
    if (!displayTemplate || !progress) return [];
    return [...progress.completedDays]
      .sort((a, b) => b - a)
      .map((day) => displayTemplate.tasks[day - 1])
      .filter(Boolean)
      .slice(0, 12);
  }, [displayTemplate, progress]);

  const changeCourseFilter = (filter: CourseFilter) => {
    setCourseFilter(filter);
    setVisibleCourseCount(4);
    if (filter === 'custom') setIsCustomBuilderOpen(mergedCustomTemplates.length === 0);
  };

  const showMoreCourses = () => {
    setVisibleCourseCount((count) => Math.min(count + COURSE_PAGE_SIZE, filteredTemplates.length));
  };

  const handleRead = () => {
    if (activeTemplate && progress) {
      onNavigateToRange?.(todayTask);
      return;
    }
    if (displayTemplate) onStartPlanAndRead?.(displayTemplate);
  };

  const handleToggleToday = () => {
    if (!activeTemplate || !progress) return;
    const isCompletedNow = onToggleToday?.(todayDay);
    if (isCompletedNow) setClaimedToday(false);
  };

  const handleClaimReward = () => {
    if (!completed && activeTemplate && progress) onToggleToday?.(todayDay);
    setClaimedToday(true);
  };

  const toggleBook = (bookId: string) => {
    setSelectedBookIds((current) => current.includes(bookId) ? current.filter((id) => id !== bookId) : [...current, bookId]);
  };

  const selectBookGroup = (group: 'gospels' | 'new' | 'old' | 'all') => {
    const ids = group === 'gospels' ? GOSPEL_BOOK_IDS : group === 'new' ? NEW_TESTAMENT_BOOK_IDS : group === 'old' ? OLD_TESTAMENT_BOOK_IDS : ALL_BOOK_IDS;
    setSelectedBookIds((current) => sameIds(current, ids) ? [] : ids);
  };

  const createCustomPlan = () => {
    if (selectedBookIds.length === 0) return;
    const fallbackTitle = selectedBooks.length === 1 ? `${selectedBooks[0].name} ${selectedDays}일` : `나만의 ${selectedDays}일 코스`;
    const template = createCustomReadingPlanTemplate({
      id: `user-${Date.now()}`,
      title: courseTitle.trim() || fallbackTitle,
      days: selectedDays,
      bookIds: selectedBookIds,
    });

    const nextTemplates = [template, ...mergedCustomTemplates.filter((item) => item.id !== template.id)];
    setLocalCustomTemplates(nextTemplates);
    saveStoredCustomPlans(nextTemplates);
    setCourseTitle('');
    setCourseFilter('custom');
    setVisibleCourseCount(8);
    setIsCustomBuilderOpen(false);
    onStartPlan?.(template.id, template);
  };

  return (
    <div className="space-y-3">
      <ProgressHero
        percent={percent}
        planTitle={planLabel.title}
        completedCount={completedCount}
        remainingDays={remainingDays}
        streak={streak}
        points={points}
        badgeCount={badgeCount}
      />

      {section === 'records' ? (
        <RecordsSection
          displayTemplate={displayTemplate}
          completedCount={completedCount}
          remainingDays={remainingDays}
          percent={percent}
          streak={streak}
          completedTasks={completedTasks}
          progress={progress}
        />
      ) : section === 'rewards' ? (
        <RewardsSection
          completed={completed}
          claimedToday={claimedToday}
          onClaim={handleClaimReward}
          points={points}
          streak={streak}
          badgeCount={badgeCount}
          completedCount={completedCount}
          percent={percent}
        />
      ) : (
        <>
          <TodaySection
            todayDay={todayDay}
            todayTitle={todayTitle}
            todayTask={todayTask}
            completed={completed}
            activeTemplate={activeTemplate}
            progress={progress}
            onRead={handleRead}
            onToggleToday={handleToggleToday}
          />

          <WeeklyCheck todayDay={todayDay} progress={progress} />

          <RewardPreview completed={completed} claimedToday={claimedToday} onClaim={handleClaimReward} />

          <section className="mt-4">
            <div className="mb-3 flex items-end justify-between">
              <div>
                <h3 className="text-[20px] font-extrabold text-[#2B2B2B]">추천 코스</h3>
                <p className="text-[13px] font-medium text-[#6B6B6B]">바로 시작하기 좋은 통독 루틴</p>
              </div>
              <div className="rounded-full border border-[#E8DDCD] bg-white px-3 py-1 text-[12px] font-bold text-[#4E7F59]">
                {filteredTemplates.length}개
              </div>
            </div>

            <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
              {COURSE_FILTERS.map((filter) => (
                <button key={filter.key} type="button" onClick={() => changeCourseFilter(filter.key)} className={filterButton(courseFilter === filter.key)}>
                  {filter.label}
                </button>
              ))}
            </div>

            {courseFilter === 'custom' && (
              <CustomCourseBuilder
                open={isCustomBuilderOpen}
                onToggleOpen={() => setIsCustomBuilderOpen((open) => !open)}
                selectedBookIds={selectedBookIds}
                toggleBook={toggleBook}
                selectBookGroup={selectBookGroup}
                isAllSelected={isAllSelected}
                isOldSelected={isOldSelected}
                isNewSelected={isNewSelected}
                isGospelsSelected={isGospelsSelected}
                durationPreset={durationPreset}
                setDurationPreset={setDurationPreset}
                manualDays={manualDays}
                setManualDays={setManualDays}
                courseTitle={courseTitle}
                setCourseTitle={setCourseTitle}
                createCustomPlan={createCustomPlan}
                hasCustomPlans={mergedCustomTemplates.length > 0}
              />
            )}

            <div className="grid grid-cols-2 gap-3">
              {courseCards.map((course, index) => (
                <CourseCard
                  key={course.key}
                  course={course}
                  index={index}
                  courseFilter={courseFilter}
                  onStart={() => onStartPlan?.(course.template.id, course.template)}
                />
              ))}
            </div>
          </section>

          {hasMoreCourses && (
            <button type="button" aria-label="통독방 더보기" onClick={showMoreCourses} className="mx-auto flex h-10 items-center justify-center gap-1 rounded-full border border-[#E8DDCD] bg-white px-4 text-[12px] font-bold text-[#8A8175] active:scale-95">
              <MoreHorizontal className="h-4 w-4" strokeWidth={2} />
              더보기 {filteredTemplates.length - visibleCourseCount}개
            </button>
          )}
        </>
      )}
    </div>
  );
}

function ProgressHero({ percent, planTitle, completedCount, remainingDays, streak, points, badgeCount }: { percent: number; planTitle: string; completedCount: number; remainingDays: number; streak: number; points: number; badgeCount: number }) {
  return (
    <section className="relative overflow-hidden rounded-[24px] border border-[#E8DDCD] bg-gradient-to-br from-[#FFF7EE] to-[#F3F7EF] p-4 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
      <div className="pointer-events-none absolute -right-3 bottom-0 opacity-35">
        <img src={designDecorations.openBibleLarge} alt="" className="h-24 w-24 object-contain" />
      </div>
      <div className="relative flex items-center gap-3">
        <div className="grid h-[72px] w-[72px] shrink-0 place-items-center rounded-full bg-[#EEE8DB] shadow-inner">
          <div aria-label={`통독 진행률 ${percent}%`} className="grid h-[62px] w-[62px] place-items-center rounded-full bg-white text-[19px] font-extrabold text-[#2B2B2B]" style={{ background: `conic-gradient(#4E7F59 ${Math.max(percent, 1) * 3.6}deg, #EFE7DA 0deg)` }}>
            <span className="grid h-[48px] w-[48px] place-items-center rounded-full bg-white">{percent}%</span>
          </div>
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-bold text-[#4E7F59]">진행 중인 통독</p>
          <h2 className="mt-1 text-[24px] font-extrabold leading-tight text-[#2B2B2B]">{planTitle}</h2>
          <p className="mt-1 text-[14px] font-medium text-[#6B6B6B]">{completedCount}일 완료 · {remainingDays}일 남음</p>
        </div>
      </div>
      <div className="relative mt-3 grid grid-cols-3 gap-2">
        <StatPill icon={<Flame className="h-4 w-4 text-[#FF8A3D]" />} label={`연속 ${streak}일`} />
        <StatPill icon={<Droplet className="h-4 w-4 text-[#F8BC24]" />} label={`포인트 ${points}P`} />
        <StatPill icon={<Trophy className="h-4 w-4 text-[#F4A651]" />} label={`배지 ${badgeCount}/5`} />
      </div>
    </section>
  );
}

function TodaySection({ todayDay, todayTitle, todayTask, completed, activeTemplate, progress, onRead, onToggleToday }: { todayDay: number; todayTitle: string; todayTask: import('../../types/readingPlan').ReadingDayTask | null; completed: boolean; activeTemplate: ReadingPlanTemplate | null; progress: ReadingPlanProgress | null; onRead: () => void; onToggleToday: () => void }) {
  return (
    <section className="relative overflow-hidden rounded-[24px] border border-[#E8DDCD] bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
      <div className="pointer-events-none absolute right-2 top-2 opacity-20"><img src={designDecorations.pottedSprout} alt="" className="h-14 w-14 object-contain" /></div>
      <div className="relative flex items-center justify-between gap-3">
        <div><p className="text-[13px] font-bold text-[#4E7F59]">{todayDay}일차 오늘 읽기</p><h2 className="mt-1 text-[23px] font-extrabold leading-tight text-[#2B2B2B]">{todayTitle}</h2></div>
        <button type="button" aria-label="성경 열기" onClick={onRead} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#E8DDCD] bg-[#FFFDF8] text-[#4E7F59] active:scale-95"><BookOpen className="h-5 w-5" strokeWidth={2} /></button>
      </div>
      <div className="mt-3 grid gap-2">
        {(todayTask?.references ?? []).slice(0, 2).map((ref) => <div key={`${ref.bookId}-${ref.startChapter}-${ref.endChapter ?? ref.startChapter}`} className="rounded-2xl border border-[#E8DDCD] bg-[#FFFDF8] px-4 py-3 text-[15px] font-bold text-[#2B2B2B]">{formatReadingRoomReference(ref)}</div>)}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" onClick={onRead} className="flex h-11 items-center justify-center gap-1.5 rounded-2xl bg-[#F4A651] text-[15px] font-bold text-white shadow-[0_2px_8px_rgba(0,0,0,0.05)] active:scale-95"><BookOpen className="h-[18px] w-[18px]" strokeWidth={2} />읽으러 가기</button>
        <button type="button" onClick={onToggleToday} disabled={!activeTemplate || !progress} className="flex h-11 items-center justify-center gap-1.5 rounded-2xl border border-[#E2D7C7] bg-white text-[14px] font-bold text-[#2B2B2B] active:scale-95 disabled:opacity-55"><CheckCircle className="h-[18px] w-[18px] text-[#4E7F59]" strokeWidth={2} />{completed ? '완료 취소' : '오늘 읽기 완료'}</button>
      </div>
    </section>
  );
}

function WeeklyCheck({ todayDay, progress }: { todayDay: number; progress: ReadingPlanProgress | null }) {
  return (
    <section className="rounded-[24px] border border-[#E8DDCD] bg-white p-3 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
      <div className="flex items-center justify-between"><h3 className="text-[18px] font-extrabold text-[#2B2B2B]">주간 체크</h3><p className="text-[13px] font-semibold text-[#9A9A9A]">오늘 {todayDay}일차</p></div>
      <div className="mt-3 grid grid-cols-7 gap-2">
        {DEFAULT_WEEK_LABELS.map((label, index) => {
          const day = Math.max(1, todayDay + index);
          const isToday = index === 0;
          const isDone = progress?.completedDays.includes(day) ?? false;
          return <div key={`${label}-${index}`} className="flex flex-col items-center gap-1"><div className={['flex h-9 w-9 items-center justify-center rounded-xl border text-[14px] font-bold', isDone ? 'border-[#4E7F59] bg-[#4E7F59] text-white' : isToday ? 'border-[#4E7F59] bg-[#F3F7EF] text-[#4E7F59]' : 'border-[#E8DDCD] bg-[#FFFDF8] text-[#6B6B6B]'].join(' ')}>{isDone ? <CheckCircle className="h-4 w-4" strokeWidth={2.2} /> : index + 1}</div><span className="text-[11px] font-medium text-[#6B6B6B]">{label}</span></div>;
        })}
      </div>
    </section>
  );
}

function RewardPreview({ completed, claimedToday, onClaim }: { completed: boolean; claimedToday: boolean; onClaim: () => void }) {
  return (
    <section className="rounded-[24px] border border-[#E8DDCD] bg-[#FFF7EE] p-3 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
      <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-[#F4A651] shadow-[0_2px_8px_rgba(0,0,0,0.05)]"><Gift className="h-5 w-5" strokeWidth={2} /></div><div><h3 className="text-[16px] font-extrabold text-[#2B2B2B]">오늘의 보상</h3><p className="mt-0.5 text-[12px] font-medium text-[#6B6B6B]">오늘 읽으면 +10P · 연속 보너스 +5P</p></div></div><button type="button" onClick={onClaim} className="rounded-full bg-[#4E7F59] px-4 py-2 text-[12px] font-bold text-white shadow-[0_2px_8px_rgba(0,0,0,0.08)]">{claimedToday ? '수령 완료' : completed ? '보상 받기' : '읽고 받기'}</button></div>
    </section>
  );
}

function RecordsSection({ displayTemplate, completedCount, remainingDays, percent, streak, completedTasks, progress }: { displayTemplate: ReadingPlanTemplate | null; completedCount: number; remainingDays: number; percent: number; streak: number; completedTasks: import('../../types/readingPlan').ReadingDayTask[]; progress: ReadingPlanProgress | null }) {
  const days = Array.from({ length: Math.min(displayTemplate?.days ?? 30, 30) }, (_, index) => index + 1);
  return (
    <section className="space-y-3">
      <div className="grid grid-cols-2 gap-3"><MetricCard label="완료" value={`${completedCount}일`} /><MetricCard label="남은 분량" value={`${remainingDays}일`} /><MetricCard label="진행률" value={`${percent}%`} /><MetricCard label="연속" value={`${streak}일`} /></div>
      <section className="rounded-[24px] border border-[#E8DDCD] bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.05)]"><h3 className="text-[18px] font-extrabold text-[#2B2B2B]">통독 달력</h3><p className="mt-1 text-[12px] font-medium text-[#6B6B6B]">최근 30일 기준으로 읽은 날을 표시합니다.</p><div className="mt-3 grid grid-cols-6 gap-2">{days.map((day) => { const done = progress?.completedDays.includes(day) ?? false; return <div key={day} className={['flex h-10 items-center justify-center rounded-xl border text-[12px] font-bold', done ? 'border-[#4E7F59] bg-[#4E7F59] text-white' : 'border-[#E8DDCD] bg-[#FFFDF8] text-[#8A8175]'].join(' ')}>{done ? <CheckCircle className="h-4 w-4" /> : day}</div>; })}</div></section>
      <section className="rounded-[24px] border border-[#E8DDCD] bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.05)]"><h3 className="text-[18px] font-extrabold text-[#2B2B2B]">완료 기록</h3><div className="mt-3 space-y-2">{completedTasks.length === 0 ? <p className="rounded-2xl border border-dashed border-[#E8DDCD] bg-[#FFFDF8] p-4 text-[13px] font-medium text-[#6B6B6B]">아직 완료한 통독 기록이 없습니다. 오늘 읽기를 완료하면 기록이 쌓입니다.</p> : completedTasks.map((task) => <div key={task.day} className="rounded-2xl border border-[#E8DDCD] bg-[#FFFDF8] px-4 py-3"><div className="text-[13px] font-extrabold text-[#4E7F59]">{task.day}일차 완료</div><div className="mt-1 text-[14px] font-bold text-[#2B2B2B]">{formatReadingRoomTask(task)}</div></div>)}</div></section>
    </section>
  );
}

function RewardsSection({ completed, claimedToday, onClaim, points, streak, badgeCount, completedCount, percent }: { completed: boolean; claimedToday: boolean; onClaim: () => void; points: number; streak: number; badgeCount: number; completedCount: number; percent: number }) {
  const badges = [
    { title: '첫 걸음', desc: '첫 통독 완료', unlocked: completedCount >= 1 },
    { title: '3일 불꽃', desc: '연속 3일 달성', unlocked: streak >= 3 },
    { title: '일주일 리듬', desc: '7일 완료', unlocked: completedCount >= 7 },
    { title: '절반의 길', desc: '50% 진행', unlocked: percent >= 50 },
    { title: '완독의 기쁨', desc: '100% 완료', unlocked: percent >= 100 },
  ];
  return (
    <section className="space-y-3">
      <section className="relative overflow-hidden rounded-[24px] border border-[#E8DDCD] bg-gradient-to-br from-[#FFF7EE] to-[#FFF1D8] p-4 shadow-[0_2px_8px_rgba(0,0,0,0.05)]"><div className="absolute right-3 top-3 opacity-20"><Sparkles className="h-16 w-16 text-[#F4A651]" /></div><p className="text-[13px] font-bold text-[#4E7F59]">나의 보상</p><h3 className="mt-1 text-[32px] font-black text-[#2B2B2B]">{points}P</h3><p className="mt-1 text-[13px] font-medium text-[#6B6B6B]">배지 {badgeCount}/5 · 연속 {streak}일</p><button type="button" onClick={onClaim} className="mt-4 flex h-11 w-full items-center justify-center rounded-2xl bg-[#4E7F59] text-[15px] font-bold text-white active:scale-95">{claimedToday ? '오늘 보상 수령 완료' : completed ? '오늘 보상 받기' : '오늘 읽고 보상 받기'}</button></section>
      <section className="rounded-[24px] border border-[#E8DDCD] bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.05)]"><h3 className="text-[18px] font-extrabold text-[#2B2B2B]">배지함</h3><div className="mt-3 grid grid-cols-2 gap-3">{badges.map((badge) => <div key={badge.title} className={['rounded-2xl border p-3', badge.unlocked ? 'border-[#4E7F59] bg-[#F3F7EF]' : 'border-[#E8DDCD] bg-[#FFFDF8] opacity-65'].join(' ')}><div className="flex items-center gap-2"><Award className={['h-5 w-5', badge.unlocked ? 'text-[#4E7F59]' : 'text-[#8A8175]'].join(' ')} /><span className="text-[14px] font-extrabold text-[#2B2B2B]">{badge.title}</span></div><p className="mt-1 text-[12px] font-medium text-[#6B6B6B]">{badge.desc}</p></div>)}</div></section>
      <section className="rounded-[24px] border border-[#E8DDCD] bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.05)]"><h3 className="text-[18px] font-extrabold text-[#2B2B2B]">포인트 규칙</h3><div className="mt-3 space-y-2 text-[13px] font-medium text-[#6B6B6B]"><p className="rounded-2xl bg-[#FFFDF8] p-3">오늘 읽기 완료: +10P</p><p className="rounded-2xl bg-[#FFFDF8] p-3">연속 읽기 보너스: +5P</p><p className="rounded-2xl bg-[#FFFDF8] p-3">배지는 완료 일수와 진행률에 따라 자동으로 열립니다.</p></div></section>
    </section>
  );
}

function CustomCourseBuilder(props: { open: boolean; onToggleOpen: () => void; selectedBookIds: string[]; toggleBook: (bookId: string) => void; selectBookGroup: (group: 'gospels' | 'new' | 'old' | 'all') => void; isAllSelected: boolean; isOldSelected: boolean; isNewSelected: boolean; isGospelsSelected: boolean; durationPreset: number; setDurationPreset: (value: number) => void; manualDays: number; setManualDays: React.Dispatch<React.SetStateAction<number>>; courseTitle: string; setCourseTitle: (value: string) => void; createCustomPlan: () => void; hasCustomPlans: boolean }) {
  return (
    <section className="mb-3 rounded-[22px] border border-[#E8DDCD] bg-white p-3 shadow-[0_2px_8px_rgba(0,0,0,0.05)]"><button type="button" onClick={props.onToggleOpen} className="flex min-h-12 w-full items-center justify-between rounded-2xl border border-[#E8DDCD] bg-[#FFFDF8] px-4 py-3 text-left active:scale-[0.99]"><span><span className="block text-[17px] font-extrabold text-[#2B2B2B]">나만의 코스 만들기</span><span className="block text-[12px] font-medium text-[#6B6B6B]">성경과 기간을 직접 선택해요</span></span><span className="flex items-center gap-1 text-[12px] font-bold text-[#4E7F59]"><SlidersHorizontal className="h-4 w-4" />{props.open ? '닫기' : '열기'}</span></button>{props.open && <div className="mt-3 grid gap-3"><div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2"><input value={props.courseTitle} onChange={(event) => props.setCourseTitle(event.target.value)} placeholder="코스 이름을 입력하세요" className="h-11 rounded-2xl border border-[#E8DDCD] bg-[#FFFDF8] px-3 text-[13px] font-bold text-[#2B2B2B] outline-none" /><button type="button" onClick={props.createCustomPlan} disabled={props.selectedBookIds.length === 0} className="rounded-2xl bg-[#4E7F59] px-4 text-[13px] font-bold text-white disabled:opacity-40">만들기</button></div><div><h4 className="mb-2 text-[15px] font-extrabold text-[#2B2B2B]">통독기간</h4><div className="flex flex-wrap gap-2">{DURATION_PRESETS.map((preset) => <button key={preset.label} type="button" onClick={() => props.setDurationPreset(preset.value)} className={filterButton(props.durationPreset === preset.value)}>{preset.label}</button>)}{props.durationPreset === 0 && <div className="flex items-center gap-2 rounded-full border border-[#E8DDCD] bg-white px-2 py-1"><button type="button" onClick={() => props.setManualDays((days) => Math.max(1, days - 1))} className="h-6 w-6 rounded-full bg-[#F3F7EF] text-[13px] font-black text-[#4E7F59]">-</button><span className="min-w-10 text-center text-[12px] font-extrabold text-[#2B2B2B]">{props.manualDays}일</span><button type="button" onClick={() => props.setManualDays((days) => Math.min(365, days + 1))} className="h-6 w-6 rounded-full bg-[#F3F7EF] text-[13px] font-black text-[#4E7F59]">+</button></div>}</div></div><div><h4 className="mb-2 text-[15px] font-extrabold text-[#2B2B2B]">통독구간</h4><div className="mb-2 flex flex-wrap gap-2"><button type="button" onClick={() => props.selectBookGroup('all')} className={groupButton(props.isAllSelected)}>성경 전체</button><button type="button" onClick={() => props.selectBookGroup('old')} className={groupButton(props.isOldSelected)}>구약 전체</button><button type="button" onClick={() => props.selectBookGroup('new')} className={groupButton(props.isNewSelected)}>신약 전체</button><button type="button" onClick={() => props.selectBookGroup('gospels')} className={groupButton(props.isGospelsSelected)}>복음서</button></div><div className="max-h-[320px] space-y-3 overflow-y-auto pr-1">{BOOK_GROUPS.map((group) => <section key={group.title}><div className="mb-1 text-[12px] font-extrabold text-[#8A8175]">{group.title}</div><div className="grid grid-cols-4 gap-1.5">{READING_PLAN_BOOK_OPTIONS.filter((book) => group.ids.includes(book.id)).map((book) => { const selected = props.selectedBookIds.includes(book.id); return <button key={book.id} type="button" onClick={() => props.toggleBook(book.id)} className={['flex min-h-9 items-center justify-between rounded-xl border px-2 text-[11px] font-bold', selected ? 'border-[#4E7F59] bg-[#F3F7EF] text-[#4E7F59]' : 'border-[#E8DDCD] bg-white text-[#6B6B6B]'].join(' ')}><span className="truncate">{book.name}</span>{selected && <Check className="h-3 w-3 shrink-0" />}</button>; })}</div></section>)}</div></div></div>}{!props.hasCustomPlans && !props.open && <div className="mt-3 rounded-2xl border border-dashed border-[#E8DDCD] bg-white px-4 py-3 text-[13px] font-medium leading-6 text-[#6B6B6B]">아직 만든 코스가 없습니다. 나만의 코스 만들기를 열어 원하는 성경과 기간을 골라보세요.</div>}</section>
  );
}

function CourseCard({ course, index, courseFilter, onStart }: { course: { key: string; title: string; description: string; days: string; template: ReadingPlanTemplate }; index: number; courseFilter: CourseFilter; onStart: () => void }) {
  return <article className="relative overflow-hidden rounded-[22px] border border-[#E8DDCD] bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.05)]"><div className="pointer-events-none absolute right-1 top-1 opacity-15"><Leaf className="h-12 w-12 text-[#4E7F59]" strokeWidth={1.8} /></div><div className="relative mb-3 flex items-center justify-between"><span className="rounded-full bg-[#F3F7EF] px-2 py-1 text-[11px] font-bold text-[#4E7F59]">{course.template.editable ? '나만의' : index === 0 && courseFilter === 'all' ? '전체' : '추천'}</span><span className="flex items-center gap-1 text-[12px] font-bold text-[#6B6B6B]"><Flame className="h-3.5 w-3.5 text-[#FF8A3D]" />{course.days}</span></div><h4 className="relative text-[21px] font-extrabold leading-tight text-[#2B2B2B]">{course.title}</h4><p className="relative mt-2 min-h-[54px] text-[13px] leading-[1.45] text-[#6B6B6B]">{course.description}</p><button type="button" aria-label={`${course.title} 시작하기`} onClick={onStart} className="relative mt-3 flex h-9 w-full items-center justify-center gap-1 rounded-2xl border border-[#E8DDCD] bg-[#FFFDF8] text-[12px] font-bold text-[#4E7F59] active:scale-95"><ClipboardList className="h-4 w-4" strokeWidth={2} />시작하기</button></article>;
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return <div className="rounded-[22px] border border-[#E8DDCD] bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.05)]"><div className="text-[12px] font-bold text-[#8A8175]">{label}</div><div className="mt-1 text-[24px] font-black text-[#2B2B2B]">{value}</div></div>;
}

function filterButton(active: boolean) {
  return ['shrink-0 rounded-full border px-3 py-1.5 text-[12px] font-bold', active ? 'border-[#4E7F59] bg-[#F3F7EF] text-[#4E7F59]' : 'border-[#E8DDCD] bg-white text-[#8A8175]'].join(' ');
}

function groupButton(active: boolean) {
  return ['rounded-full border px-3 py-1.5 text-[12px] font-bold', active ? 'border-[#4E7F59] bg-[#F3F7EF] text-[#4E7F59]' : 'border-[#E8DDCD] bg-white text-[#8A8175]'].join(' ');
}

function StatPill({ icon, label }: { icon: ReactNode; label: string }) {
  return <div className="flex min-h-[36px] items-center justify-center gap-1 rounded-full border border-[#E8DDCD] bg-white/85 px-2 text-[12px] font-bold text-[#2B2B2B] shadow-[0_2px_8px_rgba(0,0,0,0.03)]">{icon}<span className="truncate">{label}</span></div>;
}
