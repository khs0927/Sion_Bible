import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BookOpen, Heart, Share2, Volume2, RefreshCw,
  Bookmark, BookmarkCheck, Search, PenTool, Settings,
  ChevronRight, ChevronLeft, Loader2, Home, Sparkles,
  PanelsTopLeft, Library, Calendar, X, Hand, Star,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { BIBLE_BOOKS, type BibleBook } from './data/bibleBooks';
import { BIBLE_VERSES, type BibleVerse } from './data/verses';

/* ─── types ─── */
interface Verse { verse: number; text: string; }
interface JournalEntry { id: string; ref: string; date: string; note: string; }
type Tab = 'home' | 'random' | 'read' | 'journal' | 'saved' | 'settings';
type FontSize = 'sm' | 'base' | 'lg' | 'xl';
type Theme = 'a-soft' | 'a-dark';

/* ─── localStorage keys ─── */
const LS = {
  SAVED: 'gb_saved', JOURNAL: 'gb_journal', THEME: 'gb_theme', SIZE: 'gb_size',
  LAST_BOOK: 'gb_last_book', LAST_CHAP: 'gb_last_chap',
  DAILY_DATE: 'gb_daily_date', DAILY_IDX: 'gb_daily_idx',
};

/* ─── helpers ─── */
const todayStr = () => new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });

const CATEGORIES = ['전체', '위로', '소망', '감사', '사랑', '지혜', '평안', '능력', '축복'] as const;
type Category = (typeof CATEGORIES)[number];

function getDailyIdx(): number {
  const today = new Date().toDateString();
  const saved = localStorage.getItem(LS.DAILY_DATE);
  if (saved === today) {
    const idx = localStorage.getItem(LS.DAILY_IDX);
    if (idx !== null) return parseInt(idx, 10);
  }
  const hash = today.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const idx = hash % BIBLE_VERSES.length;
  localStorage.setItem(LS.DAILY_DATE, today);
  localStorage.setItem(LS.DAILY_IDX, String(idx));
  return idx;
}

function cleanText(t: string) {
  return t.replace(/\s+/g, ' ').replace(/\[[^\]]*\]/g, '').trim();
}

/* ─── getbible API ─── */
async function fetchChapter(book: BibleBook, chap: number): Promise<Verse[]> {
  const url = `https://api.getbible.net/v2/korean/${book.number}/${chap}.json`;
  const res = await fetch(url, { mode: 'cors' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data?.verses) || data.verses.length === 0) throw new Error('no verses');
  return data.verses.map((v: any) => ({ verse: Number(v.verse), text: cleanText(v.text ?? '') }));
}

/* ─── theme tokens ─── */
function TH(theme: Theme) {
  return {
    'a-soft': {
      bg: '#cfddd3', panel: 'linear-gradient(180deg, rgba(247,236,226,0.97), rgba(220,239,227,0.97))',
      card: 'linear-gradient(180deg, rgba(255,248,241,0.96), rgba(228,244,235,0.96))',
      solid: 'rgba(248,240,233,0.94)', line: 'rgba(111,146,132,0.18)',
      text: '#314840', sub: '#69867b', accent: '#5c9f87', pill: 'rgba(255,255,255,0.72)',
      shadow: '22px 22px 40px rgba(117,150,137,0.22), -16px -16px 32px rgba(255,255,255,0.82)',
      soft: '10px 10px 18px rgba(137,169,157,0.15), -8px -8px 16px rgba(255,255,255,0.78)',
    },
    'a-dark': {
      bg: '#7f9b92', panel: 'linear-gradient(180deg, rgba(118,147,138,0.96), rgba(139,168,157,0.96))',
      card: 'linear-gradient(180deg, rgba(101,129,121,0.96), rgba(124,152,142,0.96))',
      solid: 'rgba(105,132,124,0.94)', line: 'rgba(255,255,255,0.10)',
      text: '#edf7f1', sub: '#d2e5dc', accent: '#bde7d5', pill: 'rgba(255,255,255,0.08)',
      shadow: '22px 22px 40px rgba(68,88,82,0.28), -16px -16px 32px rgba(176,207,196,0.18)',
      soft: '10px 10px 18px rgba(70,90,83,0.20), -8px -8px 16px rgba(170,210,198,0.10)',
    },
  }[theme];
}

const FS: Record<FontSize, string> = { sm: '0.88rem', base: '1rem', lg: '1.14rem', xl: '1.28rem' };

