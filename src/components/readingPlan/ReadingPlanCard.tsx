import { Clock3, Play } from 'lucide-react';
import type { ReadingPlanTemplate } from '../../types/readingPlan';

type ThemeTokens = Record<string, string>;

const TONE_LABEL: Record<ReadingPlanTemplate['tone'], string> = {
  full: '전체',
  fast: '집중',
  'new-testament': '신약',
  gospels: '복음서',
  wisdom: '지혜서',
  pentateuch: '오경',
};

export function ReadingPlanCard({ template, active, T, onStart }: { template: ReadingPlanTemplate; active: boolean; T: ThemeTokens; onStart: () => void }) {
  return (
    <article style={{ borderRadius: 22, background: T.panel, border: `1px solid ${active ? T.accent : T.line}`, boxShadow: T.soft, padding: 13 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7 }}>
            <span style={{ borderRadius: 999, background: T.pill, color: T.accent, border: `1px solid ${T.line}`, padding: '4px 8px', fontSize: 10, fontWeight: 900 }}>{TONE_LABEL[template.tone]}</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: T.sub, fontSize: 11, fontWeight: 800 }}><Clock3 size={12} />{template.days}일</span>
          </div>
          <h3 className="title-font" style={{ margin: 0, fontSize: 19, lineHeight: 1.18, fontWeight: 800 }}>{template.title}</h3>
          <p style={{ margin: '5px 0 0', color: T.sub, fontSize: 12, lineHeight: 1.55 }}>{template.description}</p>
        </div>
        <button onClick={onStart} style={{ width: 42, height: 42, borderRadius: 16, border: `1px solid ${T.line}`, background: active ? `linear-gradient(145deg, ${T.butter}, ${T.peach})` : T.solid, color: T.text, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: T.soft, flex: '0 0 auto' }} aria-label={`${template.title} 시작`}>
          <Play size={17} fill="currentColor" />
        </button>
      </div>
    </article>
  );
}
