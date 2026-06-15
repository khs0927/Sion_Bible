import {
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
  onSaveCustomPlan?: (template: ReadingPlanTemplate) => void;
};

type CourseFilter = 'all' | ReadingPlanTemplate['tone'];

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

export function ReadingRoomPage({
  progress,
  userTemplates = [],
  onToggleToday,
  onStartPlan,
  onStartPlanAndRead,
  onNavigateToRange,
  onSaveCustomPlan,
}: ReadingRoomPageProps) {
  const [courseFilter, setCourseFilter] = useState<CourseFilter>('all');
  const [visibleCourseCount, setVisibleCourseCount] = useState(4);
  const [isCustomBuilderOpen, setIsCustomBuilderOpen] = useState(false);
  const [selectedBookIds, setSelectedBookIds] = useState<string[]>(['jhn']);
  const [durationPreset, setDurationPreset] = useState(10);
  const [manualDays, setManualDays] = useState(14);
  const [courseTitle, setCourseTitle] = useState('');

  const templates = useMemo(() => [...ALL_READING_PLAN_TEMPLATES, ...userTemplates], [userTemplates]);
  const activeTemplate = templates.find((template) => template.id === progress?.templateId) ?? null;
  const displayTemplate = activeTemplate ?? templates[0] ?? null;
  const todayDay = activeTemplate ? getTodayReadingDay(activeTemplate, progress) : 1;
  const todayTask = activeTemplate?.tasks[todayDay - 1] ?? displayTemplate?.tasks[0] ?? null;
  const completed = isDayCompleted(progress, todayDay);
  const percent = displayTemplate ? getProgressPercent(displayTemplate, progress) : 0;
  const completedCount = progress?.completedDays.length ?? 0;
  const remainingDays = displayTemplate ? Math.max(0, displayTemplate.days - completedCount) : 21;
  const planLabel = getReadingRoomPlanLabel(displayTemplate);
  const todayTitle = formatReadingRoomTask(todayTask);
  const selectedDays = durationPreset === 0 ? manualDays : durationPreset;
  const selectedBooks = READING_PLAN_BOOK_OPTIONS.filter((book) => selectedBookIds.includes(book.id));

  const isAllSelected = selectedBookIds.length === READING_PLAN_BOOK_OPTIONS.length;
  const isOldSelected = sameIds(selectedBookIds, OLD_TESTAMENT_BOOK_IDS);
  const isNewSelected = sameIds(selectedBookIds, NEW_TESTAMENT_BOOK_IDS);
  const isGospelsSelected = sameIds(selectedBookIds, GOSPEL_BOOK_IDS);

  const filteredTemplates = useMemo(
    () => {
      if (courseFilter === 'all') return templates;
      if (courseFilter === 'custom') return userTemplates;
      return templates.filter((template) => template.tone === courseFilter);
    },
    [courseFilter, templates, userTemplates],
  );
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

  const changeCourseFilter = (filter: CourseFilter) => {
    setCourseFilter(filter);
    setVisibleCourseCount(4);
    if (filter === 'custom') setIsCustomBuilderOpen(userTemplates.length === 0);
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
    onToggleToday?.(todayDay);
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

    onSaveCustomPlan?.(template);
    setCourseTitle('');
    setCourseFilter('custom');
    setVisibleCourseCount(8);
    setIsCustomBuilderOpen(false);
    onStartPlan?.(template.id, template);
  };

  return (
    <div className="space-y-3">
      <section className="relative overflow-hidden rounded-[24px] border border-[#E8DDCD] bg-gradient-to-br from-[#FFF7EE] to-[#F3F7EF] p-4 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
        <div className="pointer-events-none absolute -right-3 bottom-0 opacity-35">
          <img src={designDecorations.openBibleLarge} alt="" className="h-24 w-24 object-contain" />
        </div>
        <div className="relative flex items-center gap-3">
          <div className="grid h-[72px] w-[72px] shrink-0 place-items-center rounded-full bg-[#EEE8DB] shadow-inner">
            <div
              aria-label={`통독 진행률 ${percent}%`}
              className="grid h-[62px] w-[62px] place-items-center rounded-full bg-white text-[19px] font-extrabold text-[#2B2B2B]"
              style={{ background: `conic-gradient(#4E7F59 ${Math.max(percent, 1) * 3.6}deg, #EFE7DA 0deg)` }}
            >
              <span className="grid h-[48px] w-[48px] place-items-center rounded-full bg-white">{percent}%</span>
            </div>
          </div>

          <div className="min-w-0">
            <p className="text-[13px] font-bold text-[#4E7F59]">진행 중인 통독</p>
            <h2 className="mt-1 text-[24px] font-extrabold leading-tight text-[#2B2B2B]">{planLabel.title}</h2>
            <p className="mt-1 text-[14px] font-medium text-[#6B6B6B]">
              {completedCount}일 완료 · {remainingDays}일 남음
            </p>
          </div>
        </div>

        <div className="relative mt-3 grid grid-cols-3 gap-2">
          <StatPill icon={<Flame className="h-4 w-4 text-[#FF8A3D]" />} label="연속 3일" />
          <StatPill icon={<Droplet className="h-4 w-4 text-[#F8BC24]" />} label="포인트 358P" />
          <StatPill icon={<Trophy className="h-4 w-4 text-[#F4A651]" />} label="배지 2/12" />
        </div>
      </section>

      <section className="relative overflow-hidden rounded-[24px] border border-[#E8DDCD] bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
        <div className="pointer-events-none absolute right-2 top-2 opacity-20">
          <img src={designDecorations.pottedSprout} alt="" className="h-14 w-14 object-contain" />
        </div>
        <div className="relative flex items-center justify-between gap-3">
          <div>
            <p className="text-[13px] font-bold text-[#4E7F59]">{todayDay}일차 오늘 읽기</p>
            <h2 className="mt-1 text-[23px] font-extrabold leading-tight text-[#2B2B2B]">{todayTitle}</h2>
          </div>
          <button type="button" aria-label="성경 열기" onClick={handleRead} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#E8DDCD] bg-[#FFFDF8] text-[#4E7F59] active:scale-95">
            <BookOpen className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        <div className="mt-3 grid gap-2">
          {(todayTask?.references ?? []).slice(0, 2).map((ref) => (
            <div key={`${ref.bookId}-${ref.startChapter}-${ref.endChapter ?? ref.startChapter}`} className="rounded-2xl border border-[#E8DDCD] bg-[#FFFDF8] px-4 py-3 text-[15px] font-bold text-[#2B2B2B]">
              {formatReadingRoomReference(ref)}
            </div>
          ))}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" onClick={handleRead} className="flex h-11 items-center justify-center gap-1.5 rounded-2xl bg-[#F4A651] text-[15px] font-bold text-white shadow-[0_2px_8px_rgba(0,0,0,0.05)] active:scale-95">
            <BookOpen className="h-[18px] w-[18px]" strokeWidth={2} />
            읽으러 가기
          </button>

          <button type="button" onClick={handleToggleToday} disabled={!activeTemplate || !progress} className="flex h-11 items-center justify-center gap-1.5 rounded-2xl border border-[#E2D7C7] bg-white text-[14px] font-bold text-[#2B2B2B] active:scale-95 disabled:opacity-55">
            <CheckCircle className="h-[18px] w-[18px] text-[#4E7F59]" strokeWidth={2} />
            {completed ? '완료 취소' : '오늘 읽기 완료'}
          </button>
        </div>
      </section>

      <section className="rounded-[24px] border border-[#E8DDCD] bg-white p-3 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-between">
          <h3 className="text-[18px] font-extrabold text-[#2B2B2B]">주간 체크</h3>
          <p className="text-[13px] font-semibold text-[#9A9A9A]">오늘 {todayDay}일차</p>
        </div>

        <div className="mt-3 grid grid-cols-7 gap-2">
          {DEFAULT_WEEK_LABELS.map((label, index) => {
            const day = Math.max(1, todayDay + index);
            const isToday = index === 0;
            const isDone = progress?.completedDays.includes(day) ?? false;

            return (
              <div key={`${label}-${index}`} className="flex flex-col items-center gap-1">
                <div className={['flex h-9 w-9 items-center justify-center rounded-xl border text-[14px] font-bold', isDone ? 'border-[#4E7F59] bg-[#4E7F59] text-white' : isToday ? 'border-[#4E7F59] bg-[#F3F7EF] text-[#4E7F59]' : 'border-[#E8DDCD] bg-[#FFFDF8] text-[#6B6B6B]'].join(' ')}>
                  {isDone ? <CheckCircle className="h-4 w-4" strokeWidth={2.2} /> : index + 1}
                </div>
                <span className="text-[11px] font-medium text-[#6B6B6B]">{label}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-[24px] border border-[#E8DDCD] bg-[#FFF7EE] p-3 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-[#F4A651] shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
              <Gift className="h-5 w-5" strokeWidth={2} />
            </div>
            <div>
              <h3 className="text-[16px] font-extrabold text-[#2B2B2B]">오늘의 보상</h3>
              <p className="mt-0.5 text-[12px] font-medium text-[#6B6B6B]">오늘 읽으면 +10P · 연속 보너스 +5P</p>
            </div>
          </div>
          <button type="button" className="rounded-full bg-[#4E7F59] px-4 py-2 text-[12px] font-bold text-white shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
            보상 받기
          </button>
        </div>
      </section>

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
            <button key={filter.key} type="button" onClick={() => changeCourseFilter(filter.key)} className={['shrink-0 rounded-full border px-3 py-1.5 text-[12px] font-bold', courseFilter === filter.key ? 'border-[#4E7F59] bg-[#F3F7EF] text-[#4E7F59]' : 'border-[#E8DDCD] bg-white text-[#8A8175]'].join(' ')}>
              {filter.label}
            </button>
          ))}
        </div>

        {courseFilter === 'custom' && (
          <section className="mb-3 rounded-[22px] border border-[#E8DDCD] bg-white p-3 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
            <button type="button" onClick={() => setIsCustomBuilderOpen((open) => !open)} className="flex min-h-12 w-full items-center justify-between rounded-2xl border border-[#E8DDCD] bg-[#FFFDF8] px-4 py-3 text-left active:scale-[0.99]">
              <span>
                <span className="block text-[17px] font-extrabold text-[#2B2B2B]">나만의 코스 만들기</span>
                <span className="block text-[12px] font-medium text-[#6B6B6B]">성경과 기간을 직접 선택해요</span>
              </span>
              <span className="flex items-center gap-1 text-[12px] font-bold text-[#4E7F59]"><SlidersHorizontal className="h-4 w-4" />{isCustomBuilderOpen ? '닫기' : '열기'}</span>
            </button>

            {isCustomBuilderOpen && (
              <div className="mt-3 grid gap-3">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                  <input value={courseTitle} onChange={(event) => setCourseTitle(event.target.value)} placeholder="코스 이름을 입력하세요" className="h-11 rounded-2xl border border-[#E8DDCD] bg-[#FFFDF8] px-3 text-[13px] font-bold text-[#2B2B2B] outline-none" />
                  <button type="button" onClick={createCustomPlan} disabled={selectedBookIds.length === 0} className="rounded-2xl bg-[#4E7F59] px-4 text-[13px] font-bold text-white disabled:opacity-40">만들기</button>
                </div>

                <div>
                  <h4 className="mb-2 text-[15px] font-extrabold text-[#2B2B2B]">통독기간</h4>
                  <div className="flex flex-wrap gap-2">
                    {DURATION_PRESETS.map((preset) => (
                      <button key={preset.label} type="button" onClick={() => setDurationPreset(preset.value)} className={['rounded-full border px-3 py-1.5 text-[12px] font-bold', durationPreset === preset.value ? 'border-[#4E7F59] bg-[#F3F7EF] text-[#4E7F59]' : 'border-[#E8DDCD] bg-white text-[#8A8175]'].join(' ')}>
                        {preset.label}
                      </button>
                    ))}
                    {durationPreset === 0 && (
                      <div className="flex items-center gap-2 rounded-full border border-[#E8DDCD] bg-white px-2 py-1">
                        <button type="button" onClick={() => setManualDays((days) => Math.max(1, days - 1))} className="h-6 w-6 rounded-full bg-[#F3F7EF] text-[13px] font-black text-[#4E7F59]">-</button>
                        <span className="min-w-10 text-center text-[12px] font-extrabold text-[#2B2B2B]">{manualDays}일</span>
                        <button type="button" onClick={() => setManualDays((days) => Math.min(365, days + 1))} className="h-6 w-6 rounded-full bg-[#F3F7EF] text-[13px] font-black text-[#4E7F59]">+</button>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="mb-2 text-[15px] font-extrabold text-[#2B2B2B]">통독구간</h4>
                  <div className="mb-2 flex flex-wrap gap-2">
                    <button type="button" onClick={() => selectBookGroup('all')} className={groupButton(isAllSelected)}>성경 전체</button>
                    <button type="button" onClick={() => selectBookGroup('old')} className={groupButton(isOldSelected)}>구약 전체</button>
                    <button type="button" onClick={() => selectBookGroup('new')} className={groupButton(isNewSelected)}>신약 전체</button>
                    <button type="button" onClick={() => selectBookGroup('gospels')} className={groupButton(isGospelsSelected)}>복음서</button>
                  </div>
                  <div className="max-h-[320px] space-y-3 overflow-y-auto pr-1">
                    {BOOK_GROUPS.map((group) => (
                      <section key={group.title}>
                        <div className="mb-1 text-[12px] font-extrabold text-[#8A8175]">{group.title}</div>
                        <div className="grid grid-cols-4 gap-1.5">
                          {READING_PLAN_BOOK_OPTIONS.filter((book) => group.ids.includes(book.id)).map((book) => {
                            const selected = selectedBookIds.includes(book.id);
                            return (
                              <button key={book.id} type="button" onClick={() => toggleBook(book.id)} className={['flex min-h-9 items-center justify-between rounded-xl border px-2 text-[11px] font-bold', selected ? 'border-[#4E7F59] bg-[#F3F7EF] text-[#4E7F59]' : 'border-[#E8DDCD] bg-white text-[#6B6B6B]'].join(' ')}>
                                <span className="truncate">{book.name}</span>
                                {selected && <Check className="h-3 w-3 shrink-0" />}
                              </button>
                            );
                          })}
                        </div>
                      </section>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {courseFilter === 'custom' && userTemplates.length === 0 && !isCustomBuilderOpen && (
          <div className="mb-3 rounded-2xl border border-dashed border-[#E8DDCD] bg-white px-4 py-3 text-[13px] font-medium leading-6 text-[#6B6B6B]">
            아직 만든 코스가 없습니다. 나만의 코스 만들기를 열어 원하는 성경과 기간을 골라보세요.
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {courseCards.map((course, index) => (
            <article key={course.key} className="relative overflow-hidden rounded-[22px] border border-[#E8DDCD] bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
              <div className="pointer-events-none absolute right-1 top-1 opacity-15"><Leaf className="h-12 w-12 text-[#4E7F59]" strokeWidth={1.8} /></div>
              <div className="relative mb-3 flex items-center justify-between">
                <span className="rounded-full bg-[#F3F7EF] px-2 py-1 text-[11px] font-bold text-[#4E7F59]">{course.template.editable ? '나만의' : index === 0 && courseFilter === 'all' ? '전체' : '추천'}</span>
                <span className="flex items-center gap-1 text-[12px] font-bold text-[#6B6B6B]"><Flame className="h-3.5 w-3.5 text-[#FF8A3D]" />{course.days}</span>
              </div>
              <h4 className="relative text-[21px] font-extrabold leading-tight text-[#2B2B2B]">{course.title}</h4>
              <p className="relative mt-2 min-h-[54px] text-[13px] leading-[1.45] text-[#6B6B6B]">{course.description}</p>
              <button type="button" aria-label={`${course.title} 시작하기`} onClick={() => onStartPlan?.(course.template.id, course.template)} className="relative mt-3 flex h-9 w-full items-center justify-center gap-1 rounded-2xl border border-[#E8DDCD] bg-[#FFFDF8] text-[12px] font-bold text-[#4E7F59] active:scale-95">
                <ClipboardList className="h-4 w-4" strokeWidth={2} />
                시작하기
              </button>
            </article>
          ))}
        </div>
      </section>

      {hasMoreCourses && (
        <button type="button" aria-label="통독방 더보기" onClick={showMoreCourses} className="mx-auto flex h-10 items-center justify-center gap-1 rounded-full border border-[#E8DDCD] bg-white px-4 text-[12px] font-bold text-[#8A8175] active:scale-95">
          <MoreHorizontal className="h-4 w-4" strokeWidth={2} />
          더보기 {filteredTemplates.length - visibleCourseCount}개
        </button>
      )}
    </div>
  );
}

function groupButton(active: boolean) {
  return ['rounded-full border px-3 py-1.5 text-[12px] font-bold', active ? 'border-[#4E7F59] bg-[#F3F7EF] text-[#4E7F59]' : 'border-[#E8DDCD] bg-white text-[#8A8175]'].join(' ');
}

function StatPill({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="flex min-h-[36px] items-center justify-center gap-1 rounded-full border border-[#E8DDCD] bg-white/85 px-2 text-[12px] font-bold text-[#2B2B2B] shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
      {icon}
      <span className="truncate">{label}</span>
    </div>
  );
}
