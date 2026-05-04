
import { useCallback, useEffect, useMemo, useState, type CSSProperties, type FormEvent } from 'react';
import { Bookmark, BookmarkCheck, ChevronLeft, ChevronRight, Copy, Loader2, PenTool, Search, Volume2, X } from 'lucide-react';
import confetti from 'canvas-confetti';
import { BIBLE_BOOKS, type BibleBook } from './data/bibleBooks';
import { BIBLE_VERSES, type BibleVerse } from './data/verses';
import { KawaiiApplicationIcon, KawaiiAudioIcon, KawaiiBibleIcon, KawaiiCalendarIcon, KawaiiComfortIcon, KawaiiHomeIcon, KawaiiJournalIcon, KawaiiMeditationIcon, KawaiiPrayerIcon, KawaiiRandomIcon, KawaiiSavedIcon, KawaiiSettingsIcon, KawaiiShareIcon, KawaiiVerseIcon, KawaiiWisdomIcon } from './components/icons';

interface Verse { verse: number; text: string; }
interface JournalEntry { id: string; ref: string; date: string; note: string; }
interface SavedVerse { ref: string; text: string; date?: string; meditation?: string; prayer?: string; }
interface VerseDetail { ref: string; text: string; meditation?: string; prayer?: string; }

type Tab = 'home' | 'random' | 'read' | 'journal' | 'saved' | 'settings';
type FontSize = 'sm' | 'base' | 'lg' | 'xl';
type Theme = 'a-soft' | 'a-dark';
type SavedGroupMode = 'date' | 'week' | 'month';
type Category = '전체' | BibleVerse['category'];
type Mood = '평안' | '감사' | '불안' | '소망' | '회개' | '위로' | '사랑' | '용서' | '두려움' | '지혜' | '능력' | '축복';

const CATEGORIES: Category[] = ['전체', '위로', '소망', '감사', '사랑', '지혜', '평안', '능력', '축복'];
const MOODS: Array<{ label: Mood; category: BibleVerse['category'] }> = [
  { label: '평안', category: '평안' },
  { label: '감사', category: '감사' },
  { label: '불안', category: '평안' },
  { label: '소망', category: '소망' },
  { label: '회개', category: '지혜' },
  { label: '위로', category: '위로' },
  { label: '사랑', category: '사랑' },
  { label: '용서', category: '사랑' },
  { label: '두려움', category: '위로' },
  { label: '지혜', category: '지혜' },
  { label: '능력', category: '능력' },
  { label: '축복', category: '축복' },
];
const FS: Record<FontSize, string> = { sm: '0.9rem', base: '1rem', lg: '1.13rem', xl: '1.25rem' };
const LS = { SAVED: 'gb_saved', JOURNAL: 'gb_journal', THEME: 'gb_theme', SIZE: 'gb_size', LAST_BOOK: 'gb_last_book', LAST_CHAP: 'gb_last_chap', DAILY_DATE: 'gb_daily_date', DAILY_IDX: 'gb_daily_idx' };

function TH(theme: Theme) {
  return {
    'a-soft': { bg: '#ead9cc', panel: 'linear-gradient(145deg, rgba(255,250,245,0.96), rgba(244,225,211,0.92))', card: 'linear-gradient(150deg, rgba(255,253,247,0.98), rgba(249,226,216,0.94) 48%, rgba(225,241,238,0.92))', solid: 'rgba(255,247,239,0.9)', line: 'rgba(156,118,101,0.18)', text: '#403831', sub: '#8c786e', accent: '#8d95d8', pill: 'rgba(255,255,255,0.66)', peach: '#f5b9a6', mint: '#a9d9d7', butter: '#f3d390', lavender: '#b5b3e8', shadow: '16px 16px 36px rgba(154,116,93,0.16), -12px -12px 24px rgba(255,255,255,0.72)', soft: '8px 8px 16px rgba(151,111,91,0.13), -6px -6px 14px rgba(255,255,255,0.68), inset 1px 1px 0 rgba(255,255,255,0.62)' },
    'a-dark': { bg: '#8a9b98', panel: 'linear-gradient(145deg, rgba(130,150,148,0.96), rgba(112,132,128,0.96))', card: 'linear-gradient(150deg, rgba(126,149,145,0.96), rgba(154,137,137,0.92) 48%, rgba(105,129,135,0.95))', solid: 'rgba(105,132,124,0.94)', line: 'rgba(255,255,255,0.12)', text: '#fff8ef', sub: '#e8d8ce', accent: '#f3d390', pill: 'rgba(255,255,255,0.12)', peach: '#f2b4a3', mint: '#a9d9d7', butter: '#f3d390', lavender: '#b5b3e8', shadow: '20px 20px 36px rgba(68,88,82,0.26), -14px -14px 28px rgba(176,207,196,0.16)', soft: '8px 8px 16px rgba(70,90,83,0.2), -6px -6px 14px rgba(170,210,198,0.1)' },
  }[theme];
}

