import type { ReadingDayTask, ReadingPlanTemplate, ReadingReference } from '../types/readingPlan';

type BookSpec = {
  id: string;
  name: string;
  chapters: number;
};

const BOOKS: BookSpec[] = [
  { id: 'gen', name: '창세기', chapters: 50 },
  { id: 'exo', name: '출애굽기', chapters: 40 },
  { id: 'lev', name: '레위기', chapters: 27 },
  { id: 'num', name: '민수기', chapters: 36 },
  { id: 'deu', name: '신명기', chapters: 34 },
  { id: 'jos', name: '여호수아', chapters: 24 },
  { id: 'jdg', name: '사사기', chapters: 21 },
  { id: 'rut', name: '룻기', chapters: 4 },
  { id: '1sa', name: '사무엘상', chapters: 31 },
  { id: '2sa', name: '사무엘하', chapters: 24 },
  { id: '1ki', name: '열왕기상', chapters: 22 },
  { id: '2ki', name: '열왕기하', chapters: 25 },
  { id: '1ch', name: '역대상', chapters: 29 },
  { id: '2ch', name: '역대하', chapters: 36 },
  { id: 'ezr', name: '에스라', chapters: 10 },
  { id: 'neh', name: '느헤미야', chapters: 13 },
  { id: 'est', name: '에스더', chapters: 10 },
  { id: 'job', name: '욥기', chapters: 42 },
  { id: 'psa', name: '시편', chapters: 150 },
  { id: 'pro', name: '잠언', chapters: 31 },
  { id: 'ecc', name: '전도서', chapters: 12 },
  { id: 'sng', name: '아가', chapters: 8 },
  { id: 'isa', name: '이사야', chapters: 66 },
  { id: 'jer', name: '예레미야', chapters: 52 },
  { id: 'lam', name: '예레미야애가', chapters: 5 },
  { id: 'ezk', name: '에스겔', chapters: 48 },
  { id: 'dan', name: '다니엘', chapters: 12 },
  { id: 'hos', name: '호세아', chapters: 14 },
  { id: 'jol', name: '요엘', chapters: 3 },
  { id: 'amo', name: '아모스', chapters: 9 },
  { id: 'oba', name: '오바댜', chapters: 1 },
  { id: 'jon', name: '요나', chapters: 4 },
  { id: 'mic', name: '미가', chapters: 7 },
  { id: 'nam', name: '나훔', chapters: 3 },
  { id: 'hab', name: '하박국', chapters: 3 },
  { id: 'zep', name: '스바냐', chapters: 3 },
  { id: 'hag', name: '학개', chapters: 2 },
  { id: 'zec', name: '스가랴', chapters: 14 },
  { id: 'mal', name: '말라기', chapters: 4 },
  { id: 'mat', name: '마태복음', chapters: 28 },
  { id: 'mrk', name: '마가복음', chapters: 16 },
  { id: 'luk', name: '누가복음', chapters: 24 },
  { id: 'jhn', name: '요한복음', chapters: 21 },
  { id: 'act', name: '사도행전', chapters: 28 },
  { id: 'rom', name: '로마서', chapters: 16 },
  { id: '1co', name: '고린도전서', chapters: 16 },
  { id: '2co', name: '고린도후서', chapters: 13 },
  { id: 'gal', name: '갈라디아서', chapters: 6 },
  { id: 'eph', name: '에베소서', chapters: 6 },
  { id: 'php', name: '빌립보서', chapters: 4 },
  { id: 'col', name: '골로새서', chapters: 4 },
  { id: '1th', name: '데살로니가전서', chapters: 5 },
  { id: '2th', name: '데살로니가후서', chapters: 3 },
  { id: '1ti', name: '디모데전서', chapters: 6 },
  { id: '2ti', name: '디모데후서', chapters: 4 },
  { id: 'tit', name: '디도서', chapters: 3 },
  { id: 'phm', name: '빌레몬서', chapters: 1 },
  { id: 'heb', name: '히브리서', chapters: 13 },
  { id: 'jas', name: '야고보서', chapters: 5 },
  { id: '1pe', name: '베드로전서', chapters: 5 },
  { id: '2pe', name: '베드로후서', chapters: 3 },
  { id: '1jn', name: '요한일서', chapters: 5 },
  { id: '2jn', name: '요한이서', chapters: 1 },
  { id: '3jn', name: '요한삼서', chapters: 1 },
  { id: 'jud', name: '유다서', chapters: 1 },
  { id: 'rev', name: '요한계시록', chapters: 22 },
];

