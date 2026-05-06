export interface VerseDevotionResult {
  title: string;
  keyPhrase?: string;
  meditation: string;
  prayer: string;
  application: string;
  reflectionQuestion?: string;
  model?: string;
  fallback?: boolean;
  errorCode?: string;
  savedAt?: number;
}

const CACHE_PREFIX = 'sion_verse_devotion_v4_';

const CLIENT_FALLBACK: VerseDevotionResult = {
  title: '말씀 앞에 잠시 머무르기',
  keyPhrase: '',
  meditation: '본문을 다시 읽으며 반복되는 단어, 명령, 약속, 질문이 무엇인지 살펴보세요. 하나님이 이 말씀 안에서 어떤 분으로 드러나시는지, 오늘 내가 예수 그리스도를 의지하며 순종해야 할 한 걸음은 무엇인지 조용히 묵상해보세요.',
  prayer: '주님, 이 말씀 앞에서 제 마음을 조용히 내려놓습니다. 제 힘과 판단보다 예수 그리스도를 더 의지하게 하시고, 성령께서 제 안의 두려움과 불신을 비추셔서 오늘 주님께 순종할 힘을 주소서. 아멘.',
  application: '오늘 본문에서 마음에 남는 표현 하나를 적고, 그 표현 앞에서 내려놓아야 할 마음 한 가지와 순종할 행동 한 가지를 짧게 기도해보세요.',
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

    const result: VerseDevotionResult = {
      title: String(data.title || CLIENT_FALLBACK.title).trim(),
      keyPhrase: String(data.keyPhrase || '').trim(),
      meditation: String(data.meditation || CLIENT_FALLBACK.meditation).trim(),
      prayer: String(data.prayer || CLIENT_FALLBACK.prayer).trim(),
      application: String(data.application || CLIENT_FALLBACK.application).trim(),
      reflectionQuestion: String(data.reflectionQuestion || '').trim(),
      fallback: false,
    };

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

function normalizeDevotion(data: any, errorCode?: string): VerseDevotionResult {
  return {
    title: String(data?.title || CLIENT_FALLBACK.title).trim(),
    keyPhrase: String(data?.keyPhrase || CLIENT_FALLBACK.keyPhrase || '').trim(),
    meditation: String(data?.meditation || CLIENT_FALLBACK.meditation).trim(),
    prayer: String(data?.prayer || CLIENT_FALLBACK.prayer).trim(),
    application: String(data?.application || CLIENT_FALLBACK.application).trim(),
    reflectionQuestion: String(data?.reflectionQuestion || CLIENT_FALLBACK.reflectionQuestion || '').trim(),
    fallback: true,
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
