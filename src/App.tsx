import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Bookmark, BookmarkCheck, CheckSquare, ChevronLeft, ChevronRight, Copy, Download, GripVertical, Loader2, Send, X, Search } from 'lucide-react';
import confetti from 'canvas-confetti';
import { decodeHtml } from './utils/textUtils';
import { BIBLE_BOOKS } from './data/bibleBooks';
import { BIBLE_VERSES, type BibleVerse } from './data/verses';
import { KawaiiApplicationIcon, KawaiiAudioIcon, KawaiiBibleIcon, KawaiiCalendarIcon, KawaiiComfortIcon, KawaiiHomeIcon, KawaiiJournalIcon, KawaiiMeditationIcon, KawaiiPrayerIcon, KawaiiRandomIcon, KawaiiSavedIcon, KawaiiSettingsIcon, KawaiiShareIcon, KawaiiVerseIcon, KawaiiWisdomIcon } from './components/icons';
import { ReadingPlanHome } from './components/readingPlan/ReadingPlanHome';
import { MemoryHome } from './components/memory/MemoryHome';
import { getDailyDevotion } from './services/dailyDevotions';
import { readCachedVerseDevotion } from './services/verseDevotionApi';
import { VerseDevotionPanel } from './components/bible/VerseDevotionPanel';
import { ChapterNavigatorSheet } from './components/bible/ChapterNavigatorSheet';
import { AppNavIcon } from './components/ui/AppNavIcon';
import { addMemoryVerse, isVerseMemorized } from './services/memoryStorage';
import { BibleVersePicker } from './components/bible/BibleVersePicker';
import { convertTaskToBibleRange } from './services/readingPlanToBibleRange';
import type { ReadingDayTask, ReadingPlanTemplate } from './types/readingPlan';
import type { BibleReadRange } from './types/bible';

import { getActiveReadingPlan, toggleReadingDay, completeReadingDay, startReadingPlan } from './services/readingPlanStorage';
import { ALL_READING_PLAN_TEMPLATES } from './data/readingPlans';
import { BibleSearchSheet } from './components/bible/BibleSearchSheet';
import { usePwaInstall } from './hooks/usePwaInstall';
import { PwaInstallGuideSheet } from './components/pwa/PwaInstallGuideSheet';

interface SavedVerse { ref: string; text: string; date?: string; meditation?: string; prayer?: string; }
interface VerseDetail { ref: string; text: string; title?: string; meditation?: string; prayer?: string; application?: string; model?: string; fromCache?: boolean; }
interface JournalEntry { id: string; ref: string; date: string; [key: string]: unknown; }
interface ReadSelectedVerse { ref: string; text: string; verse: number; }

type Tab = 'home' | 'random' | 'read' | 'plan' | 'memory' | 'saved' | 'settings';
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
const MOOD_KEYWORDS: Record<Mood, string[]> = {
  '평안': ['평안', '평강', '안식', '평화', '안위', '쉬게'],
  '감사': ['감사', '찬양', '송축', '기뻐', '즐거워', '은혜'],
  '불안': ['평안', '두려워', '함께', '염려', '근심', '강하고'],
  '소망': ['소망', '약속', '기다', '새 일', '영원', '미래'],
  '회개': ['회개', '용서', '깨끗', '자백', '돌이', '자비'],
  '위로': ['위로', '눈물', '고난', '힘', '함께', '상한'],
  '사랑': ['사랑', '자비', '긍휼', '은혜', '오래', '친절'],
  '용서': ['용서', '긍휼', '사랑', '자비', '일흔', '화목'],
  '두려움': ['두려워', '함께', '놀라지', '능력', '강하고', '담대'],
  '지혜': ['지혜', '명철', '길', '깨달', '훈계', '정직'],
  '능력': ['능력', '권능', '힘', '능치', '강한', '역사'],
  '축복': ['복', '축복', '형통', '은택', '넘치', '복이'],
};
const FS: Record<FontSize, string> = { sm: '0.9rem', base: '1rem', lg: '1.13rem', xl: '1.25rem' };
const LS = { SAVED: 'gb_saved', JOURNAL: 'gb_journal', THEME: 'gb_theme', SIZE: 'gb_size', LAST_BOOK: 'gb_last_book', LAST_CHAP: 'gb_last_chap', DAILY_DATE: 'gb_daily_date', DAILY_IDX: 'gb_daily_idx', CUSTOM_PLANS: 'gb_custom_reading_plans' };

