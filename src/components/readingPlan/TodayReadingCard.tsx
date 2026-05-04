import { BookOpenCheck, CheckCircle2, PenLine, RotateCcw } from 'lucide-react';
import { formatReadingReference } from '../../data/readingPlans';
import type { ReadingDayTask } from '../../types/readingPlan';

type ThemeTokens = Record<string, string>;

export function TodayReadingCard({
  task,
  completed,
  T,
  onToggleComplete,
  onMeditate,
  onGoToRead,
}: {
  task: ReadingDayTask;
  completed: boolean;
  T: ThemeTokens;
  onToggleComplete: () => void;
  onMeditate: () => void;
  onGoToRead: () => void;
}) {
  return (
    <section style={{ borderRadius: 24, background: T.panel, border: `1px solid ${T.line}`, boxShadow: T.shadow, padding: 14 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ color: T.accent, fontWeight: 900, fontSize: 12, marginBottom: 5 }}>{task.day}일차 오늘 읽기</div>
          <h3 className="title-font" style={{ margin: 0, fontSize: 21, lineHeight: 1.18, fontWeight: 800 }}>
            {task.references.map(formatReadingReference).join(', ')}
          </h3>
        </div>
        <span style={{ width: 42, height: 42, borderRadius: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: completed ? `linear-gradient(145deg, ${T.mint}, ${T.lavender})` : T.solid, color: completed ? '#fff' : T.accent, border: `1px solid ${T.line}`, flex: '0 0 auto' }}>
          <BookOpenCheck size={21} />
        </span>
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        {task.references.map((ref) => (
          <div key={`${task.day}-${ref.bookId}-${ref.startChapter}`} style={{ borderRadius: 17, background: T.solid, border: `1px solid ${T.line}`, padding: '11px 12px', color: T.text, fontWeight: 800, fontSize: 13 }}>
            {formatReadingReference(ref)}
          </div>
        ))}
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
        <button onClick={onGoToRead} style={buttonStyle(T, true)}>
          <RotateCcw size={16} className="rotate-180" />
          <span>읽으러 가기</span>
        </button>
        <button onClick={onToggleComplete} style={buttonStyle(T, completed)}>
          {completed ? <RotateCcw size={16} /> : <CheckCircle2 size={16} />}
          <span>{completed ? '완료 취소' : '오늘 읽기 완료'}</span>
        </button>
      </div>

      {completed && (
        <button onClick={onMeditate} style={{ ...buttonStyle(T, false), width: '100%', marginTop: 8 }}>
          <PenLine size={16} />
          <span>이 본문으로 묵상하기</span>
        </button>
      )}
    </section>
  );
}

function buttonStyle(T: ThemeTokens, active: boolean) {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 16,
    border: `1px solid ${active ? 'rgba(255,255,255,0.72)' : T.line}`,
    background: active ? `linear-gradient(145deg, ${T.butter}, ${T.peach})` : T.solid,
    color: T.text,
    minHeight: 42,
    padding: '9px 12px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontWeight: 900,
    fontSize: 12,
    boxShadow: T.soft,
  };
}
