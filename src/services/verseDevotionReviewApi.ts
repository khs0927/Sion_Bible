import { buildLocalDevotionFromVerse, saveCachedVerseDevotion, type VerseDevotionResult } from './verseDevotionApi';

interface ReviewResponse {
  ok?: boolean;
  reviewed?: boolean;
  decision?: 'keep' | 'replace';
  confidence?: number;
  improved?: Partial<VerseDevotionResult> | null;
  provider?: string;
  model?: string;
}

export async function reviewVerseDevotion({
  ref,
  verseText,
  candidate,
}: {
  ref: string;
  verseText: string;
  candidate: VerseDevotionResult;
}): Promise<VerseDevotionResult | null> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 16_000);
  try {
    const response = await fetch('/api/verse-devotion-review', {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref, verseText, candidate }),
    });
    if (!response.ok) return null;
    const payload = await response.json() as ReviewResponse;
    if (!payload?.ok || !payload.reviewed || payload.decision !== 'replace' || !payload.improved) return null;

    const improved = buildLocalDevotionFromVerse(ref, verseText, {
      ...payload.improved,
      provider: payload.provider ? `${candidate.provider || 'primary'}+${payload.provider}-review` : candidate.provider,
      model: payload.model ? `${candidate.model || 'primary'} -> ${payload.model}` : candidate.model,
      fallback: false,
    });
    saveCachedVerseDevotion(ref, verseText, improved);
    return improved;
  } catch {
    return null;
  } finally {
    window.clearTimeout(timeout);
  }
}
