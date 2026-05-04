import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BookOpenText, FileText, Loader2, PenLine, RefreshCw, Sparkles } from 'lucide-react';
import type { ReadingDayTask } from '../../types/readingPlan';
import {
  buildReadingChaptersText,
  generateReadingMeditation,
  getReadingPassageTitle,
  type ReadingMeditationResult,
} from '../../services/readingMeditationApi';

type ThemeTokens = Record<string, string>;

export function ReadingMeditationPage({
  task,
  T,
  onBack,
  onSaveJournal,
  onNavigateToBible,
}: {
  task: ReadingDayTask;
  T: ThemeTokens;
  onBack: () => void;
  onSaveJournal?: (reference: string, note: string) => void;
  onNavigateToBible?: (bookId: string, chapter: number) => void;
}) {
  const passageTitle = useMemo(() => getReadingPassageTitle(task), [task]);
  const [chaptersText, setChaptersText] = useState('');
  const [result, setResult] = useState<ReadingMeditationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [fromCache, setFromCache] = useState(false);
  const [error, setError] = useState('');

  const loadMeditation = async (force = false) => {
    setLoading(true);
    setError('');
    try {
      const text = chaptersText || (await buildReadingChaptersText(task));
      if (!chaptersText) setChaptersText(text);
      const generated = await generateReadingMeditation({ passageTitle, chaptersText: text, force });
      setResult(generated.result);
      setFromCache(generated.fromCache);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMeditation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passageTitle]);

  const saveJournal = () => {
    if (!result) return;
    const note = [
      `# ${result.title}`,
      '',
      result.overview,
      '',
      result.sermon.body,
      '',
      result.applications.length > 0 ? `오늘의 적용: ${result.applications.join(' / ')}` : '',
      result.prayer ? `기도: ${result.prayer}` : '',
    ].filter(Boolean).join('\n');
    onSaveJournal?.(passageTitle, note);
  };

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <section style={{ borderRadius: 28, background: T.panel, border: `1px solid ${T.line}`, boxShadow: T.shadow, padding: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={onBack} style={iconButton(T)} aria-label="통독으로 돌아가기"><ArrowLeft size={17} /></button>
            <div style={{ minWidth: 0 }}>
              <div style={{ color: T.accent, fontWeight: 900, fontSize: 12 }}>AI 통독 묵상</div>
              <h2 className="title-font" style={{ margin: 0, fontSize: 22, lineHeight: 1.18, fontWeight: 800 }}>{passageTitle}</h2>
            </div>
          </div>
          {onNavigateToBible && task.references[0] && (
            <button 
              onClick={() => onNavigateToBible(task.references[0].bookId, task.references[0].startChapter)}
              style={compactButton(T)}
            >
              <BookOpenText size={16} />
              <span style={{ whiteSpace: 'nowrap' }}>성경 읽기</span>
            </button>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: result ? '1fr 1fr' : '1fr', gap: 8 }}>
          {result && <button onClick={saveJournal} style={buttonStyle(T, true)}><PenLine size={16} /><span>묵상 일기로 저장하기</span></button>}
          <button onClick={() => loadMeditation(true)} disabled={loading} style={buttonStyle(T, false)}>
            {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={16} />}
            <span>다시 생성하기</span>
          </button>
        </div>
        {fromCache && !loading && <div style={{ marginTop: 9, color: T.sub, fontSize: 11 }}>저장된 AI 묵상을 불러왔습니다.</div>}
      </section>

      {loading && (
        <section style={card(T)}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, padding: 26, color: T.sub, fontWeight: 800 }}>
            <Loader2 size={22} style={{ animation: 'spin 1s linear infinite' }} />
            통독 본문을 읽고 묵상을 생성하고 있습니다.
          </div>
        </section>
      )}

      {error && (
        <section style={{ ...card(T), borderColor: 'rgba(201,83,83,0.28)', background: 'rgba(255,246,242,0.95)' }}>
          <div style={{ color: '#c95353', fontWeight: 900, marginBottom: 6 }}>생성 오류</div>
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: '#9f4646', fontFamily: 'inherit', fontSize: 12, lineHeight: 1.65 }}>{error}</pre>
        </section>
      )}

      {result && (
        <>
          <ResultCard T={T} icon={<BookOpenText size={18} />} title="본문 흐름" body={result.overview} />
          <section style={{ display: 'grid', gap: 8 }}>
            <div className="title-font" style={{ fontWeight: 800, fontSize: 20 }}>장별 묵상</div>
            {result.chapters.length === 0 && <div style={mutedBox(T)}>장별 묵상이 비어 있습니다.</div>}
            {result.chapters.map((chapter, index) => (
              <section key={`${chapter.chapterTitle}-${index}`} style={card(T)}>
                <div style={{ color: T.accent, fontWeight: 900, fontSize: 12, marginBottom: 5 }}>{chapter.chapterTitle}</div>
                <h3 className="title-font" style={{ margin: 0, fontSize: 18, lineHeight: 1.2, fontWeight: 800 }}>{chapter.summary}</h3>
                <p style={paragraph(T)}>{chapter.meditation}</p>
                <div style={{ borderRadius: 16, background: T.solid, border: `1px solid ${T.line}`, padding: 12, color: T.text, fontSize: 13, lineHeight: 1.7 }}>
                  <strong style={{ color: T.accent }}>오늘 적용 </strong>{chapter.application}
                </div>
              </section>
            ))}
          </section>
          <ResultCard T={T} icon={<FileText size={18} />} title={result.sermon.title || '설교문 묵상'} body={result.sermon.body} large />
          <section style={card(T)}>
            <div style={label(T)}><Sparkles size={18} />오늘의 적용</div>
            <div style={{ display: 'grid', gap: 8 }}>
              {result.applications.slice(0, 3).map((application, index) => (
                <div key={`${application}-${index}`} style={{ borderRadius: 16, background: T.solid, border: `1px solid ${T.line}`, padding: 12, fontSize: 13, lineHeight: 1.65 }}>
                  <strong style={{ color: T.accent }}>{index + 1}. </strong>{application}
                </div>
              ))}
            </div>
          </section>
          <ResultCard T={T} icon={<PenLine size={18} />} title="기도문" body={result.prayer} />
        </>
      )}
    </div>
  );
}

