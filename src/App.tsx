import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type UIEvent as ReactUIEvent } from 'react';
import { Bookmark, BookmarkCheck, CheckSquare, ChevronLeft, ChevronRight, Copy, Download, GripVertical, Loader2, Send, X, Search } from 'lucide-react';
import confetti from 'canvas-confetti';
import { decodeHtml, sanitizeScriptureText } from './utils/textUtils';
import { ensureAmen } from './utils/prayer';
import { BIBLE_BOOKS } from './data/bibleBooks';
import { BIBLE_VERSES, type BibleVerse } from './data/verses';
import { KawaiiApplicationIcon, KawaiiAudioIcon, KawaiiBibleIcon, KawaiiCalendarIcon, KawaiiComfortIcon, KawaiiHomeIcon, KawaiiJournalIcon, KawaiiMeditationIcon, KawaiiPrayerIcon, KawaiiRandomIcon, KawaiiSavedIcon, KawaiiSettingsIcon, KawaiiShareIcon, KawaiiVerseIcon, KawaiiWisdomIcon, MoodIcon } from './components/icons';
import { ReadingPlanHome } from './components/readingPlan/ReadingPlanHome';
import { ReadingRoomLayout } from './components/reading-room/ReadingRoomLayout';
import { ReadingRoomPage } from './components/reading-room/ReadingRoomPage';
import { MemoryHome } from './components/memory/MemoryHome';
import { getDailyDevotion } from './services/dailyDevotions';
import { cleanDevotionText, readCachedVerseDevotion, type VerseDevotionResult } from './services/verseDevotionApi';
import { VerseDevotionPanel } from './components/bible/VerseDevotionPanel';
import { VerseQuestionPanel } from './components/bible/VerseQuestionPanel';
import { ChapterNavigatorSheet } from './components/bible/ChapterNavigatorSheet';
import { AppNavIcon } from './components/ui/AppNavIcon';
import { appBookBackground, continueCardBackground, designDecorations, moodCardBackground, verseBackgrounds } from './assets/design';
import verseCopyIcon from './assets/design/verse-actions/copy.png';
import verseSaveIcon from './assets/design/verse-actions/save.png';
import verseMemoryIcon from './assets/design/verse-actions/memory.png';
import verseListenIcon from './assets/design/verse-actions/listen.png';
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

interface SavedVerse { ref: string; text: string; date?: string; title?: string; explanation?: string; meditation?: string; prayer?: string; application?: string | string[]; }
interface VerseDetail {
  ref: string;
  text: string;
  title?: string;
  coreMessage?: string;
  keyWords?: string[];
  keyPhrase?: string;
  explanation?: string;
  meditation?: string;
  prayer?: string;
  application?: string | string[];
  question?: string;
  reflectionQuestion?: string;
  model?: string;
  fromCache?: boolean;
}
interface JournalEntry { id: string; ref: string; date: string; [key: string]: unknown; }
interface ReadSelectedVerse { ref: string; text: string; verse: number; }

type Tab = 'home' | 'random' | 'read' | 'plan' | 'memory' | 'saved' | 'settings';
type FontSize = 'sm' | 'base' | 'lg' | 'xl';
type Theme = 'a-soft' | 'a-dark';
type SavedGroupMode = 'date' | 'week' | 'month' | 'topic' | 'book';
type SavedContentMode = 'verse' | 'explanation' | 'meditation' | 'prayer' | 'application';
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
const MOOD_VERSE_REFS: Record<Mood, string[]> = {
  '평안': ['요한복음 14:27', '빌립보서 4:6-7', '시편 46:1', '마태복음 11:28', '요한복음 16:33', '이사야 26:3', '시편 4:8', '시편 91:1-2'],
  '감사': ['데살로니가전서 5:16-18', '시편 103:2', '시편 16:11', '시편 100:4', '골로새서 3:15', '시편 107:1', '시편 136:1', '시편 118:24'],
  '불안': ['빌립보서 4:6-7', '베드로전서 5:7', '이사야 41:10', '요한복음 14:27', '요한복음 16:33', '이사야 26:3', '시편 91:1-2', '시편 55:22'],
  '소망': ['로마서 8:28', '예레미야 29:11', '갈라디아서 6:9', '이사야 40:31', '히브리서 11:1', '로마서 15:13', '시편 37:5', '라멘테이션 3:22-23'],
  '회개': ['요한일서 1:9', '시편 51:10', '로마서 5:8', '미가 6:8'],
  '위로': ['이사야 41:10', '베드로전서 5:7', '마태복음 11:28', '시편 46:1', '시편 34:18', '시편 147:3', '시편 55:22', '나훔 1:7', '시편 30:5'],
  '사랑': ['고린도전서 13:13', '요한일서 4:18', '에베소서 4:32', '요한복음 3:16', '로마서 5:8', '요한복음 15:12', '로마서 8:38-39'],
  '용서': ['에베소서 4:32', '요한일서 1:9', '마태복음 6:14', '로마서 5:8', '시편 51:10'],
  '두려움': ['이사야 41:10', '여호수아 1:9', '요한일서 4:18', '시편 46:1', '디모데후서 1:7', '시편 91:1-2', '나훔 1:7'],
  '지혜': ['잠언 3:5-6', '시편 119:105', '야고보서 1:5', '잠언 9:10', '잠언 16:3', '잠언 2:6', '미가 6:8'],
  '능력': ['빌립보서 4:13', '여호수아 1:9', '이사야 41:10', '에베소서 6:10', '고린도후서 12:9', '이사야 40:29', '디모데후서 1:7'],
  '축복': ['시편 23:1', '시편 16:11', '예레미야 29:11', '민수기 6:24-26', '신명기 28:6', '시편 1:1-3', '창세기 12:2', '시편 139:14'],
};
const SAVED_CONTENT_LABELS: Record<SavedContentMode, { menu: string; title: string; empty: string }> = {
  verse: { menu: '말씀', title: '다시 읽는 말씀', empty: '저장된 말씀이 없습니다.' },
  explanation: { menu: '해설', title: '다시 읽는 해설', empty: '저장된 해설이 없습니다. 해설 카드의 책갈피를 눌러 저장해보세요.' },
  meditation: { menu: '묵상', title: '다시 읽는 묵상', empty: '저장된 묵상이 없습니다. 묵상 카드의 책갈피를 눌러 저장해보세요.' },
  prayer: { menu: '기도문', title: '다시 읽는 기도문', empty: '저장된 기도문이 없습니다. 기도문 카드의 책갈피를 눌러 저장해보세요.' },
  application: { menu: '적용', title: '다시 읽는 적용', empty: '저장된 적용이 없습니다. 적용 카드의 책갈피를 눌러 저장해보세요.' },
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
      shadow: '0 12px 34px rgba(74, 62, 48, 0.10)',
      soft: '0 6px 18px rgba(74, 62, 48, 0.08)'
    },
    'a-dark': {
      bg: '#24211F',
      panel: '#302B28',
      card: '#352F2C',
      solid: '#3C3531',
      line: '#514740',
      text: '#F5EFE8',
      sub: '#C4B7AA',
      accent: '#A7C7A1',
      pill: 'rgba(255,255,255,0.07)',
      peach: '#C98B63',
      mint: '#779B91',
      butter: '#BDA571',
      lavender: '#8F88B1',
      shadow: '0 12px 34px rgba(0, 0, 0, 0.24)',
      soft: '0 6px 18px rgba(0,0,0,0.16)'
    }
  }[theme];
}

// ... existing file content intentionally omitted here for brevity ...
