import type { CSSProperties } from 'react';
import { CalendarCheck } from 'lucide-react';
import type { ReadingPlanProgress, ReadingPlanTemplate } from '../../types/readingPlan';
import { getProgressPercent } from '../../services/readingPlanStats';

type ThemeTokens = Record<string, string>;

export function ReadingProgressCard({ template, progress, T }: { template: ReadingPlanTemplate; progress: ReadingPlanProgress; T: ThemeTokens }) {
  const percent = getProgressPercent(template, progress);
  const remaining = Math.max(0, template.days - progress.completedDays.length);
  return (
    <section style={card(T, 'linear-gradient(145deg, rgba(255,252,246,0.98), rgba(249,226,216,0.94) 48%, rgba(225,241,238,0.92))')}>
      <div style={{ display: 'grid', gridTemplateColumns: '92px minmax(0,1fr)', gap: 14, alignItems: 'center' }}>
        <div
          aria-label={`통독 진행률 ${percent}%`}
          style={{
            width: 92,
            height: 92,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            background: `conic-gradient(${T.accent} ${percent * 3.6}deg, rgba(255,255,255,0.58) 0deg)`,
            boxShadow: T.soft,
          }}
        >
          <div style={{ width: 68, height: 68, borderRadius: '50%', background: T.solid, display: 'grid', placeItems: 'center', border: `1px solid ${T.line}` }}>
            <strong style={{ fontSize: 19, color: T.text }}>{percent}%</strong>
          </div>
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: T.accent, fontWeight: 900, fontSize: 12, marginBottom: 7 }}>
            <CalendarCheck size={16} />
            진행 중인 통독
          </div>
          <h2 className="title-font" style={{ margin: 0, fontSize: 24, lineHeight: 1.12, fontWeight: 800 }}>{template.title}</h2>
          <p style={{ margin: '6px 0 0', color: T.sub, fontSize: 12, lineHeight: 1.55 }}>
            {progress.completedDays.length}일 완료 · {remaining}일 남음
          </p>
        </div>
      </div>
    </section>
  );
}

function card(T: ThemeTokens, background: string): CSSProperties {
  return {
    borderRadius: 28,
    background,
    border: `1px solid ${T.line}`,
    boxShadow: T.shadow,
    padding: 16,
  };
}
