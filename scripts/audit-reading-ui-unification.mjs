import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const verseList = read('src/components/bible/BibleVerseSelectableList.tsx');
const unification = read('src/readingUiUnification.ts');
const main = read('src/main.tsx');

const checks = [
  ['copy action is vertically aligned below bookmark', verseList.includes('flex w-9 shrink-0 flex-col') && verseList.includes('aria-label={`${verse.verse}절 복사`}')],
  ['verse click activates a reading tool selection', verseList.includes('setActiveVerse(verse.verse)') && verseList.includes('aria-pressed={isActive}')],
  ['highlight colors are persisted', verseList.includes('HIGHLIGHT_COLORS') && verseList.includes('localStorage.setItem(annotationKey(activeVerse)')],
  ['underline tools are available', verseList.includes("underline: 'solid'") && verseList.includes("underline: 'dashed'")],
  ['commentary meditation and prayer actions are present', verseList.includes("openVerseTool('commentary')") && verseList.includes("openVerseTool('meditation')") && verseList.includes("openVerseTool('prayer')")],
  ['saved screen duplicate headings are consolidated', unification.includes('sion-duplicate-screen-header') && unification.includes('unifySavedHeader')],
  ['saved controls are grouped into one layout zone', unification.includes('sion-saved-control-zone')],
  ['reading room exit is added beside more actions', unification.includes('통독방 나가기') && unification.includes("insertAdjacentElement('beforebegin'")],
  ['reading room exit returns to today screen', unification.includes("'/reading-room/today'") && unification.includes("new PopStateEvent('popstate')")],
  ['application initializes reading UI unification', main.includes('initializeReadingUiUnification();')],
];

let failures = 0;
for (const [label, passed] of checks) {
  console.log(`${passed ? '✓' : '✗'} ${label}`);
  if (!passed) failures += 1;
}

if (failures > 0) {
  console.error(`Reading UI unification audit failed: ${failures} check(s) did not pass.`);
  process.exit(1);
}

console.log('Reading UI unification audit passed.');
