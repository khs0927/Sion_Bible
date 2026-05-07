import type { BibleVerse } from '../data/verses';
import { DAILY_DEVOTIONS } from '../data/generated/dailyDevotions.generated';
import { buildLocalDevotionFromVerse, type VerseDevotionResult } from './verseDevotionApi';

export function getDailyDevotion(verse: BibleVerse): VerseDevotionResult {
  const ref = `${verse.book} ${verse.chapter}:${verse.verse}`;
  const generated = DAILY_DEVOTIONS[ref];
  if (generated?.meditation && generated?.prayer) {
    return buildLocalDevotionFromVerse(ref, verse.content, {
      ...generated,
      fallback: false,
    });
  }

  return buildLocalDevotionFromVerse(ref, verse.content, {
    title: `${ref} 묵상`,
    meditation: verse.meditation,
    prayer: verse.prayer,
    fallback: false,
  });
}