function cleanText(t: string) { return t.replace(/\s+/g, ' ').replace(/\[[^\]]*\]/g, '').trim(); }
function compactRef(ref: string) { return ref.replace(/\s+(?=\d)/g, ''); }
function todayText(date = new Date()) { return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }); }
function getDailyIdx() {
  const today = new Date().toDateString();
  if (localStorage.getItem(LS.DAILY_DATE) === today) {
    const idx = localStorage.getItem(LS.DAILY_IDX);
    if (idx !== null) return Number(idx);
  }
  const idx = today.split('').reduce((sum, c) => sum + c.charCodeAt(0), 0) % BIBLE_VERSES.length;
  localStorage.setItem(LS.DAILY_DATE, today);
  localStorage.setItem(LS.DAILY_IDX, String(idx));
  return idx;
}
async function fetchChapter(book: BibleBook, chap: number): Promise<Verse[]> {
  const res = await fetch(`https://api.getbible.net/v2/korean/${book.number}/${chap}.json`, { mode: 'cors' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data?.verses)) throw new Error('no verses');
  return data.verses.map((v: any) => ({ verse: Number(v.verse), text: cleanText(v.text ?? '') }));
}
function findCurated(ref: string) {
  const normalized = compactRef(ref).replace(/\s/g, '');
  return BIBLE_VERSES.find(v => `${v.book}${v.chapter}:${v.verse}` === normalized);
}
function detailFor(ref: string, text: string): VerseDetail {
  const curated = findCurated(ref);
  return { ref, text, meditation: curated?.meditation, prayer: curated?.prayer };
}
function groupLabel(mode: SavedGroupMode, value?: string) {
  const d = value ? new Date(value) : new Date();
  if (mode === 'month') return `${d.getFullYear()}년 ${d.getMonth() + 1}월`;
  if (mode === 'week') {
    const start = new Date(d.getFullYear(), 0, 1);
    const week = Math.ceil((((d.getTime() - start.getTime()) / 86400000) + start.getDay() + 1) / 7);
    return `${d.getFullYear()}년 ${week}주차`;
  }
  return todayText(d);
}

