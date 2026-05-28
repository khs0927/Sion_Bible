import type { BibleVerse } from '../data/verses';
import { buildLocalDevotionFromVerse, type VerseDevotionResult } from './verseDevotionApi';

export function getDailyDevotion(verse: BibleVerse): VerseDevotionResult {
  const ref = `${verse.book} ${verse.chapter}:${verse.verse}`;
  return buildLocalDevotionFromVerse(ref, verse.content, {
    reference: ref,
    title: `${ref} devotion`,
    meditation: verse.meditation,
    prayer: verse.prayer,
    application: ['read', 'reflect', 'pray'],
    fallback: false,
  });
}
