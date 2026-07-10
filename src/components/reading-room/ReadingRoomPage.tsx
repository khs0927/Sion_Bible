import {
  BarChart3,
  BookOpen,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Flame,
  Gift,
  Leaf,
  MoreHorizontal,
  PenLine,
  Play,
  Plus,
  SlidersHorizontal,
  Star,
  Trophy,
  X,
} from 'lucide-react';
import { useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import {
  ALL_READING_PLAN_TEMPLATES,
  createCustomReadingPlanTemplate,
  READING_PLAN_BOOK_OPTIONS,
} from '../../data/readingPlans';
import { getProgressPercent, getTodayReadingDay, isDayCompleted } from '../../services/readingPlanStats';
import type { ReadingDayTask, ReadingPlanProgress, ReadingPlanTemplate } from '../../types/readingPlan';
import { formatReadingRoomReference, formatReadingRoomTask, getReadingRoomPlanLabel } from './readingRoomUtils';

type ReadingRoomPageProps = {
  progress: ReadingPlanProgress | null;
  userTemplates?: ReadingPlanTemplate[];
  onToggleToday?: (day: number) => boolean | void;
  onStartPlan?: (templateId: string, template?: ReadingPlanTemplate) => void;
  onStartPlanAndRead?: (template: ReadingPlanTemplate) => void;
  onNavigateToRange?: (task?: ReadingDayTask | null) => void;
};

type CourseFilter = 'all' | ReadingPlanTemplate['tone'];
type ReadingRoomSection = 'today' | 'plan' | 'records' | 'rewards';

const CUSTOM_PLANS_STORAGE_KEY = 'gb_custom_reading_plans';
const REFLECTION_STORAGE_PREFIX = 'sion_reading_reflection_v1_';
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

function currentSection(): ReadingRoomSection {
  if (typeof window === 'undefined') return 'plan';
  const path = window.location.pathname;
  if (path.startsWith('/reading-room/today')) return 'today';
  if (path.startsWith('/reading-room/records')) return 'records';
  if (path.startsWith('/reading-room/rewards')) return 'rewards';
  return 'plan';
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

function saveCustomPlans(templates: ReadingPlanTemplate[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(CUSTOM_PLANS_STORAGE_KEY, JSON.stringify(templates));
}

function getStreak(completedDays: number[]) {
  if (completedDays.length === 0) return 0;
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
  if (!task) return 0;
  return task.references.reduce((sum, reference) => sum + ((reference.endChapter ?? reference.startChapter) - reference.startChapter + 1), 0);
}

function formatDate() {
  const now = new Date();
  return `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;
}

function reflectionKey(templateId: string, day: number) {
  return `${REFLECTION_STORAGE_PREFIX}${templateId}_${day}`;
}

function readReflection(templateId: string, day: number) {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(reflectionKey(templateId, day)) || '';
}

export function ReadingRoomPage({
  progress,
  userTemplates = [],
  onToggleToday,
  onStartPlan,
  onStartPlanAndRead,
  onNavigateToRange,
}: ReadingRoomPageProps) {
  const section = currentSection();
  const [courseFilter, setCourseFilter] = useState<CourseFilter>('all');
  const [visibleCourseCount, setVisibleCourseCount] = useState(6);
  const [customBuilderOpen, setCustomBuilderOpen] = useState(false);
  const [selectedBookIds, setSelectedBookIds] = useState<string[]>(['jhn']);
  const [durationPreset, setDurationPreset] = useState(10);
  const [manualDays, setManualDays] = useState(14);
  const [courseTitle, setCourseTitle] = useState('');
  const [localCustomTemplates, setLocalCustomTemplates] = useState<ReadingPlanTemplate[]>(readCustomPlans);
  const [reflectionOpen, setReflectionOpen] = useState(false);

  const mergedCustomTemplates = useMemo(() => {
    const map = new Map<string, ReadingPlanTemplate>();
    [...userTemplates, ...localCustomTemplates].forEach((template) => map.set(template.id, template));
    return Array.from(map.values());
  }, [userTemplates, localCustomTemplates]);

  const templates = useMemo(
    () => [...ALL_READING_PLAN_TEMPLATES, ...mergedCustomTemplates],
    [mergedCustomTemplates],
  );
  const activeTemplate = templates.find((template) => template.id === progress?.templateId) ?? null;
  const suggestedTemplate = activeTemplate ?? templates[0] ?? null;
  const todayDay = activeTemplate ? getTodayReadingDay(activeTemplate, progress) : 1;
  const todayTask = activeTemplate?.tasks[todayDay - 1] ?? suggestedTemplate?.tasks[0] ?? null;
  const completed = isDayCompleted(progress, todayDay);
  const completedDays = progress?.completedDays ?? [];
  const completedCount = completedDays.length;
  const percent = activeTemplate ? getProgressPercent(activeTemplate, progress) : 0;
  const remainingDays = activeTemplate ? Math.max(0, activeTemplate.days - completedCount) : 0;
  const streak = getStreak(completedDays);
  const points = completedCount * 10 + streak * 5;
  const totalReadChapters = activeTemplate
    ? completedDays.reduce((sum, day) => sum + taskChapterCount(activeTemplate.tasks[day - 1]), 0)
    : 0;
  const selectedDays = durationPreset === 0 ? manualDays : durationPreset;
  const selectedBooks = READING_PLAN_BOOK_OPTIONS.filter((book) => selectedBookIds.includes(book.id));

  const filteredTemplates = useMemo(() => {
    if (courseFilter === 'all') return templates;
    if (courseFilter === 'custom') return mergedCustomTemplates;
    return templates.filter((template) => template.tone === courseFilter);
  }, [courseFilter, templates, mergedCustomTemplates]);
  const visibleTemplates = filteredTemplates.slice(0, visibleCourseCount);

  const startCourse = (template: ReadingPlanTemplate) => {
    if (onStartPlanAndRead) {
      onStartPlanAndRead(template);
      return;
    }
    onStartPlan?.(template.id, template);
  };

  const createCustomPlan = () => {
    if (selectedBookIds.length === 0) return;
    const fallbackTitle = selectedBooks.length === 1
      ? `${selectedBooks[0].name} ${selectedDays}일`
      : `나만의 ${selectedDays}일 코스`;
    const template = createCustomReadingPlanTemplate({
      id: `user-${Date.now()}`,
      title: courseTitle.trim() || fallbackTitle,
      days: selectedDays,
      bookIds: selectedBookIds,
    });
    const next = [template, ...mergedCustomTemplates.filter((item) => item.id !== template.id)];
    setLocalCustomTemplates(next);
    saveCustomPlans(next);
    setCourseFilter('custom');
    setVisibleCourseCount(8);
    setCourseTitle('');
    setCustomBuilderOpen(false);
  };

  const toggleBook = (bookId: string) => {
    setSelectedBookIds((current) => current.includes(bookId)
      ? current.filter((id) => id !== bookId)
      : [...current, bookId]);
  };

  const selectGroup = (group: 'gospels' | 'new' | 'old' | 'all') => {
    const ids = group === 'gospels'
      ? GOSPEL_BOOK_IDS
      : group === 'new'
        ? NEW_TESTAMENT_BOOK_IDS
        : group === 'old'
          ? OLD_TESTAMENT_BOOK_IDS
          : ALL_BOOK_IDS;
    setSelectedBookIds((current) => sameIds(current, ids) ? [] : ids);
  };

  const openTodayReading = () => {
    if (activeTemplate && todayTask) {
      onNavigateToRange?.(todayTask);
      return;
    }
    if (suggestedTemplate) startCourse(suggestedTemplate);
  };

  const toggleTodayComplete = () => {
    if (!activeTemplate || !progress) return;
    onToggleToday?.(todayDay);
  };

  if (section === 'records') {
    return (
      <RecordsPage
        activeTemplate={activeTemplate}
        progress={progress}
        percent={percent}
        completedCount={completedCount}
        remainingDays={remainingDays}
        streak={streak}
        points={points}
        totalReadChapters={totalReadChapters}
      />
    );
  }

  if (section === 'rewards') {
    return (
      <RewardsPage
        completedCount={completedCount}
        streak={streak}
        points={points}
        totalReadChapters={totalReadChapters}
        percent={percent}
        onRead={openTodayReading}
      />
    );
  }

  if (section === 'today') {
    return (
      <div className="space-y-3">
        <ProgressCard
          template={activeTemplate}
          percent={percent}
          completedCount={completedCount}
          remainingDays={remainingDays}
          streak={streak}
          points={points}
        />
        <TodayReadingCard
          activeTemplate={activeTemplate}
          task={todayTask}
          day={todayDay}
          completed={completed}
          onRead={openTodayReading}
          onToggleComplete={toggleTodayComplete}
          onOpenReflection={() => setReflectionOpen(true)}
        />
        {reflectionOpen && activeTemplate && todayTask && (
          <ReflectionPanel
            templateId={activeTemplate.id}
            task={todayTask}
            onClose={() => setReflectionOpen(false)}
          />
        )}
        <WeeklyCard progress={progress} todayDay={todayDay} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ProgressCard
        template={activeTemplate}
        percent={percent}
        completedCount={completedCount}
        remainingDays={remainingDays}
        streak={streak}
        points={points}
      />

      {activeTemplate && todayTask && (
        <button
          type="button"
          onClick={openTodayReading}
          className="flex w-full items-center justify-between rounded-[22px] border border-[#DDEAD9] bg-[#F4FAF1] px-4 py-4 text-left shadow-sm active:scale-[0.99]"
        >
          <span>
            <span className="block text-[12px] font-bold text-[#4E7F59]">오늘의 통독 · {todayDay}일차</span>
            <span className="mt-1 block text-[20px] font-extrabold text-[#2B2B2B]">{formatReadingRoomTask(todayTask)}</span>
          </span>
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#4E7F59] text-white"><Play className="h-5 w-5" fill="currentColor" /></span>
        </button>
      )}

      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-[22px] font-extrabold text-[#2B2B2B]">통독 코스</h2>
            <p className="mt-1 text-[12px] font-medium text-[#6B6B6B]">코스를 선택하면 첫날 본문으로 바로 이동합니다.</p>
          </div>
          <span className="rounded-full border border-[#E8DDCD] bg-white px-3 py-1 text-[12px] font-bold text-[#4E7F59]">{filteredTemplates.length}개</span>
        </div>

        <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
          {COURSE_FILTERS.map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={() => {
                setCourseFilter(filter.key);
                setVisibleCourseCount(6);
                if (filter.key === 'custom' && mergedCustomTemplates.length === 0) setCustomBuilderOpen(true);
              }}
              className={filterButton(courseFilter === filter.key)}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {courseFilter === 'custom' && (
          <CustomCourseBuilder
            open={customBuilderOpen}
            onToggleOpen={() => setCustomBuilderOpen((open) => !open)}
            selectedBookIds={selectedBookIds}
            toggleBook={toggleBook}
            selectGroup={selectGroup}
            durationPreset={durationPreset}
            setDurationPreset={setDurationPreset}
            manualDays={manualDays}
            setManualDays={setManualDays}
            courseTitle={courseTitle}
            setCourseTitle={setCourseTitle}
            createPlan={createCustomPlan}
          />
        )}

        {visibleTemplates.length === 0 ? (
          <div className="rounded-[22px] border border-dashed border-[#E8DDCD] bg-white px-5 py-8 text-center text-[13px] font-medium text-[#6B6B6B]">
            아직 만든 코스가 없습니다. 나만의 코스를 만들어보세요.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {visibleTemplates.map((template) => (
              <CourseCard
                key={template.id}
                template={template}
                active={template.id === activeTemplate?.id}
                onStart={() => startCourse(template)}
              />
            ))}
          </div>
        )}

        {visibleCourseCount < filteredTemplates.length && (
          <button
            type="button"
            onClick={() => setVisibleCourseCount((count) => Math.min(count + COURSE_PAGE_SIZE, filteredTemplates.length))}
            className="mx-auto mt-4 flex h-10 items-center justify-center gap-1 rounded-full border border-[#E8DDCD] bg-white px-4 text-[12px] font-bold text-[#8A8175] active:scale-95"
          >
            <MoreHorizontal className="h-4 w-4" />더보기 {filteredTemplates.length - visibleCourseCount}개
          </button>
        )}
      </section>
    </div>
  );
}

function ProgressCard({
  template,
  percent,
  completedCount,
  remainingDays,
  streak,
  points,
}: {
  template: ReadingPlanTemplate | null;
  percent: number;
  completedCount: number;
  remainingDays: number;
  streak: number;
  points: number;
}) {
  const label = getReadingRoomPlanLabel(template);
  return (
    <section className="relative overflow-hidden rounded-[24px] border border-[#E8DDCD] bg-gradient-to-br from-[#FFF7EE] to-[#F3F7EF] p-4 shadow-sm">
      <Leaf className="pointer-events-none absolute -right-3 -top-3 h-24 w-24 text-[#4E7F59] opacity-10" />
      <div className="relative flex items-center gap-3">
        <div className="grid h-[72px] w-[72px] shrink-0 place-items-center rounded-full bg-[#EEE8DB]" style={{ background: `conic-gradient(#4E7F59 ${Math.max(percent, 1) * 3.6}deg, #EEE8DB 0deg)` }}>
          <span className="grid h-[58px] w-[58px] place-items-center rounded-full bg-white text-[19px] font-black text-[#2B2B2B]">{percent}%</span>
        </div>
        <div className="min-w-0">
          <p className="text-[12px] font-bold text-[#4E7F59]">{template ? '진행 중인 통독' : '시작할 통독을 선택하세요'}</p>
          <h2 className="mt-1 truncate text-[23px] font-extrabold text-[#2B2B2B]">{template ? label.title : '나의 말씀 여정'}</h2>
          <p className="mt-1 text-[13px] font-medium text-[#6B6B6B]">{template ? `${completedCount}일 완료 · ${remainingDays}일 남음` : '추천 코스에서 바로 시작할 수 있습니다.'}</p>
        </div>
      </div>
      <div className="relative mt-3 grid grid-cols-3 gap-2">
        <StatPill icon={<Flame className="h-4 w-4 text-[#FF8A3D]" />} label={`연속 ${streak}일`} />
        <StatPill icon={<Star className="h-4 w-4 text-[#F8BC24]" />} label={`${points}P`} />
        <StatPill icon={<Trophy className="h-4 w-4 text-[#6E8BB7]" />} label={`${completedCount}일`} />
      </div>
    </section>
  );
}

function TodayReadingCard({
  activeTemplate,
  task,
  day,
  completed,
  onRead,
  onToggleComplete,
  onOpenReflection,
}: {
  activeTemplate: ReadingPlanTemplate | null;
  task: ReadingDayTask | null;
  day: number;
  completed: boolean;
  onRead: () => void;
  onToggleComplete: () => void;
  onOpenReflection: () => void;
}) {
  return (
    <section className="rounded-[24px] border border-[#E8DDCD] bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3 border-b border-[#EFE6D8] pb-4">
        <div>
          <p className="text-[12px] font-bold text-[#4E7F59]">{activeTemplate ? `${day}일차 · ${formatDate()}` : '추천 첫날 본문'}</p>
          <h2 className="mt-1 text-[23px] font-extrabold leading-tight text-[#2B2B2B]">{formatReadingRoomTask(task)}</h2>
        </div>
        {completed && <span className="flex items-center gap-1 rounded-full bg-[#EAF5E7] px-3 py-1 text-[11px] font-bold text-[#4E7F59]"><Check className="h-3.5 w-3.5" />완료</span>}
      </div>

      <div className="mt-4 space-y-2">
        {(task?.references ?? []).map((reference) => (
          <button
            key={`${reference.bookId}-${reference.startChapter}-${reference.endChapter ?? reference.startChapter}`}
            type="button"
            onClick={onRead}
            className="flex w-full items-center justify-between rounded-2xl border border-[#E8DDCD] bg-[#FFFDF8] px-4 py-3 text-left active:scale-[0.99]"
          >
            <span className="flex items-center gap-3 text-[15px] font-bold text-[#2B2B2B]"><BookOpen className="h-5 w-5 text-[#4E7F59]" />{formatReadingRoomReference(reference)}</span>
            <span className="text-[12px] font-bold text-[#4E7F59]">읽기</span>
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <button type="button" onClick={onRead} className="flex h-11 items-center justify-center gap-1 rounded-2xl bg-[#F4A651] text-[13px] font-bold text-white active:scale-95"><BookOpen className="h-4 w-4" />읽기</button>
        <button type="button" onClick={onOpenReflection} disabled={!activeTemplate || !task} className="flex h-11 items-center justify-center gap-1 rounded-2xl border border-[#E2D7C7] bg-white text-[13px] font-bold text-[#2B2B2B] active:scale-95 disabled:opacity-40"><PenLine className="h-4 w-4" />묵상</button>
        <button type="button" onClick={onToggleComplete} disabled={!activeTemplate} className="flex h-11 items-center justify-center gap-1 rounded-2xl bg-[#4E7F59] text-[13px] font-bold text-white active:scale-95 disabled:opacity-40"><Check className="h-4 w-4" />{completed ? '취소' : '완료'}</button>
      </div>
    </section>
  );
}

function ReflectionPanel({ templateId, task, onClose }: { templateId: string; task: ReadingDayTask; onClose: () => void }) {
  const [note, setNote] = useState(() => readReflection(templateId, task.day));
  const [saved, setSaved] = useState(false);
  const prompt = task.reflectionPrompt || '오늘 본문에서 하나님에 대해 새롭게 본 것은 무엇이며, 내가 순종할 한 가지는 무엇인가요?';

  const save = () => {
    window.localStorage.setItem(reflectionKey(templateId, task.day), note.trim());
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
  };

  return (
    <section className="rounded-[24px] border border-[#DDEAD9] bg-[#F7FBF5] p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[12px] font-bold text-[#4E7F59]">오늘의 묵상 기록</p>
          <h3 className="mt-1 text-[17px] font-extrabold text-[#2B2B2B]">{prompt}</h3>
        </div>
        <button type="button" onClick={onClose} aria-label="묵상 기록 닫기" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-[#6B6B6B]"><X className="h-4 w-4" /></button>
      </div>
      <textarea
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder="말씀을 읽으며 받은 마음과 오늘의 순종을 기록해보세요."
        className="mt-3 min-h-36 w-full resize-none rounded-2xl border border-[#E8DDCD] bg-white p-4 text-[14px] leading-6 text-[#2B2B2B] outline-none focus:border-[#4E7F59]"
      />
      <button type="button" onClick={save} disabled={!note.trim()} className="mt-3 h-11 w-full rounded-2xl bg-[#4E7F59] text-[13px] font-bold text-white active:scale-[0.99] disabled:opacity-40">{saved ? '저장되었습니다' : '묵상 기록 저장'}</button>
    </section>
  );
}

function WeeklyCard({ progress, todayDay }: { progress: ReadingPlanProgress | null; todayDay: number }) {
  const startDay = Math.max(1, todayDay - 3);
  const days = Array.from({ length: 7 }, (_, index) => startDay + index);
  const done = new Set(progress?.completedDays ?? []);
  const doneCount = days.filter((day) => done.has(day)).length;
  return (
    <section className="rounded-[24px] border border-[#E8DDCD] bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[18px] font-extrabold text-[#2B2B2B]">최근 7일 진행</h3>
          <p className="mt-1 text-[12px] font-medium text-[#6B6B6B]">완료한 날은 초록색으로 표시됩니다.</p>
        </div>
        <span className="text-[15px] font-black text-[#4E7F59]">{doneCount}/7</span>
      </div>
      <div className="mt-4 grid grid-cols-7 gap-2">
        {days.map((day) => {
          const isDone = done.has(day);
          const isToday = day === todayDay;
          return (
            <div key={day} className="text-center">
              <div className={['mx-auto grid h-9 w-9 place-items-center rounded-full border text-[12px] font-bold', isDone ? 'border-[#4E7F59] bg-[#4E7F59] text-white' : isToday ? 'border-[#F4A651] bg-[#FFF7EE] text-[#A35E1F]' : 'border-[#E8DDCD] bg-[#FFFDF8] text-[#8A8175]'].join(' ')}>{isDone ? <Check className="h-4 w-4" /> : day}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function RecordsPage({
  activeTemplate,
  progress,
  percent,
  completedCount,
  remainingDays,
  streak,
  points,
  totalReadChapters,
}: {
  activeTemplate: ReadingPlanTemplate | null;
  progress: ReadingPlanProgress | null;
  percent: number;
  completedCount: number;
  remainingDays: number;
  streak: number;
  points: number;
  totalReadChapters: number;
}) {
  const completedTasks = activeTemplate && progress
    ? [...progress.completedDays].sort((a, b) => b - a).map((day) => activeTemplate.tasks[day - 1]).filter(Boolean)
    : [];

  return (
    <div className="space-y-3">
      <PageTitle icon={<BarChart3 className="h-6 w-6" />} title="읽기 기록" subtitle="실제 완료 기록을 기준으로 계산합니다." />
      <div className="grid grid-cols-2 gap-3">
        <MetricCard label="진행률" value={`${percent}%`} icon={<Trophy className="h-5 w-5 text-[#6E8BB7]" />} />
        <MetricCard label="완료 일수" value={`${completedCount}일`} icon={<Check className="h-5 w-5 text-[#4E7F59]" />} />
        <MetricCard label="읽은 분량" value={`${totalReadChapters}장`} icon={<BookOpen className="h-5 w-5 text-[#F4A651]" />} />
        <MetricCard label="연속 기록" value={`${streak}일`} icon={<Flame className="h-5 w-5 text-[#FF8A3D]" />} />
      </div>
      <section className="rounded-[24px] border border-[#E8DDCD] bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-[18px] font-extrabold text-[#2B2B2B]">통독 요약</h3>
            <p className="mt-1 text-[12px] font-medium text-[#6B6B6B]">{activeTemplate ? `${activeTemplate.title} · ${remainingDays}일 남음` : '진행 중인 코스가 없습니다.'}</p>
          </div>
          <span className="rounded-full bg-[#FFF7D8] px-3 py-1 text-[12px] font-black text-[#A35E1F]">{points}P</span>
        </div>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-[#EEE7DB]"><div className="h-full rounded-full bg-[#4E7F59]" style={{ width: `${percent}%` }} /></div>
      </section>
      <section className="rounded-[24px] border border-[#E8DDCD] bg-white p-4 shadow-sm">
        <h3 className="text-[18px] font-extrabold text-[#2B2B2B]">완료한 본문</h3>
        <div className="mt-3 space-y-2">
          {completedTasks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#E8DDCD] bg-[#FFFDF8] p-5 text-center text-[13px] font-medium text-[#6B6B6B]">아직 완료한 통독 기록이 없습니다.</div>
          ) : completedTasks.map((task) => (
            <div key={task.day} className="flex items-center justify-between rounded-2xl bg-[#FFFDF8] px-4 py-3">
              <div>
                <div className="text-[13px] font-bold text-[#4E7F59]">{task.day}일차</div>
                <div className="mt-1 text-[15px] font-extrabold text-[#2B2B2B]">{formatReadingRoomTask(task)}</div>
              </div>
              <Check className="h-5 w-5 text-[#4E7F59]" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function RewardsPage({
  completedCount,
  streak,
  points,
  totalReadChapters,
  percent,
  onRead,
}: {
  completedCount: number;
  streak: number;
  points: number;
  totalReadChapters: number;
  percent: number;
  onRead: () => void;
}) {
  const badges = [
    { title: '첫 걸음', condition: completedCount >= 1, detail: '첫날 완료', icon: '📖' },
    { title: '꾸준한 독자', condition: streak >= 7, detail: '7일 연속', icon: '🔥' },
    { title: '말씀 탐험가', condition: totalReadChapters >= 30, detail: '30장 읽기', icon: '🧭' },
    { title: '절반의 여정', condition: percent >= 50, detail: '진행률 50%', icon: '⭐' },
    { title: '완독의 기쁨', condition: percent >= 100, detail: '코스 완주', icon: '🏆' },
  ];
  const unlocked = badges.filter((badge) => badge.condition).length;

  return (
    <div className="space-y-3">
      <PageTitle icon={<Gift className="h-6 w-6" />} title="보상과 배지" subtitle="실제 통독 기록에 따라 자동으로 열립니다." />
      <section className="rounded-[24px] border border-[#E8DDCD] bg-gradient-to-br from-[#FFF7D8] to-[#FFFDF8] p-4 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[12px] font-bold text-[#A35E1F]">나의 말씀 포인트</p>
            <h2 className="mt-1 text-[34px] font-black text-[#2B2B2B]">{points.toLocaleString()}P</h2>
            <p className="mt-1 text-[12px] font-medium text-[#6B6B6B]">완료 10P + 연속 기록 보너스</p>
          </div>
          <button type="button" onClick={onRead} className="rounded-2xl bg-[#4E7F59] px-4 py-3 text-[13px] font-bold text-white active:scale-95">오늘 읽기</button>
        </div>
      </section>
      <section className="rounded-[24px] border border-[#E8DDCD] bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between"><h3 className="text-[18px] font-extrabold text-[#2B2B2B]">보유 배지</h3><span className="text-[13px] font-black text-[#4E7F59]">{unlocked}/{badges.length}</span></div>
        <div className="mt-4 grid grid-cols-3 gap-3">
          {badges.map((badge) => (
            <div key={badge.title} className="text-center">
              <div className={['mx-auto grid h-14 w-14 place-items-center rounded-2xl border text-2xl', badge.condition ? 'border-[#E0C071] bg-gradient-to-br from-[#F7D36B] to-[#EBA74D]' : 'border-[#E8DDCD] bg-[#F1F1F1] grayscale'].join(' ')}>{badge.condition ? badge.icon : '🔒'}</div>
              <div className="mt-2 text-[11px] font-extrabold text-[#2B2B2B]">{badge.title}</div>
              <div className="text-[10px] font-medium text-[#8A8175]">{badge.detail}</div>
            </div>
          ))}
        </div>
      </section>
      <section className="rounded-[24px] border border-[#DDEAD9] bg-[#F4FAF1] p-4">
        <h3 className="text-[19px] font-extrabold text-[#4E7F59]">꾸준함이 가장 큰 보상입니다</h3>
        <p className="mt-2 text-[13px] font-medium leading-6 text-[#6B6B6B]">포인트와 배지는 말씀을 가까이한 시간을 기억하기 위한 표시입니다. 숫자보다 오늘 본문을 믿고 살아내는 한 걸음이 더 중요합니다.</p>
      </section>
    </div>
  );
}

function CustomCourseBuilder({
  open,
  onToggleOpen,
  selectedBookIds,
  toggleBook,
  selectGroup,
  durationPreset,
  setDurationPreset,
  manualDays,
  setManualDays,
  courseTitle,
  setCourseTitle,
  createPlan,
}: {
  open: boolean;
  onToggleOpen: () => void;
  selectedBookIds: string[];
  toggleBook: (bookId: string) => void;
  selectGroup: (group: 'gospels' | 'new' | 'old' | 'all') => void;
  durationPreset: number;
  setDurationPreset: (value: number) => void;
  manualDays: number;
  setManualDays: Dispatch<SetStateAction<number>>;
  courseTitle: string;
  setCourseTitle: (value: string) => void;
  createPlan: () => void;
}) {
  const allSelected = sameIds(selectedBookIds, ALL_BOOK_IDS);
  const oldSelected = sameIds(selectedBookIds, OLD_TESTAMENT_BOOK_IDS);
  const newSelected = sameIds(selectedBookIds, NEW_TESTAMENT_BOOK_IDS);
  const gospelsSelected = sameIds(selectedBookIds, GOSPEL_BOOK_IDS);

  return (
    <section className="mb-3 rounded-[22px] border border-[#E8DDCD] bg-white p-3 shadow-sm">
      <button type="button" onClick={onToggleOpen} className="flex min-h-12 w-full items-center justify-between rounded-2xl bg-[#FFFDF8] px-4 py-3 text-left active:scale-[0.99]">
        <span><span className="block text-[17px] font-extrabold text-[#2B2B2B]">나만의 코스 만들기</span><span className="block text-[12px] font-medium text-[#6B6B6B]">성경과 기간을 직접 선택합니다.</span></span>
        <span className="flex items-center gap-1 text-[12px] font-bold text-[#4E7F59]"><SlidersHorizontal className="h-4 w-4" />{open ? '닫기' : '열기'}</span>
      </button>
      {open && (
        <div className="mt-3 space-y-4">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
            <input value={courseTitle} onChange={(event) => setCourseTitle(event.target.value)} placeholder="코스 이름" className="h-11 rounded-2xl border border-[#E8DDCD] bg-[#FFFDF8] px-3 text-[13px] font-bold text-[#2B2B2B] outline-none" />
            <button type="button" onClick={createPlan} disabled={selectedBookIds.length === 0} className="rounded-2xl bg-[#4E7F59] px-4 text-[13px] font-bold text-white disabled:opacity-40"><Plus className="mr-1 inline h-4 w-4" />만들기</button>
          </div>
          <div>
            <h4 className="mb-2 text-[14px] font-extrabold text-[#2B2B2B]">기간</h4>
            <div className="flex flex-wrap gap-2">
              {DURATION_PRESETS.map((preset) => <button key={preset.label} type="button" onClick={() => setDurationPreset(preset.value)} className={filterButton(durationPreset === preset.value)}>{preset.label}</button>)}
              {durationPreset === 0 && (
                <div className="flex items-center gap-2 rounded-full border border-[#E8DDCD] bg-white px-2 py-1">
                  <button type="button" onClick={() => setManualDays((days) => Math.max(1, days - 1))} className="grid h-6 w-6 place-items-center rounded-full bg-[#F3F7EF] text-[#4E7F59]"><ChevronDown className="h-4 w-4" /></button>
                  <span className="min-w-11 text-center text-[12px] font-extrabold text-[#2B2B2B]">{manualDays}일</span>
                  <button type="button" onClick={() => setManualDays((days) => Math.min(365, days + 1))} className="grid h-6 w-6 place-items-center rounded-full bg-[#F3F7EF] text-[#4E7F59]"><ChevronUp className="h-4 w-4" /></button>
                </div>
              )}
            </div>
          </div>
          <div>
            <h4 className="mb-2 text-[14px] font-extrabold text-[#2B2B2B]">통독 구간</h4>
            <div className="mb-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => selectGroup('all')} className={filterButton(allSelected)}>성경 전체</button>
              <button type="button" onClick={() => selectGroup('old')} className={filterButton(oldSelected)}>구약</button>
              <button type="button" onClick={() => selectGroup('new')} className={filterButton(newSelected)}>신약</button>
              <button type="button" onClick={() => selectGroup('gospels')} className={filterButton(gospelsSelected)}>복음서</button>
            </div>
            <div className="max-h-[320px] space-y-3 overflow-y-auto pr-1">
              {BOOK_GROUPS.map((group) => (
                <section key={group.title}>
                  <div className="mb-1 text-[11px] font-extrabold text-[#8A8175]">{group.title}</div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {READING_PLAN_BOOK_OPTIONS.filter((book) => group.ids.includes(book.id)).map((book) => {
                      const selected = selectedBookIds.includes(book.id);
                      return <button key={book.id} type="button" onClick={() => toggleBook(book.id)} className={['min-h-9 rounded-xl border px-2 text-[11px] font-bold', selected ? 'border-[#4E7F59] bg-[#F3F7EF] text-[#4E7F59]' : 'border-[#E8DDCD] bg-white text-[#6B6B6B]'].join(' ')}>{book.name}</button>;
                    })}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function CourseCard({ template, active, onStart }: { template: ReadingPlanTemplate; active: boolean; onStart: () => void }) {
  const label = getReadingRoomPlanLabel(template);
  return (
    <article className={['relative overflow-hidden rounded-[22px] border bg-white p-4 shadow-sm', active ? 'border-[#4E7F59]' : 'border-[#E8DDCD]'].join(' ')}>
      <Leaf className="pointer-events-none absolute right-1 top-1 h-12 w-12 text-[#4E7F59] opacity-10" />
      <div className="relative flex items-center justify-between"><span className="rounded-full bg-[#F3F7EF] px-2 py-1 text-[10px] font-bold text-[#4E7F59]">{active ? '진행 중' : template.editable ? '나만의' : '추천'}</span><span className="text-[11px] font-bold text-[#6B6B6B]">{template.days}일</span></div>
      <h3 className="relative mt-3 text-[19px] font-extrabold leading-tight text-[#2B2B2B]">{label.title}</h3>
      <p className="relative mt-2 min-h-[54px] text-[12px] leading-[1.5] text-[#6B6B6B]">{label.description}</p>
      <button type="button" onClick={onStart} className="relative mt-3 flex h-10 w-full items-center justify-center gap-1 rounded-2xl bg-[#4E7F59] text-[12px] font-bold text-white active:scale-95"><ClipboardList className="h-4 w-4" />{active ? '오늘 본문 읽기' : '시작하기'}</button>
    </article>
  );
}

function PageTitle({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return <div className="flex items-center gap-3 py-1"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-[#4E7F59] shadow-sm">{icon}</div><div><h1 className="text-[23px] font-black text-[#2B2B2B]">{title}</h1><p className="mt-0.5 text-[12px] font-medium text-[#6B6B6B]">{subtitle}</p></div></div>;
}

function MetricCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return <section className="rounded-[22px] border border-[#E8DDCD] bg-white p-4 shadow-sm"><div className="flex items-center justify-between">{icon}<span className="text-[11px] font-bold text-[#8A8175]">{label}</span></div><div className="mt-3 text-[27px] font-black text-[#2B2B2B]">{value}</div></section>;
}

function StatPill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return <div className="flex min-h-9 items-center justify-center gap-1 rounded-full border border-[#E8DDCD] bg-white/90 px-2 text-[11px] font-bold text-[#2B2B2B]">{icon}<span className="truncate">{label}</span></div>;
}

function filterButton(active: boolean) {
  return ['shrink-0 rounded-full border px-3 py-1.5 text-[12px] font-bold', active ? 'border-[#4E7F59] bg-[#F3F7EF] text-[#4E7F59]' : 'border-[#E8DDCD] bg-white text-[#8A8175]'].join(' ');
}
