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

const CACHE_PREFIX = 'sion_verse_devotion_v8_';

const CLIENT_FALLBACK: VerseDevotionResult = {
  title: '말씀 앞에 잠시 머무르기',
  coreMessage: '하나님은 말씀 안에서 우리를 부르시고, 은혜로 오늘의 걸음을 인도하십니다.',
  keyWords: ['말씀', '은혜', '순종'],
  keyPhrase: '',
  explanation: '이 구절은 먼저 본문의 흐름 속에서 하나님의 뜻과 사람의 반응을 살피도록 우리를 초대합니다. 말씀은 단순한 감정의 위로가 아니라, 하나님이 어떤 분이신지 드러내고 우리의 마음을 비추는 거울입니다. 우리는 때로 상황을 먼저 보고 판단하지만, 하나님은 말씀을 통해 우리를 은혜와 순종의 자리로 부르십니다. 이 말씀은 예수 그리스도 안에서 주어지는 회복과 새 길을 바라보게 합니다. 그러므로 본문을 내 소원대로만 적용하기보다, 하나님이 오늘 내게 보여주시는 뜻을 겸손히 묵상하는 것이 중요합니다.',
  meditation: '본문을 다시 읽으며 반복되는 단어, 명령, 약속, 질문이 무엇인지 살펴보세요. 하나님이 이 말씀 안에서 어떤 분으로 드러나시는지, 오늘 내가 예수 그리스도를 의지하며 순종해야 할 한 걸음은 무엇인지 조용히 묵상해보세요.',
  prayer: '주님, 이 말씀 앞에서 제 마음을 조용히 내려놓습니다. 제 힘과 판단보다 예수 그리스도를 더 의지하게 하시고, 성령께서 제 안의 두려움과 불신을 비추셔서 오늘 주님께 순종할 힘을 주소서. 우리 주 예수 그리스도의 이름으로 기도드립니다. 아멘.',
  application: [
    '오늘 본문에서 마음에 남는 표현 하나를 적어보기',
    '그 표현 앞에서 내려놓아야 할 마음을 짧게 기도하기',
    '오늘 순종할 수 있는 작은 행동 한 가지를 실천하기',
  ],
  question: '이 말씀 앞에서 오늘 내가 주님께 맡겨야 할 마음은 무엇인가요?',
  reflectionQuestion: '이 말씀 앞에서 오늘 내가 주님께 맡겨야 할 마음은 무엇인가요?',
  fallback: true,
};

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

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return { result: normalizeDevotion({}, 'INVALID_CONTENT_TYPE'), fromCache: false };
    }

    const data = await response.json();
    if (!response.ok || data.fallback) {
      return { result: normalizeDevotion(data), fromCache: false };
    }

    const result = normalizeDevotion(data, undefined, false);

    saveCachedVerseDevotion(ref, verseText, result);
    return { result, fromCache: false };
  } catch {
    return { result: normalizeDevotion({}, 'FETCH_FAILED'), fromCache: false };
  }
}

export function clearAllVerseDevotionCache() {
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith('sion_verse_devotion_')) localStorage.removeItem(key);
  });
}

function normalizeDevotion(data: any, errorCode?: string, fallback = true): VerseDevotionResult {
  const keyWords = Array.isArray(data?.keyWords)
    ? data.keyWords.map((item: unknown) => String(item).trim()).filter(Boolean).slice(0, 5)
    : String(data?.keyPhrase || CLIENT_FALLBACK.keyPhrase || '')
      .split(/[,，·ㆍ]/)
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 5);
  const question = String(data?.question || data?.reflectionQuestion || CLIENT_FALLBACK.question || '').trim();
  const application = Array.isArray(data?.application)
    ? data.application.map((item: unknown) => String(item).trim()).filter(Boolean).slice(0, 5)
    : String(data?.application || '').trim() || CLIENT_FALLBACK.application;

  return {
    reference: String(data?.reference || '').trim(),
    title: String(data?.title || CLIENT_FALLBACK.title).trim(),
    coreMessage: String(data?.coreMessage || CLIENT_FALLBACK.coreMessage || '').trim(),
    keyWords,
    keyPhrase: String(data?.keyPhrase || keyWords.join(', ') || CLIENT_FALLBACK.keyPhrase || '').trim(),
    explanation: String(data?.explanation || CLIENT_FALLBACK.explanation || '').trim(),
    meditation: String(data?.meditation || CLIENT_FALLBACK.meditation).trim(),
    prayer: String(data?.prayer || CLIENT_FALLBACK.prayer).trim(),
    application,
    question,
    reflectionQuestion: question,
    fallback,
    errorCode: errorCode || data?.errorCode,
  };
}

function hashString(value: string) {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index);
  }
  return (hash >>> 0).toString(36);
}