/* ─── component ─── */
export default function App() {
  const [tab, setTab] = useState<Tab>('home');
  const [theme, setTheme] = useState<Theme>('a-soft');
  const [fontSize, setFontSize] = useState<FontSize>('base');

  /* daily */
  const [daily, setDaily] = useState<BibleVerse | null>(null);
  const [dailyLoading, setDailyLoading] = useState(true);

  /* random */
  const [selCat, setSelCat] = useState<Category>('전체');
  const [rndVerse, setRndVerse] = useState<BibleVerse | null>(null);
  const [rndLoading, setRndLoading] = useState(false);
  const [rndOpen, setRndOpen] = useState(false);

  /* bible reader */
  const [selBook, setSelBook] = useState(BIBLE_BOOKS[42]);
  const [selChap, setSelChap] = useState(3);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [showBookPicker, setShowBookPicker] = useState(false);
  const [bookSearch, setBookSearch] = useState('');
  const [testament, setTestament] = useState<'old' | 'new' | 'all'>('all');

  /* verse detail modal */
  const [selVerse, setSelVerse] = useState<{ verse: number; text: string; ref: string } | null>(null);

  /* saved */
  const [saved, setSaved] = useState<Array<{ ref: string; text: string }>>([]);

  /* journal */
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [journalNote, setJournalNote] = useState('');
  const [journalRef, setJournalRef] = useState('');
  const [showJournalForm, setShowJournalForm] = useState(false);

  /* TTS */
  const [speaking, setSpeaking] = useState(false);

  /* PWA */
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  useEffect(() => {
    try { const s = localStorage.getItem(LS.SAVED); if (s) setSaved(JSON.parse(s)); } catch {}
    try { const j = localStorage.getItem(LS.JOURNAL); if (j) setJournals(JSON.parse(j)); } catch {}
    const t = localStorage.getItem(LS.THEME) as Theme | null; if (t) setTheme(t);
    const sz = localStorage.getItem(LS.SIZE) as FontSize | null; if (sz) setFontSize(sz);
    const lb = localStorage.getItem(LS.LAST_BOOK); const lc = localStorage.getItem(LS.LAST_CHAP);
    if (lb) { const bk = BIBLE_BOOKS.find(b => b.id === lb); if (bk) setSelBook(bk); }
    if (lc) setSelChap(parseInt(lc, 10));

    const handleInstall = (e: Event) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener('beforeinstallprompt', handleInstall);
    return () => { window.removeEventListener('beforeinstallprompt', handleInstall); window.speechSynthesis?.cancel(); };
  }, []);

  /* daily verse */
  useEffect(() => {
    const idx = getDailyIdx();
    setDaily(BIBLE_VERSES[idx]);
    setDailyLoading(false);
  }, []);

  /* random verse from category */
  const goRandom = useCallback(() => {
    setRndLoading(true); setRndOpen(false);
    const pool = selCat === '전체' ? BIBLE_VERSES : BIBLE_VERSES.filter(v => v.category === selCat);
    const pick = pool[Math.floor(Math.random() * pool.length)];
    setTimeout(() => { setRndVerse(pick); setRndLoading(false); setRndOpen(true); confetti({ particleCount: 35, spread: 45, origin: { y: 0.5 } }); }, 400);
  }, [selCat]);

  /* load chapter */
  const loadChapter = useCallback(async (book: BibleBook, chap: number) => {
    setLoading(true); setErr(''); setVerses([]);
    window.speechSynthesis?.cancel(); setSpeaking(false);
    try {
      const vs = await fetchChapter(book, chap);
      setVerses(vs);
      localStorage.setItem(LS.LAST_BOOK, book.id);
      localStorage.setItem(LS.LAST_CHAP, String(chap));
    } catch { setErr('말씀을 불러오지 못했습니다. 네트워크를 확인해 주세요.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (tab === 'read') loadChapter(selBook, selChap); }, [tab, selBook.id, selChap, loadChapter]);

  /* actions */
  const toggleSave = (ref: string, text: string) => {
    const exists = saved.some(s => s.ref === ref);
    const next = exists ? saved.filter(s => s.ref !== ref) : [...saved, { ref, text }];
    setSaved(next); localStorage.setItem(LS.SAVED, JSON.stringify(next));
    if (!exists) confetti({ particleCount: 55, spread: 40, origin: { y: 0.7 } });
  };
  const isSaved = (ref: string) => saved.some(s => s.ref === ref);

  const speak = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    if (speaking) { window.speechSynthesis.cancel(); setSpeaking(false); return; }
    const u = new SpeechSynthesisUtterance(text); u.lang = 'ko-KR'; u.rate = 0.92;
    u.onend = () => setSpeaking(false); u.onerror = () => setSpeaking(false);
    setSpeaking(true); window.speechSynthesis.speak(u);
  };

  const shareVerse = async (ref: string, text: string) => {
    const msg = `📖 ${ref}\n\n"${text}"\n\n— 은혜의 말씀 앱`;
    if (navigator.share) { try { await navigator.share({ title: ref, text: msg }); } catch {} return; }
    await navigator.clipboard.writeText(msg); alert('복사되었습니다!');
  };

  const saveJournal = (e: React.FormEvent) => {
    e.preventDefault(); if (!journalNote.trim()) return;
    const entry: JournalEntry = { id: Date.now().toString(), ref: journalRef || '자유 묵상', date: todayStr(), note: journalNote };
    const next = [entry, ...journals];
    setJournals(next); localStorage.setItem(LS.JOURNAL, JSON.stringify(next));
    setJournalNote(''); setJournalRef(''); setShowJournalForm(false);
    confetti({ particleCount: 35, spread: 30 });
  };

  const deleteJournal = (id: string) => {
    const next = journals.filter(j => j.id !== id);
    setJournals(next); localStorage.setItem(LS.JOURNAL, JSON.stringify(next));
  };

  const filteredBooks = useMemo(() => BIBLE_BOOKS.filter(b => {
    const mt = testament === 'all' || b.testament === testament;
    const ms = bookSearch === '' || b.name.includes(bookSearch) || b.abbr.includes(bookSearch);
    return mt && ms;
  }), [testament, bookSearch]);

  /* ─── style helpers ─── */
  const th = TH(theme);
  const fsize = FS[fontSize];

  const btn = (active: boolean): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    padding: '10px 14px', borderRadius: 16, border: `1px solid ${active ? th.accent : th.line}`,
    background: active ? th.pill : th.solid, color: th.text, cursor: 'pointer',
    fontWeight: 700, fontSize: 13, fontFamily: 'inherit', boxShadow: th.soft,
  });

  const circle = (active: boolean): React.CSSProperties => ({
    width: 36, height: 36, borderRadius: 14, border: `1px solid ${active ? th.accent : th.line}`,
    background: active ? th.pill : th.solid, color: active ? th.accent : th.text,
    cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: th.soft,
  });

  const chip = (active: boolean): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    padding: '9px 11px', borderRadius: 13, border: `1px solid ${active ? th.accent : th.line}`,
    background: active ? th.pill : th.solid, color: active ? th.text : th.sub,
    cursor: 'pointer', fontWeight: active ? 800 : 600, fontSize: 12, fontFamily: 'inherit',
  });

  /* ─── verse card component ─── */
  function VerseCard({ v, large }: { v: BibleVerse; large?: boolean }) {
    const ref = `${v.book} ${v.chapter}:${v.verse}`;
    return (
      <div style={{ borderRadius: large ? 26 : 22, background: th.card, border: `1px solid ${th.line}`, boxShadow: th.soft, overflow: 'hidden' }}>
        <div style={{ padding: large ? '20px 20px 16px' : '16px 16px 12px' }}>
          {/* category + ref */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: th.sub, textTransform: 'uppercase' }}>{v.category} · 랜덤 말씀</span>
            <div style={{ display: 'flex', gap: 5 }}>
              <button onClick={() => speak(v.content)} style={circle(false)}><Volume2 size={13} /></button>
              <button onClick={() => toggleSave(ref, v.content)} style={circle(isSaved(ref))}>{isSaved(ref) ? <BookmarkCheck size={13} /> : <Bookmark size={13} />}</button>
              <button onClick={() => shareVerse(ref, v.content)} style={circle(false)}><Share2 size={13} /></button>
            </div>
          </div>
          {/* verse text */}
          <p style={{ margin: 0, lineHeight: 1.88, fontSize: large ? fsize : '0.95rem', wordBreak: 'keep-all' }}>
            "{v.content}"
          </p>
          <div style={{ marginTop: 10, fontWeight: 700, color: th.accent, fontSize: large ? 14 : 12 }}>{ref}</div>
        </div>
        {/* meditation */}
        <div style={{ padding: '0 20px 14px' }}>
          <div style={{ borderRadius: 18, background: th.solid, border: `1px solid ${th.line}`, padding: '14px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <Star size={14} style={{ color: th.accent }} />
              <span style={{ fontWeight: 800, fontSize: 12, color: th.accent }}>🕊️ 묵상</span>
            </div>
            <div style={{ fontSize: large ? '0.92rem' : '0.85rem', lineHeight: 1.85, wordBreak: 'keep-all', color: th.text }}>{v.meditation}</div>
          </div>
        </div>
        {/* prayer */}
        <div style={{ padding: '0 20px 16px' }}>
          <div style={{ borderRadius: 18, background: th.solid, border: `1px solid ${th.line}`, padding: '14px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <Hand size={14} style={{ color: th.accent }} />
              <span style={{ fontWeight: 800, fontSize: 12, color: th.accent }}>🙏 기도문</span>
            </div>
            <div style={{ fontSize: large ? '0.92rem' : '0.85rem', lineHeight: 1.85, wordBreak: 'keep-all', fontStyle: 'italic', color: th.text }}>{v.prayer}</div>
          </div>
        </div>
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════════ */
  return (
    <div style={{ minHeight: '100vh', background: th.bg, color: th.text, fontFamily: "'Pretendard', sans-serif" }}>
      <main style={{ position: 'relative', zIndex: 2, maxWidth: 1260, margin: '0 auto', padding: '22px 16px 100px', overflowY: 'auto', maxHeight: '100vh' }}>

        {/* ─── HEADER (no duplicate titles) ─── */}
        {tab === 'read' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <button onClick={() => setShowBookPicker(true)} style={circle(false)}><ChevronLeft size={18} /></button>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.25rem', lineHeight: 1.2 }}>{selBook.name} {selChap}장</div>
              <div style={{ fontSize: 11, color: th.sub }}>{selBook.chapters}장 중 {selChap}장</div>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 5 }}>
              <button onClick={() => { if (selChap > 1) setSelChap(c => c - 1); }} style={circle(false)} disabled={selChap === 1}><ChevronLeft size={14} /></button>
              <button onClick={() => { if (selChap < selBook.chapters) setSelChap(c => c + 1); }} style={circle(false)} disabled={selChap === selBook.chapters}><ChevronRight size={14} /></button>
            </div>
          </div>
        )}

        {/* ─── HOME TAB ─── */}
        {tab === 'home' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 380px) minmax(0, 1fr)', gap: 18, alignItems: 'start' }}>
            {/* LEFT PANEL */}
            <section style={{ borderRadius: 30, background: th.panel, border: `1px solid ${th.line}`, boxShadow: th.shadow, padding: 16, position: 'sticky', top: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 11, letterSpacing: '0.3em', color: th.sub, marginBottom: 3 }}>GRACE BIBLE</div>
                  <div style={{ fontWeight: 800, fontSize: '1.4rem', lineHeight: 1.1 }}>은혜의 말씀</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {installPrompt && <button onClick={() => { installPrompt.prompt(); installPrompt.userChoice.finally(() => setInstallPrompt(null)); }} style={circle(false)}><Sparkles size={14} /></button>}
                  <button onClick={() => setTab('settings')} style={circle(false)}><Settings size={14} /></button>
                </div>
              </div>

              {/* daily verse */}
              <div style={{ borderRadius: 24, background: th.card, border: `1px solid ${th.line}`, boxShadow: th.soft, overflow: 'hidden', marginBottom: 12 }}>
                <div style={{ padding: '14px 14px 10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: th.sub, fontSize: 11, marginBottom: 4 }}>
                    <Calendar size={11} />
                    {new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '1.2rem', lineHeight: 1.1 }}>Today&apos;s Verse</div>
                </div>
                <div style={{ padding: '0 14px 14px' }}>
                  {dailyLoading ? <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}><Loader2 size={22} style={{ animation: 'spin 1s linear infinite', color: th.accent }} /></div> : daily && (
                    <>
                      <div style={{ borderRadius: 20, background: th.solid, padding: '14px 12px', border: `1px solid ${th.line}` }}>
                        <p style={{ margin: 0, lineHeight: 1.85, fontSize: '0.9rem', wordBreak: 'keep-all' }}>"{daily.content}"</p>
                        <div style={{ marginTop: 8, fontWeight: 700, color: th.accent, fontSize: 12 }}>{daily.book} {daily.chapter}:{daily.verse}</div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: 6, marginTop: 8 }}>
                        <button onClick={() => { setTab('random'); }} style={btn(true)}><RefreshCw size={13} /><span>랜덤 말씀</span></button>
                        <button onClick={() => speak(daily.content)} style={circle(false)}><Volume2 size={13} /></button>
                        <button onClick={() => toggleSave(`${daily.book} ${daily.chapter}:${daily.verse}`, daily.content)} style={circle(isSaved(`${daily.book} ${daily.chapter}:${daily.verse}`))}>{isSaved(`${daily.book} ${daily.chapter}:${daily.verse}`) ? <BookmarkCheck size={13} /> : <Bookmark size={13} />}</button>
                        <button onClick={() => shareVerse(`${daily.book} ${daily.chapter}:${daily.verse}`, daily.content)} style={circle(false)}><Share2 size={13} /></button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 7, marginBottom: 12 }}>
                {[{ l: '저장', v: saved.length, i: <Bookmark size={14} /> }, { l: '일기', v: journals.length, i: <PenTool size={14} /> }, { l: '66권', v: '전체', i: <Library size={14} /> }].map(s => (
                  <div key={s.l} style={{ borderRadius: 18, background: th.card, border: `1px solid ${th.line}`, padding: '10px 6px', textAlign: 'center', boxShadow: th.soft }}>
                    <div style={{ width: 30, height: 30, margin: '0 auto 5px', borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', background: th.pill, color: th.accent }}>{s.i}</div>
                    <div style={{ fontWeight: 800, fontSize: 16 }}>{s.v}</div>
                    <div style={{ fontSize: 10, color: th.sub }}>{s.l}</div>
                  </div>
                ))}
              </div>

              {/* nav */}
              <div style={{ borderRadius: 20, background: th.card, border: `1px solid ${th.line}`, padding: 8, boxShadow: th.soft }}>
                {[
                  { id: 'home', label: '홈', icon: <Home size={14} /> },
                  { id: 'random', label: '랜덤 말씀', icon: <Sparkles size={14} /> },
                  { id: 'read', label: '성경 읽기', icon: <BookOpen size={14} /> },
                  { id: 'journal', label: '묵상 일기', icon: <PenTool size={14} /> },
                  { id: 'saved', label: '저장한 말씀', icon: <Heart size={14} /> },
                  { id: 'settings', label: '설정', icon: <PanelsTopLeft size={14} /> },
                ].map(n => (
                  <button key={n.id} onClick={() => setTab(n.id as Tab)} style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 9,
                    padding: '10px 10px', borderRadius: 14, border: 'none',
                    background: tab === n.id ? th.pill : 'transparent',
                    color: tab === n.id ? th.text : th.sub, fontWeight: tab === n.id ? 700 : 600,
                    cursor: 'pointer', fontFamily: 'inherit', marginBottom: 3,
                  }}>{n.icon}<span>{n.label}</span><span style={{ marginLeft: 'auto' }}><ChevronRight size={13} /></span></button>
                ))}
              </div>
            </section>

            {/* RIGHT: Quick cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 14 }}>
              <Card title="바로 성경 읽기" subtitle="66권 전체 성경을 책·장별로 탐색" T={th} span="span 7">
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
                  <button onClick={() => setShowBookPicker(true)} style={btn(false)}><BookOpen size={14} /><span style={{ fontWeight: 700 }}>{selBook.name}</span></button>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <button onClick={() => { if (selChap > 1) setSelChap(c => c - 1); }} style={circle(false)} disabled={selChap === 1}><ChevronLeft size={13} /></button>
                    <div style={{ minWidth: 56, textAlign: 'center', fontWeight: 800, fontSize: 14 }}>{selChap}장</div>
                    <button onClick={() => { if (selChap < selBook.chapters) setSelChap(c => c + 1); }} style={circle(false)} disabled={selChap === selBook.chapters}><ChevronRight size={13} /></button>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 5, overflowX: 'auto', paddingBottom: 3 }}>
                  {Array.from({ length: selBook.chapters }, (_, i) => i + 1).slice(0, 24).map(ch => (
                    <button key={ch} onClick={() => { setSelChap(ch); setTab('read'); }} style={chip(ch === selChap)}>{ch}</button>
                  ))}
                </div>
              </Card>

              <Card title="랜덤 말씀" subtitle="카테고리별로 은혜로운 말씀을" T={th} span="span 5">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <button onClick={() => { setTab('random'); }} style={{ ...btn(true), justifyContent: 'center', padding: '14px 0' }}>
                    <Sparkles size={16} /><span>랜덤 말씀 탭 열기</span>
                  </button>
                  <div style={{ fontSize: 12, color: th.sub, textAlign: 'center' }}>위로 · 소망 · 감사 · 사랑 · 지혜 · 평안 · 능력 · 축복</div>
                </div>
              </Card>

              <Card title="주요 기능" subtitle="말씀을 읽고 기록하고 간직하세요" T={th} span="span 12">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  {[
                    { title: '성경 읽기', desc: '실시간으로 모든 장을 불러옵니다.', action: () => setTab('read') },
                    { title: '묵상 일기', desc: '오늘의 은혜를 기록하세요.', action: () => { setTab('journal'); setShowJournalForm(true); } },
                    { title: '보관함', desc: '마음에 남는 말씀을 저장합니다.', action: () => setTab('saved') },
                  ].map(c => (
                    <button key={c.title} onClick={c.action} style={{ border: `1px solid ${th.line}`, background: th.solid, borderRadius: 18, padding: 14, textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', color: th.text }}>
                      <div style={{ fontWeight: 800, marginBottom: 4, fontSize: 14 }}>{c.title}</div>
                      <div style={{ color: th.sub, fontSize: 11, lineHeight: 1.6 }}>{c.desc}</div>
                    </button>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* ─── RANDOM TAB (categorized) ─── */}
        {tab === 'random' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 380px) minmax(0, 1fr)', gap: 18, alignItems: 'start' }}>
            {/* LEFT */}
            <section style={{ borderRadius: 30, background: th.panel, border: `1px solid ${th.line}`, boxShadow: th.shadow, padding: 16, position: 'sticky', top: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 11, letterSpacing: '0.3em', color: th.sub, marginBottom: 3 }}>RANDOM VERSE</div>
                  <div style={{ fontWeight: 800, fontSize: '1.4rem', lineHeight: 1.1 }}>랜덤 말씀</div>
                </div>
                <button onClick={() => setTab('home')} style={circle(false)}><Home size={15} /></button>
              </div>

              {/* category chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 14 }}>
                {CATEGORIES.map(c => (
                  <button key={c} onClick={() => { setSelCat(c); goRandom(); }} style={chip(selCat === c)}>{c}</button>
                ))}
              </div>

              {/* big random button */}
              <button onClick={goRandom} style={{ ...btn(true), width: '100%', justifyContent: 'center', padding: '16px 0', fontSize: 15 }} disabled={rndLoading}>
                {rndLoading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={18} />}
                <span>{rndLoading ? '생성 중...' : '새 말씀 받기'}</span>
              </button>

              {/* stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 7, marginTop: 14 }}>
                {[{ l: '저장', v: saved.length, i: <Bookmark size={14} /> }, { l: '일기', v: journals.length, i: <PenTool size={14} /> }, { l: '66권', v: '전체', i: <Library size={14} /> }].map(s => (
                  <div key={s.l} style={{ borderRadius: 18, background: th.card, border: `1px solid ${th.line}`, padding: '10px 6px', textAlign: 'center', boxShadow: th.soft }}>
                    <div style={{ width: 30, height: 30, margin: '0 auto 5px', borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', background: th.pill, color: th.accent }}>{s.i}</div>
                    <div style={{ fontWeight: 800, fontSize: 16 }}>{s.v}</div>
                    <div style={{ fontSize: 10, color: th.sub }}>{s.l}</div>
                  </div>
                ))}
              </div>

              {/* nav */}
              <div style={{ borderRadius: 20, background: th.card, border: `1px solid ${th.line}`, padding: 8, marginTop: 12, boxShadow: th.soft }}>
                {[
                  { id: 'home', label: '홈', icon: <Home size={14} /> },
                  { id: 'random', label: '랜덤 말씀', icon: <Sparkles size={14} /> },
                  { id: 'read', label: '성경 읽기', icon: <BookOpen size={14} /> },
                  { id: 'journal', label: '묵상 일기', icon: <PenTool size={14} /> },
                  { id: 'saved', label: '저장한 말씀', icon: <Heart size={14} /> },
                  { id: 'settings', label: '설정', icon: <PanelsTopLeft size={14} /> },
                ].map(n => (
                  <button key={n.id} onClick={() => setTab(n.id as Tab)} style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 9,
                    padding: '10px 10px', borderRadius: 14, border: 'none',
                    background: tab === n.id ? th.pill : 'transparent',
                    color: tab === n.id ? th.text : th.sub, fontWeight: tab === n.id ? 700 : 600,
                    cursor: 'pointer', fontFamily: 'inherit', marginBottom: 3,
                  }}>{n.icon}<span>{n.label}</span><span style={{ marginLeft: 'auto' }}><ChevronRight size={13} /></span></button>
                ))}
              </div>
            </section>

            {/* RIGHT: random verse card */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {rndLoading && (
                <div style={{ borderRadius: 26, background: th.card, border: `1px solid ${th.line}`, boxShadow: th.soft, padding: 40, textAlign: 'center' }}>
                  <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: th.accent, margin: '0 auto 12px', display: 'block' }} />
                  <div style={{ fontWeight: 700, fontSize: 16 }}>은혜로운 말씀을 찾고 있습니다...</div>
                  <div style={{ fontSize: 12, color: th.sub, marginTop: 4 }}>{selCat === '전체' ? '모든 카테고리' : `"${selCat}" 카테고리`}</div>
                </div>
              )}
              {!rndLoading && rndOpen && rndVerse && <VerseCard v={rndVerse} large />}
              {!rndLoading && !rndOpen && !rndLoading && (
                <div style={{ borderRadius: 26, background: th.card, border: `1px solid ${th.line}`, boxShadow: th.soft, padding: 50, textAlign: 'center' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>📖</div>
                  <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 6 }}>랜덤 말씀을 선택해 주세요</div>
                  <div style={{ fontSize: 13, color: th.sub }}>좌측에서 카테고리를 고르고<br/>"새 말씀 받기" 버튼을 눌러보세요</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── READ TAB ─── */}
        {tab === 'read' && (
          <Card title={`${selBook.name} ${selChap}장`} subtitle={`총 ${verses.length}절`} T={th} span="span 12">
            {loading && <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, padding: 30, color: th.sub }}><Loader2 size={22} style={{ animation: 'spin 1s linear infinite' }} />말씀을 불러오는 중...</div>}
            {err && <div style={{ padding: 14, borderRadius: 14, background: 'rgba(255,120,120,0.08)', color: '#c95353', border: '1px solid rgba(255,120,120,0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{err}</span>
              <button onClick={() => loadChapter(selBook, selChap)} style={btn(true)}>다시 시도</button>
            </div>}
            {!loading && !err && (
              <div style={{ display: 'grid', gap: 6 }}>
                {verses.map(v => {
                  const ref = `${selBook.name} ${selChap}:${v.verse}`;
                  return (
                    <div key={ref} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', border: `1px solid ${th.line}`, borderRadius: 16, background: th.solid, padding: '10px 12px' }}>
                      <div style={{ minWidth: 28, height: 28, borderRadius: 9, background: th.pill, display: 'flex', alignItems: 'center', justifyContent: 'center', color: th.accent, fontWeight: 800, fontSize: 11 }}>{v.verse}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: fsize, lineHeight: 1.9, wordBreak: 'keep-all' }}>{v.text}</div>
                      </div>
                      {isSaved(ref) && <BookmarkCheck size={14} color={th.accent} />}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        )}

        {/* ─── JOURNAL TAB ─── */}
        {tab === 'journal' && (
          <Card title="묵상 일기" subtitle="오늘 받은 말씀과 은혜를 기록" T={th} span="span 12">
            <div style={{ marginBottom: 10 }}>
              <button onClick={() => setShowJournalForm(v => !v)} style={btn(true)}><PenTool size={13} /><span>{showJournalForm ? '닫기' : '새 기록 작성'}</span></button>
            </div>
            {showJournalForm && (
              <form onSubmit={saveJournal} style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
                <input value={journalRef} onChange={e => setJournalRef(e.target.value)} placeholder="관련 말씀 (예: 요한복음 3:16)" style={inputStyle(th)} />
                <textarea value={journalNote} onChange={e => setJournalNote(e.target.value)} rows={5} placeholder="묵상과 기도를 적어보세요" style={{ ...inputStyle(th), resize: 'vertical', lineHeight: 1.8 }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="submit" style={btn(true)}>저장하기</button>
                  <button type="button" onClick={() => setShowJournalForm(false)} style={btn(false)}>취소</button>
                </div>
              </form>
            )}
            <div style={{ display: 'grid', gap: 8 }}>
              {journals.length === 0 && <div style={{ color: th.sub, fontSize: 14 }}>아직 작성된 묵상 일기가 없습니다.</div>}
              {journals.map(j => (
                <div key={j.id} style={{ borderRadius: 16, border: `1px solid ${th.line}`, background: th.solid, padding: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div><div style={{ fontWeight: 800, fontSize: 13 }}>{j.ref}</div><div style={{ fontSize: 10, color: th.sub }}>{j.date}</div></div>
                    <button onClick={() => deleteJournal(j.id)} style={circle(false)}><X size={12} /></button>
                  </div>
                  <div style={{ fontSize: 13, lineHeight: 1.85, wordBreak: 'keep-all' }}>{j.note}</div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* ─── SAVED TAB ─── */}
        {tab === 'saved' && (
          <Card title="저장한 말씀" subtitle="즐겨찾기한 구절을 다시 읽어보세요" T={th} span="span 12">
            <div style={{ display: 'grid', gap: 8 }}>
              {saved.length === 0 && <div style={{ color: th.sub, fontSize: 14 }}>저장된 말씀이 없습니다.</div>}
              {saved.map(s => (
                <div key={s.ref} style={{ borderRadius: 16, border: `1px solid ${th.line}`, background: th.solid, padding: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6, marginBottom: 6 }}>
                    <div style={{ fontWeight: 800, color: th.accent, fontSize: 13 }}>{s.ref}</div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={() => speak(s.text)} style={circle(false)}><Volume2 size={12} /></button>
                      <button onClick={() => shareVerse(s.ref, s.text)} style={circle(false)}><Share2 size={12} /></button>
                      <button onClick={() => toggleSave(s.ref, s.text)} style={circle(false)}><X size={12} /></button>
                    </div>
                  </div>
                  <div style={{ fontSize: fsize, lineHeight: 1.9, wordBreak: 'keep-all' }}>“{s.text}”</div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* ─── SETTINGS TAB ─── */}
        {tab === 'settings' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 14 }}>
            <Card title="테마" subtitle="감성으로 전환" T={th} span="span 6">
              <div style={{ display: 'grid', gap: 8 }}>
                {([['a-soft', 'A 스타일 Soft ☀️'], ['a-dark', 'A 스타일 Dark 🌙']] as const).map(([k, l]) => (
                  <button key={k} onClick={() => { setTheme(k); localStorage.setItem(LS.THEME, k); }} style={{ ...btn(theme === k), justifyContent: 'flex-start' }}><Sparkles size={13} /><span>{l}</span></button>
                ))}
              </div>
            </Card>
            <Card title="글자 크기" subtitle="칸 안에 잘 들어오도록" T={th} span="span 6">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 7 }}>
                {([['sm','작게'],['base','보통'],['lg','크게'],['xl','아주 크게']] as const).map(([k,l]) => (
                  <button key={k} onClick={() => { setFontSize(k as FontSize); localStorage.setItem(LS.SIZE, k); }} style={chip(fontSize === k)}>{l}</button>
                ))}
              </div>
            </Card>
            <Card title="성경 데이터" subtitle="로딩 방식 안내" T={th} span="span 12">
              <div style={{ fontSize: 13, lineHeight: 1.9, color: th.sub }}>
                • 성경 본문은 getbible.net 공개 API에서 실시간으로 불러옵니다.<br />
                • 큐레이션된 {BIBLE_VERSES.length}개 말씀에는 묵상과 기도문이 이미 포함되어 있습니다.<br />
                • API 연동 기능은 추후 추가 예정입니다.
              </div>
            </Card>
          </div>
        )}
      </main>

      {/* ─── BOOK PICKER MODAL ─── */}
      {showBookPicker && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'flex-end' }}>
          <div onClick={() => setShowBookPicker(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.38)', backdropFilter: 'blur(4px)' }} />
          <div style={{ position: 'relative', width: '100%', maxHeight: '76vh', background: th.panel, borderTopLeftRadius: 26, borderTopRightRadius: 26, border: `1px solid ${th.line}`, padding: 14, overflow: 'hidden' }}>
            <div style={{ width: 38, height: 4, borderRadius: 4, background: th.line, margin: '0 auto 12px' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ fontWeight: 800, fontSize: 17 }}>성경 책 선택</div>
              <button onClick={() => setShowBookPicker(false)} style={circle(false)}><X size={12} /></button>
            </div>
            <div style={{ display: 'flex', gap: 5, marginBottom: 7 }}>
              {([['all','전체'],['old','구약'],['new','신약']] as const).map(([k,l]) => (
                <button key={k} onClick={() => setTestament(k)} style={chip(testament === k)}>{l}</button>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8, padding: '9px 10px', borderRadius: 14, background: th.solid, border: `1px solid ${th.line}` }}>
              <Search size={12} color={th.sub} />
              <input value={bookSearch} onChange={e => setBookSearch(e.target.value)} placeholder="책 이름 검색" style={{ border: 'none', background: 'transparent', outline: 'none', flex: 1, color: th.text, fontFamily: 'inherit', fontSize: 13 }} />
            </div>
            <div style={{ overflowY: 'auto', maxHeight: '48vh', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 5 }}>
              {filteredBooks.map(book => (
                <button key={book.id} onClick={() => { setSelBook(book); setSelChap(1); setShowBookPicker(false); setTab('read'); }} style={{ borderRadius: 14, background: selBook.id === book.id ? th.pill : th.solid, border: `1px solid ${selBook.id === book.id ? th.accent : th.line}`, padding: '9px 5px', cursor: 'pointer', fontFamily: 'inherit', color: th.text }}>
                  <div style={{ fontWeight: 800, fontSize: 12 }}>{book.name}</div>
                  <div style={{ fontSize: 10, color: th.sub, marginTop: 2 }}>{book.chapters}장</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── VERSE DETAIL MODAL ─── */}
      {selVerse && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 120, display: 'flex', alignItems: 'flex-end' }}>
          <div onClick={() => setSelVerse(null)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.38)', backdropFilter: 'blur(4px)' }} />
          <div style={{ position: 'relative', width: '100%', maxHeight: '70vh', background: th.panel, borderTopLeftRadius: 26, borderTopRightRadius: 26, border: `1px solid ${th.line}`, padding: 16, overflow: 'hidden' }}>
            <div style={{ width: 38, height: 4, borderRadius: 4, background: th.line, margin: '0 auto 12px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div><div style={{ fontWeight: 800, color: th.accent, fontSize: 15 }}>{selVerse.ref}</div></div>
              <button onClick={() => setSelVerse(null)} style={circle(false)}><X size={12} /></button>
            </div>
            <div style={{ borderRadius: 18, background: th.solid, border: `1px solid ${th.line}`, padding: 14, marginBottom: 12 }}>
              <div style={{ fontSize: fsize, lineHeight: 1.95, wordBreak: 'keep-all' }}>“{selVerse.text}”</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
              <button onClick={() => speak(selVerse.text)} style={btn(false)}><Volume2 size={12} /><span>읽기</span></button>
              <button onClick={() => toggleSave(selVerse.ref, selVerse.text)} style={btn(isSaved(selVerse.ref))}>{isSaved(selVerse.ref) ? <BookmarkCheck size={12} /> : <Bookmark size={12} />}<span>저장</span></button>
              <button onClick={() => shareVerse(selVerse.ref, selVerse.text)} style={btn(false)}><Share2 size={12} /><span>공유</span></button>
              <button onClick={() => { setJournalRef(selVerse.ref); setSelVerse(null); setTab('journal'); setShowJournalForm(true); }} style={btn(false)}><PenTool size={12} /><span>기록</span></button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        @media (max-width: 960px) {
          main > div:first-child { grid-template-columns: 1fr !important; }
          section[style*='sticky'] { position: relative !important; top: 0 !important; }
        }
      `}</style>
    </div>
  );
}

/* ─── sub ─── */
function Card({ title, subtitle, T, span, children }: { title: string; subtitle: string; T: any; span: string; children: React.ReactNode }) {
  return (
    <div style={{ gridColumn: span, borderRadius: 26, background: T.panel, border: `1px solid ${T.line}`, boxShadow: T.shadow, padding: 14 }}>
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontWeight: 800, fontSize: 20, lineHeight: 1.15 }}>{title}</div>
        <div style={{ color: T.sub, fontSize: 11, marginTop: 3 }}>{subtitle}</div>
      </div>
      {children}
    </div>
  );
}

function inputStyle(T: any): React.CSSProperties {
  return { width: '100%', padding: '10px 11px', borderRadius: 13, border: `1px solid ${T.line}`, background: T.solid, color: T.text, fontSize: 13, fontFamily: 'inherit', outline: 'none' };
}
