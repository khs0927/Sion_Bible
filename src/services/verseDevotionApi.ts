import { BIBLE_VERSES } from '../data/verses';

export interface VerseDevotionResult {
  reference?: string;
  title: string;
  coreMessage?: string;
  keyWords?: string[];
  keyPhrase?: string;
  explanation?: string;
  meditation: string;
  prayer: string;
  application: string | string[];
  question?: string;
  reflectionQuestion?: string;
  model?: string;
  fallback?: boolean;
  errorCode?: string;
  savedAt?: number;
}

const CACHE_PREFIX = 'sion_verse_devotion_v12_';
const REQUIRED_PRAYER_ENDING = '아버지, 감사합니다. 예수 그리스도의 이름으로 기도드립니다. 아멘.';
interface DevotionContext {
  ref: string;
  verseText: string;
}

function normalizeRef(ref: string) {
  return String(ref || '').replace(/\s+(?=\d)/g, '').replace(/\s/g, '');
}

function findCuratedVerse(ref: string) {
  const key = normalizeRef(ref);
  return BIBLE_VERSES.find((verse) => normalizeRef(`${verse.book} ${verse.chapter}:${verse.verse}`) === key);
}

function applicationArray(value: VerseDevotionResult['application'] | unknown, fallback: string[]) {
  const list = Array.isArray(value)
    ? value
    : String(value || '')
      .split(/\n+/)
      .map((item) => item.replace(/^\s*\d+[.)]\s*/, '').trim());
  const normalized = list.map((item) => String(item).trim()).filter(Boolean).slice(0, 3);
  return normalized.length > 0 ? normalized : fallback;
}

