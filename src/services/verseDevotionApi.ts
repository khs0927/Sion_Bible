export interface VerseDevotionResult {
  title: string;
  meditation: string;
  prayer: string;
  application: string;
  fallback: boolean;
  errorCode?: string;
  savedAt?: number;
}

const CACHE_PREFIX = 'sion_verse_devotion_v3_';

const CLIENT_FALLBACK: VerseDevotionResult = {
  title: '말씀 앞에 잠시 머무르기',
  meditation: '이 말씀을 천천히 다시 읽으며 마음에 남는 단어를 붙들어보세요. 하나님께서 오늘 내게 주시는 위로와 초대를 조용히 바라보는 시간이 되길 바랍니다.',
  prayer: '주님, 이 말씀을 오늘 제 마음에 새기고 순종하게 하소서. 제 생각과 마음을 주님께 맞추게 하시고, 말씀 안에서 평안을 누리게 하소서. 아멘.',
  application: '오늘 이 말씀 앞에서 내가 붙들 한 단어를 적고, 하루 중 한 번 다시 떠올려보세요.',
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
}: {
  ref: string;
  verseText: string;
}) {
  if (!ref || !verseText) throw new Error('구절 정보와 본문이 필요합니다.');

  const cached = readCachedVerseDevotion(ref, verseText);
  if (cached) return { result: cached, fromCache: true };

  try {
    const response = await fetch('/api/verse-devotion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref, verseText }),
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
      meditation: String(data.meditation || CLIENT_FALLBACK.meditation).trim(),
      prayer: String(data.prayer || CLIENT_FALLBACK.prayer).trim(),
      application: String(data.application || CLIENT_FALLBACK.application).trim(),
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
    meditation: String(data?.meditation || CLIENT_FALLBACK.meditation).trim(),
    prayer: String(data?.prayer || CLIENT_FALLBACK.prayer).trim(),
    application: String(data?.application || CLIENT_FALLBACK.application).trim(),
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