function ResultCard({ T, icon, title, body, large = false }: { T: ThemeTokens; icon: React.ReactNode; title: string; body: string; large?: boolean }) {
  return (
    <section style={card(T)}>
      <div style={label(T)}>{icon}{title}</div>
      <div className="serif-verse" style={{ ...paragraph(T), fontSize: large ? '1rem' : '0.94rem' }}>{body || '내용이 비어 있습니다.'}</div>
    </section>
  );
}

function card(T: ThemeTokens) {
  return {
    borderRadius: 24,
    background: T.panel,
    border: `1px solid ${T.line}`,
    boxShadow: T.shadow,
    padding: 14,
  };
}

function label(T: ThemeTokens) {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    color: T.accent,
    fontWeight: 900,
    fontSize: 12,
    marginBottom: 9,
  };
}

function paragraph(T: ThemeTokens) {
  return {
    margin: '9px 0 0',
    color: T.text,
    fontSize: 14,
    lineHeight: 1.82,
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'keep-all' as const,
  };
}

function mutedBox(T: ThemeTokens) {
  return {
    borderRadius: 18,
    background: T.solid,
    border: `1px solid ${T.line}`,
    color: T.sub,
    padding: 14,
    fontSize: 13,
  };
}

function iconButton(T: ThemeTokens) {
  return {
    width: 38,
    height: 38,
    borderRadius: 16,
    border: `1px solid ${T.line}`,
    background: T.solid,
    color: T.text,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: T.soft,
  };
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

function compactButton(T: ThemeTokens) {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: 12,
    border: `1px solid ${T.line}`,
    background: T.solid,
    color: T.accent,
    padding: '7px 10px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontWeight: 900,
    fontSize: 11,
    boxShadow: T.soft,
  };
}
