/**
 * 공개 원천(개역한글 본문 + 절 제목)으로 성경 색인 "복구 기록"을 재생성한다.
 *
 * 배경
 * - 색인 원본은 개인 PC(C:/Users/khs09/Downloads/성경(구약+신약).md)에서 만들어져 저장소에 없다.
 * - 2026-08-29 점검에서 62권(66권 중)의 1장 1절이 색인에서 누락된 것이 확인됐다.
 *   (import-user-korean-bible.mjs 구버전이 책 경계 첫 절을 이전 책 마지막 절에 병합해 버린 영향)
 * - 같은 본문/번호/절 제목을 가진 공개 원천을 고정 커밋으로 참조하면 누락 구절과
 *   깨진 문자(?, 책 경계 혼합 문장)를 정확히 복구할 수 있다.
 *
 * 동작
 * 1. 공개 원천 66권 텍스트를 고정 커밋에서 내려받아 .cache/bible-source/ 에 캐시한다.
 * 2. import-user-korean-bible.mjs 와 동일한 규칙으로 파싱한다.
 * 3. 현재 public/bible/korean-bible-index.json 과 대조해
 *    - 누락 구절(추가) / 본문 불일치 구절(교정) 목록을 계산한다.
 * 4. public/bible/korean-bible-patches.json 에 복구 기록을 쓴다.
 *    (이미 패치 파일에 들어 있는 수동 보정은 그대로 유지한다.)
 *
 * 사용법
 *   node scripts/import-public-korean-bible.mjs            # 원천 내려받기 + 패치 재생성
 *   node scripts/import-public-korean-bible.mjs --check    # 파일 수정 없이 대조 결과만 출력
 *   node scripts/import-public-korean-bible.mjs --source-dir <dir>   # 로컬 원천 사용
 */
import fs from 'node:fs';
import path from 'node:path';

const REPO_ROOT = path.resolve(import.meta.dirname, '..');
const INDEX_PATH = path.join(REPO_ROOT, 'public/bible/korean-bible-index.json');
const PATCH_PATH = path.join(REPO_ROOT, 'public/bible/korean-bible-patches.json');
const META_PATH = path.join(REPO_ROOT, 'public/bible/korean-bible-meta.json');
const BOOKS_PATH = path.join(REPO_ROOT, 'src/data/bibleBooks.ts');
const CACHE_DIR = path.join(REPO_ROOT, '.cache/bible-source');

// 공개 원천 고정 버전 (개역한글 본문 + 절 제목, 본문 31,102행)
const SOURCE_REPOSITORY = 'neppiness/typer-bible';
const SOURCE_COMMIT = 'de7861d47a1b8dd916f0ed94abb726799cf38dc3';
const SOURCE_PATH_PREFIX = 'src/main/resources/bible-text';

// 원천 파일(영문 파일명) -> 성경책 id
const SOURCE_FILES = [
  ['old', '01GENESIS.txt', 'gen'], ['old', '02EXODUS.txt', 'exo'], ['old', '03LEVITICUS.txt', 'lev'],
  ['old', '04NUMBERS.txt', 'num'], ['old', '05DEUTERONOMY.txt', 'deu'], ['old', '06JOSHUA.txt', 'jos'],
  ['old', '07JUDGES.txt', 'jdg'], ['old', '08RUTH.txt', 'rut'], ['old', '09SAMUEL1.txt', '1sa'],
  ['old', '10SAMUEL2.txt', '2sa'], ['old', '11KINGS1.txt', '1ki'], ['old', '12KINGS2.txt', '2ki'],
  ['old', '13CHRONICLES1.txt', '1ch'], ['old', '14CHRONICLES2.txt', '2ch'], ['old', '15EZRA.txt', 'ezr'],
  ['old', '16NEHEMIAH.txt', 'neh'], ['old', '17ESTHER.txt', 'est'], ['old', '18JOB.txt', 'job'],
  ['old', '19PSALMS.txt', 'psa'], ['old', '20PROVERBS.txt', 'pro'], ['old', '21ECCLESIASTES.txt', 'ecc'],
  ['old', '22SONGOFSOLOMON.txt', 'sng'], ['old', '23ISAIAH.txt', 'isa'], ['old', '24JEREMIAH.txt', 'jer'],
  ['old', '25LAMENTATIONS.txt', 'lam'], ['old', '26EZEKIEL.txt', 'ezk'], ['old', '27DANIEL.txt', 'dan'],
  ['old', '28HOSEA.txt', 'hos'], ['old', '29JOEL.txt', 'jol'], ['old', '30AMOS.txt', 'amo'],
  ['old', '31OBADIAH.txt', 'oba'], ['old', '32JONAH.txt', 'jon'], ['old', '33MICAH.txt', 'mic'],
  ['old', '34NAHUM.txt', 'nam'], ['old', '35HABAKKUK.txt', 'hab'], ['old', '36ZEPHANIAH.txt', 'zep'],
  ['old', '37HAGGAI.txt', 'hag'], ['old', '38ZECHARIAH.txt', 'zec'], ['old', '39MALACHI.txt', 'mal'],
  ['new', '01MATTHEW.txt', 'mat'], ['new', '02MARK.txt', 'mrk'], ['new', '03LUKE.txt', 'luk'],
  ['new', '04JOHN.txt', 'jhn'], ['new', '05ACTS.txt', 'act'], ['new', '06ROMANS.txt', 'rom'],
  ['new', '07CORINTHIANS1.txt', '1co'], ['new', '08CORINTHIANS2.txt', '2co'], ['new', '09GALATIANS.txt', 'gal'],
  ['new', '10EPHESIANS.txt', 'eph'], ['new', '11PHILIPPIANS.txt', 'php'], ['new', '12COLOSSIANS.txt', 'col'],
  ['new', '13THESSALONIANS1.txt', '1th'], ['new', '14THESSALONIANS2.txt', '2th'], ['new', '15TIMOTHY1.txt', '1ti'],
  ['new', '16TIMOTHY2.txt', '2ti'], ['new', '17TITUS.txt', 'tit'], ['new', '18PHILEMON.txt', 'phm'],
  ['new', '19HEBREWS.txt', 'heb'], ['new', '20JAMES.txt', 'jas'], ['new', '21PETER1.txt', '1pe'],
  ['new', '22PETER2.txt', '2pe'], ['new', '23JOHN1.txt', '1jn'], ['new', '24JOHN2.txt', '2jn'],
  ['new', '25JOHN3.txt', '3jn'], ['new', '26JUDE.txt', 'jud'], ['new', '27REVELATION.txt', 'rev'],
];

