import fs from 'fs';
import path from 'path';

const SOURCE_PATH = 'C:/Users/khs09/Downloads/성경(구약+신약).md';
const REPO_ROOT = path.resolve(import.meta.dirname, '..');
const INDEX_PATH = path.join(REPO_ROOT, 'public/bible/korean-bible-index.json');
const META_PATH = path.join(REPO_ROOT, 'public/bible/korean-bible-meta.json');
const BOOKS_PATH = path.join(REPO_ROOT, 'src/data/bibleBooks.ts');

const BOOKS = [
  ['gen', 1, '창세기', '창', 'old', 50],
  ['exo', 2, '출애굽기', '출', 'old', 40],
  ['lev', 3, '레위기', '레', 'old', 27],
  ['num', 4, '민수기', '민', 'old', 36],
  ['deu', 5, '신명기', '신', 'old', 34],
  ['jos', 6, '여호수아', '수', 'old', 24],
  ['jdg', 7, '사사기', '삿', 'old', 21],
  ['rut', 8, '룻기', '룻', 'old', 4],
  ['1sa', 9, '사무엘상', '삼상', 'old', 31],
  ['2sa', 10, '사무엘하', '삼하', 'old', 24],
  ['1ki', 11, '열왕기상', '왕상', 'old', 22],
  ['2ki', 12, '열왕기하', '왕하', 'old', 25],
  ['1ch', 13, '역대상', '대상', 'old', 29],
  ['2ch', 14, '역대하', '대하', 'old', 36],
  ['ezr', 15, '에스라', '스', 'old', 10],
  ['neh', 16, '느헤미야', '느', 'old', 13],
  ['est', 17, '에스더', '에', 'old', 10],
  ['job', 18, '욥기', '욥', 'old', 42],
  ['psa', 19, '시편', '시', 'old', 150],
  ['pro', 20, '잠언', '잠', 'old', 31],
  ['ecc', 21, '전도서', '전', 'old', 12],
  ['sng', 22, '아가', '아', 'old', 8],
  ['isa', 23, '이사야', '사', 'old', 66],
  ['jer', 24, '예레미야', '렘', 'old', 52],
  ['lam', 25, '예레미야애가', '애', 'old', 5],
  ['ezk', 26, '에스겔', '겔', 'old', 48],
  ['dan', 27, '다니엘', '단', 'old', 12],
  ['hos', 28, '호세아', '호', 'old', 14],
  ['jol', 29, '요엘', '욜', 'old', 3],
  ['amo', 30, '아모스', '암', 'old', 9],
  ['oba', 31, '오바댜', '옵', 'old', 1],
  ['jon', 32, '요나', '욘', 'old', 4],
  ['mic', 33, '미가', '미', 'old', 7],
  ['nam', 34, '나훔', '나', 'old', 3],
  ['hab', 35, '하박국', '합', 'old', 3],
  ['zep', 36, '스바냐', '습', 'old', 3],
  ['hag', 37, '학개', '학', 'old', 2],
  ['zec', 38, '스가랴', '슥', 'old', 14],
  ['mal', 39, '말라기', '말', 'old', 4],
  ['mat', 40, '마태복음', '마', 'new', 28],
  ['mrk', 41, '마가복음', '막', 'new', 16],
  ['luk', 42, '누가복음', '눅', 'new', 24],
  ['jhn', 43, '요한복음', '요', 'new', 21],
  ['act', 44, '사도행전', '행', 'new', 28],
  ['rom', 45, '로마서', '롬', 'new', 16],
  ['1co', 46, '고린도전서', '고전', 'new', 16],
  ['2co', 47, '고린도후서', '고후', 'new', 13],
  ['gal', 48, '갈라디아서', '갈', 'new', 6],
  ['eph', 49, '에베소서', '엡', 'new', 6],
  ['php', 50, '빌립보서', '빌', 'new', 4],
  ['col', 51, '골로새서', '골', 'new', 4],
  ['1th', 52, '데살로니가전서', '살전', 'new', 5],
  ['2th', 53, '데살로니가후서', '살후', 'new', 3],
  ['1ti', 54, '디모데전서', '딤전', 'new', 6],
  ['2ti', 55, '디모데후서', '딤후', 'new', 4],
  ['tit', 56, '디도서', '딛', 'new', 3],
  ['phm', 57, '빌레몬서', '몬', 'new', 1],
  ['heb', 58, '히브리서', '히', 'new', 13],
  ['jas', 59, '야고보서', '약', 'new', 5],
  ['1pe', 60, '베드로전서', '벧전', 'new', 5],
  ['2pe', 61, '베드로후서', '벧후', 'new', 3],
  ['1jn', 62, '요한일서', '요일', 'new', 5],
  ['2jn', 63, '요한이서', '요이', 'new', 1],
  ['3jn', 64, '요한삼서', '요삼', 'new', 1],
  ['jud', 65, '유다서', '유', 'new', 1],
  ['rev', 66, '요한계시록', '계', 'new', 22],
].map(([id, number, name, abbr, testament, chapters]) => ({
  id,
  number,
  name,
  abbr,
  testament,
  chapters,
}));