function sanitizeKoreanDevotionText(value: string) {
  return String(value || '')
    .replace(/您的/g, '주님의')
    .replace(/souvent/gi, '자주')
    .replace(/如何/g, '어떠하든')
    .replace(/最近/g, '최근')
    .replace(/cụ체적인/g, '구체적인')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripPrayerEnding(value: string) {
  let next = sanitizeKoreanDevotionText(value);
  let previous = '';
  const endingPatterns = [
    /아버지,?\s*감사합니다[.!?。．…]*\s*예수\s+그리스도의\s+이름으로\s+기도드립니다[.!?。．…]*\s*아멘[.!?。．…]*$/i,
    /우리\s+주\s+예수\s+그리스도의\s+이름으로\s+기도드립니다[.!?。．…]*\s*아멘[.!?。．…]*$/i,
    /우리\s+주\s+예수\s+그리스도의\s+이름으로\s+기도드립니다[.!?。．…]*$/i,
    /예수\s+그리스도의\s+이름으로\s+기도(?:드립니|합니)다[.!?。．…]*\s*아멘[.!?。．…]*$/i,
    /예수님의\s+이름으로\s+기도(?:드립니|합니)다[.!?。．…]*\s*아멘[.!?。．…]*$/i,
    /아멘[.!?。．…]*$/i,
  ];
  while (previous !== next) {
    previous = next;
    for (const pattern of endingPatterns) {
      next = next.replace(pattern, '').trim();
    }
  }
  return next.replace(/[.!?。．…]+$/, '').trim();
}

function ensurePrayerEnding(value: string) {
  const body = stripPrayerEnding(value);
  return body ? `${body}. ${REQUIRED_PRAYER_ENDING}` : REQUIRED_PRAYER_ENDING;
}

export function createContextualFallback(ref: string, _verseText: string, errorCode?: string): VerseDevotionResult {
  const normalizedRef = String(ref || '').trim() || '선택한 말씀';
  const curated = findCuratedVerse(normalizedRef);

  if (/요한복음\s*9\s*:\s*3/.test(normalizedRef)) {
    return {
      reference: normalizedRef,
      title: '정죄가 아니라 하나님의 일을 바라보기',
      coreMessage: '예수님은 고난받는 사람을 죄의 결과로 단정하지 않으시고, 하나님의 일이 나타날 존귀한 사람으로 바라보십니다.',
      keyWords: ['정죄', '하나님의 일', '은혜의 시선'],
      keyPhrase: '정죄가 아니라 은혜의 시선',
      explanation: '요한복음 9장은 예수님께서 날 때부터 앞을 보지 못한 사람을 만나시는 장면입니다. 제자들은 그 사람의 고난을 보며 누구의 죄 때문인지 묻지만, 예수님은 그 사람이나 부모의 죄 때문이라고 단정하지 않으셨습니다. 당시에는 질병이나 장애를 개인의 죄와 직접 연결해 생각하는 시선이 있었지만, 예수님은 그 정죄의 틀을 깨뜨리셨습니다. 예수님은 아픔을 가진 사람을 설명해야 할 문제로만 보지 않으시고, 하나님의 일이 나타날 사람으로 바라보셨습니다. 이 말씀은 고난의 이유를 함부로 판단하지 말라는 조심스러운 초대입니다. 동시에 하나님께서 절망처럼 보이는 자리에서도 은혜와 회복과 영광을 드러내실 수 있음을 보여줍니다. 예수 그리스도의 복음은 사람을 죄책감 속에 가두기보다, 하나님의 긍휼 안에서 새롭게 바라보게 합니다.',
      meditation: '우리는 때때로 나의 연약함이나 다른 사람의 아픔을 보며 너무 빨리 원인을 찾으려 합니다. 그러나 예수님은 고난받는 사람을 정죄의 시선으로 보지 않으셨습니다. 주님은 그 사람 안에서 하나님이 하실 일을 바라보셨습니다. 오늘 나의 설명되지 않는 아픔도 단순히 부끄러움이나 실패의 증거로만 남아 있지 않을 수 있습니다. 하나님은 내가 감추고 싶은 자리에서도 은혜의 빛을 비추실 수 있습니다. 오늘은 원인을 단정하기보다, 그 자리에서 예수님께서 어떻게 일하시는지 믿음으로 바라볼 수 있습니다.',
      prayer: '주님, 제 삶의 아픔과 연약함을 죄책감과 두려움으로만 바라보지 않습니다. 사람을 쉽게 판단하고 정죄했던 마음을 주님 앞에 내려놓습니다. 예수님께서 날 때부터 앞을 보지 못한 사람을 하나님의 일이 나타날 사람으로 바라보신 것처럼, 저도 나 자신과 이웃을 은혜의 시선으로 바라봅니다. 설명되지 않는 고난 속에서도 하나님이 일하심을 신뢰합니다. 절망처럼 보이는 자리에도 주님의 빛이 임할 수 있음을 믿습니다. 아버지, 감사합니다. 예수 그리스도의 이름으로 기도드립니다. 아멘.',
      application: [
        '나 자신이나 누군가의 아픔을 쉽게 판단했던 마음을 조용히 적어보기',
        '설명되지 않는 고난 한 가지를 주님께 맡기는 짧은 기도 드리기',
        '오늘 만나는 한 사람을 정죄보다 긍휼의 시선으로 바라보기',
      ],
      question: '나는 오늘 누구의 아픔을 정죄가 아니라 하나님의 은혜가 일하실 자리로 바라볼 수 있을까?',
      reflectionQuestion: '나는 오늘 누구의 아픔을 정죄가 아니라 하나님의 은혜가 일하실 자리로 바라볼 수 있을까?',
      fallback: true,
      errorCode,
    };
  }

  const fallbackApplication = [
    `${normalizedRef} 본문을 한 번 더 천천히 읽고 마음에 남는 표현 하나 적어보기`,
    '그 표현 앞에서 지금 내 마음의 두려움이나 바람을 짧게 기도하기',
    '오늘 할 수 있는 작은 순종 한 가지를 정하고 조용히 실천하기',
  ];

  return {
    reference: normalizedRef,
    title: '말씀 앞에 잠시 머무르기',
    coreMessage: '하나님은 말씀 안에서 오늘 붙들 은혜와 순종의 길을 조용히 보여주십니다.',
    keyWords: ['말씀', '은혜', '기도'],
    keyPhrase: '말씀 앞에 머무르기',
    explanation: '이 말씀을 잠시 멈추어 다시 읽어보세요. 본문 안에서 마음에 남는 단어와 표현이 무엇인지 천천히 살펴보면 좋겠습니다. 하나님은 짧은 말씀 속에서도 우리의 마음을 비추시고, 예수 그리스도의 은혜 안에서 오늘 걸어갈 방향을 보여주십니다.',
    meditation: curated?.meditation || '말씀 앞에 조용히 머물며 지금 내 마음을 주님께 올려드릴 수 있습니다. 답을 급히 찾기보다, 하나님이 이 말씀을 통해 내게 보여주시는 작은 빛을 기다려보세요. 오늘은 큰 결심보다 마음에 남은 한 문장을 붙들고 주님과 동행해볼 수 있습니다.',
    prayer: ensurePrayerEnding(curated?.prayer || `하나님, 이 말씀 앞에 제 마음을 조용히 내려놓습니다. 제 생각과 감정보다 주님의 뜻을 먼저 듣습니다. 예수 그리스도의 은혜 안에서 오늘 작은 순종을 걷습니다. 성령님께서 제 마음을 비추시고 주님을 신뢰할 힘을 주심을 믿습니다.`),
    application: fallbackApplication,
    question: '오늘 이 말씀 앞에서 주님께 맡겨야 할 마음은 무엇일까?',
    reflectionQuestion: '오늘 이 말씀 앞에서 주님께 맡겨야 할 마음은 무엇일까?',
    fallback: true,
    errorCode,
  };
}

const CLIENT_FALLBACK = createContextualFallback('', '', 'CLIENT_FALLBACK');

export function buildLocalDevotionFromVerse(ref: string, verseText: string, partial?: Partial<VerseDevotionResult>): VerseDevotionResult {
  const fallback = createContextualFallback(ref, verseText);
  const question = String(partial?.question || partial?.reflectionQuestion || fallback.question || '').trim();
  return {
    ...fallback,
    ...partial,
    reference: String(partial?.reference || ref || fallback.reference || '').trim(),
    title: sanitizeKoreanDevotionText(String(partial?.title || fallback.title)),
    coreMessage: sanitizeKoreanDevotionText(String(partial?.coreMessage || fallback.coreMessage || '')),
    keyWords: Array.isArray(partial?.keyWords) && partial.keyWords.length > 0 ? partial.keyWords.slice(0, 3) : fallback.keyWords,
    keyPhrase: sanitizeKoreanDevotionText(String(partial?.keyPhrase || fallback.keyPhrase || '')),
    explanation: sanitizeKoreanDevotionText(String(partial?.explanation || fallback.explanation || '')),
    meditation: sanitizeKoreanDevotionText(String(partial?.meditation || fallback.meditation)),
    prayer: ensurePrayerEnding(String(partial?.prayer || fallback.prayer)),
    application: applicationArray(partial?.application, fallback.application as string[]),
    question,
    reflectionQuestion: question,
    fallback: partial?.fallback ?? false,
  };
}

export function getVerseDevotionCacheKey(ref: string, verseText: string) {
  return `${CACHE_PREFIX}${hashString(`${ref}:${verseText}`)}`;
}

export function readCachedVerseDevotion(ref: string, verseText: string): VerseDevotionResult | null {
  try {
    const key = getVerseDevotionCacheKey(ref, verseText);
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const cached = JSON.parse(raw) as VerseDevotionResult;
    if (cached.fallback) {
      localStorage.removeItem(key);
      return null;
    }

    return cached;
  } catch {
    return null;
  }
}

export function saveCachedVerseDevotion(ref: string, verseText: string, result: VerseDevotionResult) {
  if (result.fallback) return;
  localStorage.setItem(getVerseDevotionCacheKey(ref, verseText), JSON.stringify({ ...result, savedAt: Date.now() }));
}

export async function getOrGenerateVerseDevotion({
  ref,
  verseText,
  mode,
}: {
  ref: string;
  verseText: string;
  mode?: 'fast' | 'deep';
}) {
  if (!ref || !verseText) throw new Error('구절 정보와 본문이 필요합니다.');

  const cached = readCachedVerseDevotion(ref, verseText);
  if (cached) return { result: cached, fromCache: true };

  try {
    const response = await fetch('/api/verse-devotion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref, verseText, mode }),
    });

    if (!response.ok) throw new Error(`HTTP_${response.status}`);

    const data = await response.json();
    const result = buildLocalDevotionFromVerse(ref, verseText, data?.result || data);
    saveCachedVerseDevotion(ref, verseText, result);
    return { result, fromCache: false };
  } catch (error) {
    const errorCode = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
    return { result: createContextualFallback(ref, verseText, errorCode), fromCache: false };
  }
}

function hashString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = ((hash << 5) - hash) + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

export { CLIENT_FALLBACK };
