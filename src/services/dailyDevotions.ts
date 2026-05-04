import type { BibleVerse } from '../data/verses';
import { DAILY_DEVOTIONS } from '../data/generated/dailyDevotions.generated';
import type { VerseDevotionResult } from './verseDevotionApi';

export function getDailyDevotion(verse: BibleVerse): VerseDevotionResult {
  const ref = `${verse.book} ${verse.chapter}:${verse.verse}`;
  const generated = DAILY_DEVOTIONS[ref];
  if (generated?.meditation && generated?.prayer) {
    return {
      ...generated,
      application: generated.application || '',
      fallback: false,
    };
  }

  return {
    title: `${ref} 묵상`,
    meditation: verse.meditation,
    prayer: verse.prayer,
    application: '',
    fallback: false,
  };
}
