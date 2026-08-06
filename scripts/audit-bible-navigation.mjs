import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const selectorPath = path.join(root, 'src/components/bible/BibleBookChapterSelector.tsx');
const pickerPath = path.join(root, 'src/components/bible/BibleVersePicker.tsx');

const selector = fs.readFileSync(selectorPath, 'utf8');
const picker = fs.readFileSync(pickerPath, 'utf8');

const checks = [
  {
    name: 'selector exposes one atomic reference callback',
    pass: selector.includes('onSelectReference: (book: BibleBook, chapter: number) => void;'),
  },
  {
    name: 'selector commits the pending book and chosen chapter together',
    pass: selector.includes('onSelectReference(pendingBook, chapter);'),
  },
  {
    name: 'picker navigates with callback arguments rather than stale state',
    pass: picker.includes('onNavigate?.(book, chapter);'),
  },
  {
    name: 'legacy stale navigation pattern is absent',
    pass: !picker.includes('onNavigate?.(selBook, chapter);'),
  },
  {
    name: 'legacy split selector callbacks are absent',
    pass: !selector.includes('onSelectBook: (book: BibleBook) => void;')
      && !selector.includes('onSelectChapter: (chapter: number) => void;'),
  },
];

const failed = checks.filter((check) => !check.pass);
for (const check of checks) {
  console.log(`${check.pass ? '✓' : '✗'} ${check.name}`);
}

if (failed.length > 0) {
  console.error(`Bible navigation audit failed: ${failed.length} check(s) did not pass.`);
  process.exit(1);
}

console.log('Bible navigation audit passed.');
