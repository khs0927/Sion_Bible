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

const OLD_TESTAMENT_IDS = BOOKS.slice(0, 39).map((book) => book.id);
const NEW_TESTAMENT_IDS = BOOKS.slice(39).map((book) => book.id);
const GOSPEL_IDS = ['mat', 'mrk', 'luk', 'jhn'];
const PENTATEUCH_IDS = ['gen', 'exo', 'lev', 'num', 'deu'];
const HISTORY_IDS = ['jos', 'jdg', 'rut', '1sa', '2sa', '1ki', '2ki', '1ch', '2ch', 'ezr', 'neh', 'est'];
const WISDOM_IDS = ['job', 'psa', 'pro', 'ecc', 'sng'];
const MAJOR_PROPHET_IDS = ['isa', 'jer', 'lam', 'ezk', 'dan'];
const MINOR_PROPHET_IDS = ['hos', 'jol', 'amo', 'oba', 'jon', 'mic', 'nam', 'hab', 'zep', 'hag', 'zec', 'mal'];
const PAUL_IDS = ['rom', '1co', '2co', 'gal', 'eph', 'php', 'col', '1th', '2th', '1ti', '2ti', 'tit', 'phm'];
const GENERAL_EPISTLE_IDS = ['heb', 'jas', '1pe', '2pe', '1jn', '2jn', '3jn', 'jud'];
const JOHN_WRITINGS_IDS = ['jhn', '1jn', '2jn', '3jn', 'rev'];
const PRISON_EPISTLE_IDS = ['eph', 'php', 'col', 'phm'];
const PASTORAL_EPISTLE_IDS = ['1ti', '2ti', 'tit'];

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
  options: Pick<ReadingPlanTemplate, 'bookIds' | 'editable'> = {},
): ReadingPlanTemplate {
  return {
    id,
    title,
    subtitle,
    description,
    days,
    tone,
    tasks: buildTasks(books, days),
    bookIds: options.bookIds ?? books.map((book) => book.id),
    editable: options.editable,
  };
}

export function formatReadingReference(ref: ReadingReference) {
  return refLabel(ref);
}

export const READING_PLAN_BOOK_OPTIONS = BOOKS.map((book) => ({ ...book }));

export function createCustomReadingPlanTemplate({
  id,
  title,
  days,
  bookIds,
}: {
  id: string;
  title: string;
  days: number;
  bookIds: string[];
}): ReadingPlanTemplate {
  const uniqueBookIds = Array.from(new Set(bookIds));
  const selectedBooks = rangeBooks(uniqueBookIds.length > 0 ? uniqueBookIds : ['jhn']);
  const safeDays = Math.min(365, Math.max(1, Math.round(days)));
  const bookTitle = selectedBooks.length === 1
    ? selectedBooks[0].name
    : `${selectedBooks[0].name} 외 ${selectedBooks.length - 1}권`;

  return makePlan(
    id,
    title.trim() || '나만의 통독 코스',
    `${safeDays}일 직접 구성`,
    `${bookTitle}을 선택한 기간에 맞춰 나누어 읽습니다.`,
    safeDays,
    'custom',
    selectedBooks,
    { bookIds: selectedBooks.map((book) => book.id), editable: true },
  );
}