function TH(theme: Theme) {
  return {
    'a-soft': { 
      bg: '#F1EEE7', 
      panel: '#FFFCF7', 
      card: '#FFFFFF', 
      solid: '#F8F3EC', 
      line: '#E4D8CA', 
      text: '#342D27', 
      sub: '#756B61', 
      accent: '#6F8F72', 
      pill: 'rgba(255,255,255,0.88)', 
      peach: '#E9A86F', 
      mint: '#86B7AD', 
      butter: '#F4D79F', 
      lavender: '#9E97C9', 
      shadow: '0 14px 36px rgba(52,45,39,0.08)', 
      soft: '0 8px 20px rgba(52,45,39,0.05)' 
    },
    'a-dark': { bg: '#24312E', panel: 'linear-gradient(145deg, rgba(50,68,63,0.96), rgba(38,54,50,0.98))', card: 'linear-gradient(150deg, rgba(54,73,67,0.98), rgba(75,64,59,0.94) 52%, rgba(37,56,58,0.98))', solid: 'rgba(255,255,255,0.08)', line: 'rgba(255,255,255,0.13)', text: '#fff8ef', sub: '#d8cbc0', accent: '#f2cf87', pill: 'rgba(255,255,255,0.12)', peach: '#f0a77e', mint: '#9fd1c4', butter: '#f2cf87', lavender: '#b9addc', shadow: '0 18px 42px rgba(10,18,17,0.26)', soft: '0 10px 24px rgba(10,18,17,0.18)' },
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

function getInitialReadingLocation() {
  try {
    const lastBookId = localStorage.getItem(LS.LAST_BOOK);
    const lastChapter = Number(localStorage.getItem(LS.LAST_CHAP));
    const book = BIBLE_BOOKS.find(item => item.id === lastBookId) ?? BIBLE_BOOKS[42];
    const chapter = Number.isFinite(lastChapter) && lastChapter >= 1 && lastChapter <= book.chapters ? lastChapter : 3;
    return { book, chapter };
  } catch {
    return { book: BIBLE_BOOKS[42], chapter: 3 };
  }
}

export default function App() {
  const initialReadingLocation = useMemo(() => getInitialReadingLocation(), []);
  const [tab, setTab] = useState<Tab>('home');
  const [theme, setTheme] = useState<Theme>('a-soft');
  const [fontSize, setFontSize] = useState<FontSize>('base');
  const [homeHistory, setHomeHistory] = useState<BibleVerse[]>([]);
  const [homeIndex, setHomeIndex] = useState(0);
  const [selCat, setSelCat] = useState<Category>('전체');
  const [rndVerse, setRndVerse] = useState<BibleVerse | null>(null);
  const [rndLoading, setRndLoading] = useState(false);
  const [selBook, setSelBook] = useState(initialReadingLocation.book);
  const [selChap, setSelChap] = useState(initialReadingLocation.chapter);
  const [saved, setSaved] = useState<SavedVerse[]>([]);
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [savedMode, setSavedMode] = useState<SavedGroupMode>('date');
  const [isReorderingSaved, setIsReorderingSaved] = useState(false);
  const [draggedSavedRef, setDraggedSavedRef] = useState<string | null>(null);
  const [detail, setDetail] = useState<VerseDetail | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [selectedMood, setSelectedMood] = useState<Mood | null>(null);
  const [todayReadingTask, setTodayReadingTask] = useState<ReadingDayTask | null>(null);
  const [activeReadingRange, setActiveReadingRange] = useState<BibleReadRange | null>(null);
  const [readingProgress, setReadingProgress] = useState<import('./types/readingPlan').ReadingPlanProgress | null>(null);
  const [userReadingTemplates, setUserReadingTemplates] = useState<ReadingPlanTemplate[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isChapterSheetOpen, setIsChapterSheetOpen] = useState(false);
  const [homeDevotion, setHomeDevotion] = useState<import('./services/verseDevotionApi').VerseDevotionResult | null>(null);
  const [homeDevotionLoading, setHomeDevotionLoading] = useState(false);
  const [isPwaGuideOpen, setIsPwaGuideOpen] = useState(false);
  const [isReadSelectMode, setIsReadSelectMode] = useState(false);
  const [readSelectedVerses, setReadSelectedVerses] = useState<ReadSelectedVerse[]>([]);
  const [readSelectionResetKey, setReadSelectionResetKey] = useState(0);
  const [isNavVisible, setIsNavVisible] = useState(true);
  const allReadingPlanTemplates = useMemo(
    () => [...ALL_READING_PLAN_TEMPLATES, ...userReadingTemplates],
    [userReadingTemplates],
  );
  
  const { 
    platform, 
    isInstalled, 
    canInstall, 
    install, 
    instructions, 
    buttonLabel, 
    guideTitle,
  } = usePwaInstall();

  useEffect(() => {
    setReadingProgress(getActiveReadingPlan());
  }, []);

  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const nextY = window.scrollY;
      if (Math.abs(nextY - lastY) < 8) return;
      setIsNavVisible(nextY < lastY || nextY < 32);
      lastY = nextY;
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (tab !== 'read') {
      setIsReadSelectMode(false);
      setReadSelectedVerses([]);
      setReadSelectionResetKey(k => k + 1);
    }
  }, [tab]);

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
  const currentHomeDevotion = homeDevotion ?? getDailyDevotion(currentHomeVerse);
  const recentJournals = journals.slice(0, 2);

  // Sync AI devotion for currentHomeVerse
  useEffect(() => {
    let active = true;
    const fetchDevotion = async () => {
      const ref = `${currentHomeVerse.book} ${currentHomeVerse.chapter}:${currentHomeVerse.verse}`;
      const text = currentHomeVerse.content;
      
      // First check curated/cache
      const cached = readCachedVerseDevotion(ref, text);
      if (cached) {
        setHomeDevotion(cached);
        setHomeDevotionLoading(false);
        return;
      }

      setHomeDevotionLoading(true);
      const { getOrGenerateVerseDevotion } = await import('./services/verseDevotionApi');
      const { result } = await getOrGenerateVerseDevotion({ ref, verseText: text });
      
      if (active) {
        setHomeDevotion(result);
        setHomeDevotionLoading(false);
      }
    };

    fetchDevotion();
    return () => { active = false; };
  }, [currentHomeVerse]);

  const handleSelectChapter = ({ bookId, chapter }: { bookId: string; bookName: string; chapter: number }) => {
    const book = BIBLE_BOOKS.find(b => b.id === bookId);
    if (book) {
      setSelBook(book);
      setSelChap(chapter);
      localStorage.setItem(LS.LAST_BOOK, bookId);
      localStorage.setItem(LS.LAST_CHAP, String(chapter));
    }
    setIsChapterSheetOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    try { const s = localStorage.getItem(LS.SAVED); if (s) setSaved(JSON.parse(s)); } catch {}
    try { const j = localStorage.getItem(LS.JOURNAL); if (j) setJournals(JSON.parse(j)); } catch {}
    try { const plans = localStorage.getItem(LS.CUSTOM_PLANS); if (plans) setUserReadingTemplates(JSON.parse(plans)); } catch {}
    const t = localStorage.getItem(LS.THEME) as Theme | null; if (t) setTheme(t);
    const sz = localStorage.getItem(LS.SIZE) as FontSize | null; if (sz) setFontSize(sz);
    setHomeHistory([BIBLE_VERSES[getDailyIdx()]]);
    return () => { window.speechSynthesis?.cancel(); };
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

  const NAV_ICON_TUNING = {
    home: { scale: 1.0, nudgeX: 0, nudgeY: 0 },
    read: { scale: 0.96, nudgeX: 0, nudgeY: 1 },
    plan: { scale: 0.98, nudgeX: 0, nudgeY: 0 },
    memory: { scale: 0.95, nudgeX: 0, nudgeY: 1 },
    saved: { scale: 0.98, nudgeX: 0, nudgeY: 0 },
  } as const;

  const navItems = [
    { id: 'home', label: '홈', icon: <KawaiiHomeIcon size={24} />, ...NAV_ICON_TUNING.home },
    { id: 'read', label: '성경', icon: <KawaiiBibleIcon size={24} />, ...NAV_ICON_TUNING.read },
    { id: 'plan', label: '통독', icon: <KawaiiApplicationIcon size={24} />, ...NAV_ICON_TUNING.plan },
    { id: 'memory', label: '암송', icon: <KawaiiWisdomIcon size={24} />, ...NAV_ICON_TUNING.memory },
    { id: 'saved', label: '저장', icon: <KawaiiSavedIcon size={24} />, ...NAV_ICON_TUNING.saved },
  ] as const;

  const pageTitle = { home: '은혜의 말씀', random: '오늘의 말씀', read: activeReadingRange?.label ?? `${selBook.name} ${selChap}장`, plan: '통독', memory: '암송', saved: '저장한 말씀', settings: '설정' }[tab];

  const pageIcon = tab === 'read'
    ? <KawaiiBibleIcon size={25} />
    : tab === 'plan'
      ? <KawaiiApplicationIcon size={25} />
      : tab === 'memory'
        ? <KawaiiWisdomIcon size={25} />
        : tab === 'saved'
          ? <KawaiiSavedIcon size={25} />
          : tab === 'settings'
            ? <KawaiiSettingsIcon size={25} />
            : <KawaiiHomeIcon size={25} />;
  const currentBookIndex = BIBLE_BOOKS.findIndex(book => book.id === selBook.id);
  const canGoPreviousChapter = currentBookIndex > 0 || selChap > 1;
  const canGoNextChapter = currentBookIndex < BIBLE_BOOKS.length - 1 || selChap < selBook.chapters;
  const navigateChapterBy = (delta: -1 | 1) => {
    let nextBook = selBook;
    let nextChapter = selChap + delta;

    if (nextChapter < 1) {
      if (currentBookIndex <= 0) return;
      nextBook = BIBLE_BOOKS[currentBookIndex - 1];
      nextChapter = nextBook.chapters;
    } else if (nextChapter > selBook.chapters) {
      if (currentBookIndex >= BIBLE_BOOKS.length - 1) return;
      nextBook = BIBLE_BOOKS[currentBookIndex + 1];
      nextChapter = 1;
    }

    handleBibleNavigate(nextBook, nextChapter);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearReadSelection = () => {
    setReadSelectedVerses([]);
    setReadSelectionResetKey(k => k + 1);
  };

  const toggleReadSelectMode = () => {
    setIsReadSelectMode(active => {
      const next = !active;
      if (!next) clearReadSelection();
      return next;
    });
  };

  const copyReadSelection = async () => {
    if (readSelectedVerses.length === 0) return;
    const text = readSelectedVerses
      .map(item => `${decodeHtml(item.text)}\n${item.ref}`)
      .join('\n\n');
    await navigator.clipboard.writeText(text);
    alert('선택한 말씀이 복사되었습니다.');
  };

  const saveReadSelection = () => {
    if (readSelectedVerses.length === 0) return;
    const next = [...saved];
    readSelectedVerses.forEach(item => {
      if (!next.some(savedItem => savedItem.ref === item.ref)) {
        next.unshift({ ref: item.ref, text: item.text, date: new Date().toISOString() });
      }
    });
    saveSaved(next);
    confetti({ particleCount: 42, spread: 45, origin: { y: 0.78 } });
  };

  const sendReadSelectionToMemory = () => {
    if (readSelectedVerses.length === 0) return;
    let addedCount = 0;
    readSelectedVerses.forEach(item => {
      if (!isVerseMemorized(item.ref, item.text)) {
        addMemoryVerse({ ref: item.ref, text: item.text });
        addedCount++;
      }
    });
    if (addedCount > 0) confetti({ particleCount: 46, spread: 48, origin: { y: 0.76 } });
    alert(addedCount > 0 ? '암송 목록으로 보냈습니다.' : '이미 암송 목록에 있는 말씀입니다.');
  };

  const btn = (active: boolean): CSSProperties => ({ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, minWidth: 0, padding: '9px 12px', borderRadius: 12, border: active ? 'none' : `1px solid ${th.line}`, background: active ? `linear-gradient(145deg, ${th.mint}, ${th.accent})` : th.card, color: active ? '#fff' : th.text, cursor: 'pointer', fontWeight: 800, fontSize: 12, fontFamily: 'inherit', boxShadow: active ? '0 10px 20px rgba(74, 112, 86, 0.2)' : th.soft, outline: 'none', WebkitTapHighlightColor: 'transparent' });
  const circle = (active: boolean): CSSProperties => ({ width: 38, height: 38, borderRadius: 13, border: `1px solid ${active ? 'rgba(255,255,255,0.7)' : th.line}`, background: active ? `linear-gradient(145deg, ${th.butter}, ${th.peach})` : th.card, color: th.text, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: active ? '0 8px 16px rgba(126, 89, 55, 0.16)' : th.soft, flex: '0 0 auto', outline: 'none', WebkitTapHighlightColor: 'transparent' });
  const installBtn = (active: boolean): CSSProperties => ({ minWidth: 78, height: 38, borderRadius: 12, border: active ? 'none' : `1px solid ${th.line}`, background: active ? `linear-gradient(145deg, ${th.accent}, ${th.mint})` : th.card, color: active ? '#fff' : th.text, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5, boxShadow: active ? '0 10px 20px rgba(74, 112, 86, 0.2)' : th.soft, flex: '0 0 auto', fontFamily: 'inherit', fontWeight: 900, fontSize: 11, outline: 'none', WebkitTapHighlightColor: 'transparent' });
  const chip = (active: boolean): CSSProperties => ({ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '7px 10px', minHeight: 32, borderRadius: 999, border: active ? 'none' : `1px solid ${th.line}`, background: active ? `linear-gradient(145deg, ${th.accent}, ${th.mint})` : th.card, color: active ? '#fff' : th.sub, cursor: 'pointer', fontWeight: active ? 900 : 700, fontSize: 11, fontFamily: 'inherit', outline: 'none', WebkitTapHighlightColor: 'transparent' });
  const iconTile = (_tone: string): CSSProperties => ({ width: 42, height: 42, borderRadius: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: '0', color: '#fff', boxShadow: 'none', outline: 'none', WebkitTapHighlightColor: 'transparent' });
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
  const copyVerseBlock = async (ref: string, text: string) => {
    await navigator.clipboard.writeText(`${decodeHtml(text)}\n${ref}`);
    alert('복사되었습니다!');
  };
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
  const pickHomeVerse = async (mood = selectedMood): Promise<BibleVerse> => {
    const keywords = mood ? MOOD_KEYWORDS[mood] : CATEGORIES.filter(c => c !== '전체').flatMap(c => MOOD_KEYWORDS[c as Mood] || []);
    const randomKeyword = keywords[Math.floor(Math.random() * keywords.length)];
    
    try {
      const { searchBibleVerses } = await import('./services/bibleSearch');
      const { items } = await searchBibleVerses(randomKeyword, { limit: 50 });
      
      if (items.length > 0) {
        const item = items[Math.floor(Math.random() * items.length)];
        const category = (mood && MOODS.find(m => m.label === mood)?.category) || '평안';
        return {
          id: Date.now(),
          book: item.bookName,
          chapter: String(item.chapter),
          verse: String(item.verse),
          content: item.text,
          contentEn: '',
          category: category as BibleVerse['category'],
          meditation: '',
          prayer: ''
        };
      }
    } catch (e) {
      console.error('Failed to pick home verse from full index', e);
    }
    
    // Fallback to curated verses
    const category = mood ? MOODS.find(item => item.label === mood)?.category : null;
    const pool = category ? BIBLE_VERSES.filter(v => v.category === category) : BIBLE_VERSES;
    return pool[Math.floor(Math.random() * pool.length)];
  };
  function pickRandom(category = selCat) {
    setRndLoading(true);
    const pool = category === '전체' ? BIBLE_VERSES : BIBLE_VERSES.filter(v => v.category === category);
    window.setTimeout(() => { setRndVerse(pool[Math.floor(Math.random() * pool.length)]); setRndLoading(false); confetti({ particleCount: 32, spread: 38, origin: { y: 0.55 } }); }, 220);
  }
  const chooseMood = async (mood: Mood) => {
    const nextMood = selectedMood === mood ? null : mood;
    setSelectedMood(nextMood);
    const pick = await pickHomeVerse(nextMood);
    setHomeHistory(prev => [...prev.slice(0, homeIndex + 1), pick]);
    setHomeIndex(homeIndex + 1);
  };
  const nextHomeVerse = async () => {
    if (homeIndex < homeHistory.length - 1) { setHomeIndex(homeIndex + 1); return; }
    const pick = await pickHomeVerse();
    setHomeHistory(prev => [...prev, pick]); setHomeIndex(homeIndex + 1);
  };

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
    if (isInstalled) return;

    const { outcome } = await install();
    
    if (outcome === 'manual-guide-required' || outcome === 'open-safari-guide-required' || outcome === 'unavailable') {
      setIsPwaGuideOpen(true);
    }
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
      handleBibleNavigate(book, chapter);
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

  const handleNavTab = (nextTab: Tab) => {
    if (nextTab !== 'read') {
      setActiveReadingRange(null);
      clearReadSelection();
    }
    setTab(nextTab);
  };

  const handleBibleNavigate = (book: import('./data/bibleBooks').BibleBook, chapter: number) => {
    setSelBook(book);
    setSelChap(chapter);
    localStorage.setItem(LS.LAST_BOOK, book.id);
    localStorage.setItem(LS.LAST_CHAP, chapter.toString());
    clearReadSelection();
  };

  const saveUserReadingTemplates = (templates: ReadingPlanTemplate[]) => {
    setUserReadingTemplates(templates);
    localStorage.setItem(LS.CUSTOM_PLANS, JSON.stringify(templates));
  };

  const handleSaveCustomPlan = (template: ReadingPlanTemplate) => {
    saveUserReadingTemplates([template, ...userReadingTemplates.filter(item => item.id !== template.id)]);
  };

  const handleUpdateCustomPlan = (template: ReadingPlanTemplate) => {
    saveUserReadingTemplates(userReadingTemplates.map(item => item.id === template.id ? template : item));
    if (readingProgress?.templateId === template.id) {
      setReadingProgress(startReadingPlan(template));
    }
  };

  const handleStartPlan = (templateId: string, providedTemplate?: ReadingPlanTemplate) => {
    const template = providedTemplate ?? allReadingPlanTemplates.find((t: any) => t.id === templateId);
    if (template) {
      setReadingProgress(startReadingPlan(template));
    }
  };

  const handleStartPlanAndRead = (template: ReadingPlanTemplate) => {
    setReadingProgress(startReadingPlan(template));
    const firstTask = template.tasks[0];
    if (firstTask) {
      setTodayReadingTask(firstTask);
      setActiveReadingRange(convertTaskToBibleRange(firstTask));
      setTab('read');
      window.scrollTo(0, 0);
    }
  };

  const handleSearchNavigate = (verse: import('./types/bible').BibleVerseRecord) => {
    const book = BIBLE_BOOKS.find(b => b.id === verse.bookId);
    if (book) {
      handleBibleNavigate(book, verse.chapter);
      setTab('read');
      setActiveReadingRange(null);
      setIsSearchOpen(false);
      
      // Wait for the verses to load and render, then scroll to the specific verse
      setTimeout(() => {
        const el = document.getElementById(`verse-${verse.verse}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Highlight effect
          el.style.transition = 'background-color 1s ease';
          el.style.backgroundColor = 'rgba(245, 194, 146, 0.3)'; // Peach color
          setTimeout(() => {
            el.style.backgroundColor = 'white';
          }, 2000);
        }
      }, 800); // 800ms to allow fetch and render
    }
  };

  return <div style={{ minHeight: '100vh', background: `radial-gradient(circle at top left, rgba(255,255,255,0.46), transparent 34%), ${th.bg}`, color: th.text, fontFamily: "'S-Core Dream', sans-serif" }}>
    {isSearchOpen && <BibleSearchSheet onClose={() => setIsSearchOpen(false)} onNavigate={handleSearchNavigate} T={th} fontSize={fsize} />}
    
    <PwaInstallGuideSheet 
      open={isPwaGuideOpen} 
      onClose={() => setIsPwaGuideOpen(false)} 
      platform={platform} 
      instructions={instructions}
      title={guideTitle}
    />
    
    <main style={{ position: 'relative', maxWidth: 1120, margin: '0 auto', padding: tab === 'read' ? '6px 10px 92px' : '16px 16px 112px', minHeight: '100vh' }}>
      <header style={{ position: 'sticky', top: 0, zIndex: 20, display: 'flex', alignItems: 'center', gap: 7, padding: tab === 'read' ? '4px 0 7px' : '8px 0 14px', background: `linear-gradient(180deg, ${th.bg} 80%, transparent)` }}>
        <button aria-label="홈으로 이동" onClick={() => { setDetail(null); setTab('home'); setActiveReadingRange(null); }} style={{ ...circle(tab === 'home'), width: tab === 'read' ? 36 : 46, height: tab === 'read' ? 36 : 46, borderRadius: tab === 'read' ? 12 : 18 }}>{pageIcon}</button>
        <div style={{ minWidth: 0, flex: 1 }}>
          {tab !== 'read' && <div className="title-font" style={{ fontSize: 11, color: th.sub, fontWeight: 800 }}>시온성경</div>}
          {tab === 'read' ? (
            <div style={{ display: 'inline-grid', gridTemplateColumns: activeReadingRange ? '1fr' : '30px minmax(0, auto) 30px', alignItems: 'center', gap: 3, maxWidth: '100%' }}>
              {!activeReadingRange && (
                <button
                  aria-label="이전 장"
                  disabled={!canGoPreviousChapter}
                  onClick={() => navigateChapterBy(-1)}
                  style={{ ...circle(false), width: 30, height: 30, borderRadius: 10, opacity: canGoPreviousChapter ? 1 : 0.35 }}
                >
                  <ChevronLeft size={17} />
                </button>
              )}
              <button
                aria-label={activeReadingRange ? `${pageTitle} 본문` : `${selBook.name} 장 선택`}
                onClick={() => !activeReadingRange && setIsChapterSheetOpen(true)}
                style={{
                  minWidth: 0,
                  height: 32,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  borderRadius: 11,
                  border: activeReadingRange ? 'none' : `1px solid ${th.line}`,
                  background: activeReadingRange ? 'transparent' : th.card,
                  color: th.text,
                  boxShadow: activeReadingRange ? 'none' : th.soft,
                  padding: activeReadingRange ? 0 : '0 9px',
                  cursor: activeReadingRange ? 'default' : 'pointer',
                  fontFamily: 'inherit',
                  outline: 'none',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <span className="title-font" style={{ fontWeight: 800, fontSize: '1.08rem', lineHeight: 1.15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {pageTitle}
                </span>
                {!activeReadingRange && (
                  <span style={{ color: th.sub, fontSize: 10, fontWeight: 900, lineHeight: 1, paddingTop: 2 }}>
                    {selChap}/{selBook.chapters}
                  </span>
                )}
              </button>
              {!activeReadingRange && (
                <button
                  aria-label="다음 장"
                  disabled={!canGoNextChapter}
                  onClick={() => navigateChapterBy(1)}
                  style={{ ...circle(false), width: 30, height: 30, borderRadius: 10, opacity: canGoNextChapter ? 1 : 0.35 }}
                >
                  <ChevronRight size={17} />
                </button>
              )}
            </div>
          ) : (
            <div className="title-font" style={{ fontWeight: 800, fontSize: '1.15rem', lineHeight: 1.22, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pageTitle}</div>
          )}
        </div>
        
        {tab === 'home' ? (
          <>
            {!isInstalled && (
              <button aria-label="앱 설치" onClick={installApp} style={installBtn(canInstall)}>
                <Download size={15} />
                <span>{buttonLabel}</span>
              </button>
            )}
            <button aria-label="설정" onClick={() => setTab('settings')} style={circle(false)}><KawaiiSettingsIcon size={23} /></button>
          </>
        ) : tab === 'read' ? (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, flex: '0 0 auto' }}>
            <button aria-label={isReadSelectMode ? '구절 선택 종료' : '구절 선택'} onClick={toggleReadSelectMode} style={{ ...circle(isReadSelectMode), width: 34, height: 34, borderRadius: 11 }}><CheckSquare size={18} /></button>
            <button aria-label="성경 검색" onClick={() => setIsSearchOpen(true)} style={{ ...circle(false), width: 34, height: 34, borderRadius: 11 }}><Search size={20} /></button>
          </div>
        ) : (
          <button aria-label="설정" onClick={() => setTab('settings')} style={circle(tab === 'settings')}><KawaiiSettingsIcon size={23} /></button>
        )}
      </header>

      {tab === 'home' && <div style={{ display: 'grid', gap: 10 }}>
        <Card title="오늘의 마음 체크인" subtitle={selectedMood ? `${selectedMood}에 맞는 말씀을 보고 있어요` : '선택하지 않으면 모든 말씀이 랜덤으로 나와요'} T={th} compact>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 6 }} className="mood-chip-grid">
            {MOODS.map(item => <button key={item.label} onClick={() => chooseMood(item.label)} style={{ border: `1px solid ${selectedMood === item.label ? 'transparent' : th.line}`, background: selectedMood === item.label ? `linear-gradient(145deg, ${th.accent}, ${th.mint})` : th.card, color: selectedMood === item.label ? '#fff' : th.sub, borderRadius: 999, minHeight: 34, padding: '6px 8px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 900, fontSize: 11, boxShadow: selectedMood === item.label ? '0 8px 18px rgba(74,112,86,0.18)' : th.soft }}>{item.label}</button>)}
          </div>
        </Card>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.08fr) minmax(280px, 0.92fr)', gap: 14, alignItems: 'start' }} className="screen-grid">
          <section style={{ display: 'grid', gap: 10 }}>
            <section style={{ borderRadius: 22, background: th.panel, border: `1px solid ${th.line}`, boxShadow: th.shadow, padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span style={iconTile(`linear-gradient(145deg, ${th.peach}, ${th.butter})`)}><KawaiiVerseIcon size={25} /></span><div><div className="title-font" style={{ fontSize: 18, fontWeight: 800 }}>오늘 붙들 말씀</div><div style={{ fontSize: 11, color: th.sub }}>{selectedMood ? `${selectedMood}에 관한 말씀` : '오늘의 말씀'}</div></div></div>
                <div style={{ display: 'flex', gap: 6, flex: '0 0 auto' }}><button onClick={nextHomeVerse} style={{ ...btn(false), padding: '7px 10px', whiteSpace: 'nowrap' }}>말씀 더보기</button><button onClick={() => toggleSave(`${currentHomeVerse.book} ${currentHomeVerse.chapter}:${currentHomeVerse.verse}`, currentHomeVerse.content, currentHomeVerse.meditation, currentHomeVerse.prayer)} style={{ ...btn(isSaved(`${currentHomeVerse.book} ${currentHomeVerse.chapter}:${currentHomeVerse.verse}`)), padding: '7px 10px', whiteSpace: 'nowrap' }}><KawaiiSavedIcon size={17} /><span>저장</span></button></div>
              </div>
              <button onClick={nextHomeVerse} style={{ width: '100%', textAlign: 'left', border: `1px solid ${th.line}`, borderRadius: 18, background: th.card, color: th.text, padding: '15px 16px', fontFamily: 'inherit', cursor: 'pointer', boxShadow: th.soft }}>
                <p style={{ margin: 0, fontSize: fsize, lineHeight: 1.82, wordBreak: 'keep-all' }}>"{decodeHtml(currentHomeVerse.content)}"</p>
                <div style={{ marginTop: 9, color: th.accent, fontWeight: 900, fontSize: 12 }}>{currentHomeVerse.book} {currentHomeVerse.chapter}:{currentHomeVerse.verse}</div>
              </button>
              <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
                <div className="serif-verse" style={{ borderRadius: 16, background: th.solid, border: `1px solid ${th.line}`, padding: 13, position: 'relative', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7, color: th.accent, fontWeight: 900, fontSize: 12 }}>
                    <KawaiiMeditationIcon size={18} />
                    <span className={homeDevotionLoading ? "animate-pulse" : ""}>
                      {homeDevotionLoading ? '묵상할 바를 생각중입니다...' : (currentHomeDevotion.title || '묵상')}
                    </span>
                  </div>
                  <div style={{ fontSize: fsize, lineHeight: 1.8 }}>
                    {decodeHtml(currentHomeDevotion.meditation)}
                  </div>
                </div>
                <div className="serif-verse" style={{ borderRadius: 16, background: th.solid, border: `1px solid ${th.line}`, padding: 13, position: 'relative', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7, color: th.accent, fontWeight: 900, fontSize: 12 }}>
                    <KawaiiPrayerIcon size={18} />
                    <span className={homeDevotionLoading ? "animate-pulse" : ""}>
                      {homeDevotionLoading ? '기도할 바를 생각중입니다...' : '기도문'}
                    </span>
                  </div>
                  <div style={{ fontSize: fsize, lineHeight: 1.8 }}>
                    {decodeHtml(currentHomeDevotion.prayer)}
                  </div>
                </div>
              </div>
            </section>

          </section>

          <section style={{ display: 'grid', gap: 10 }}>
            <Card title="이어서 읽기" subtitle={`${selBook.name} ${selChap}장`} T={th} compact><button onClick={() => { setActiveReadingRange(null); setTab('read'); }} style={{ ...btn(false), width: '100%', justifyContent: 'space-between', padding: '10px 12px' }}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}><KawaiiBibleIcon size={20} />마지막으로 읽은 곳</span><span>계속 읽기</span></button></Card>
            {recentJournals.length > 0 && <Card title="최근 묵상 기록" subtitle="다시 이어서 기도하기" T={th} compact><div style={{ display: 'grid', gap: 7 }}>{recentJournals.map(j => <button key={j.id} onClick={() => setTab('saved')} style={{ textAlign: 'left', border: `1px solid ${th.line}`, background: th.solid, color: th.text, borderRadius: 15, padding: 10, fontFamily: 'inherit' }}><div style={{ fontWeight: 900, fontSize: 12 }}>{j.ref}</div><div style={{ color: th.sub, fontSize: 11, marginTop: 3 }}>{j.date}</div></button>)}</div></Card>}
          </section>
        </div>
      </div>}
      {tab === 'random' && <div style={{ display: 'grid', gap: 12 }}>
        <section style={{ borderRadius: 24, background: th.panel, border: `1px solid ${th.line}`, boxShadow: th.shadow, padding: 12 }}><div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>{CATEGORIES.map(c => <button key={c} onClick={() => { setSelCat(c); pickRandom(c); }} style={chip(selCat === c)}>{c}</button>)}</div><div style={{ display: 'grid', gridTemplateColumns: 'minmax(120px,1.4fr) repeat(2,minmax(70px,0.8fr))', gap: 8 }} className="compact-menu-grid"><button onClick={() => pickRandom()} disabled={rndLoading} style={{ ...btn(true), padding: '10px 8px' }}>{rndLoading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <KawaiiRandomIcon size={20} />}<span>새 말씀 받기</span></button><button onClick={() => setTab('read')} style={btn(false)}><KawaiiBibleIcon size={18} /><span>성경</span></button><button onClick={() => setTab('saved')} style={btn(false)}><KawaiiSavedIcon size={18} /><span>저장</span></button></div></section>
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
            onNavigate={handleBibleNavigate}
            readSelectionMode={isReadSelectMode}
            readSelectionResetKey={readSelectionResetKey}
            onReadSelectionChange={setReadSelectedVerses}
          />
        </div>
      )}

      {tab === 'plan' && <ReadingPlanHome T={th} progress={readingProgress} userTemplates={userReadingTemplates} onToggleDay={handleToggleReadingDay} onStartPlan={handleStartPlan} onStartPlanAndRead={handleStartPlanAndRead} onSaveCustomPlan={handleSaveCustomPlan} onUpdateCustomPlan={handleUpdateCustomPlan} onNavigateToBible={navigateToBible} onNavigateToRange={handleNavigateToRange} onTodayTaskLoaded={setTodayReadingTask} />}

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


      {tab === 'settings' && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 12 }} className="screen-grid"><Card title="테마" subtitle="감성 전환" T={th} compact><div style={{ display: 'grid', gap: 8 }}>{([['a-soft', 'Soft'], ['a-dark', 'Dark']] as const).map(([k, l]) => <button key={k} onClick={() => { setTheme(k); localStorage.setItem(LS.THEME, k); }} style={{ ...btn(theme === k), justifyContent: 'flex-start' }}><KawaiiVerseIcon size={18} />{l}</button>)}</div></Card><Card title="글자 크기" subtitle="본문 크기" T={th} compact><div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 7 }}>{([['sm','작게'],['base','보통'],['lg','크게'],['xl','아주 크게']] as const).map(([k,l]) => <button key={k} onClick={() => { setFontSize(k); localStorage.setItem(LS.SIZE, k); }} style={chip(fontSize === k)}>{l}</button>)}</div></Card><Card title="앱 설치" subtitle={isInstalled ? '이미 설치됨' : '홈 화면에 추가'} T={th} compact><button disabled={isInstalled} onClick={installApp} style={{ ...btn(!isInstalled && canInstall), opacity: isInstalled ? 0.55 : 1 }}>{isInstalled ? '설치됨' : buttonLabel}</button></Card></div>}
    </main>

    {isReadSelectMode && readSelectedVerses.length > 0 && (
      <div style={{ position: 'fixed', left: 0, right: 0, bottom: 'calc(62px + env(safe-area-inset-bottom))', zIndex: 110, display: 'flex', justifyContent: 'center', padding: '0 14px', pointerEvents: 'none' }}>
        <div style={{ width: '100%', maxWidth: 420, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8, pointerEvents: 'auto' }}>
          <button aria-label="선택 구절 복사" onClick={copyReadSelection} style={{ ...btn(true), minHeight: 48, borderRadius: 16, flexDirection: 'column', gap: 2 }}><Copy size={17} /><span>복사</span></button>
          <button aria-label="선택 구절 저장" onClick={saveReadSelection} style={{ ...btn(false), minHeight: 48, borderRadius: 16, flexDirection: 'column', gap: 2 }}><Bookmark size={17} /><span>저장</span></button>
          <button aria-label="선택 구절 암송 보내기" onClick={sendReadSelectionToMemory} style={{ ...btn(false), minHeight: 48, borderRadius: 16, flexDirection: 'column', gap: 2 }}><Send size={17} /><span>암송</span></button>
        </div>
      </div>
    )}

    <nav style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 90, padding: '0 8px calc(5px + env(safe-area-inset-bottom))', background: `linear-gradient(180deg, transparent, ${th.bg} 34%, ${th.bg})`, transform: isNavVisible ? 'translateY(0)' : 'translateY(92px)', opacity: isNavVisible ? 1 : 0, transition: 'transform 260ms ease, opacity 220ms ease' }}>
      <div style={{ maxWidth: 500, margin: '0 auto', display: 'grid', gridTemplateColumns: `repeat(${navItems.length}, 1fr)`, gap: 2, borderRadius: 18, background: 'rgba(255,252,247,0.88)', boxShadow: '0 10px 28px rgba(52,45,39,0.12)', padding: '3px 5px', backdropFilter: 'blur(12px)' }}>
        {navItems.map(n => (
          <button 
            key={n.id} 
            className={tab === n.id ? 'bottom-nav-item active' : 'bottom-nav-item'} 
            aria-label={`${n.label} 탭`} 
            onClick={() => handleNavTab(n.id)} 
            style={{ 
              minWidth: 0, 
              minHeight: 52, 
              borderRadius: 14, 
              border: 'none', 
              background: 'transparent', 
              color: tab === n.id ? th.accent : th.sub, 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              cursor: 'pointer', 
              fontFamily: 'inherit', 
              fontWeight: tab === n.id ? 900 : 700, 
              fontSize: 10, 
              transition: 'all 200ms ease', 
              outline: 'none', 
              WebkitTapHighlightColor: 'transparent',
              position: 'relative',
              paddingBottom: 2
            }}
          >
            <AppNavIcon active={tab === n.id} nudgeX={n.nudgeX} nudgeY={n.nudgeY} scale={n.scale * (tab === n.id ? 1.05 : 1)}>
              {n.icon}
            </AppNavIcon>
            <span style={{ 
              marginTop: -11, 
              opacity: tab === n.id ? 1 : 0.7,
              transform: tab === n.id ? 'scale(1.05)' : 'scale(1)',
              transition: 'all 200ms ease'
            }}>{n.label}</span>
            {tab === n.id && (
              <div style={{ position: 'absolute', bottom: 3, width: 4, height: 4, borderRadius: '50%', background: th.accent, animation: 'pulse 1.5s infinite' }} />
            )}
          </button>
        ))}
      </div>
    </nav>


    {detail && (
      <div style={{ position: 'fixed', inset: 0, zIndex: 120, display: 'flex', alignItems: 'flex-end' }}>
        <div onClick={() => setDetail(null)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.38)', backdropFilter: 'blur(4px)' }} />
        <div style={{ position: 'relative', width: '100%', maxHeight: '85vh', overflowY: 'auto', background: th.panel, borderTopLeftRadius: 26, borderTopRightRadius: 26, border: `1px solid ${th.line}`, padding: 16 }}>
          <div style={{ width: 38, height: 4, borderRadius: 4, background: th.line, margin: '0 auto 12px' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{ fontWeight: 900, color: th.accent, fontSize: 15 }}>{detail.ref}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button aria-label="구절 복사" onClick={() => copyVerseBlock(detail.ref, detail.text)} style={circle(false)}><Copy size={14} /></button>
              <button aria-label="구절 저장" onClick={() => toggleSave(detail.ref, detail.text)} style={circle(isSaved(detail.ref))}>
                {isSaved(detail.ref) ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
              </button>
              <button aria-label="암송 보내기" onClick={() => handleGoToMemory(detail)} style={circle(false)}><Send size={14} /></button>
              <button aria-label="닫기" onClick={() => setDetail(null)} style={circle(false)}><X size={12} /></button>
            </div>
          </div>
          <div style={{ borderRadius: 18, background: th.solid, border: `1px solid ${th.line}`, padding: 14, marginBottom: 10 }}>
            <div style={{ fontSize: fsize, lineHeight: 1.9, wordBreak: 'keep-all' }}>"{detail.text}"</div>
          </div>
          <VerseDevotionPanel selectedVerse={detail} onGoToMemory={handleGoToMemory} fontSize={fsize} />
        </div>
      </div>
    )}

    <ChapterNavigatorSheet 
        open={isChapterSheetOpen}
        onClose={() => setIsChapterSheetOpen(false)}
        currentBookId={selBook.id}
        currentBookName={selBook.name}
        currentChapter={selChap}
        onSelectChapter={handleSelectChapter}
        T={th}
    />

    <style>{`
      * { box-sizing: border-box; }
      @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
      @keyframes savedWiggle { 0%, 100% { transform: rotate(-0.35deg) translateY(0); } 50% { transform: rotate(0.35deg) translateY(-1px); } }
      @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
      .reorder-card { animation: savedWiggle 0.22s ease-in-out infinite; touch-action: none; }
      .animate-pulse { animation: pulse 1.8s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
      @media (max-width: 900px) { .screen-grid { grid-template-columns: 1fr !important; } .compact-menu-grid { grid-template-columns: repeat(2, minmax(0,1fr)) !important; } }
      @media (max-width: 680px) { .mood-chip-grid { grid-template-columns: repeat(4, minmax(0,1fr)) !important; } }
      @media (max-width: 520px) { .book-grid { grid-template-columns: repeat(3,1fr) !important; } .detail-actions { grid-template-columns: repeat(2,1fr) !important; } .mood-chip-grid { grid-template-columns: repeat(3, minmax(0,1fr)) !important; } }
    `}</style>
  </div>;
}

function Card({ title, subtitle, T, compact = false, headerAction, children }: { title: string; subtitle: string; T: any; compact?: boolean; headerAction?: React.ReactNode; children: React.ReactNode }) {
  const icon = getCardIcon(title);
  return <section className="surface-card" style={{ borderRadius: 20, background: T.panel, border: `1px solid ${T.line}`, boxShadow: T.shadow, padding: compact ? 13 : 16 }}>
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
