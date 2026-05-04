
import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from 'react';
import { Bookmark, BookmarkCheck, Copy, Download, GripVertical, Loader2, X } from 'lucide-react';
import confetti from 'canvas-confetti';
import { BIBLE_BOOKS } from './data/bibleBooks';
import { BIBLE_VERSES, type BibleVerse } from './data/verses';
import { KawaiiApplicationIcon, KawaiiAudioIcon, KawaiiBibleIcon, KawaiiCalendarIcon, KawaiiComfortIcon, KawaiiHomeIcon, KawaiiJournalIcon, KawaiiMeditationIcon, KawaiiPrayerIcon, KawaiiRandomIcon, KawaiiSavedIcon, KawaiiSettingsIcon, KawaiiShareIcon, KawaiiVerseIcon, KawaiiWisdomIcon } from './components/icons';
import { ReadingPlanHome } from './components/readingPlan/ReadingPlanHome';
import { MemoryHome } from './components/memory/MemoryHome';
import { getDailyDevotion } from './services/dailyDevotions';
import { readCachedVerseDevotion } from './services/verseDevotionApi';
import { VerseDevotionPanel } from './components/bible/VerseDevotionPanel';
import { addMemoryVerse, isVerseMemorized } from './services/memoryStorage';
import { BibleVersePicker } from './components/bible/BibleVersePicker';
import { convertTaskToBibleRange } from './services/readingPlanToBibleRange';
import type { ReadingDayTask } from './types/readingPlan';
import type { BibleReadRange } from './types/bible';
import { Search } from 'lucide-react';
import { getActiveReadingPlan, toggleReadingDay, completeReadingDay, startReadingPlan } from './services/readingPlanStorage';
import { READING_PLAN_TEMPLATES } from './data/readingPlans';
import { BibleSearchSheet } from './components/bible/BibleSearchSheet';

interface JournalEntry { id: string; ref: string; date: string; note: string; }
interface SavedVerse { ref: string; text: string; date?: string; meditation?: string; prayer?: string; }
interface VerseDetail { ref: string; text: string; title?: string; meditation?: string; prayer?: string; application?: string; model?: string; fromCache?: boolean; }

type Tab = 'home' | 'random' | 'read' | 'plan' | 'memory' | 'journal' | 'saved' | 'settings';
type FontSize = 'sm' | 'base' | 'lg' | 'xl';
type Theme = 'a-soft' | 'a-dark';
type SavedGroupMode = 'date' | 'week' | 'month' | 'topic' | 'book';
type Category = '전체' | BibleVerse['category'];
type Mood = '평안' | '감사' | '불안' | '소망' | '회개' | '위로' | '사랑' | '용서' | '두려움' | '지혜' | '능력' | '축복';

