import { Check } from 'lucide-react';
import type { ReadingPlanProgress, ReadingPlanTemplate } from '../../types/readingPlan';
import { isDayCompleted } from '../../services/readingPlanStats';

type ThemeTokens = Record<string, string>;

export function WeeklyProgressBar({ template, progress, todayDay, T }: { template: ReadingPlanTemplate; progress: ReadingPlanProgress | null; todayDay: number; T: ThemeTokens }) {
  const start = Math.min(Math.max(1, todayDay - 3), Math.max(1, template.days - 6));
  const days = Array.from({ length: Math.min(7, template.days) }, (_, index) => start + index);

  return (
    <section style={{ borderRadius: 22, background: T.panel, border: `1px solid ${T.line}`, boxShadow: T.soft, padding: 13 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
        <div className="title-font" style={{ fontWeight: 800, fontSize: 17 }}>주간 체크</div>
        <div style={{ color: T.sub, fontSize: 11 }}>오늘 {todayDay}일차</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${days.length}, minmax(0,1fr))`, gap: 6 }}>
        {days.map((day) => {
          const complete = isDayCompleted(progress, day);
          const current = day === todayDay;
          return (
            <div key={day} style={{ display: 'grid', gap: 5, justifyItems: 'center' }}>
              <div style={{ width: 34, height: 34, borderRadius: 13, display: 'grid', placeItems: 'center', border: `1px solid ${current ? T.accent : T.line}`, background: complete ? `linear-gradient(145deg, ${T.mint}, ${T.lavender})` : T.solid, color: complete ? '#fff' : current ? T.accent : T.sub, boxShadow: current ? T.soft : undefined }}>
                {complete ? <Check size={16} /> : <span style={{ fontWeight: 900, fontSize: 11 }}>{day}</span>}
              </div>
              <span style={{ color: current ? T.accent : T.sub, fontSize: 10, fontWeight: current ? 900 : 700 }}>{current ? '오늘' : `${day}일`}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
