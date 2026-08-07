import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const verseList = read('src/components/bible/BibleVerseSelectableList.tsx');
const unification = read('src/readingUiUnification.ts');
const main = read('src/main.tsx');

const checks = [
  ['copy action is vertically aligned below bookmark in a compact icon rail', verseList.includes('flex w-7 shrink-0 flex-col') && verseList.includes('aria-label={`${verse.verse}절 복사`}')],
  ['bookmark and copy controls are borderless compact icons', verseList.includes('inline-flex h-7 w-7') && verseList.includes('bg-transparent p-0') && !verseList.includes('rounded-xl border border-[#E8D8C8] bg-[#FFFDF8] shadow-sm disabled:cursor-default')],
  ['verse rows use compact vertical spacing', verseList.includes("'relative w-full px-3 py-2 text-left transition-all'"))],
  ['verse click activates a reading tool selection', verseList.includes('setActiveVerse(verse.verse)') && verseList.includes('aria-pressed={isActive}')],
  ['highlight colors are persisted', verseList.includes('HIGHLIGHT_COLORS') && verseList.includes('localStorage.setItem(annotationKey(activeVerse)')],
  ['highlight is applied to text span rather than full verse row', verseList.includes("backgroundColor: annotation ? HIGHLIGHT_COLORS[annotation.color] : 'transparent'") && verseList.includes("boxDecorationBreak: 'clone'") && !verseList.includes('style={{ backgroundColor: annotation ? HIGHLIGHT_COLORS[annotation.color] : undefined }}')],
  ['legacy underline state is reset to none', verseList.includes("underline: 'none',") && verseList.includes('JSON.stringify(stored)')],
  ['underline tools are available with a clear none option', verseList.includes("underline: 'solid'") && verseList.includes("underline: 'dashed'") && verseList.includes('밑줄 없음')],
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