const CATEGORIES: Category[] = ['전체', '위로', '소망', '감사', '사랑', '지혜', '평안', '능력', '축복'];
const SAVED_TOPICS: Array<{ label: BibleVerse['category'] | '기타'; keywords: string[] }> = [
  { label: '사랑', keywords: ['사랑', '긍휼', '자비', '용서', '은혜'] },
  { label: '위로', keywords: ['위로', '눈물', '고난', '상한', '두려워', '두려움'] },
  { label: '소망', keywords: ['소망', '기다', '새 일', '미래', '약속'] },
  { label: '감사', keywords: ['감사', '찬양', '송축', '기뻐', '은택'] },
  { label: '지혜', keywords: ['지혜', '명철', '훈계', '길', '말씀'] },
  { label: '평안', keywords: ['평안', '평강', '안식', '쉬게', '염려'] },
  { label: '능력', keywords: ['능력', '힘', '강', '담대', '이기'] },
  { label: '축복', keywords: ['복', '축복', '형통', '기업', '은혜'] },
];
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
    'a-soft': { 
      bg: '#EADDD2', 
      panel: '#FFF8F1', 
      card: '#FFF8F1', 
      solid: '#FDF6F0', 
      line: '#E8D8C8', 
      text: '#3D3129', 
      sub: '#7B6A5D', 
      accent: '#9A8FE3', 
      pill: 'rgba(255,255,255,0.8)', 
      peach: '#F5C292', 
      mint: '#A9D9D7', 
      butter: '#F1C5AA', 
      lavender: '#B5B3E8', 
      shadow: '0 8px 30px rgba(61,49,41,0.06)', 
      soft: '0 4px 12px rgba(61,49,41,0.04)' 
    },
    'a-dark': { bg: '#8a9b98', panel: 'linear-gradient(145deg, rgba(130,150,148,0.96), rgba(112,132,128,0.96))', card: 'linear-gradient(150deg, rgba(126,149,145,0.96), rgba(154,137,137,0.92) 48%, rgba(105,129,135,0.95))', solid: 'rgba(105,132,124,0.94)', line: 'rgba(255,255,255,0.12)', text: '#fff8ef', sub: '#e8d8ce', accent: '#f3d390', pill: 'rgba(255,255,255,0.12)', peach: '#f2b4a3', mint: '#a9d9d7', butter: '#f3d390', lavender: '#b5b3e8', shadow: '20px 20px 36px rgba(68,88,82,0.26), -14px -14px 28px rgba(176,207,196,0.16)', soft: '8px 8px 16px rgba(70,90,83,0.2), -6px -6px 14px rgba(170,210,198,0.1)' },
  }[theme];
}

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
function findCurated(ref: string) {
  const normalized = compactRef(ref).replace(/\s/g, '');
  return BIBLE_VERSES.find(v => `${v.book}${v.chapter}:${v.verse}` === normalized);
}
function topicForSavedVerse(item: SavedVerse) {
  const curated = findCurated(item.ref);
  if (curated) return curated.category;
  const target = `${item.ref} ${item.text} ${item.meditation ?? ''} ${item.prayer ?? ''}`;
  return SAVED_TOPICS.find(topic => topic.keywords.some(keyword => target.includes(keyword)))?.label ?? '기타';
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
  const [saved, setSaved] = useState<SavedVerse[]>([]);
  const [savedMode, setSavedMode] = useState<SavedGroupMode>('date');
  const [isReorderingSaved, setIsReorderingSaved] = useState(false);
  const [draggedSavedRef, setDraggedSavedRef] = useState<string | null>(null);
  const [detail, setDetail] = useState<VerseDetail | null>(null);
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [journalNote, setJournalNote] = useState('');
  const [journalRef, setJournalRef] = useState('');
  const [showJournalForm, setShowJournalForm] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [selectedMood, setSelectedMood] = useState<Mood | null>(null);
  const [todayReadingTask, setTodayReadingTask] = useState<ReadingDayTask | null>(null);
  const [activeReadingRange, setActiveReadingRange] = useState<BibleReadRange | null>(null);
  const [readingProgress, setReadingProgress] = useState<import('./types/readingPlan').ReadingPlanProgress | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    setReadingProgress(getActiveReadingPlan());
  }, []);

  const handleToggleReadingDay = (day: number) => {
    if (readingProgress) {
      const next = toggleReadingDay(readingProgress, day);
      setReadingProgress(next);
      return next.completedDays.includes(day);
    }
    return false;
  };

  const handleCompleteReadingFromRange = () => {
    if (!todayReadingTask || !readingProgress) {
      setActiveReadingRange(null);
      setTab('plan');
      return;
    }

    const next = completeReadingDay(readingProgress, todayReadingTask.day);
    setReadingProgress(next);
    setActiveReadingRange(null);
    setTab('plan');
    
    // 효과 및 알림
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
  };

  const th = TH(theme);
  const fsize = FS[fontSize];
  const currentHomeVerse = homeHistory[homeIndex] ?? BIBLE_VERSES[getDailyIdx()];
  const currentHomeDevotion = getDailyDevotion(currentHomeVerse);
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

  useEffect(() => { if (tab === 'random' && !rndVerse) pickRandom(selCat); }, [tab]);


  const savedGroups = useMemo(() => {
    const groups = new Map<string, SavedVerse[]>();
    saved.forEach(item => {
      let key = '';
      if (savedMode === 'topic') {
        key = topicForSavedVerse(item);
      } else if (savedMode === 'book') {
        key = item.ref.split(/\s+/)[0]; // Extract book name (e.g. "요한복음")
      } else {
        key = groupLabel(savedMode, item.date);
      }
      groups.set(key, [...(groups.get(key) ?? []), item]);
    });
    return Array.from(groups.entries());
  }, [saved, savedMode]);

  const navItems = [
    { id: 'home', label: '홈', icon: <KawaiiHomeIcon size={24} /> },
    { id: 'read', label: '성경', icon: <KawaiiBibleIcon size={24} /> },
    { id: 'plan', label: '통독', icon: <KawaiiApplicationIcon size={24} /> },
    { id: 'memory', label: '암송', icon: <KawaiiWisdomIcon size={24} /> },
    { id: 'saved', label: '저장', icon: <KawaiiSavedIcon size={24} /> },
    { id: 'journal', label: '일기', icon: <KawaiiJournalIcon size={24} /> },
  ] as const;

  const pageTitle = { home: '은혜의 말씀', random: '오늘의 말씀', read: `${selBook.name} ${selChap}장`, plan: '통독', memory: '암송', journal: '묵상 일기', saved: '저장한 말씀', settings: '설정' }[tab];

  const btn = (active: boolean): CSSProperties => ({ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, minWidth: 0, padding: '9px 12px', borderRadius: 16, border: `1px solid ${active ? 'rgba(255,255,255,0.72)' : th.line}`, background: active ? `linear-gradient(145deg, ${th.butter}, ${th.peach})` : th.solid, color: th.text, cursor: 'pointer', fontWeight: 800, fontSize: 12, fontFamily: 'inherit', boxShadow: th.soft });
  const circle = (active: boolean): CSSProperties => ({ width: 38, height: 38, borderRadius: 16, border: `1px solid ${active ? 'rgba(255,255,255,0.72)' : th.line}`, background: active ? `linear-gradient(145deg, ${th.lavender}, ${th.mint})` : th.solid, color: active ? '#fff' : th.text, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: th.soft, flex: '0 0 auto' });
  const installBtn = (active: boolean): CSSProperties => ({ minWidth: 78, height: 38, borderRadius: 16, border: `1px solid ${active ? 'rgba(255,255,255,0.72)' : th.line}`, background: active ? `linear-gradient(145deg, ${th.lavender}, ${th.mint})` : th.solid, color: active ? '#fff' : th.text, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5, boxShadow: th.soft, flex: '0 0 auto', fontFamily: 'inherit', fontWeight: 900, fontSize: 11 });
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
  const moveSavedVerse = (fromRef: string, toRef: string) => {
    if (fromRef === toRef) return;
    const fromIndex = saved.findIndex(item => item.ref === fromRef);
    const toIndex = saved.findIndex(item => item.ref === toRef);
    if (fromIndex < 0 || toIndex < 0) return;
    const next = [...saved];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    saveSaved(next);
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
  const openCuratedDetail = (v: BibleVerse) => {
    const devotion = getDailyDevotion(v);
    setDetail({ ref: `${v.book} ${v.chapter}:${v.verse}`, text: v.content, ...devotion });
  };
  const openVerseDetail = (ref: string, text: string) => {
    const initial = detailFor(ref, text);
    const cached = readCachedVerseDevotion(ref, text);
    setDetail(cached ? { ref, text, ...cached, fromCache: true } : initial);
  };
  const installApp = async () => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
    if (isStandalone) {
      alert('이미 앱이 설치되어 있습니다. 홈 화면의 아이콘을 통해 이용해 주세요!');
      return;
    }

    if (installPrompt?.prompt) {
      const result = await installPrompt.prompt();
      console.log('Install prompt result:', result);
      setInstallPrompt(null);
      return;
    }

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS) {
      alert('iPhone/iPad에서는 브라우저 하단의 [공유] 버튼을 누른 후, [홈 화면에 추가]를 선택하시면 바탕화면에 아이콘이 생성됩니다.');
    } else {
      alert('브라우저 메뉴(우측 상단 또는 하단 점 세개)에서 "앱 설치" 또는 "홈 화면에 추가"를 선택하시면 바탕화면에 아이콘이 생성됩니다.');
    }
  };
  const startJournalFromReading = (reference: string, note = '') => {
    setJournalRef(reference);
    setJournalNote(note);
    setShowJournalForm(true);
    setTab('journal');
  };

  const handleGoToMemory = (verse: { ref: string; text: string }) => {
    if (!isVerseMemorized(verse.ref, verse.text)) {
      addMemoryVerse({
        ref: verse.ref,
        text: verse.text,
      });
      confetti({ particleCount: 40, spread: 45, origin: { y: 0.7 } });
    }
    setDetail(null);
    setTab('memory');
  };

  function InsightBlocks({ title, meditation, prayer, application }: { title?: string; meditation?: string; prayer?: string; application?: string }) {
    const hasInsight = Boolean(meditation || prayer);
    if (!hasInsight) {
      return <div className="serif-verse" style={{ borderRadius: 18, background: th.solid, border: `1px solid ${th.line}`, padding: 13, color: th.sub, fontSize: '0.9rem', lineHeight: 1.75 }}>
        이 구절의 묵상과 기도문은 아직 생성되지 않았습니다. 아래 버튼을 누르면 이 본문에 맞춰 빠르게 생성합니다.
      </div>;
    }
    return <div style={{ display: 'grid', gap: 8 }}>
      {meditation && <div className="serif-verse" style={{ borderRadius: 18, background: th.solid, border: `1px solid ${th.line}`, padding: 13 }}><div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7, color: th.accent, fontWeight: 900, fontSize: 12 }}><KawaiiVerseIcon size={18} /><span>{title || '묵상'}</span></div><div style={{ fontSize: '0.94rem', lineHeight: 1.85, color: th.text }}>{meditation}</div></div>}
      {application && <div className="serif-verse" style={{ borderRadius: 18, background: th.solid, border: `1px solid ${th.line}`, padding: 13 }}><div style={{ color: th.accent, fontWeight: 900, fontSize: 12, marginBottom: 7 }}>오늘 적용</div><div style={{ fontSize: '0.92rem', lineHeight: 1.75, color: th.text }}>{application}</div></div>}
      {prayer && <div className="serif-verse" style={{ borderRadius: 18, background: th.solid, border: `1px solid ${th.line}`, padding: 13 }}><div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7, color: th.accent, fontWeight: 900, fontSize: 12 }}><KawaiiPrayerIcon size={18} /><span>기도문</span></div><div style={{ fontSize: '0.94rem', lineHeight: 1.85, color: th.text, fontStyle: 'normal' }}>{prayer}</div></div>}
    </div>;
  }

  function VerseCard({ v, large = false }: { v: BibleVerse; large?: boolean }) {
    const ref = `${v.book} ${v.chapter}:${v.verse}`;
    const devotion = getDailyDevotion(v);
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
      <div style={{ padding: '0 14px 14px' }}><InsightBlocks {...devotion} /></div>
    </article>;
  }

  const navigateToBible = (bookId: string, chapter: number) => {
    const book = BIBLE_BOOKS.find(b => b.id === bookId);
    if (book) {
      setSelBook(book);
      setSelChap(chapter);
      setTab('read');
      setDetail(null);
      window.scrollTo(0, 0);
    }
  };

  const handleNavigateToRange = () => {
    if (!todayReadingTask) return;
    const range = convertTaskToBibleRange(todayReadingTask);
    setActiveReadingRange(range);
    setTab('read');
    window.scrollTo(0, 0);
  };

  const handleStartPlan = (templateId: string) => {
    const template = READING_PLAN_TEMPLATES.find((t: any) => t.id === templateId);
    if (template) {
      setReadingProgress(startReadingPlan(template));
    }
  };

  const handleSearchNavigate = (verse: import('./types/bible').BibleVerseRecord) => {
    const book = BIBLE_BOOKS.find(b => b.id === verse.bookId);
    if (book) {
      setSelBook(book);
      setSelChap(verse.chapter);
      setTab('read');
      setActiveReadingRange(null);
      setIsSearchOpen(false);
      // We can also set a highlighted verse state if we want
      window.scrollTo(0, 0);
    }
  };

  return <div style={{ minHeight: '100vh', background: th.bg, color: th.text, fontFamily: "'S-Core Dream', sans-serif" }}>
    {isSearchOpen && <BibleSearchSheet onClose={() => setIsSearchOpen(false)} onNavigate={handleSearchNavigate} T={th} />}
    
    <main style={{ position: 'relative', zIndex: 2, maxWidth: 1220, margin: '0 auto', padding: '14px 16px 112px', minHeight: '100vh' }}>
      <header style={{ position: 'sticky', top: 0, zIndex: 20, display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0 12px', background: `linear-gradient(180deg, ${th.bg} 74%, transparent)` }}>
        <button aria-label="홈으로 이동" onClick={() => { setDetail(null); setTab('home'); setActiveReadingRange(null); }} style={{ ...circle(tab === 'home'), width: 46, height: 46, borderRadius: 18 }}><KawaiiHomeIcon size={25} /></button>
        <div style={{ minWidth: 0, flex: 1 }}><div className="title-font" style={{ fontSize: 11, color: th.sub, fontWeight: 800 }}>SION BIBLE</div><div className="title-font" style={{ fontWeight: 800, fontSize: '1.15rem', lineHeight: 1.22, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pageTitle}</div></div>
        
        {tab === 'home' ? (
          <>
            <button aria-label="앱 설치" onClick={installApp} style={installBtn(Boolean(installPrompt))}><Download size={16} /><span>APP 설치</span></button>
            <button aria-label="설정" onClick={() => setTab('settings')} style={circle(false)}><KawaiiSettingsIcon size={23} /></button>
          </>
        ) : tab === 'read' ? (
          <button aria-label="성경 검색" onClick={() => setIsSearchOpen(true)} style={circle(false)}><Search size={22} /></button>
        ) : (
          <button aria-label="설정" onClick={() => setTab('settings')} style={circle(tab === 'settings')}><KawaiiSettingsIcon size={23} /></button>
        )}
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
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span style={iconTile(`linear-gradient(145deg, ${th.peach}, ${th.butter})`)}><KawaiiVerseIcon size={25} /></span><div><div className="title-font" style={{ fontSize: 18, fontWeight: 800 }}>오늘 붙들 말씀</div><div style={{ fontSize: 11, color: th.sub }}>{selectedMood ? `${selectedMood}에 관한 말씀` : '오늘의 말씀'}</div></div></div>
                <div style={{ display: 'flex', gap: 6, flex: '0 0 auto' }}><button onClick={nextHomeVerse} style={{ ...btn(false), padding: '7px 10px', whiteSpace: 'nowrap' }}>말씀 더보기</button><button onClick={() => toggleSave(`${currentHomeVerse.book} ${currentHomeVerse.chapter}:${currentHomeVerse.verse}`, currentHomeVerse.content, currentHomeVerse.meditation, currentHomeVerse.prayer)} style={{ ...btn(isSaved(`${currentHomeVerse.book} ${currentHomeVerse.chapter}:${currentHomeVerse.verse}`)), padding: '7px 10px', whiteSpace: 'nowrap' }}><KawaiiSavedIcon size={17} /><span>저장</span></button></div>
              </div>
              <button onClick={nextHomeVerse} style={{ width: '100%', textAlign: 'left', border: `1px solid ${th.line}`, borderRadius: 22, background: th.card, color: th.text, padding: '15px 16px', fontFamily: 'inherit', cursor: 'pointer', boxShadow: th.soft }}>
                <p style={{ margin: 0, fontSize: fsize, lineHeight: 1.82, wordBreak: 'keep-all' }}>"{currentHomeVerse.content}"</p>
                <div style={{ marginTop: 9, color: th.accent, fontWeight: 900, fontSize: 12 }}>{currentHomeVerse.book} {currentHomeVerse.chapter}:{currentHomeVerse.verse}</div>
              </button>
              <div style={{ display: 'grid', gap: 8, marginTop: 10 }}><div className="serif-verse" style={{ borderRadius: 18, background: th.solid, border: `1px solid ${th.line}`, padding: 13 }}><div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7, color: th.accent, fontWeight: 900, fontSize: 12 }}><KawaiiMeditationIcon size={18} /><span>{currentHomeDevotion.title || '묵상'}</span></div><div style={{ fontSize: fsize, lineHeight: 1.8 }}>{currentHomeDevotion.meditation}</div></div><div className="serif-verse" style={{ borderRadius: 18, background: th.solid, border: `1px solid ${th.line}`, padding: 13 }}><div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7, color: th.accent, fontWeight: 900, fontSize: 12 }}><KawaiiPrayerIcon size={18} /><span>기도문</span></div><div style={{ fontSize: fsize, lineHeight: 1.8 }}>{currentHomeDevotion.prayer}</div></div></div>
            </section>

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

      {tab === 'read' && (
        <div style={{ display: 'grid', gap: 12 }}>
          <BibleVersePicker
            mode="read"
            initialBook={selBook}
            initialChapter={selChap}
            onVerseClick={(v) => openVerseDetail(v.ref, v.text)}
            onToggleSave={(v) => toggleSave(v.ref, v.text)}
            isSaved={(ref) => isSaved(ref)}
            onCopy={(text) => { navigator.clipboard.writeText(text); alert('클립보드에 복사되었습니다.'); }}
            fontSize={fsize}
            readingRange={activeReadingRange}
            onExitRange={handleCompleteReadingFromRange}
          />
        </div>
      )}

      {tab === 'plan' && <ReadingPlanHome T={th} progress={readingProgress} onToggleDay={handleToggleReadingDay} onStartPlan={handleStartPlan} onSaveJournal={startJournalFromReading} onNavigateToBible={navigateToBible} onNavigateToRange={handleNavigateToRange} onTodayTaskLoaded={setTodayReadingTask} />}

      {tab === 'memory' && <MemoryHome T={th} savedVerses={saved} />}

      {tab === 'saved' && <div style={{ display: 'grid', gap: 12 }}>
        <Card 
          title="다시 읽는 말씀" 
          subtitle="일별, 주별, 월별, 주제별, 권별로 정리" 
          T={th} 
          compact
          headerAction={
            <button 
              onClick={() => setIsReorderingSaved(v => !v)} 
              style={{ 
                ...btn(isReorderingSaved), 
                padding: '6px 10px', 
                borderRadius: 12, 
                fontSize: 10,
                height: 32,
                gap: 4
              }}
            >
              <span>순서변경</span>
              <GripVertical size={14} />
            </button>
          }
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {([['date', '일별'], ['week', '주별'], ['month', '월별']] as const).map(([mode, label]) => (
                <button key={mode} onClick={() => setSavedMode(mode)} style={chip(savedMode === mode)}>{label}</button>
              ))}
              <button 
                onClick={() => setSavedMode('topic')} 
                style={{ 
                  ...chip(savedMode === 'topic'), 
                  background: savedMode === 'topic' ? `linear-gradient(145deg, ${th.peach}, ${th.butter})` : th.solid,
                  borderColor: savedMode === 'topic' ? 'rgba(255,255,255,0.72)' : th.line
                }}
              >
                주제별
              </button>
              <button 
                onClick={() => setSavedMode('book')} 
                style={{ 
                  ...chip(savedMode === 'book'), 
                  background: savedMode === 'book' ? `linear-gradient(145deg, ${th.mint}, #88d4d1)` : th.solid,
                  borderColor: savedMode === 'book' ? 'rgba(255,255,255,0.72)' : th.line
                }}
              >
                권별
              </button>
            </div>
          </div>
          {saved.length === 0 && <div style={{ color: th.sub, fontSize: 14 }}>저장된 말씀이 없습니다.</div>}
          {isReorderingSaved && <div style={{ color: th.sub, fontSize: 11, marginBottom: 8 }}>카드를 길게 잡고 원하는 위치로 끌어 옮겨보세요.</div>}
          <div style={{ display: 'grid', gap: 12 }}>{savedGroups.map(([label, items]) => <section key={label} style={{ display: 'grid', gap: 7 }}><div style={{ display: 'flex', alignItems: 'center', gap: 6, color: th.sub, fontWeight: 900, fontSize: 12 }}><KawaiiCalendarIcon size={17} />{label}</div>{items.map(s => <button key={`${label}-${s.ref}`} draggable={isReorderingSaved} onDragStart={() => setDraggedSavedRef(s.ref)} onDragOver={e => { if (isReorderingSaved) e.preventDefault(); }} onDrop={e => { e.preventDefault(); if (draggedSavedRef) moveSavedVerse(draggedSavedRef, s.ref); setDraggedSavedRef(null); }} onDragEnd={() => setDraggedSavedRef(null)} onClick={() => { if (!isReorderingSaved) openVerseDetail(s.ref, s.text); }} className={isReorderingSaved ? 'reorder-card' : undefined} style={{ textAlign: 'left', border: `1px solid ${draggedSavedRef === s.ref ? th.accent : th.line}`, borderRadius: 16, background: th.solid, color: th.text, padding: 12, fontFamily: 'inherit', cursor: isReorderingSaved ? 'grab' : 'pointer', boxShadow: th.soft }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}><span style={{ fontWeight: 900, color: th.accent, fontSize: 13 }}>{s.ref}</span><span onClick={e => { e.stopPropagation(); if (!isReorderingSaved) toggleSave(s.ref, s.text); }}>{isReorderingSaved ? <GripVertical size={14} color={th.sub} /> : <X size={13} color={th.sub} />}</span></div><div style={{ fontSize: fsize, lineHeight: 1.85, wordBreak: 'keep-all' }}>"{s.text}"</div></button>)}</section>)}</div>
        </Card>
      </div>}

      {tab === 'journal' && <div style={{ display: 'grid', gap: 12 }}>
        <Card title="오늘 받은 은혜" subtitle="저장 화면 안에서 묵상 일기를 함께 관리" T={th} compact>
          <div style={{ marginBottom: 10 }}><button onClick={() => setShowJournalForm(v => !v)} style={btn(true)}><KawaiiJournalIcon size={18} /><span>{showJournalForm ? '닫기' : '새 기록 작성'}</span></button></div>
          {showJournalForm && <form onSubmit={saveJournal} style={{ display: 'grid', gap: 8, marginBottom: 12 }}><input value={journalRef} onChange={e => setJournalRef(e.target.value)} placeholder="관련 말씀" style={inputStyle(th)} /><textarea value={journalNote} onChange={e => setJournalNote(e.target.value)} rows={5} placeholder="묵상과 기도를 적어보세요" style={{ ...inputStyle(th), resize: 'vertical', lineHeight: 1.8 }} /><div style={{ display: 'flex', gap: 8 }}><button type="submit" style={btn(true)}>저장하기</button><button type="button" onClick={() => setShowJournalForm(false)} style={btn(false)}>취소</button></div></form>}
          <div style={{ display: 'grid', gap: 8 }}>{journals.length === 0 && <div style={{ color: th.sub, fontSize: 14 }}>아직 작성된 묵상 일기가 없습니다.</div>}{journals.map(j => <div key={j.id} style={{ borderRadius: 16, border: `1px solid ${th.line}`, background: th.solid, padding: 12 }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}><div><div style={{ fontWeight: 900, fontSize: 13 }}>{j.ref}</div><div style={{ fontSize: 10, color: th.sub }}>{j.date}</div></div><button onClick={() => deleteJournal(j.id)} style={circle(false)}><X size={12} /></button></div><div style={{ fontSize: 13, lineHeight: 1.85, wordBreak: 'keep-all' }}>{j.note}</div></div>)}</div>
        </Card>
      </div>}
      {tab === 'settings' && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 12 }} className="screen-grid"><Card title="테마" subtitle="감성 전환" T={th} compact><div style={{ display: 'grid', gap: 8 }}>{([['a-soft', 'Soft'], ['a-dark', 'Dark']] as const).map(([k, l]) => <button key={k} onClick={() => { setTheme(k); localStorage.setItem(LS.THEME, k); }} style={{ ...btn(theme === k), justifyContent: 'flex-start' }}><KawaiiVerseIcon size={18} />{l}</button>)}</div></Card><Card title="글자 크기" subtitle="본문 크기" T={th} compact><div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 7 }}>{([['sm','작게'],['base','보통'],['lg','크게'],['xl','아주 크게']] as const).map(([k,l]) => <button key={k} onClick={() => { setFontSize(k); localStorage.setItem(LS.SIZE, k); }} style={chip(fontSize === k)}>{l}</button>)}</div></Card><Card title="앱 설치" subtitle="홈 화면에 추가" T={th} compact><button disabled={!installPrompt} onClick={async () => { await installPrompt?.prompt?.(); setInstallPrompt(null); }} style={{ ...btn(Boolean(installPrompt)), opacity: installPrompt ? 1 : 0.55 }}>설치하기</button></Card></div>}
    </main>

    <nav style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 90, padding: '8px 8px calc(8px + env(safe-area-inset-bottom))', background: `linear-gradient(180deg, transparent, ${th.bg} 18%, ${th.bg})` }}><div style={{ maxWidth: 540, margin: '0 auto', display: 'grid', gridTemplateColumns: `repeat(${navItems.length}, 1fr)`, gap: 4, borderRadius: 22, background: th.panel, border: `1px solid ${th.line}`, boxShadow: th.shadow, padding: 6 }}>{navItems.map(n => <button key={n.id} aria-label={`${n.label} 탭`} onClick={() => setTab(n.id)} style={{ minWidth: 0, minHeight: 48, borderRadius: 15, border: `1px solid ${tab === n.id ? th.accent : 'transparent'}`, background: tab === n.id ? th.pill : 'transparent', color: tab === n.id ? th.accent : th.sub, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, cursor: 'pointer', fontFamily: 'inherit', fontWeight: tab === n.id ? 900 : 700, fontSize: 9 }}>{n.icon}<span>{n.label}</span></button>)}</div></nav>


    {detail && <div style={{ position: 'fixed', inset: 0, zIndex: 120, display: 'flex', alignItems: 'flex-end' }}><div onClick={() => setDetail(null)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.38)', backdropFilter: 'blur(4px)' }} /><div style={{ position: 'relative', width: '100%', maxHeight: '85vh', overflowY: 'auto', background: th.panel, borderTopLeftRadius: 26, borderTopRightRadius: 26, border: `1px solid ${th.line}`, padding: 16 }}><div style={{ width: 38, height: 4, borderRadius: 4, background: th.line, margin: '0 auto 12px' }} /><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}><div style={{ fontWeight: 900, color: th.accent, fontSize: 15 }}>{detail.ref}</div><button onClick={() => setDetail(null)} style={circle(false)}><X size={12} /></button></div><div style={{ borderRadius: 18, background: th.solid, border: `1px solid ${th.line}`, padding: 14, marginBottom: 10 }}><div style={{ fontSize: fsize, lineHeight: 1.9, wordBreak: 'keep-all' }}>"{detail.text}"</div></div><VerseDevotionPanel selectedVerse={detail} onGoToMemory={handleGoToMemory} fontSize={fsize} /></div></div>}

    <style>{`
      * { box-sizing: border-box; }
      @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      @keyframes savedWiggle { 0%, 100% { transform: rotate(-0.35deg) translateY(0); } 50% { transform: rotate(0.35deg) translateY(-1px); } }
      .reorder-card { animation: savedWiggle 0.22s ease-in-out infinite; touch-action: none; }
      @media (max-width: 900px) { .screen-grid { grid-template-columns: 1fr !important; } .compact-menu-grid { grid-template-columns: repeat(2, minmax(0,1fr)) !important; } }
      @media (max-width: 680px) { .mood-chip-grid { grid-template-columns: repeat(4, minmax(0,1fr)) !important; } }
      @media (max-width: 520px) { .book-grid { grid-template-columns: repeat(3,1fr) !important; } .detail-actions { grid-template-columns: repeat(2,1fr) !important; } .mood-chip-grid { grid-template-columns: repeat(3, minmax(0,1fr)) !important; } }
    `}</style>
  </div>;
}

function Card({ title, subtitle, T, compact = false, headerAction, children }: { title: string; subtitle: string; T: any; compact?: boolean; headerAction?: React.ReactNode; children: React.ReactNode }) {
  const icon = getCardIcon(title);
  return <section className="surface-card" style={{ borderRadius: 24, background: T.panel, border: `1px solid ${T.line}`, boxShadow: T.shadow, padding: compact ? 13 : 16 }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 9, marginBottom: compact ? 9 : 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        {icon && <span style={{ width: 34, height: 34, borderRadius: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: T.solid, border: `1px solid ${T.line}`, color: T.accent }}>{icon}</span>}
        <div>
          <div className="title-font" style={{ fontWeight: 800, fontSize: compact ? 18 : 22, lineHeight: 1.16 }}>{title}</div>
          <div style={{ color: T.sub, fontSize: 11, marginTop: 3 }}>{subtitle}</div>
        </div>
      </div>
      {headerAction && <div style={{ flexShrink: 0 }}>{headerAction}</div>}
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





