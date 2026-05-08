import {
  BookOpen,
  CheckCircle,
  ClipboardList,
  Droplet,
  Flame,
  Gift,
  Leaf,
  MoreHorizontal,
  Trophy,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { ALL_READING_PLAN_TEMPLATES } from '../../data/readingPlans';
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

const DEFAULT_WEEK_LABELS = ['오늘', '2일', '3일', '4일', '5일', '6일', '7일'];
const RECOMMENDED_FALLBACK = [
  {
    title: '성경 365',
    desc: '구약과 신약 전체를 매일 부담 없는 분량으로 읽습니다.',
    day: '365일',
  },
  {
    title: '성경 180',
    desc: '하루 분량을 조금 늘려 성경 전체 흐름을 빠르게 잡습니다.',
    day: '180일',
  },
  {
    title: '신약 100일',
    desc: '신약 전체의 큰 흐름을 차분히 따라갑니다.',
    day: '100일',
  },
  {
    title: '사복음서 30일',
    desc: '예수님의 말씀과 사역을 한 달 동안 가까이 읽습니다.',
    day: '30일',
  },
];

export function ReadingRoomPage({
  progress,
  userTemplates = [],
  onToggleToday,
  onStartPlan,
  onStartPlanAndRead,
  onNavigateToRange,
}: ReadingRoomPageProps) {
  const templates = [...ALL_READING_PLAN_TEMPLATES, ...userTemplates];
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
  const recommendedTemplates = templates.slice(0, 4);
  const courseCards = recommendedTemplates.length
    ? recommendedTemplates.map((template) => {
        const label = getReadingRoomPlanLabel(template);
        return {
          key: template.id,
          title: label.title,
          description: label.description,
          days: `${template.days}일`,
          template,
        };
      })
    : RECOMMENDED_FALLBACK.map((course) => ({
        key: course.title,
        title: course.title,
        description: course.desc,
        days: course.day,
        template: null,
      }));

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

  return (
    <div className="space-y-3">
      <section className="relative overflow-hidden rounded-[24px] border border-[#E8DDCD] bg-gradient-to-br from-[#FFF7EE] to-[#F3F7EF] p-4 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
        <div className="pointer-events-none absolute -right-3 bottom-0 opacity-35">
          <img src={designDecorations.openBibleLarge} alt="" className="h-24 w-24 object-contain" />
        </div>
        <div className="relative flex items-center gap-3">
          <div className="grid h-[72px] w-[72px] shrink-0 place-items-center rounded-full bg-[#EEE8DB] shadow-inner">
            <div
              className="grid h-[62px] w-[62px] place-items-center rounded-full bg-white text-[19px] font-extrabold text-[#2B2B2B]"
              style={{
                background: `conic-gradient(#4E7F59 ${Math.max(percent, 1)}%, #EFE7DA 0)`,
              }}
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
          <button
            type="button"
            aria-label="성경 열기"
            onClick={handleRead}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#E8DDCD] bg-[#FFFDF8] text-[#4E7F59] active:scale-95"
          >
            <BookOpen className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        <div className="mt-3 grid gap-2">
          {(todayTask?.references ?? []).slice(0, 2).map((ref) => (
            <div
              key={`${ref.bookId}-${ref.startChapter}-${ref.endChapter ?? ref.startChapter}`}
              className="rounded-2xl border border-[#E8DDCD] bg-[#FFFDF8] px-4 py-3 text-[15px] font-bold text-[#2B2B2B]"
            >
              {formatReadingRoomReference(ref)}
            </div>
          ))}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleRead}
            className="flex h-11 items-center justify-center gap-1.5 rounded-2xl bg-[#F4A651] text-[15px] font-bold text-white shadow-[0_2px_8px_rgba(0,0,0,0.05)] active:scale-95"
          >
            <BookOpen className="h-[18px] w-[18px]" strokeWidth={2} />
            읽으러 가기
          </button>

          <button
            type="button"
            onClick={handleToggleToday}
            disabled={!activeTemplate || !progress}
            className="flex h-11 items-center justify-center gap-1.5 rounded-2xl border border-[#E2D7C7] bg-white text-[14px] font-bold text-[#2B2B2B] active:scale-95 disabled:opacity-55"
          >
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
            const day = Math.max(1, todayDay - 0 + index);
            const isToday = index === 0;
            const isDone = progress?.completedDays.includes(day) ?? false;

            return (
              <div key={`${label}-${index}`} className="flex flex-col items-center gap-1">
                <div
                  className={[
                    'flex h-9 w-9 items-center justify-center rounded-xl border text-[14px] font-bold',
                    isDone
                      ? 'border-[#4E7F59] bg-[#4E7F59] text-white'
                      : isToday
                        ? 'border-[#4E7F59] bg-[#F3F7EF] text-[#4E7F59]'
                        : 'border-[#E8DDCD] bg-[#FFFDF8] text-[#6B6B6B]',
                  ].join(' ')}
                >
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
          <button className="rounded-full bg-[#4E7F59] px-4 py-2 text-[12px] font-bold text-white shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
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
            추천
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {courseCards.map((course, index) => {
            return (
              <article
                key={course.key}
                className="relative overflow-hidden rounded-[22px] border border-[#E8DDCD] bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.05)]"
              >
                <div className="pointer-events-none absolute right-1 top-1 opacity-15">
                  <Leaf className="h-12 w-12 text-[#4E7F59]" strokeWidth={1.8} />
                </div>
                <div className="relative mb-3 flex items-center justify-between">
                  <span className="rounded-full bg-[#F3F7EF] px-2 py-1 text-[11px] font-bold text-[#4E7F59]">
                    {index === 0 ? '전체' : '추천'}
                  </span>
                  <span className="flex items-center gap-1 text-[12px] font-bold text-[#6B6B6B]">
                    <Flame className="h-3.5 w-3.5 text-[#FF8A3D]" />
                    {course.days}
                  </span>
                </div>
                <h4 className="relative text-[21px] font-extrabold leading-tight text-[#2B2B2B]">{course.title}</h4>
                <p className="relative mt-2 min-h-[54px] text-[13px] leading-[1.45] text-[#6B6B6B]">{course.description}</p>
                <button
                  type="button"
                  aria-label={`${course.title} 시작하기`}
                  onClick={() => course.template && onStartPlan?.(course.template.id, course.template)}
                  className="relative mt-3 flex h-9 w-full items-center justify-center gap-1 rounded-2xl border border-[#E8DDCD] bg-[#FFFDF8] text-[12px] font-bold text-[#4E7F59] active:scale-95"
                >
                  <ClipboardList className="h-4 w-4" strokeWidth={2} />
                  시작하기
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <button
        type="button"
        aria-label="통독방 더보기"
        className="mx-auto flex h-10 items-center justify-center gap-1 rounded-full border border-[#E8DDCD] bg-white px-4 text-[12px] font-bold text-[#8A8175]"
      >
        <MoreHorizontal className="h-4 w-4" strokeWidth={2} />
        더보기
      </button>
    </div>
  );
}

function StatPill({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="flex min-h-[36px] items-center justify-center gap-1 rounded-full border border-[#E8DDCD] bg-white/85 px-2 text-[12px] font-bold text-[#2B2B2B] shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
      {icon}
      <span className="truncate">{label}</span>
    </div>
  );
}
