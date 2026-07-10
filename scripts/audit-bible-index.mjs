import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
const indexPath = resolve(root, 'public/bible/korean-bible-index.json');
const patchPath = resolve(root, 'public/bible/korean-bible-patches.json');
const booksPath = resolve(root, 'src/data/bibleBooks.ts');

const [baseRaw, patchRaw, booksSource] = await Promise.all([
  readFile(indexPath, 'utf8'),
  readFile(patchPath, 'utf8').catch(() => '[]'),
  readFile(booksPath, 'utf8'),
]);

const base = JSON.parse(baseRaw);
const patches = JSON.parse(patchRaw);
const bookPattern = /\{\s*id:\s*'([^']+)'[^}]*name:\s*'([^']+)'[^}]*chapters:\s*(\d+)\s*\}/g;
const books = [];
for (const match of booksSource.matchAll(bookPattern)) {
  books.push({ id: match[1], name: match[2], chapters: Number(match[3]) });
}

if (books.length !== 66) {
  throw new Error(`Could not parse all Bible books. Parsed ${books.length}/66.`);
}

const keyOf = (verse) => `${verse.bookId}-${verse.chapter}-${verse.verse}`;
const merged = new Map();
for (const verse of base) merged.set(keyOf(verse), verse);
for (const verse of patches) merged.set(keyOf(verse), verse);
const verses = [...merged.values()];

const errors = [];
const warnings = [];
const chapterMap = new Map();
const duplicateBaseKeys = new Set();
const seenBaseKeys = new Set();

for (const verse of base) {
  const key = keyOf(verse);
  if (seenBaseKeys.has(key)) duplicateBaseKeys.add(key);
  seenBaseKeys.add(key);
}

if (duplicateBaseKeys.size > 0) {
  errors.push(`Duplicate base references: ${[...duplicateBaseKeys].slice(0, 20).join(', ')}`);
}

for (const verse of verses) {
  if (!verse.id || !verse.bookId || !verse.bookName || !Number.isInteger(verse.chapter) || !Number.isInteger(verse.verse)) {
    errors.push(`Malformed record: ${JSON.stringify(verse).slice(0, 200)}`);
    continue;
  }
  if (!String(verse.text || '').trim()) errors.push(`Empty verse text: ${keyOf(verse)}`);
  const chapterKey = `${verse.bookId}-${verse.chapter}`;
  const list = chapterMap.get(chapterKey) || [];
  list.push(verse.verse);
  chapterMap.set(chapterKey, list);
}

for (const book of books) {
  for (let chapter = 1; chapter <= book.chapters; chapter += 1) {
    const chapterKey = `${book.id}-${chapter}`;
    const numbers = [...new Set(chapterMap.get(chapterKey) || [])].sort((a, b) => a - b);
    if (numbers.length === 0) {
      errors.push(`Missing chapter: ${book.name} ${chapter}`);
      continue;
    }
    const maximum = numbers.at(-1);
    const present = new Set(numbers);
    for (let verse = 1; verse <= maximum; verse += 1) {
      if (!present.has(verse)) errors.push(`Internal verse gap: ${book.name} ${chapter}:${verse}`);
    }
  }
}

if (verses.length < 30_000) errors.push(`Verse count is unexpectedly low: ${verses.length}`);
if (patches.length > 0) warnings.push(`Applied ${patches.length} explicit repair record(s).`);
if (base.length !== verses.length) warnings.push(`Base count ${base.length}; merged count ${verses.length}.`);

console.log(`Bible books: ${books.length}`);
console.log(`Base verses: ${base.length.toLocaleString()}`);
console.log(`Patch verses: ${patches.length.toLocaleString()}`);
console.log(`Merged verses: ${verses.length.toLocaleString()}`);

warnings.forEach((warning) => console.warn(`WARN: ${warning}`));
if (errors.length > 0) {
  errors.slice(0, 100).forEach((error) => console.error(`ERROR: ${error}`));
  if (errors.length > 100) console.error(`...and ${errors.length - 100} more errors.`);
  process.exitCode = 1;
} else {
  console.log('Bible index integrity audit passed.');
}
