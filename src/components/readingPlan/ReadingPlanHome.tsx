import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { BookOpen, Calendar, Check, ChevronDown, ChevronUp, SlidersHorizontal, X } from 'lucide-react';
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

function dateValueFromDays(days: number) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + Math.max(1, days) - 1);
  return date.toISOString().slice(0, 10);
}

function daysFromDateValue(value: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${value}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000) + 1;
  return Math.min(365, Math.max(1, diff));
}

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
  onDeleteCustomPlan,
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
  onDeleteCustomPlan?: (templateId: string) => void;
}) {
  const [meditationTask, setMeditationTask] = useState<ReadingDayTask | null>(null);
  const [courseTab, setCourseTab] = useState<'recommended' | 'custom'>('recommended');
  const [selectedBookIds, setSelectedBookIds] = useState<string[]>(['jhn']);
  const [durationPreset, setDurationPreset] = useState(10);
  const [manualDays, setManualDays] = useState(14);
  const [courseTitle, setCourseTitle] = useState('');
  const [pendingTemplate, setPendingTemplate] = useState<ReadingPlanTemplate | null>(null);
  const [editDays, setEditDays] = useState<Record<string, number>>({});
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [isCustomBuilderOpen, setIsCustomBuilderOpen] = useState(false);
  const [showManualCalendar, setShowManualCalendar] = useState(false);
  const [manualEndDate, setManualEndDate] = useState(() => dateValueFromDays(14));

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
  const isAllSelected = selectedBookIds.length === READING_PLAN_BOOK_OPTIONS.length;
  const isOldSelected = sameIds(selectedBookIds, OLD_TESTAMENT_BOOK_IDS);
  const isNewSelected = sameIds(selectedBookIds, NEW_TESTAMENT_BOOK_IDS);

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
      if (current.includes(bookId)) return current.filter((id) => id !== bookId);
      return [...current, bookId];
    });
  };

  const selectBookGroup = (group: 'gospels' | 'new' | 'old' | 'all') => {
    const ids =
      group === 'gospels'
        ? GOSPEL_BOOK_IDS
        : group === 'new'
          ? NEW_TESTAMENT_BOOK_IDS
          : group === 'old'
            ? OLD_TESTAMENT_BOOK_IDS
            : ALL_BOOK_IDS;
    setSelectedBookIds((current) => sameIds(current, ids) ? [] : ids);
  };

  const selectDurationPreset = (value: number) => {
    setDurationPreset(value);
    if (value === 0 && !manualEndDate) {
      setManualEndDate(dateValueFromDays(manualDays));
    }
  };

  const selectManualDate = (value: string) => {
    setManualEndDate(value);
    const days = daysFromDateValue(value);
    if (days !== null) setManualDays(days);
  };

  const createPlan = () => {
    if (selectedBookIds.length === 0) return;
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
    setEditingTemplateId(null);
    setIsCustomBuilderOpen(false);
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
    setEditingTemplateId(null);
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

      <section style={{ display: 'grid', gap: 9 }}>
        <div style={{ position: 'sticky', top: 62, zIndex: 30, display: 'flex', alignItems: 'end', justifyContent: 'space-between', gap: 10, padding: '7px 0 8px', background: `linear-gradient(180deg, ${T.bg} 74%, transparent)`, backdropFilter: 'blur(6px)' }}>
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
            <button
              onClick={() => setIsCustomBuilderOpen((open) => !open)}
              style={{ ...secondaryButton(T), justifyContent: 'space-between', borderRadius: 20, minHeight: 52, padding: '12px 14px' }}
            >
              <span className="title-font" style={{ fontSize: 18, fontWeight: 800 }}>나만의 코스 만들기</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: T.accent }}>
                <SlidersHorizontal size={16} />
                {isCustomBuilderOpen ? '닫기' : '열기'}
              </span>
            </button>

            {isCustomBuilderOpen && (
            <section style={{ borderRadius: 22, background: T.panel, border: `1px solid ${T.line}`, boxShadow: T.soft, padding: 13, display: 'grid', gap: 10 }}>
              <div style={{ position: 'sticky', top: 116, zIndex: 25, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 8, padding: '0 0 8px', background: T.panel }}>
                <input
                  value={courseTitle}
                  onChange={(event) => setCourseTitle(event.target.value)}
                  placeholder="코스 이름을 입력하세요"
                  style={{ width: '100%', borderRadius: 14, border: `1px solid ${T.line}`, background: T.solid, color: T.text, padding: '11px 12px', fontFamily: 'inherit', fontWeight: 800, outline: 'none' }}
                />
                <button
                  onClick={createPlan}
                  disabled={selectedBookIds.length === 0}
                  style={{ ...primaryButton(T), minHeight: 42, opacity: selectedBookIds.length === 0 ? 0.42 : 1, cursor: selectedBookIds.length === 0 ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}
                >
                  만들기
                </button>
              </div>
              <div>
                <div className="title-font" style={{ fontWeight: 900, fontSize: 16, marginBottom: 7 }}>통독기간</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {DURATION_PRESETS.map((preset) => (
                  <button key={preset.label} onClick={() => selectDurationPreset(preset.value)} style={chip(T, durationPreset === preset.value)}>
                    {preset.label}
                  </button>
                ))}
                {durationPreset === 0 && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, borderRadius: 999, border: `1px solid ${T.line}`, background: T.card, minHeight: 32, padding: '4px 8px', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => setManualDays((days) => Math.max(1, days - 1))}
                      style={{ ...primaryIconButton(T), width: 24, height: 24, borderRadius: 10 }}
                      aria-label="기간 하루 줄이기"
                    >
                      <ChevronDown size={14} />
                    </button>
                    <span style={{ minWidth: 46, textAlign: 'center', fontWeight: 900, fontSize: 12, color: T.text }}>{manualDays}일</span>
                    <button
                      onClick={() => setManualDays((days) => Math.min(365, days + 1))}
                      style={{ ...primaryIconButton(T), width: 24, height: 24, borderRadius: 10 }}
                      aria-label="기간 하루 늘리기"
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      onClick={() => setShowManualCalendar((open) => !open)}
                      style={{ ...primaryIconButton(T), width: 26, height: 26, borderRadius: 10 }}
                      aria-label="달력으로 기간 선택"
                    >
                      <Calendar size={14} />
                    </button>
                    {showManualCalendar && (
                      <input
                        type="date"
                        value={manualEndDate}
                        min={new Date().toISOString().slice(0, 10)}
                        onChange={(event) => selectManualDate(event.target.value)}
                        style={{ border: `1px solid ${T.line}`, background: T.solid, color: T.text, borderRadius: 11, minHeight: 28, padding: '3px 7px', fontFamily: 'inherit', fontWeight: 800, fontSize: 11, outline: 'none' }}
                      />
                    )}
                  </div>
                )}
              </div>
              </div>
              <div>
                <div className="title-font" style={{ fontWeight: 900, fontSize: 16, marginBottom: 7 }}>통독구간</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button onClick={() => selectBookGroup('all')} style={chip(T, isAllSelected)}>성경 전체</button>
                <button onClick={() => selectBookGroup('old')} style={chip(T, isOldSelected)}>구약 전체</button>
                <button onClick={() => selectBookGroup('new')} style={chip(T, isNewSelected)}>신약 전체</button>
              </div>
              </div>
              <div style={{ maxHeight: 320, overflowY: 'auto', display: 'grid', gap: 10, paddingRight: 2 }}>
                {BOOK_GROUPS.map((group) => (
                  <section key={group.title} style={{ display: 'grid', gap: 6 }}>
                    <div style={{ fontWeight: 900, fontSize: 12, color: T.sub }}>{group.title}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 6 }} className="book-grid">
                      {READING_PLAN_BOOK_OPTIONS.filter((book) => group.ids.includes(book.id)).map((book) => {
                        const selected = selectedBookIds.includes(book.id);
                        return (
                          <button key={book.id} onClick={() => toggleBook(book.id)} style={{ ...chip(T, selected), borderRadius: 12, justifyContent: 'space-between', padding: '8px 9px' }}>
                            <span>{book.name}</span>
                            {selected && <Check size={13} />}
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            </section>
            )}

            <section style={{ display: 'grid', gap: 9 }}>
                <div style={{ ...secondaryButton(T), justifyContent: 'space-between', borderRadius: 20, minHeight: 52, padding: '12px 14px', cursor: 'default' }}>
                  <span className="title-font" style={{ fontSize: 18, fontWeight: 800 }}>내가 만든 코스</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: T.accent, fontSize: 12, fontWeight: 900 }}>
                    <BookOpen size={16} />
                    {userTemplates.length}개
                  </span>
                </div>
                {userTemplates.length === 0 && (
                  <div style={{ borderRadius: 18, border: `1px dashed ${T.line}`, background: T.solid, color: T.sub, padding: 14, fontSize: 13, lineHeight: 1.6 }}>
                    아직 만든 코스가 없습니다. 위의 만들기 창을 열어 원하는 성경과 기간을 골라보세요.
                  </div>
                )}
                {userTemplates.map((template) => (
                  <article key={template.id} style={{ borderRadius: 20, background: T.panel, border: `1px solid ${template.id === progress?.templateId ? T.accent : T.line}`, padding: 12, boxShadow: T.soft, display: 'grid', gap: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                      <div>
                        <div className="title-font" style={{ fontSize: 18, fontWeight: 800 }}>{template.title}</div>
                        <div style={{ color: T.sub, fontSize: 12, fontWeight: 800, marginTop: 3 }}>{template.description}</div>
                      </div>
                      <div style={{ display: 'inline-flex', alignItems: 'flex-start', gap: 6 }}>
                        <button onClick={() => onDeleteCustomPlan?.(template.id)} style={{ ...primaryIconButton(T), width: 34, height: 34, borderRadius: 12 }} aria-label={`${template.title} 삭제`}>
                          <X size={14} />
                        </button>
                        <button onClick={() => onStartPlanAndRead?.(template)} style={{ ...primaryButton(T), minHeight: 38, padding: '8px 10px', flex: '0 0 auto' }} aria-label={`${template.title} 읽으러 가기`}>
                          읽으러 가기
                        </button>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gap: 8 }}>
                      <button onClick={() => setEditingTemplateId((current) => (current === template.id ? null : template.id))} style={secondaryButton(T)}>기간 수정</button>
                      {editingTemplateId === template.id && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'auto minmax(0,1fr) auto', gap: 8, alignItems: 'center' }}>
                          <button
                            onClick={() => setEditDays((current) => ({ ...current, [template.id]: Math.max(1, (current[template.id] ?? template.days) - 1) }))}
                            style={primaryIconButton(T)}
                            aria-label={`${template.title} 기간 줄이기`}
                          >
                            <ChevronDown size={16} />
                          </button>
                          <div style={{ textAlign: 'center', fontWeight: 900, fontSize: 14, color: T.text }}>
                            {(editDays[template.id] ?? template.days)}일
                          </div>
                          <button
                            onClick={() => setEditDays((current) => ({ ...current, [template.id]: Math.min(365, (current[template.id] ?? template.days) + 1) }))}
                            style={primaryIconButton(T)}
                            aria-label={`${template.title} 기간 늘리기`}
                          >
                            <ChevronUp size={16} />
                          </button>
                        </div>
                      )}
                      {editingTemplateId === template.id && (
                        <button onClick={() => updateCustomDays(template)} style={primaryButton(T)}>확인</button>
                      )}
                    </div>
                  </article>
                ))}
              </section>
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