const args = process.argv.slice(2);
const checkOnly = args.includes('--check');
const sourceDirIndex = args.indexOf('--source-dir');
const externalSourceDir = sourceDirIndex >= 0 ? args[sourceDirIndex + 1] : null;

function parseBooks() {
  const source = fs.readFileSync(BOOKS_PATH, 'utf8');
  const pattern = /\{\s*id:\s*'([^']+)',\s*number:\s*(\d+),\s*name:\s*'([^']+)',\s*abbr:\s*'([^']+)',\s*testament:\s*'([^']+)',\s*chapters:\s*(\d+)\s*\}/g;
  const books = [];
  for (const match of source.matchAll(pattern)) {
    const [, id, number, name, abbr, testament] = match;
    books.push({ id, number: Number(number), name, abbr, testament });
  }
  if (books.length !== 66) throw new Error(`성경책 파싱 실패: ${books.length}/66`);
  return books;
}

async function ensureSourceFiles() {
  const targetRoot = externalSourceDir ?? CACHE_DIR;
  for (const [dir, file] of SOURCE_FILES) {
    const target = path.join(targetRoot, dir, file);
    if (fs.existsSync(target)) continue;
    fs.mkdirSync(path.dirname(target), { recursive: true });
    const url = `https://raw.githubusercontent.com/${SOURCE_REPOSITORY}/${SOURCE_COMMIT}/${SOURCE_PATH_PREFIX}/${dir}/${file}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`원천 내려받기 실패 (${response.status}): ${url}`);
    fs.writeFileSync(target, await response.text(), 'utf8');
  }
  return targetRoot;
}

function normalize(text) {
  return text
    .replace(/\s+/g, '')
    .replace(/[.,/#!$%\^&\*;:{}=\-_`~()\[\]<>「」『』“”'"?？!！·,，。]/g, '')
    .trim();
}

const versePattern = /^([^0-9]+)(\d+):(\d+)(?:-(\d+))?\s+(.+)$/;
const continuationPattern = /^([^0-9]+)(\d+):(.+)$/;
const headingPattern = /^제[이삼사오]?권$/;

function parseSource(root, books) {
  const byAbbr = new Map(books.map((book) => [book.abbr, book]));
  const records = [];
  const stats = { rangeLines: 0, appendedLines: 0, skippedHeadings: 0, unparsed: [] };

  for (const [dir, file] of SOURCE_FILES) {
    const text = fs.readFileSync(path.join(root, dir, file), 'utf8');
    for (const line of text.split(/\r?\n/)) {
      if (!line.trim()) continue;

      const verseMatch = line.match(versePattern);
      if (verseMatch) {
        const [, abbr, chapterText, startText, endText, verseText] = verseMatch;
        const book = byAbbr.get(abbr);
        if (!book) {
          stats.unparsed.push(line);
          continue;
        }
        const chapter = Number(chapterText);
        const startVerse = Number(startText);
        const endVerse = endText ? Number(endText) : startVerse;
        if (endVerse > startVerse) stats.rangeLines += 1;
        for (let verse = startVerse; verse <= endVerse; verse += 1) {
          records.push({
            id: `${book.id}-${chapter}-${verse}`,
            bookId: book.id,
            bookName: book.name,
            bookOrder: book.number,
            testament: book.testament,
            chapter,
            verse,
            ref: `${book.name} ${chapter}:${verse}`,
            text: verseText.trim(),
            searchText: normalize(verseText),
          });
        }
        continue;
      }

      const continuationMatch = line.match(continuationPattern);
      if (continuationMatch) {
        const [, abbr, chapterText, continuationText] = continuationMatch;
        const book = byAbbr.get(abbr);
        if (!book) {
          stats.unparsed.push(line);
          continue;
        }
        const chapter = Number(chapterText);
        const trimmed = continuationText.trim();
        if (headingPattern.test(trimmed)) {
          stats.skippedHeadings += 1;
          continue;
        }
        const last = records.at(-1);
        if (last && last.bookId === book.id && last.chapter === chapter) {
          last.text = `${last.text} ${trimmed}`.trim();
          last.searchText = normalize(last.text);
          stats.appendedLines += 1;
          continue;
        }
        records.push({
          id: `${book.id}-${chapter}-1`,
          bookId: book.id,
          bookName: book.name,
          bookOrder: book.number,
          testament: book.testament,
          chapter,
          verse: 1,
          ref: `${book.name} ${chapter}:1`,
          text: trimmed,
          searchText: normalize(trimmed),
        });
        stats.appendedLines += 1;
        continue;
      }

      stats.unparsed.push(line);
    }
  }

  if (stats.unparsed.length > 0) {
    throw new Error(`원천 파싱 실패 ${stats.unparsed.length}줄: ${stats.unparsed[0]}`);
  }

  const byId = new Map();
  for (const record of records) byId.set(record.id, record);
  return { records: byId, stats };
}

const books = parseBooks();
const sourceRoot = await ensureSourceFiles();
const { records: sourceRecords, stats } = parseSource(sourceRoot, books);

const base = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'));
const existingPatches = fs.existsSync(PATCH_PATH) ? JSON.parse(fs.readFileSync(PATCH_PATH, 'utf8')) : [];
const baseById = new Map(base.map((verse) => [verse.id, verse]));
const patchedIds = new Set(existingPatches.map((verse) => verse.id));

const missing = [...sourceRecords.keys()].filter((id) => !baseById.has(id));
const differing = [...sourceRecords.keys()].filter(
  (id) => baseById.has(id) && baseById.get(id).text !== sourceRecords.get(id).text,
);

const generated = [];
const keptManual = [];
for (const id of missing.concat(differing)) {
  if (patchedIds.has(id)) {
    keptManual.push(id);
    continue;
  }
  generated.push(sourceRecords.get(id));
}

const merged = new Map();
for (const verse of base) merged.set(verse.id, verse);
for (const verse of existingPatches) merged.set(verse.id, verse);
for (const verse of generated) merged.set(verse.id, verse);

const finalPatches = [...existingPatches, ...generated].sort(
  (left, right) =>
    left.bookOrder - right.bookOrder || left.chapter - right.chapter || left.verse - right.verse,
);

console.log(`원천 구절 수: ${sourceRecords.size}`);
console.log(`색인 구절 수: ${base.length}`);
console.log(`누락 구절: ${missing.length} / 본문 불일치: ${differing.length}`);
console.log(`수동 보정 유지: ${keptManual.length} (${keptManual.join(', ') || '없음'})`);
console.log(`복구 기록: ${finalPatches.length}건 (기존 ${existingPatches.length} + 생성 ${generated.length})`);
console.log(`병합 후 구절 수: ${merged.size}`);
console.log(
  `파싱 통계: 범위 ${stats.rangeLines} / 이어붙임 ${stats.appendedLines} / 제목 생략 ${stats.skippedHeadings}`,
);

if (checkOnly) {
  console.log('--check 모드: 파일을 수정하지 않았습니다.');
  process.exit(0);
}

fs.writeFileSync(PATCH_PATH, `${JSON.stringify(finalPatches, null, 2)}\n`, 'utf8');

const meta = fs.existsSync(META_PATH) ? JSON.parse(fs.readFileSync(META_PATH, 'utf8')) : {};
meta.verseCount = merged.size;
meta.baseVerseCount = base.length;
meta.repairSource = {
  repository: `${SOURCE_REPOSITORY}@${SOURCE_COMMIT}`,
  path: SOURCE_PATH_PREFIX,
  fetchedAt: new Date().toISOString(),
  bookCount: SOURCE_FILES.length,
  verseCount: sourceRecords.size,
  missingVersesRestored: missing.length,
  correctedVerses: differing.length,
};
fs.writeFileSync(META_PATH, `${JSON.stringify(meta, null, 2)}\n`, 'utf8');

console.log(`갱신: ${path.relative(REPO_ROOT, PATCH_PATH)}, ${path.relative(REPO_ROOT, META_PATH)}`);
