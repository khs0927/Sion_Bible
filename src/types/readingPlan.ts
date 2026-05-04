export interface ReadingReference {
  bookId: string;
  bookName: string;
  startChapter: number;
  endChapter?: number;
}

export interface ReadingDayTask {
  day: number;
  title: string;
  references: ReadingReference[];
  reflectionPrompt?: string;
}

export interface ReadingPlanTemplate {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  days: number;
  tone: 'full' | 'fast' | 'new-testament' | 'gospels' | 'wisdom' | 'pentateuch';
  tasks: ReadingDayTask[];
}

export interface ReadingPlanProgress {
  templateId: string;
  startedAt: string;
  completedDays: number[];
}
