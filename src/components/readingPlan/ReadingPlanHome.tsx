import { useEffect, useMemo, useState } from 'react';
import { PlusCircle } from 'lucide-react';
import { READING_PLAN_TEMPLATES } from '../../data/readingPlans';
import { getTodayReadingDay, isDayCompleted } from '../../services/readingPlanStats';
import type { ReadingPlanProgress, ReadingDayTask } from '../../types/readingPlan';
import { ReadingPlanCard } from './ReadingPlanCard';
import { ReadingMeditationPage } from './ReadingMeditationPage';
import { ReadingProgressCard } from './ReadingProgressCard';
import { TodayReadingCard } from './TodayReadingCard';
import { WeeklyProgressBar } from './WeeklyProgressBar';

type ThemeTokens = Record<string, string>;

export function ReadingPlanHome({ 
  T, 
  progress,
  onToggleDay,
  onSaveJournal, 
  onNavigateToBible,
  onNavigateToRange,
  onTodayTaskLoaded,
  onStartPlan,
}: { 
  T: ThemeTokens; 
  progress: ReadingPlanProgress | null;
  onToggleDay?: (day: number) => void;
  onSaveJournal?: (reference: string, note: string) => void;
  onNavigateToBible?: (bookId: string, chapter: number) => void;
  onNavigateToRange?: () => void;
  onTodayTaskLoaded?: (task: ReadingDayTask | null) => void;
  onStartPlan?: (templateId: string) => void;
}) {
  const [meditationTask, setMeditationTask] = useState<ReadingDayTask | null>(null);

  const activeTemplate = useMemo(
    () => READING_PLAN_TEMPLATES.find((template) => template.id === progress?.templateId) ?? null,
    [progress],
  );
  const todayDay = activeTemplate ? getTodayReadingDay(activeTemplate, progress) : 1;
  const todayTask = activeTemplate?.tasks[todayDay - 1] ?? null;
  const completed = isDayCompleted(progress, todayDay);

  useEffect(() => {
    onTodayTaskLoaded?.(todayTask);
  }, [todayTask, onTodayTaskLoaded]);

  const beginPlan = (templateId: string) => {
    onStartPlan?.(templateId);
  };

  const toggleToday = () => {
    onToggleDay?.(todayDay);
  };

  const meditateToday = () => {
    if (!todayTask) return;
    setMeditationTask(todayTask);
  };

  if (meditationTask) {
    return (
      <ReadingMeditationPage
        task={meditationTask}
        T={T}
        onBack={() => setMeditationTask(null)}
        onSaveJournal={onSaveJournal}
        onNavigateToBible={onNavigateToBible}
      />
    );
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {activeTemplate && progress && (
        <>
          <ReadingProgressCard template={activeTemplate} progress={progress} T={T} />
          {todayTask && (
            <TodayReadingCard
              task={todayTask}
              completed={completed}
              T={T}
              onToggleComplete={toggleToday}
              onMeditate={meditateToday}
              onGoToRead={() => {
                if (onNavigateToRange) {
                  onNavigateToRange();
                } else if (todayTask && onNavigateToBible) {
                  onNavigateToBible(todayTask.references[0].bookId, todayTask.references[0].startChapter);
                }
              }}
            />
          )}
          <WeeklyProgressBar template={activeTemplate} progress={progress} todayDay={todayDay} T={T} />
        </>
      )}

      {!activeTemplate && (
        <section style={{ borderRadius: 28, background: T.panel, border: `1px solid ${T.line}`, boxShadow: T.shadow, padding: 16 }}>
          <div style={{ color: T.accent, fontWeight: 900, fontSize: 12, marginBottom: 7 }}>통독 시작하기</div>
          <h2 className="title-font" style={{ margin: 0, fontSize: 25, lineHeight: 1.12, fontWeight: 800 }}>오늘부터 말씀의 큰 흐름을 따라가요</h2>
          <p style={{ margin: '8px 0 0', color: T.sub, fontSize: 13, lineHeight: 1.65 }}>
            추천 코스를 선택하면 진행률과 오늘 읽을 본문이 이 기기에 저장됩니다.
          </p>
        </section>
      )}

      <section style={{ display: 'grid', gap: 9 }}>
        <div style={{ display: 'flex', alignItems: 'end', justifyContent: 'space-between', gap: 10 }}>
          <div>
            <div className="title-font" style={{ fontWeight: 800, fontSize: 21, lineHeight: 1.15 }}>추천 코스</div>
            <div style={{ color: T.sub, fontSize: 11, marginTop: 3 }}>데이터 기반 기본 통독 루틴</div>
          </div>
          <button
            disabled
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              borderRadius: 16,
              border: `1px solid ${T.line}`,
              background: T.solid,
              color: T.sub,
              minHeight: 38,
              padding: '8px 10px',
              fontFamily: 'inherit',
              fontWeight: 900,
              fontSize: 11,
              opacity: 0.74,
            }}
          >
            <PlusCircle size={15} />
            나만의 코스
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 10 }} className="reading-plan-grid">
          {READING_PLAN_TEMPLATES.map((template) => (
            <ReadingPlanCard
              key={template.id}
              template={template}
              active={template.id === progress?.templateId}
              T={T}
              onStart={() => beginPlan(template.id)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
