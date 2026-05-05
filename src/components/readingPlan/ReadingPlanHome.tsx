import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { CalendarClock, Check, PlusCircle, SlidersHorizontal, X } from 'lucide-react';
import { createCustomReadingPlanTemplate, READING_PLAN_BOOK_OPTIONS, READING_PLAN_TEMPLATES } from '../../data/readingPlans';
import { getTodayReadingDay, isDayCompleted } from '../../services/readingPlanStats';
import type { ReadingPlanProgress, ReadingDayTask, ReadingPlanTemplate } from '../../types/readingPlan';
import { ReadingPlanCard } from './ReadingPlanCard';
import { ReadingMeditationPage } from './ReadingMeditationPage';
import { ReadingProgressCard } from './ReadingProgressCard';
import { TodayReadingCard } from './TodayReadingCard';
import { WeeklyProgressBar } from './WeeklyProgressBar';

type ThemeTokens = Record<string, string>;

const DURATION_PRESETS = [
  { label: '5일', value: 5 },
  { label: '10일', value: 10 },
  { label: '한주', value: 7 },
  { label: '한달', value: 30 },
  { label: '세달', value: 90 },
  { label: '직접', value: 0 },
];

export function ReadingPlanHome({ 
  T, 
  progress,
  userTemplates = [],
  onToggleDay,
  onSaveJournal, 
  onNavigateToBible,
  onNavigateToRange,
  onTodayTaskLoaded,
  onStartPlan,
  onStartPlanAndRead,
  onSaveCustomPlan,
  onUpdateCustomPlan,
}: { 
  T: ThemeTokens; 
  progress: ReadingPlanProgress | null;
  userTemplates?: ReadingPlanTemplate[];
  onToggleDay?: (day: number) => void;
  onSaveJournal?: (reference: string, note: string) => void;
  onNavigateToBible?: (bookId: string, chapter: number) => void;
  onNavigateToRange?: () => void;
  onTodayTaskLoaded?: (task: ReadingDayTask | null) => void;
  onStartPlan?: (templateId: string, template?: ReadingPlanTemplate) => void;
  onStartPlanAndRead?: (template: ReadingPlanTemplate) => void;
  onSaveCustomPlan?: (template: ReadingPlanTemplate) => void;
  onUpdateCustomPlan?: (template: ReadingPlanTemplate) => void;
}) {
  const [meditationTask, setMeditationTask] = useState<ReadingDayTask | null>(null);
  const [courseTab, setCourseTab] = useState<'recommended' | 'custom'>('recommended');
  const [selectedBookIds, setSelectedBookIds] = useState<string[]>(['jhn']);
  const [durationPreset, setDurationPreset] = useState(10);
  const [manualDays, setManualDays] = useState(14);
  const [courseTitle, setCourseTitle] = useState('');
  const [pendingTemplate, setPendingTemplate] = useState<ReadingPlanTemplate | null>(null);
  const [editDays, setEditDays] = useState<Record<string, number>>({});

  const allTemplates = useMemo(() => [...READING_PLAN_TEMPLATES, ...userTemplates], [userTemplates]);
  const activeTemplate = useMemo(
    () => allTemplates.find((template) => template.id === progress?.templateId) ?? null,
    [allTemplates, progress],
  );
  const todayDay = activeTemplate ? getTodayReadingDay(activeTemplate, progress) : 1;
  const todayTask = activeTemplate?.tasks[todayDay - 1] ?? null;
  const completed = isDayCompleted(progress, todayDay);
  const selectedDays = durationPreset === 0 ? manualDays : durationPreset;
  const selectedBooks = READING_PLAN_BOOK_OPTIONS.filter((book) => selectedBookIds.includes(book.id));

  useEffect(() => {
    onTodayTaskLoaded?.(todayTask);
  }, [todayTask, onTodayTaskLoaded]);

  const beginPlan = (template: ReadingPlanTemplate) => {
    setPendingTemplate(template);
  };

  const startLater = () => {
    if (!pendingTemplate) return;
    onStartPlan?.(pendingTemplate.id, pendingTemplate);
    setPendingTemplate(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const startAndRead = () => {
    if (!pendingTemplate) return;
    onStartPlanAndRead?.(pendingTemplate);
    setPendingTemplate(null);
  };

  const toggleToday = () => {
    onToggleDay?.(todayDay);
  };

  const meditateToday = () => {
    if (!todayTask) return;
    setMeditationTask(todayTask);
  };

  const toggleBook = (bookId: string) => {
    setSelectedBookIds((current) => {
      if (current.includes(bookId)) return current.length === 1 ? current : current.filter((id) => id !== bookId);
      return [...current, bookId];
    });
  };

  const selectBookGroup = (group: 'gospels' | 'new' | 'old' | 'all') => {
    if (group === 'gospels') setSelectedBookIds(['mat', 'mrk', 'luk', 'jhn']);
    if (group === 'new') setSelectedBookIds(READING_PLAN_BOOK_OPTIONS.slice(39).map((book) => book.id));
    if (group === 'old') setSelectedBookIds(READING_PLAN_BOOK_OPTIONS.slice(0, 39).map((book) => book.id));
    if (group === 'all') setSelectedBookIds(READING_PLAN_BOOK_OPTIONS.map((book) => book.id));
  };

  const createPlan = () => {
    const fallbackTitle = selectedBooks.length === 1 ? `${selectedBooks[0].name} ${selectedDays}일` : `나만의 ${selectedDays}일 코스`;
    const template = createCustomReadingPlanTemplate({
      id: `user-${Date.now()}`,
      title: courseTitle.trim() || fallbackTitle,
      days: selectedDays,
      bookIds: selectedBookIds,
    });
    onSaveCustomPlan?.(template);
    setPendingTemplate(template);
    setCourseTitle('');
  };

  const updateCustomDays = (template: ReadingPlanTemplate) => {
    const days = editDays[template.id] || template.days;
    const next = createCustomReadingPlanTemplate({
      id: template.id,
      title: template.title,
      days,
      bookIds: template.bookIds ?? ['jhn'],
    });
    onUpdateCustomPlan?.(next);
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
            추천 코스를 고르거나, 원하는 성경과 기간을 직접 골라 나만의 코스를 만들 수 있습니다.
          </p>
        </section>
      )}

      <section style={{ display: 'grid', gap: 9 }}>
        <div style={{ display: 'flex', alignItems: 'end', justifyContent: 'space-between', gap: 10 }}>
          <div>
            <div className="title-font" style={{ fontWeight: 800, fontSize: 21, lineHeight: 1.15 }}>{courseTab === 'recommended' ? '추천 코스' : '나만의 코스'}</div>
            <div style={{ color: T.sub, fontSize: 11, marginTop: 3 }}>{courseTab === 'recommended' ? '바로 시작하기 좋은 통독 루틴' : '성경과 기간을 직접 선택해요'}</div>
          </div>
          <div style={{ display: 'inline-flex', gap: 6, padding: 4, borderRadius: 16, border: `1px solid ${T.line}`, background: T.solid }}>
            {([
              ['recommended', '추천'] as const,
              ['custom', '나만의 코스'] as const,
            ]).map(([key, label]) => (
              <button key={key} onClick={() => setCourseTab(key)} style={tabButton(T, courseTab === key)}>
                {key === 'custom' && <SlidersHorizontal size={14} />}
                {label}
              </button>
            ))}
          </div>
        </div>

        {courseTab === 'recommended' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 10 }} className="reading-plan-grid">
            {READING_PLAN_TEMPLATES.map((template) => (
              <ReadingPlanCard
                key={template.id}
                template={template}
                active={template.id === progress?.templateId}
                T={T}
                onStart={() => beginPlan(template)}
              />
            ))}
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            <section style={{ borderRadius: 22, background: T.panel, border: `1px solid ${T.line}`, boxShadow: T.soft, padding: 13, display: 'grid', gap: 10 }}>
              <input
                value={courseTitle}
                onChange={(event) => setCourseTitle(event.target.value)}
                placeholder="코스 이름을 입력하세요"
                style={{ width: '100%', borderRadius: 14, border: `1px solid ${T.line}`, background: T.solid, color: T.text, padding: '11px 12px', fontFamily: 'inherit', fontWeight: 800, outline: 'none' }}
              />
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {DURATION_PRESETS.map((preset) => (
                  <button key={preset.label} onClick={() => setDurationPreset(preset.value)} style={chip(T, durationPreset === preset.value)}>
                    {preset.label}
                  </button>
                ))}
                {durationPreset === 0 && (
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={manualDays}
                    onChange={(event) => setManualDays(Number(event.target.value))}
                    style={{ width: 82, borderRadius: 999, border: `1px solid ${T.line}`, background: T.solid, color: T.text, padding: '7px 10px', fontFamily: 'inherit', fontWeight: 900 }}
                  />
                )}
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button onClick={() => selectBookGroup('gospels')} style={chip(T, false)}>사복음서</button>
                <button onClick={() => selectBookGroup('new')} style={chip(T, false)}>신약 전체</button>
                <button onClick={() => selectBookGroup('old')} style={chip(T, false)}>구약 전체</button>
                <button onClick={() => selectBookGroup('all')} style={chip(T, false)}>성경 전체</button>
              </div>
              <div style={{ maxHeight: 260, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 6, paddingRight: 2 }} className="book-grid">
                {READING_PLAN_BOOK_OPTIONS.map((book) => {
                  const selected = selectedBookIds.includes(book.id);
                  return (
                    <button key={book.id} onClick={() => toggleBook(book.id)} style={{ ...chip(T, selected), borderRadius: 12, justifyContent: 'space-between', padding: '8px 9px' }}>
                      <span>{book.name}</span>
                      {selected && <Check size={13} />}
                    </button>
                  );
                })}
              </div>
              <button onClick={createPlan} style={primaryButton(T)}>
                <PlusCircle size={17} />
                <span>나만의 코스 만들기</span>
              </button>
            </section>

            {userTemplates.length > 0 && (
              <section style={{ display: 'grid', gap: 9 }}>
                <div style={{ fontWeight: 900, fontSize: 13, color: T.sub }}>내가 만든 코스</div>
                {userTemplates.map((template) => (
                  <article key={template.id} style={{ borderRadius: 20, background: T.panel, border: `1px solid ${template.id === progress?.templateId ? T.accent : T.line}`, padding: 12, boxShadow: T.soft, display: 'grid', gap: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                      <div>
                        <div className="title-font" style={{ fontSize: 18, fontWeight: 800 }}>{template.title}</div>
                        <div style={{ color: T.sub, fontSize: 12, fontWeight: 800, marginTop: 3 }}>{template.description}</div>
                      </div>
                      <button onClick={() => beginPlan(template)} style={{ ...primaryIconButton(T), flex: '0 0 auto' }} aria-label={`${template.title} 시작`}><PlusCircle size={17} /></button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 8 }}>
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 7, borderRadius: 14, border: `1px solid ${T.line}`, background: T.solid, padding: '8px 10px', color: T.sub, fontWeight: 900, fontSize: 12 }}>
                        <CalendarClock size={15} />
                        <input
                          type="number"
                          min={1}
                          max={365}
                          value={editDays[template.id] ?? template.days}
                          onChange={(event) => setEditDays((current) => ({ ...current, [template.id]: Number(event.target.value) }))}
                          style={{ width: 58, border: 'none', background: 'transparent', color: T.text, fontFamily: 'inherit', fontWeight: 900, outline: 'none' }}
                        />
                        일
                      </label>
                      <button onClick={() => updateCustomDays(template)} style={secondaryButton(T)}>기간 수정</button>
                    </div>
                  </article>
                ))}
              </section>
            )}
          </div>
        )}
      </section>

      {pendingTemplate && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 140, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={() => setPendingTemplate(null)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.38)', backdropFilter: 'blur(4px)' }} />
          <section style={{ position: 'relative', width: '100%', maxWidth: 480, borderTopLeftRadius: 26, borderTopRightRadius: 26, background: T.panel, border: `1px solid ${T.line}`, boxShadow: T.shadow, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <div>
                <div style={{ color: T.accent, fontSize: 12, fontWeight: 900 }}>코스를 시작할까요?</div>
                <h3 className="title-font" style={{ margin: '4px 0 0', fontSize: 22, fontWeight: 800 }}>{pendingTemplate.title}</h3>
              </div>
              <button onClick={() => setPendingTemplate(null)} style={primaryIconButton(T)} aria-label="닫기"><X size={16} /></button>
            </div>
            <p style={{ color: T.sub, fontSize: 13, lineHeight: 1.6, margin: '10px 0 14px' }}>{pendingTemplate.description}</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button onClick={startAndRead} style={primaryButton(T)}>읽으러 가기</button>
              <button onClick={startLater} style={secondaryButton(T)}>나중에 읽기</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function tabButton(T: ThemeTokens, active: boolean): CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: 12,
    border: 'none',
    background: active ? T.card : 'transparent',
    color: active ? T.text : T.sub,
    minHeight: 32,
    padding: '7px 9px',
    fontFamily: 'inherit',
    fontWeight: 900,
    fontSize: 11,
    boxShadow: active ? T.soft : 'none',
    cursor: 'pointer',
  };
}

function chip(T: ThemeTokens, active: boolean): CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: 999,
    border: `1px solid ${active ? 'transparent' : T.line}`,
    background: active ? `linear-gradient(145deg, ${T.accent}, ${T.mint})` : T.solid,
    color: active ? '#fff' : T.sub,
    minHeight: 32,
    padding: '7px 10px',
    fontFamily: 'inherit',
    fontWeight: 900,
    fontSize: 11,
    cursor: 'pointer',
  };
}

function primaryButton(T: ThemeTokens): CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 16,
    border: 'none',
    background: `linear-gradient(145deg, ${T.butter}, ${T.peach})`,
    color: T.text,
    minHeight: 44,
    padding: '10px 13px',
    fontFamily: 'inherit',
    fontWeight: 900,
    fontSize: 12,
    boxShadow: T.soft,
    cursor: 'pointer',
  };
}

function secondaryButton(T: ThemeTokens): CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    border: `1px solid ${T.line}`,
    background: T.solid,
    color: T.text,
    minHeight: 44,
    padding: '10px 13px',
    fontFamily: 'inherit',
    fontWeight: 900,
    fontSize: 12,
    boxShadow: T.soft,
    cursor: 'pointer',
  };
}

function primaryIconButton(T: ThemeTokens): CSSProperties {
  return {
    width: 40,
    height: 40,
    borderRadius: 14,
    border: `1px solid ${T.line}`,
    background: T.solid,
    color: T.text,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: T.soft,
    cursor: 'pointer',
  };
}
