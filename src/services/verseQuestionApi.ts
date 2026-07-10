export interface AskVerseQuestionParams {
  ref: string;
  verseText: string;
  meditation?: string;
  prayer?: string;
  question: string;
}

export interface VerseQuestionAnswer {
  question: string;
  answer: string;
  followUpQuestion?: string;
  provider?: string;
  model?: string;
  fallback?: boolean;
  errorCode?: string;
  savedAt?: number;
}

const CACHE_PREFIX = 'sion_verse_question_v2_';
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 20_000;

function hashString(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash) + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function cacheKey(params: AskVerseQuestionParams) {
  return `${CACHE_PREFIX}${hashString(`${params.ref}:${params.verseText}:${params.question}`)}`;
}

function readCache(params: AskVerseQuestionParams): VerseQuestionAnswer | null {
  try {
    const raw = window.localStorage.getItem(cacheKey(params));
    if (!raw) return null;
    const cached = JSON.parse(raw) as VerseQuestionAnswer;
    if (!cached.answer || !cached.savedAt || Date.now() - cached.savedAt > CACHE_TTL_MS) {
      window.localStorage.removeItem(cacheKey(params));
      return null;
    }
    return cached;
  } catch {
    return null;
  }
}

function saveCache(params: AskVerseQuestionParams, result: VerseQuestionAnswer) {
  if (result.fallback) return;
  try {
    window.localStorage.setItem(cacheKey(params), JSON.stringify({ ...result, savedAt: Date.now() }));
  } catch {
    // 저장 공간이 부족해도 질문 기능은 계속 사용합니다.
  }
}

function isVerseQuestionAnswer(value: unknown): value is VerseQuestionAnswer {
  if (!value || typeof value !== 'object') return false;
  const answer = value as Partial<VerseQuestionAnswer>;
  return typeof answer.question === 'string'
    && typeof answer.answer === 'string'
    && answer.answer.trim().length > 0;
}

export async function askVerseQuestion(params: AskVerseQuestionParams): Promise<VerseQuestionAnswer> {
  const normalized: AskVerseQuestionParams = {
    ref: params.ref.trim(),
    verseText: params.verseText.trim(),
    meditation: params.meditation?.trim(),
    prayer: params.prayer?.trim(),
    question: params.question.trim(),
  };

  const cached = readCache(normalized);
  if (cached) return cached;

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch('/api/verse-question', {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(normalized),
    });

    const raw = await response.text();
    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch {
      throw new Error('질문 API가 올바른 JSON을 반환하지 않았습니다.');
    }

    if (!response.ok) {
      const errorMessage = typeof data === 'object' && data && 'error' in data
        ? String((data as { error?: unknown }).error || '')
        : '';
      throw new Error(errorMessage || '질문 답변 생성에 실패했습니다.');
    }

    if (!isVerseQuestionAnswer(data)) {
      throw new Error('질문 답변 형식이 올바르지 않습니다.');
    }

    const result: VerseQuestionAnswer = {
      ...data,
      question: data.question.trim(),
      answer: data.answer.replace(/\*\*/g, '').trim(),
      followUpQuestion: data.followUpQuestion?.trim(),
    };
    saveCache(normalized, result);
    return result;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('답변 생성 시간이 오래 걸리고 있습니다. 잠시 후 다시 시도해주세요.');
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}