export const READING_PLAN_TEMPLATES: ReadingPlanTemplate[] = [
  makePlan('bible-365', '성경 365', '하루 조금씩, 1년 완독', '구약과 신약 전체를 매일 부담 없는 분량으로 읽습니다.', 365, 'full', BOOKS),
  makePlan('bible-180', '성경 180', '반년 집중 통독', '하루 분량을 조금 늘려 성경 전체 흐름을 빠르게 잡습니다.', 180, 'fast', BOOKS),
  makePlan('bible-100', '성경 100일', '성경 전체 핵심 흐름', '매일 집중해서 창세기부터 계시록까지 빠르게 훑습니다.', 100, 'fast', BOOKS),
  makePlan('bible-90', '성경 90일', '3개월 집중 완독', '짧은 기간에 성경 전체 구조를 강하게 붙드는 코스입니다.', 90, 'fast', BOOKS),
  makePlan('bible-60', '성경 60일', '두 달 몰입 통독', '하루 분량이 많지만 전체 흐름을 빠르게 잡고 싶은 분에게 맞습니다.', 60, 'fast', BOOKS),
  makePlan('bible-30-overview', '성경 전체 30일', '전체 흐름 압축 읽기', '한 달 동안 성경 전체의 큰 줄기를 빠르게 따라갑니다.', 30, 'fast', BOOKS),

  makePlan('old-testament-270', '구약 270일', '언약과 역사 천천히', '구약 전체를 넉넉한 호흡으로 읽으며 하나님의 언약 흐름을 봅니다.', 270, 'full', rangeBooks(OLD_TESTAMENT_IDS)),
  makePlan('old-testament-180', '구약 180일', '구약 반년 통독', '창세기부터 말라기까지 구약의 큰 흐름을 반년 동안 읽습니다.', 180, 'full', rangeBooks(OLD_TESTAMENT_IDS)),
  makePlan('old-testament-120', '구약 120일', '구약 집중 읽기', '구약 전체를 4개월 호흡으로 이어 읽습니다.', 120, 'fast', rangeBooks(OLD_TESTAMENT_IDS)),
  makePlan('pentateuch-90', '모세오경 90일', '시작과 언약의 길', '창세기부터 신명기까지 말씀의 큰 뿌리를 읽습니다.', 90, 'pentateuch', rangeBooks(PENTATEUCH_IDS)),
  makePlan('pentateuch-30', '모세오경 30일', '율법과 언약 압축', '창세기부터 신명기까지 성경의 기초를 한 달 동안 살핍니다.', 30, 'pentateuch', rangeBooks(PENTATEUCH_IDS)),
  makePlan('history-120', '역사서 120일', '이스라엘 이야기', '여호수아부터 에스더까지 성경 역사 흐름을 큰 그림으로 읽습니다.', 120, 'fast', rangeBooks(HISTORY_IDS)),
  makePlan('history-60', '역사서 60일', '왕국과 포로의 길', '이스라엘의 순종과 실패, 회복의 역사를 두 달 동안 읽습니다.', 60, 'fast', rangeBooks(HISTORY_IDS)),
  makePlan('major-prophets-90', '대선지서 90일', '심판과 회복의 말씀', '이사야부터 다니엘까지 선지자의 메시지를 차분히 읽습니다.', 90, 'full', rangeBooks(MAJOR_PROPHET_IDS)),
  makePlan('minor-prophets-30', '소선지서 30일', '돌이킴의 초대', '열두 소선지서를 한 달 동안 읽으며 회개와 소망을 묵상합니다.', 30, 'full', rangeBooks(MINOR_PROPHET_IDS)),
  makePlan('prophets-120', '선지서 120일', '회개와 회복의 큰 흐름', '대선지서와 소선지서를 함께 읽으며 하나님의 마음을 봅니다.', 120, 'full', rangeBooks([...MAJOR_PROPHET_IDS, ...MINOR_PROPHET_IDS])),

  makePlan('new-testament-100', '신약 100일', '복음과 교회의 시작', '마태복음부터 요한계시록까지 신약 전체를 차분히 읽습니다.', 100, 'new-testament', rangeBooks(NEW_TESTAMENT_IDS)),
  makePlan('new-testament-60', '신약 60일', '복음부터 계시록까지', '신약 전체 흐름을 두 달 동안 부담 없이 이어갑니다.', 60, 'new-testament', rangeBooks(NEW_TESTAMENT_IDS)),
  makePlan('new-testament-30', '신약 핵심 30일', '복음서부터 서신까지', '신약 전체를 너무 길지 않은 호흡으로 훑어보고 싶은 분에게 맞춘 코스입니다.', 30, 'new-testament', rangeBooks(NEW_TESTAMENT_IDS)),
  makePlan('new-testament-21', '신약 21일', '예수님과 교회의 흐름', '짧은 기간에 신약의 큰 흐름을 빠르게 붙듭니다.', 21, 'new-testament', rangeBooks(NEW_TESTAMENT_IDS)),
  makePlan('gospels-45', '사복음서 45일', '예수님의 길 천천히', '네 복음서를 여유 있게 읽으며 예수님의 말씀과 사역을 따라갑니다.', 45, 'gospels', rangeBooks(GOSPEL_IDS)),
  makePlan('gospels-30', '사복음서 30일', '예수님의 생애 따라가기', '마태, 마가, 누가, 요한복음을 한 달 리듬으로 읽습니다.', 30, 'gospels', rangeBooks(GOSPEL_IDS)),
  makePlan('gospels-14', '복음서 맛보기', '처음 시작하는 2주', '처음 통독을 시작하는 분을 위해 사복음서의 흐름을 가볍게 잡습니다.', 14, 'gospels', rangeBooks(GOSPEL_IDS)),
  makePlan('john-21', '요한복음 21일', '하루 한 장 깊이 읽기', '요한복음을 한 장씩 읽으며 예수님의 사랑과 생명을 묵상합니다.', 21, 'gospels', rangeBooks(['jhn'])),
  makePlan('john-10', '요한복음 천천히', '10일 깊이 읽기', '요한복음을 부담 없이 나누어 읽고 묵상 질문을 남기기 좋게 만들었습니다.', 10, 'gospels', rangeBooks(['jhn'])),
  makePlan('john-7', '요한복음 7일', '사랑과 생명의 복음', '요한복음을 일주일 동안 깊게 묵상합니다.', 7, 'gospels', rangeBooks(['jhn'])),
  makePlan('mark-16', '마가복음 16일', '예수님의 빠른 행보', '마가복음을 하루 한 장씩 읽으며 예수님의 섬김을 따라갑니다.', 16, 'gospels', rangeBooks(['mrk'])),
  makePlan('luke-24', '누가복음 24일', '긍휼의 예수님', '누가복음을 하루 한 장씩 읽으며 주님의 긍휼을 묵상합니다.', 24, 'gospels', rangeBooks(['luk'])),

  makePlan('acts-28', '사도행전 28일', '초대교회 여정 따라가기', '하루 한 장씩 사도행전의 흐름을 따라가며 교회의 시작을 봅니다.', 28, 'new-testament', rangeBooks(['act'])),
  makePlan('paul-45', '바울서신 45일', '복음의 적용 읽기', '로마서부터 빌레몬서까지 교리와 삶의 권면을 균형 있게 읽습니다.', 45, 'new-testament', rangeBooks(PAUL_IDS)),
  makePlan('paul-30', '바울서신 30일', '은혜와 삶의 권면', '바울서신을 한 달 동안 읽으며 복음이 삶에 적용되는 길을 봅니다.', 30, 'new-testament', rangeBooks(PAUL_IDS)),
  makePlan('romans-16', '로마서 16일', '복음의 기초', '로마서를 하루 한 장씩 읽으며 의롭다 하심과 새 생명을 붙듭니다.', 16, 'new-testament', rangeBooks(['rom'])),
  makePlan('prison-14', '옥중서신 14일', '기쁨과 그리스도 중심', '에베소서, 빌립보서, 골로새서, 빌레몬서를 짧게 묵상합니다.', 14, 'new-testament', rangeBooks(PRISON_EPISTLE_IDS)),
  makePlan('pastoral-14', '목회서신 14일', '믿음의 질서와 경건', '디모데전후서와 디도서를 읽으며 교회와 삶의 질서를 묵상합니다.', 14, 'new-testament', rangeBooks(PASTORAL_EPISTLE_IDS)),
  makePlan('general-21', '공동서신 21일', '믿음의 인내와 사랑', '히브리서부터 유다서까지 믿음의 권면을 읽습니다.', 21, 'new-testament', rangeBooks(GENERAL_EPISTLE_IDS)),
  makePlan('john-writings-30', '요한문헌 30일', '사랑과 생명과 소망', '요한복음, 요한서신, 계시록을 함께 읽으며 사랑과 소망을 봅니다.', 30, 'gospels', rangeBooks(JOHN_WRITINGS_IDS)),
  makePlan('revelation-22', '요한계시록 22일', '어린양의 승리', '요한계시록을 하루 한 장씩 읽으며 마지막 소망을 붙듭니다.', 22, 'new-testament', rangeBooks(['rev'])),

  makePlan('wisdom-90', '지혜서 90일', '시와 지혜의 길', '욥기, 시편, 잠언, 전도서, 아가를 천천히 읽으며 마음의 언어를 넓힙니다.', 90, 'wisdom', rangeBooks(WISDOM_IDS)),
  makePlan('wisdom-60', '지혜서 60일', '기도와 지혜의 균형', '시와 지혜의 말씀을 두 달 동안 읽으며 마음을 정돈합니다.', 60, 'wisdom', rangeBooks(WISDOM_IDS)),
  makePlan('psalms-150', '시편 150일', '하루 한 편 기도', '시편을 하루 한 편씩 읽으며 기도의 언어를 회복합니다.', 150, 'wisdom', rangeBooks(['psa'])),
  makePlan('psalms-60', '시편 60일', '기도와 찬양의 언어', '시편을 매일 넉넉히 읽으며 기도의 말을 회복합니다.', 60, 'wisdom', rangeBooks(['psa'])),
  makePlan('psalms-30', '시편 30일', '한 달 기도 루틴', '시편을 한 달 동안 집중해서 읽으며 마음을 하나님께 올려드립니다.', 30, 'wisdom', rangeBooks(['psa'])),
  makePlan('proverbs-31', '잠언 31일', '매일 지혜 한 장', '잠언을 하루 한 장씩 읽으며 삶의 지혜를 배웁니다.', 31, 'wisdom', rangeBooks(['pro'])),
  makePlan('proverbs-30', '잠언 30일', '매일 지혜 한 걸음', '잠언 전체를 한 달 동안 삶의 지혜로 받아들입니다.', 30, 'wisdom', rangeBooks(['pro'])),
  makePlan('job-42', '욥기 42일', '고난 속 믿음', '욥기를 하루 한 장씩 읽으며 고난 속에서도 하나님을 바라봅니다.', 42, 'wisdom', rangeBooks(['job'])),
  makePlan('morning-21', '아침 10분 코스', '21일 작은 습관 만들기', '시편과 잠언을 짧게 읽으며 매일의 시작을 말씀으로 열 수 있게 구성했습니다.', 21, 'wisdom', rangeBooks(['psa', 'pro'])),
];

export const CUSTOM_READING_PLAN_TEMPLATES: ReadingPlanTemplate[] = [];

export const ALL_READING_PLAN_TEMPLATES: ReadingPlanTemplate[] = [
  ...READING_PLAN_TEMPLATES,
  ...CUSTOM_READING_PLAN_TEMPLATES,
];