const byAbbr = new Map(BOOKS.map((book) => [book.abbr, book]));

function normalize(text) {
  return text
    .replace(/\s+/g, '')
    .replace(/[.,/#!$%^&*;:{}=\-_`~()[\]<>「」『』“”'"?？!！·,，。]/g, '')
    .trim();
}

const raw = fs.readFileSync(SOURCE_PATH);
const lines = new TextDecoder('utf-8').decode(raw).split(/\r?\n/);
const records = [];
let rangeLines = 0;
let appendedLines = 0;
let skippedHeadings = 0;

for (const line of lines) {
  if (!line.trim()) continue;

  const verseMatch = line.match(/^([^0-9]+)(\d+):(\d+)(?:-(\d+))?\s+(.+)$/);
  if (verseMatch) {
    const [, abbr, chapterText, startText, endText, text] = verseMatch;
    const book = byAbbr.get(abbr);
    if (!book) throw new Error(`Unknown book abbreviation: ${abbr}`);

    const chapter = Number(chapterText);
    const startVerse = Number(startText);
    const endVerse = endText ? Number(endText) : startVerse;
    if (endVerse > startVerse) rangeLines += 1;

    for (let verse = startVerse; verse <= endVerse; verse += 1) {
      records.push({
        id: `${book.id}-${chapter}-${verse}`,
        bookId: book.id,
        bookName: book.name,
        testament: book.testament,
        bookOrder: book.number,
        chapter,
        verse,
        ref: `${book.name} ${chapter}:${verse}`,
        text: text.trim(),
        searchText: normalize(text),
      });
    }
    continue;
  }

  const continuationMatch = line.match(/^([^0-9]+)(\d+):(.+)$/);
  if (continuationMatch) {
    const [, abbr, chapterText, text] = continuationMatch;
    const book = byAbbr.get(abbr);
    const chapter = Number(chapterText);
    const trimmed = text.trim();

    if (/^제[이삼사오]?권$/.test(trimmed)) {
      skippedHeadings += 1;
      continue;
    }

    const last = records.at(-1);
    if (book && last && last.bookId === book.id && last.chapter === chapter) {
      last.text = `${last.text} ${trimmed}`.trim();
      last.searchText = normalize(last.text);
      appendedLines += 1;
      continue;
    }

    if (book) {
      records.push({
        id: `${book.id}-${chapter}-1`,
        bookId: book.id,
        bookName: book.name,
        testament: book.testament,
        bookOrder: book.number,
        chapter,
        verse: 1,
        ref: `${book.name} ${chapter}:1`,
        text: trimmed,
        searchText: normalize(trimmed),
      });
      appendedLines += 1;
      continue;
    }
  }

  throw new Error(`Unparsed line: ${line}`);
}

fs.writeFileSync(INDEX_PATH, JSON.stringify(records), 'utf8');
fs.writeFileSync(
  META_PATH,
  JSON.stringify(
    {
      version: 'user-provided-korean-bible',
      verseCount: records.length,
      createdAt: new Date().toISOString(),
      source: SOURCE_PATH,
      encoding: 'utf-8',
      rangeLinesExpanded: rangeLines,
      headingLinesSkipped: skippedHeadings,
      malformedContinuationLinesAppended: appendedLines,
    },
    null,
    2,
  ),
  'utf8',
);

const oldBooksFile = fs.readFileSync(BOOKS_PATH, 'utf8');
const randomStart = oldBooksFile.indexOf('export const RANDOM_POOL');
if (randomStart < 0) throw new Error('RANDOM_POOL block not found');

const randomPool = oldBooksFile.slice(randomStart);
const bookLines = BOOKS.map(
  (book) =>
    `  { id: '${book.id}', number: ${book.number}, name: '${book.name}', abbr: '${book.abbr}', testament: '${book.testament}', chapters: ${book.chapters} },`,
).join('\n');

const nextBooksFile = `export interface BibleBook {
  id: string;
  number: number;
  name: string;
  testament: 'old' | 'new';
  chapters: number;
  abbr: string;
}

export const BIBLE_BOOKS: BibleBook[] = [
${bookLines}
];

export const findBook = (id: string) => BIBLE_BOOKS.find(b => b.id === id);

${randomPool}`;

fs.writeFileSync(BOOKS_PATH, nextBooksFile, 'utf8');

console.log(
  `records=${records.length} rangeLines=${rangeLines} appended=${appendedLines} skippedHeadings=${skippedHeadings}`,
);
