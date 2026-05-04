import type { ReadingDayTask, ReadingReference } from '../types/readingPlan';
import type { BibleReadRange, BibleChapterRange } from '../types/bible';

/**
 * Converts a reading task's references to a BibleReadRange object.
 */
export function convertTaskToBibleRange(task: ReadingDayTask): BibleReadRange {
  const ranges: BibleChapterRange[] = task.references.map(ref => ({
    bookId: ref.bookId,
    bookName: ref.bookName,
    chapterStart: ref.startChapter,
    chapterEnd: ref.endChapter || ref.startChapter,
  }));

  const label = formatReadingRangeLabel(task.references);

  return {
    label,
    ranges,
    source: 'reading-plan',
    day: task.day,
  };
}

/**
 * Formats a list of reading references into a human-readable string.
 * e.g., "창세기 1-6장", "요한복음 3장", "창세기 1장, 마태복음 1장"
 */
export function formatReadingRangeLabel(references: ReadingReference[]): string {
  if (references.length === 0) return '본문 없음';

  return references
    .map(ref => {
      const isMultipleChapters = ref.endChapter && ref.endChapter !== ref.startChapter;
      const chapterRange = isMultipleChapters 
        ? `${ref.startChapter}-${ref.endChapter}` 
        : `${ref.startChapter}`;
      
      // Handle "Psalms" (시편) specially if needed, but normally "장" is fine.
      const unit = ref.bookName.includes('시편') ? '편' : '장';
      
      return `${ref.bookName} ${chapterRange}${unit}`;
    })
    .join(', ');
}