const NEW_TESTAMENT_IDS = BOOKS.slice(39).map((book) => book.id);
const GOSPEL_IDS = ['mat', 'mrk', 'luk', 'jhn'];
const PENTATEUCH_IDS = ['gen', 'exo', 'lev', 'num', 'deu'];

function rangeBooks(ids: string[]) {
  return BOOKS.filter((book) => ids.includes(book.id));
}

function expandChapters(books: BookSpec[]): ReadingReference[] {
  return books.flatMap((book) =>
    Array.from({ length: book.chapters }, (_, index) => ({
      bookId: book.id,
      bookName: book.name,
      startChapter: index + 1,
    })),
  );
}

function refLabel(ref: ReadingReference) {
  if (!ref.endChapter || ref.endChapter === ref.startChapter) return `${ref.bookName} ${ref.startChapter}장`;
  return `${ref.bookName} ${ref.startChapter}-${ref.endChapter}장`;
}

function compactReferences(refs: ReadingReference[]): ReadingReference[] {
  const compacted: ReadingReference[] = [];
  refs.forEach((ref) => {
    const last = compacted[compacted.length - 1];
    if (last && last.bookId === ref.bookId && (last.endChapter ?? last.startChapter) + 1 === ref.startChapter) {
      last.endChapter = ref.startChapter;
      return;
    }
    compacted.push({ ...ref });
  });
  return compacted;
}

function buildTasks(books: BookSpec[], days: number): ReadingDayTask[] {
  const chapters = expandChapters(books);
  return Array.from({ length: days }, (_, index) => {
    const start = Math.floor((index * chapters.length) / days);
    const end = Math.floor(((index + 1) * chapters.length) / days);
    const references = compactReferences(chapters.slice(start, Math.max(end, start + 1)));
    return {
      day: index + 1,
      title: `${index + 1}일차`,
      references,
      reflectionPrompt: `${references.map(refLabel).join(', ')}에서 오늘 마음에 남는 한 문장을 기록해보세요.`,
    };
  });
}

function makePlan(
  id: string,
  title: string,
  subtitle: string,
  description: string,
  days: number,
  tone: ReadingPlanTemplate['tone'],
  books: BookSpec[],
): ReadingPlanTemplate {
  return {
    id,
    title,
    subtitle,
    description,
    days,
    tone,
    tasks: buildTasks(books, days),
  };
}

export function formatReadingReference(ref: ReadingReference) {
  return refLabel(ref);
}

export const READING_PLAN_TEMPLATES: ReadingPlanTemplate[] = [
  makePlan('bible-365', '성경 365', '하루 조금씩, 1년 완독', '구약과 신약 전체를 매일 부담 없는 분량으로 이어갑니다.', 365, 'full', BOOKS),
  makePlan('bible-180', '성경 180', '반년 집중 통독', '하루 분량을 조금 늘려 성경 전체 흐름을 빠르게 잡습니다.', 180, 'fast', BOOKS),
  makePlan('new-testament-100', '신약 100일', '복음과 교회의 시작', '마태복음부터 요한계시록까지 신약 전체를 차분히 읽습니다.', 100, 'new-testament', rangeBooks(NEW_TESTAMENT_IDS)),
  makePlan('gospels-30', '사복음서 30일', '예수님의 생애 따라가기', '마태, 마가, 누가, 요한복음을 한 달 리듬으로 읽습니다.', 30, 'gospels', rangeBooks(GOSPEL_IDS)),
  makePlan('john-7', '요한복음 7일', '사랑과 생명의 복음', '요한복음을 일주일 동안 깊게 묵상합니다.', 7, 'gospels', rangeBooks(['jhn'])),
  makePlan('proverbs-30', '잠언 30일', '매일 지혜 한 걸음', '잠언 전체를 한 달 동안 삶의 지혜로 받아들입니다.', 30, 'wisdom', rangeBooks(['pro'])),
  makePlan('psalms-30', '시편 30일', '기도와 찬양의 언어', '시편을 매일 넉넉히 읽으며 기도의 말을 회복합니다.', 30, 'wisdom', rangeBooks(['psa'])),
  makePlan('pentateuch-90', '모세오경 90일', '시작과 언약의 길', '창세기부터 신명기까지 말씀의 큰 뿌리를 읽습니다.', 90, 'pentateuch', rangeBooks(PENTATEUCH_IDS)),
];