export default function App() {
  const [tab, setTab] = useState<Tab>('home');
  const [theme, setTheme] = useState<Theme>('a-soft');
  const [fontSize, setFontSize] = useState<FontSize>('base');
  const [homeHistory, setHomeHistory] = useState<BibleVerse[]>([]);
  const [homeIndex, setHomeIndex] = useState(0);
  const [selCat, setSelCat] = useState<Category>('전체');
  const [rndVerse, setRndVerse] = useState<BibleVerse | null>(null);
  const [rndLoading, setRndLoading] = useState(false);
  const [selBook, setSelBook] = useState(BIBLE_BOOKS[42]);
  const [selChap, setSelChap] = useState(3);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [showBookPicker, setShowBookPicker] = useState(false);
  const [bookSearch, setBookSearch] = useState('');
  const [testament, setTestament] = useState<'old' | 'new' | 'all'>('all');
  const [saved, setSaved] = useState<SavedVerse[]>([]);
  const [savedMode, setSavedMode] = useState<SavedGroupMode>('date');
  const [detail, setDetail] = useState<VerseDetail | null>(null);
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [journalNote, setJournalNote] = useState('');
  const [journalRef, setJournalRef] = useState('');
  const [showJournalForm, setShowJournalForm] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [insightLoading, setInsightLoading] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [selectedMood, setSelectedMood] = useState<Mood | null>(null);
  const [homePrayerOpen, setHomePrayerOpen] = useState(false);

  const th = TH(theme);
  const fsize = FS[fontSize];
  const currentHomeVerse = homeHistory[homeIndex] ?? BIBLE_VERSES[getDailyIdx()];
  const meditationPreview = currentHomeVerse.meditation.length > 112 ? `${currentHomeVerse.meditation.slice(0, 112)}...` : currentHomeVerse.meditation;
  const recentJournals = journals.slice(0, 2);

  useEffect(() => {
    try { const s = localStorage.getItem(LS.SAVED); if (s) setSaved(JSON.parse(s)); } catch {}
    try { const j = localStorage.getItem(LS.JOURNAL); if (j) setJournals(JSON.parse(j)); } catch {}
    const t = localStorage.getItem(LS.THEME) as Theme | null; if (t) setTheme(t);
    const sz = localStorage.getItem(LS.SIZE) as FontSize | null; if (sz) setFontSize(sz);
    const lb = localStorage.getItem(LS.LAST_BOOK); const lc = localStorage.getItem(LS.LAST_CHAP);
    if (lb) { const bk = BIBLE_BOOKS.find(b => b.id === lb); if (bk) setSelBook(bk); }
    if (lc) setSelChap(Number(lc));
    setHomeHistory([BIBLE_VERSES[getDailyIdx()]]);
    const handleInstall = (e: Event) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener('beforeinstallprompt', handleInstall);
    return () => { window.removeEventListener('beforeinstallprompt', handleInstall); window.speechSynthesis?.cancel(); };
  }, []);

  const loadChapter = useCallback(async (book: BibleBook, chap: number) => {
    setLoading(true); setErr(''); setVerses([]); window.speechSynthesis?.cancel(); setSpeaking(false);
    try {
      const loaded = await fetchChapter(book, chap);
      setVerses(loaded);
      localStorage.setItem(LS.LAST_BOOK, book.id);
      localStorage.setItem(LS.LAST_CHAP, String(chap));
    } catch { setErr('말씀을 불러오지 못했습니다. 네트워크를 확인해 주세요.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (tab === 'read') loadChapter(selBook, selChap); }, [tab, selBook, selChap, loadChapter]);
  useEffect(() => { if (tab === 'random' && !rndVerse) pickRandom(selCat); }, [tab]);

  const filteredBooks = useMemo(() => BIBLE_BOOKS.filter(b => {
    const matchesTestament = testament === 'all' || b.testament === testament;
    const matchesSearch = !bookSearch || b.name.includes(bookSearch) || b.abbr.includes(bookSearch);
    return matchesTestament && matchesSearch;
  }), [bookSearch, testament]);

  const savedGroups = useMemo(() => {
    const groups = new Map<string, SavedVerse[]>();
    saved.forEach(item => {
      const key = groupLabel(savedMode, item.date);
      groups.set(key, [...(groups.get(key) ?? []), item]);
    });
    return Array.from(groups.entries());
  }, [saved, savedMode]);

  const navItems = [
    { id: 'home', label: '홈', icon: <KawaiiHomeIcon size={24} /> },
    { id: 'read', label: '성경', icon: <KawaiiBibleIcon size={24} /> },
    { id: 'random', label: '오늘의 말씀', icon: <KawaiiVerseIcon size={24} /> },
    { id: 'saved', label: '저장', icon: <KawaiiSavedIcon size={24} /> },
  ] as const;

  const pageTitle = { home: '은혜의 말씀', random: '오늘의 말씀', read: `${selBook.name} ${selChap}장`, journal: '묵상 일기', saved: '저장한 말씀', settings: '설정' }[tab];

  const btn = (active: boolean): CSSProperties => ({ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, minWidth: 0, padding: '9px 12px', borderRadius: 16, border: `1px solid ${active ? 'rgba(255,255,255,0.72)' : th.line}`, background: active ? `linear-gradient(145deg, ${th.butter}, ${th.peach})` : th.solid, color: th.text, cursor: 'pointer', fontWeight: 800, fontSize: 12, fontFamily: 'inherit', boxShadow: th.soft });
  const circle = (active: boolean): CSSProperties => ({ width: 38, height: 38, borderRadius: 16, border: `1px solid ${active ? 'rgba(255,255,255,0.72)' : th.line}`, background: active ? `linear-gradient(145deg, ${th.lavender}, ${th.mint})` : th.solid, color: active ? '#fff' : th.text, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: th.soft, flex: '0 0 auto' });
  const chip = (active: boolean): CSSProperties => ({ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '7px 10px', minHeight: 32, borderRadius: 999, border: `1px solid ${active ? 'rgba(255,255,255,0.72)' : th.line}`, background: active ? `linear-gradient(145deg, ${th.mint}, ${th.lavender})` : th.solid, color: active ? '#fff' : th.sub, cursor: 'pointer', fontWeight: active ? 900 : 700, fontSize: 11, fontFamily: 'inherit' });
  const iconTile = (tone: string): CSSProperties => ({ width: 42, height: 42, borderRadius: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: tone, border: '1px solid rgba(255,255,255,0.62)', color: '#fff', boxShadow: th.soft });

  const saveSaved = (next: SavedVerse[]) => { setSaved(next); localStorage.setItem(LS.SAVED, JSON.stringify(next)); };
  const isSaved = (ref: string) => saved.some(s => s.ref === ref);
  const toggleSave = (ref: string, text: string, meditation?: string, prayer?: string) => {
    const exists = isSaved(ref);
    const next = exists ? saved.filter(s => s.ref !== ref) : [{ ref, text, meditation, prayer, date: new Date().toISOString() }, ...saved];
    saveSaved(next);
    if (!exists) confetti({ particleCount: 38, spread: 38, origin: { y: 0.72 } });
  };
  const copyText = async (ref: string, text: string) => { await navigator.clipboard.writeText(`${compactRef(ref)} ${text}`); alert('복사되었습니다!'); };
  const speak = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    if (speaking) { window.speechSynthesis.cancel(); setSpeaking(false); return; }
    const u = new SpeechSynthesisUtterance(text); u.lang = 'ko-KR'; u.rate = 0.92; u.onend = () => setSpeaking(false); u.onerror = () => setSpeaking(false);
    setSpeaking(true); window.speechSynthesis.speak(u);
  };
  const shareVerse = async (ref: string, text: string) => {
    const msg = `${compactRef(ref)} ${text}`;
    if (navigator.share) { try { await navigator.share({ title: ref, text: msg }); return; } catch {} }
    await navigator.clipboard.writeText(msg); alert('복사되었습니다!');
  };
  const pickHomeVerse = (mood = selectedMood) => {
    const category = mood ? MOODS.find(item => item.label === mood)?.category : null;
    const pool = category ? BIBLE_VERSES.filter(v => v.category === category) : BIBLE_VERSES;
    return pool[Math.floor(Math.random() * pool.length)];
  };
  function pickRandom(category = selCat) {
    setRndLoading(true);
    const pool = category === '전체' ? BIBLE_VERSES : BIBLE_VERSES.filter(v => v.category === category);
    window.setTimeout(() => { setRndVerse(pool[Math.floor(Math.random() * pool.length)]); setRndLoading(false); confetti({ particleCount: 32, spread: 38, origin: { y: 0.55 } }); }, 220);
  }
  const chooseMood = (mood: Mood) => {
    const nextMood = selectedMood === mood ? null : mood;
    setSelectedMood(nextMood);
    const pick = pickHomeVerse(nextMood);
    setHomeHistory(prev => [...prev.slice(0, homeIndex + 1), pick]);
    setHomeIndex(homeIndex + 1);
  };
  const nextHomeVerse = () => {
    if (homeIndex < homeHistory.length - 1) { setHomeIndex(homeIndex + 1); return; }
    const pick = pickHomeVerse();
    setHomeHistory(prev => [...prev, pick]); setHomeIndex(homeIndex + 1);
  };
  const saveJournal = (e: FormEvent) => {
    e.preventDefault(); if (!journalNote.trim()) return;
    const entry = { id: String(Date.now()), ref: journalRef || '자유 묵상', date: todayText(), note: journalNote.trim() };
    const next = [entry, ...journals]; setJournals(next); localStorage.setItem(LS.JOURNAL, JSON.stringify(next));
    setJournalNote(''); setJournalRef(''); setShowJournalForm(false); confetti({ particleCount: 32, spread: 30 });
  };
  const deleteJournal = (id: string) => { const next = journals.filter(j => j.id !== id); setJournals(next); localStorage.setItem(LS.JOURNAL, JSON.stringify(next)); };
  const openCuratedDetail = (v: BibleVerse) => setDetail({ ref: `${v.book} ${v.chapter}:${v.verse}`, text: v.content, meditation: v.meditation, prayer: v.prayer });
  const openVerseDetail = async (ref: string, text: string) => {
    const initial = detailFor(ref, text);
    setDetail(initial);
    if (initial.meditation || initial.prayer) return;
    setInsightLoading(true);
    try {
      const res = await fetch('/api/insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ref, text }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setDetail({ ref, text, meditation: data.meditation, prayer: data.prayer });
    } catch {
      setDetail({ ref, text, meditation: 'AI 묵상 생성은 배포 서버의 NVIDIA API 연결이 준비되면 이 구절에 맞춰 표시됩니다.', prayer: '주님, 이 말씀을 오늘 제 마음에 새기고 순종하게 하소서. 아멘.' });
    } finally {
      setInsightLoading(false);
    }
  };

  function InsightBlocks({ meditation, prayer }: { meditation?: string; prayer?: string }) {
    const hasInsight = Boolean(meditation || prayer);
    if (!hasInsight) {
      return <div className="serif-verse" style={{ borderRadius: 18, background: th.solid, border: `1px solid ${th.line}`, padding: 13, color: th.sub, fontSize: '0.9rem', lineHeight: 1.75 }}>
        이 구절의 묵상과 기도문은 아직 생성되지 않았습니다. NVIDIA API 연결 후 말씀 본문에 맞춰 생성되도록 준비하겠습니다.
      </div>;
    }
    return <div style={{ display: 'grid', gap: 8 }}>
      {meditation && <div className="serif-verse" style={{ borderRadius: 18, background: th.solid, border: `1px solid ${th.line}`, padding: 13 }}><div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7, color: th.accent, fontWeight: 900, fontSize: 12 }}><KawaiiVerseIcon size={18} /><span>묵상</span></div><div style={{ fontSize: '0.94rem', lineHeight: 1.85, color: th.text }}>{meditation}</div></div>}
      {prayer && <div className="serif-verse" style={{ borderRadius: 18, background: th.solid, border: `1px solid ${th.line}`, padding: 13 }}><div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7, color: th.accent, fontWeight: 900, fontSize: 12 }}><KawaiiPrayerIcon size={18} /><span>기도문</span></div><div style={{ fontSize: '0.94rem', lineHeight: 1.85, color: th.text, fontStyle: 'normal' }}>{prayer}</div></div>}
    </div>;
  }

  function VerseCard({ v, large = false }: { v: BibleVerse; large?: boolean }) {
    const ref = `${v.book} ${v.chapter}:${v.verse}`;
    return <article style={{ borderRadius: large ? 26 : 22, background: th.card, border: `1px solid ${th.line}`, boxShadow: th.soft, overflow: 'hidden' }}>
      <div style={{ padding: large ? '18px 18px 14px' : '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: 10, fontWeight: 900, color: th.sub }}>{v.category} · 오늘의 말씀</span>
          <div style={{ display: 'flex', gap: 5 }}>
            <button aria-label="읽어주기" onClick={() => speak(v.content)} style={circle(false)}><KawaiiAudioIcon size={18} /></button>
            <button aria-label="저장" onClick={() => toggleSave(ref, v.content, v.meditation, v.prayer)} style={circle(isSaved(ref))}>{isSaved(ref) ? <BookmarkCheck size={13} /> : <Bookmark size={13} />}</button>
            <button aria-label="복사" onClick={() => copyText(ref, v.content)} style={circle(false)}><Copy size={13} /></button>
            <button aria-label="공유" onClick={() => shareVerse(ref, v.content)} style={circle(false)}><KawaiiShareIcon size={18} /></button>
          </div>
        </div>
        <p style={{ margin: 0, lineHeight: 1.88, fontSize: large ? fsize : '0.96rem', wordBreak: 'keep-all' }}>"{v.content}"</p>
        <button onClick={() => openCuratedDetail(v)} style={{ ...btn(false), marginTop: 11, padding: '7px 10px' }}>{ref}</button>
      </div>
      <div style={{ padding: '0 14px 14px' }}><InsightBlocks meditation={v.meditation} prayer={v.prayer} /></div>
    </article>;
  }

  return <div style={{ minHeight: '100vh', background: th.bg, color: th.text, fontFamily: "'S-Core Dream', sans-serif" }}>
    <main style={{ position: 'relative', zIndex: 2, maxWidth: 1220, margin: '0 auto', padding: '14px 16px 112px', minHeight: '100vh' }}>
      <header style={{ position: 'sticky', top: 0, zIndex: 20, display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0 12px', background: `linear-gradient(180deg, ${th.bg} 74%, transparent)` }}>
        <button aria-label="홈으로 이동" onClick={() => { setShowBookPicker(false); setDetail(null); setTab('home'); }} style={{ ...circle(tab === 'home'), width: 46, height: 46, borderRadius: 18 }}><KawaiiHomeIcon size={25} /></button>
        <div style={{ minWidth: 0, flex: 1 }}><div className="title-font" style={{ fontSize: 11, color: th.sub, fontWeight: 800 }}>SION BIBLE</div><div className="title-font" style={{ fontWeight: 800, fontSize: '1.15rem', lineHeight: 1.22, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pageTitle}</div></div>
        <button aria-label="설정" onClick={() => setTab('settings')} style={circle(tab === 'settings')}><KawaiiSettingsIcon size={23} /></button>
      </header>

      {tab === 'home' && <div style={{ display: 'grid', gap: 10 }}>
        <Card title="오늘의 마음 체크인" subtitle={selectedMood ? `${selectedMood}에 맞는 말씀을 보고 있어요` : '선택하지 않으면 모든 말씀이 랜덤으로 나와요'} T={th} compact>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 6 }} className="mood-chip-grid">
            {MOODS.map(item => <button key={item.label} onClick={() => chooseMood(item.label)} style={{ border: `1px solid ${selectedMood === item.label ? th.accent : th.line}`, background: selectedMood === item.label ? th.pill : th.solid, color: selectedMood === item.label ? th.accent : th.sub, borderRadius: 999, minHeight: 32, padding: '6px 8px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 900, fontSize: 11, boxShadow: th.soft }}>{item.label}</button>)}
          </div>
        </Card>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.08fr) minmax(280px, 0.92fr)', gap: 14, alignItems: 'start' }} className="screen-grid">
          <section style={{ display: 'grid', gap: 10 }}>
            <section style={{ borderRadius: 28, background: th.panel, border: `1px solid ${th.line}`, boxShadow: th.shadow, padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span style={iconTile(`linear-gradient(145deg, ${th.peach}, ${th.butter})`)}><KawaiiVerseIcon size={25} /></span><div><div className="title-font" style={{ fontSize: 18, fontWeight: 800 }}>오늘 붙들 말씀</div><div style={{ fontSize: 11, color: th.sub }}>{selectedMood ? `${selectedMood}에 관한 말씀` : '오늘 하나님 앞에서 머무는 말씀'}</div></div></div>
                <button onClick={nextHomeVerse} style={{ ...btn(false), padding: '7px 10px', whiteSpace: 'nowrap' }}>말씀 더보기</button>
              </div>
              <button onClick={nextHomeVerse} style={{ width: '100%', textAlign: 'left', border: `1px solid ${th.line}`, borderRadius: 22, background: th.card, color: th.text, padding: '15px 16px', fontFamily: 'inherit', cursor: 'pointer', boxShadow: th.soft }}>
                <p style={{ margin: 0, fontSize: fsize, lineHeight: 1.82, wordBreak: 'keep-all' }}>"{currentHomeVerse.content}"</p>
                <div style={{ marginTop: 9, color: th.accent, fontWeight: 900, fontSize: 12 }}>{currentHomeVerse.book} {currentHomeVerse.chapter}:{currentHomeVerse.verse}</div>
              </button>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}><button onClick={() => openCuratedDetail(currentHomeVerse)} style={btn(false)}><KawaiiMeditationIcon size={18} /><span>묵상하기</span></button><button onClick={() => setHomePrayerOpen(v => !v)} style={btn(false)}><KawaiiPrayerIcon size={18} /><span>{homePrayerOpen ? '기도문 닫기' : '기도하기'}</span></button><button onClick={() => toggleSave(`${currentHomeVerse.book} ${currentHomeVerse.chapter}:${currentHomeVerse.verse}`, currentHomeVerse.content, currentHomeVerse.meditation, currentHomeVerse.prayer)} style={btn(isSaved(`${currentHomeVerse.book} ${currentHomeVerse.chapter}:${currentHomeVerse.verse}`))}><KawaiiSavedIcon size={18} /><span>저장</span></button></div>
            </section>

            <Card title="오늘의 묵상" subtitle={todayText()} T={th} compact><div style={{ display: 'grid', gap: 8 }}><div className="serif-verse" style={{ borderRadius: 18, background: th.solid, border: `1px solid ${th.line}`, padding: 13 }}><div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7, color: th.accent, fontWeight: 900, fontSize: 12 }}><KawaiiMeditationIcon size={18} /><span>묵상</span></div><div style={{ fontSize: fsize, lineHeight: 1.8 }}>{meditationPreview}</div></div>{homePrayerOpen && <div className="serif-verse" style={{ borderRadius: 18, background: th.solid, border: `1px solid ${th.line}`, padding: 13 }}><div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7, color: th.accent, fontWeight: 900, fontSize: 12 }}><KawaiiPrayerIcon size={18} /><span>기도문</span></div><div style={{ fontSize: fsize, lineHeight: 1.8 }}>{currentHomeVerse.prayer}</div></div>}</div></Card>
          </section>

          <section style={{ display: 'grid', gap: 10 }}>
            <Card title="이어서 읽기" subtitle={`${selBook.name} ${selChap}장`} T={th} compact><button onClick={() => setTab('read')} style={{ ...btn(false), width: '100%', justifyContent: 'space-between', padding: '10px 12px' }}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}><KawaiiBibleIcon size={20} />마지막으로 읽은 곳</span><span>계속 읽기</span></button></Card>
            {recentJournals.length > 0 && <Card title="최근 묵상 기록" subtitle="다시 이어서 기도하기" T={th} compact><div style={{ display: 'grid', gap: 7 }}>{recentJournals.map(j => <button key={j.id} onClick={() => setTab('saved')} style={{ textAlign: 'left', border: `1px solid ${th.line}`, background: th.solid, color: th.text, borderRadius: 15, padding: 10, fontFamily: 'inherit' }}><div style={{ fontWeight: 900, fontSize: 12 }}>{j.ref}</div><div style={{ color: th.sub, fontSize: 11, marginTop: 3 }}>{j.date}</div></button>)}</div></Card>}
          </section>
        </div>
      </div>}
      {tab === 'random' && <div style={{ display: 'grid', gap: 12 }}>
        <section style={{ borderRadius: 24, background: th.panel, border: `1px solid ${th.line}`, boxShadow: th.shadow, padding: 12 }}><div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>{CATEGORIES.map(c => <button key={c} onClick={() => { setSelCat(c); pickRandom(c); }} style={chip(selCat === c)}>{c}</button>)}</div><div style={{ display: 'grid', gridTemplateColumns: 'minmax(120px,1.4fr) repeat(3,minmax(70px,0.8fr))', gap: 8 }} className="compact-menu-grid"><button onClick={() => pickRandom()} disabled={rndLoading} style={{ ...btn(true), padding: '10px 8px' }}>{rndLoading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <KawaiiRandomIcon size={20} />}<span>새 말씀 받기</span></button><button onClick={() => setTab('read')} style={btn(false)}><KawaiiBibleIcon size={18} /><span>성경</span></button><button onClick={() => { if (rndVerse) setJournalRef(`${rndVerse.book} ${rndVerse.chapter}:${rndVerse.verse}`); setTab('saved'); setShowJournalForm(true); }} style={btn(false)}><KawaiiJournalIcon size={18} /><span>기록</span></button><button onClick={() => setTab('saved')} style={btn(false)}><KawaiiSavedIcon size={18} /><span>저장</span></button></div></section>
        {rndLoading && <Card title="준비 중" subtitle="은혜로운 말씀을 찾고 있습니다" T={th} compact><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 20, color: th.sub }}><Loader2 size={22} style={{ animation: 'spin 1s linear infinite' }} />불러오는 중...</div></Card>}
        {!rndLoading && rndVerse && <VerseCard v={rndVerse} large />}
      </div>}

      {tab === 'read' && <div style={{ display: 'grid', gap: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '42px minmax(0,1fr) 42px', gap: 8, alignItems: 'center' }}><button aria-label="이전 장" onClick={() => setSelChap(c => Math.max(1, c - 1))} disabled={selChap === 1} style={{ ...circle(false), opacity: selChap === 1 ? 0.4 : 1 }}><ChevronLeft size={20} /></button><button onClick={() => setShowBookPicker(true)} style={{ ...btn(false), width: '100%', padding: '11px 12px' }}><KawaiiBibleIcon size={20} /><span>{selBook.name}</span><span style={{ color: th.sub }}>{selChap}/{selBook.chapters}장</span></button><button aria-label="다음 장" onClick={() => setSelChap(c => Math.min(selBook.chapters, c + 1))} disabled={selChap === selBook.chapters} style={{ ...circle(false), opacity: selChap === selBook.chapters ? 0.4 : 1 }}><ChevronRight size={20} /></button></div>
        <Card title={`${verses.length}절`} subtitle="구절을 누르면 묵상과 기도문이 열립니다" T={th} compact>
          {loading && <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, padding: 28, color: th.sub }}><Loader2 size={22} style={{ animation: 'spin 1s linear infinite' }} />말씀을 불러오는 중...</div>}
          {err && <div style={{ padding: 14, borderRadius: 14, background: 'rgba(255,120,120,0.08)', color: '#c95353', border: '1px solid rgba(255,120,120,0.15)' }}>{err}</div>}
          {!loading && !err && <div style={{ display: 'grid', gap: 7 }}>{verses.map(v => { const ref = `${selBook.name} ${selChap}:${v.verse}`; return <button key={ref} onClick={() => openVerseDetail(ref, v.text)} style={{ position: 'relative', textAlign: 'left', border: `1px solid ${th.line}`, borderRadius: 17, background: th.solid, color: th.text, padding: '11px 46px 11px 12px', fontFamily: 'inherit', cursor: 'pointer', boxShadow: th.soft }}><span style={{ position: 'absolute', top: -1, right: 10, width: 25, height: 32, borderRadius: '0 0 10px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: isSaved(ref) ? th.accent : th.pill, color: isSaved(ref) ? '#fff' : th.sub }} onClick={e => { e.stopPropagation(); toggleSave(ref, v.text); }}>{isSaved(ref) ? <BookmarkCheck size={13} /> : <Bookmark size={13} />}</span><span style={{ display: 'inline-flex', width: 28, height: 28, borderRadius: 10, alignItems: 'center', justifyContent: 'center', background: th.pill, color: th.accent, fontWeight: 900, fontSize: 11, marginRight: 8 }}>{v.verse}</span><span style={{ fontSize: fsize, lineHeight: 1.82, wordBreak: 'keep-all' }}>{v.text}</span></button>; })}</div>}
        </Card>
      </div>}

      {tab === 'saved' && <div style={{ display: 'grid', gap: 12 }}>
        <Card title="다시 읽는 말씀" subtitle="날짜별, 주간별, 월별로 정리" T={th} compact>
          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>{([['date', '날짜별'], ['week', '주간별'], ['month', '월별']] as const).map(([mode, label]) => <button key={mode} onClick={() => setSavedMode(mode)} style={chip(savedMode === mode)}>{label}</button>)}</div>
          {saved.length === 0 && <div style={{ color: th.sub, fontSize: 14 }}>저장된 말씀이 없습니다.</div>}
          <div style={{ display: 'grid', gap: 12 }}>{savedGroups.map(([label, items]) => <section key={label} style={{ display: 'grid', gap: 7 }}><div style={{ display: 'flex', alignItems: 'center', gap: 6, color: th.sub, fontWeight: 900, fontSize: 12 }}><KawaiiCalendarIcon size={17} />{label}</div>{items.map(s => <button key={`${label}-${s.ref}`} onClick={() => openVerseDetail(s.ref, s.text)} style={{ textAlign: 'left', border: `1px solid ${th.line}`, borderRadius: 16, background: th.solid, color: th.text, padding: 12, fontFamily: 'inherit', cursor: 'pointer', boxShadow: th.soft }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}><span style={{ fontWeight: 900, color: th.accent, fontSize: 13 }}>{s.ref}</span><span onClick={e => { e.stopPropagation(); toggleSave(s.ref, s.text); }}><X size={13} color={th.sub} /></span></div><div style={{ fontSize: fsize, lineHeight: 1.85, wordBreak: 'keep-all' }}>"{s.text}"</div></button>)}</section>)}</div>
        </Card>

        <Card title="오늘 받은 은혜" subtitle="저장 화면 안에서 묵상 일기를 함께 관리" T={th} compact>
          <div style={{ marginBottom: 10 }}><button onClick={() => setShowJournalForm(v => !v)} style={btn(true)}><KawaiiJournalIcon size={18} /><span>{showJournalForm ? '닫기' : '새 기록 작성'}</span></button></div>
          {showJournalForm && <form onSubmit={saveJournal} style={{ display: 'grid', gap: 8, marginBottom: 12 }}><input value={journalRef} onChange={e => setJournalRef(e.target.value)} placeholder="관련 말씀" style={inputStyle(th)} /><textarea value={journalNote} onChange={e => setJournalNote(e.target.value)} rows={5} placeholder="묵상과 기도를 적어보세요" style={{ ...inputStyle(th), resize: 'vertical', lineHeight: 1.8 }} /><div style={{ display: 'flex', gap: 8 }}><button type="submit" style={btn(true)}>저장하기</button><button type="button" onClick={() => setShowJournalForm(false)} style={btn(false)}>취소</button></div></form>}
          <div style={{ display: 'grid', gap: 8 }}>{journals.length === 0 && <div style={{ color: th.sub, fontSize: 14 }}>아직 작성된 묵상 일기가 없습니다.</div>}{journals.map(j => <div key={j.id} style={{ borderRadius: 16, border: `1px solid ${th.line}`, background: th.solid, padding: 12 }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}><div><div style={{ fontWeight: 900, fontSize: 13 }}>{j.ref}</div><div style={{ fontSize: 10, color: th.sub }}>{j.date}</div></div><button onClick={() => deleteJournal(j.id)} style={circle(false)}><X size={12} /></button></div><div style={{ fontSize: 13, lineHeight: 1.85, wordBreak: 'keep-all' }}>{j.note}</div></div>)}</div>
        </Card>
      </div>}
      {tab === 'settings' && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 12 }} className="screen-grid"><Card title="테마" subtitle="감성 전환" T={th} compact><div style={{ display: 'grid', gap: 8 }}>{([['a-soft', 'Soft'], ['a-dark', 'Dark']] as const).map(([k, l]) => <button key={k} onClick={() => { setTheme(k); localStorage.setItem(LS.THEME, k); }} style={{ ...btn(theme === k), justifyContent: 'flex-start' }}><KawaiiVerseIcon size={18} />{l}</button>)}</div></Card><Card title="글자 크기" subtitle="본문 크기" T={th} compact><div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 7 }}>{([['sm','작게'],['base','보통'],['lg','크게'],['xl','아주 크게']] as const).map(([k,l]) => <button key={k} onClick={() => { setFontSize(k); localStorage.setItem(LS.SIZE, k); }} style={chip(fontSize === k)}>{l}</button>)}</div></Card><Card title="앱 설치" subtitle="홈 화면에 추가" T={th} compact><button disabled={!installPrompt} onClick={async () => { await installPrompt?.prompt?.(); setInstallPrompt(null); }} style={{ ...btn(Boolean(installPrompt)), opacity: installPrompt ? 1 : 0.55 }}>설치하기</button></Card></div>}
    </main>

    <nav style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 90, padding: '8px 12px calc(8px + env(safe-area-inset-bottom))', background: `linear-gradient(180deg, transparent, ${th.bg} 18%, ${th.bg})` }}><div style={{ maxWidth: 520, margin: '0 auto', display: 'grid', gridTemplateColumns: `repeat(${navItems.length}, 1fr)`, gap: 6, borderRadius: 22, background: th.panel, border: `1px solid ${th.line}`, boxShadow: th.shadow, padding: 7 }}>{navItems.map(n => <button key={n.id} aria-label={`${n.label} 탭`} onClick={() => setTab(n.id)} style={{ minWidth: 0, minHeight: 48, borderRadius: 16, border: `1px solid ${tab === n.id ? th.accent : 'transparent'}`, background: tab === n.id ? th.pill : 'transparent', color: tab === n.id ? th.accent : th.sub, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, cursor: 'pointer', fontFamily: 'inherit', fontWeight: tab === n.id ? 900 : 700, fontSize: 10 }}>{n.icon}<span>{n.label}</span></button>)}</div></nav>

    {showBookPicker && <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'flex-end' }}><div onClick={() => setShowBookPicker(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.38)', backdropFilter: 'blur(4px)' }} /><div style={{ position: 'relative', width: '100%', maxHeight: '76vh', background: th.panel, borderTopLeftRadius: 26, borderTopRightRadius: 26, border: `1px solid ${th.line}`, padding: 14, overflow: 'hidden' }}><div style={{ width: 38, height: 4, borderRadius: 4, background: th.line, margin: '0 auto 12px' }} /><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}><div style={{ fontWeight: 900, fontSize: 17 }}>성경 책 선택</div><button onClick={() => setShowBookPicker(false)} style={circle(false)}><X size={12} /></button></div><div style={{ display: 'flex', gap: 5, marginBottom: 7 }}>{([['all','전체'],['old','구약'],['new','신약']] as const).map(([k,l]) => <button key={k} onClick={() => setTestament(k)} style={chip(testament === k)}>{l}</button>)}</div><div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8, padding: '9px 10px', borderRadius: 14, background: th.solid, border: `1px solid ${th.line}` }}><Search size={12} color={th.sub} /><input value={bookSearch} onChange={e => setBookSearch(e.target.value)} placeholder="책 이름 검색" style={{ border: 'none', background: 'transparent', outline: 'none', flex: 1, color: th.text, fontFamily: 'inherit', fontSize: 13 }} /></div><div style={{ overflowY: 'auto', maxHeight: '48vh', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 5 }} className="book-grid">{filteredBooks.map(book => <button key={book.id} onClick={() => { setSelBook(book); setSelChap(1); setShowBookPicker(false); setTab('read'); }} style={{ borderRadius: 14, background: selBook.id === book.id ? th.pill : th.solid, border: `1px solid ${selBook.id === book.id ? th.accent : th.line}`, padding: '9px 5px', cursor: 'pointer', fontFamily: 'inherit', color: th.text }}><div style={{ fontWeight: 900, fontSize: 12 }}>{book.name}</div><div style={{ fontSize: 10, color: th.sub, marginTop: 2 }}>{book.chapters}장</div></button>)}</div></div></div>}

    {detail && <div style={{ position: 'fixed', inset: 0, zIndex: 120, display: 'flex', alignItems: 'flex-end' }}><div onClick={() => setDetail(null)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.38)', backdropFilter: 'blur(4px)' }} /><div style={{ position: 'relative', width: '100%', maxHeight: '76vh', overflowY: 'auto', background: th.panel, borderTopLeftRadius: 26, borderTopRightRadius: 26, border: `1px solid ${th.line}`, padding: 16 }}><div style={{ width: 38, height: 4, borderRadius: 4, background: th.line, margin: '0 auto 12px' }} /><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}><div style={{ fontWeight: 900, color: th.accent, fontSize: 15 }}>{detail.ref}</div><button onClick={() => setDetail(null)} style={circle(false)}><X size={12} /></button></div><div style={{ borderRadius: 18, background: th.solid, border: `1px solid ${th.line}`, padding: 14, marginBottom: 10 }}><div style={{ fontSize: fsize, lineHeight: 1.9, wordBreak: 'keep-all' }}>"{detail.text}"</div></div>{insightLoading ? <div style={{ borderRadius: 18, background: th.solid, border: `1px solid ${th.line}`, padding: 14, color: th.sub, display: 'flex', alignItems: 'center', gap: 8 }}><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />AI가 이 말씀에 맞는 묵상과 기도문을 준비하고 있습니다.</div> : <InsightBlocks meditation={detail.meditation} prayer={detail.prayer} />}<div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6, marginTop: 10 }} className="detail-actions"><button onClick={() => speak(detail.text)} style={btn(false)}><Volume2 size={12} /><span>읽기</span></button><button onClick={() => toggleSave(detail.ref, detail.text, detail.meditation, detail.prayer)} style={btn(isSaved(detail.ref))}>{isSaved(detail.ref) ? <BookmarkCheck size={12} /> : <Bookmark size={12} />}<span>저장</span></button><button onClick={() => copyText(detail.ref, detail.text)} style={btn(false)}><Copy size={12} /><span>복사</span></button><button onClick={() => { setJournalRef(detail.ref); setDetail(null); setTab('saved'); setShowJournalForm(true); }} style={btn(false)}><PenTool size={12} /><span>기록</span></button></div></div></div>}

    <style>{`
      * { box-sizing: border-box; }
      @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      @media (max-width: 900px) { .screen-grid { grid-template-columns: 1fr !important; } .compact-menu-grid { grid-template-columns: repeat(2, minmax(0,1fr)) !important; } }
      @media (max-width: 680px) { .mood-chip-grid { grid-template-columns: repeat(4, minmax(0,1fr)) !important; } }
      @media (max-width: 520px) { .book-grid { grid-template-columns: repeat(3,1fr) !important; } .detail-actions { grid-template-columns: repeat(2,1fr) !important; } .mood-chip-grid { grid-template-columns: repeat(3, minmax(0,1fr)) !important; } }
    `}</style>
  </div>;
}

function Card({ title, subtitle, T, compact = false, children }: { title: string; subtitle: string; T: any; compact?: boolean; children: React.ReactNode }) {
  const icon = getCardIcon(title);
  return <section className="surface-card" style={{ borderRadius: 24, background: T.panel, border: `1px solid ${T.line}`, boxShadow: T.shadow, padding: compact ? 13 : 16 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: compact ? 9 : 12 }}>
      {icon && <span style={{ width: 34, height: 34, borderRadius: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: T.solid, border: `1px solid ${T.line}`, color: T.accent }}>{icon}</span>}
      <div>
        <div className="title-font" style={{ fontWeight: 800, fontSize: compact ? 18 : 22, lineHeight: 1.16 }}>{title}</div>
        <div style={{ color: T.sub, fontSize: 11, marginTop: 3 }}>{subtitle}</div>
      </div>
    </div>
    {children}
  </section>;
}

function getCardIcon(title: string) {
  if (title.includes('마음')) return <KawaiiComfortIcon size={22} />;
  if (title.includes('이어서')) return <KawaiiBibleIcon size={22} />;
  if (title.includes('순종')) return <KawaiiApplicationIcon size={22} />;
  if (title.includes('묵상')) return <KawaiiMeditationIcon size={22} />;
  if (title.includes('은혜')) return <KawaiiJournalIcon size={22} />;
  if (title.includes('다시')) return <KawaiiSavedIcon size={22} />;
  if (title.includes('절')) return <KawaiiBibleIcon size={22} />;
  if (title.includes('테마')) return <KawaiiSettingsIcon size={22} />;
  if (title.includes('글자')) return <KawaiiWisdomIcon size={22} />;
  return null;
}

function inputStyle(T: any): CSSProperties {
  return { width: '100%', padding: '10px 11px', borderRadius: 13, border: `1px solid ${T.line}`, background: T.solid, color: T.text, fontSize: 13, fontFamily: 'inherit', outline: 'none' };
}





