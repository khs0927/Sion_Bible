import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const verseList = read('src/components/bible/BibleVerseSelectableList.tsx');
const devotionPanel = read('src/components/bible/VerseDevotionPanel.tsx');
const unification = read('src/readingUiUnification.ts');
const main = read('src/main.tsx');

const checks = [
  ['bookmark remains compact and borderless in the verse rail', verseList.includes('inline-flex h-7 w-7 items-center justify-center bg-transparent p-0')],
  ['copy action moved into the bottom sheet', verseList.includes('verseCopyIcon') && verseList.includes('>복사</button>') && !verseList.includes('aria-label={`${verse.verse}절 복사`}')],
  ['verse rows use tighter vertical spacing', verseList.includes("'relative w-full px-3 py-1.5 text-left transition-all'")],
  ['active verse selection is visually distinct', verseList.includes("bg-[#FFF6DD] ring-2 ring-inset ring-[#D0A13D]") && verseList.includes("bg-[#D0A13D] text-white")],
  ['verse click activates the bottom sheet', verseList.includes('setActiveVerse(verse.verse)') && verseList.includes('setDetailTab(null)')],
  ['bottom sheet covers the app navigation area', verseList.includes('fixed inset-x-0 bottom-0 z-[1400]') && verseList.includes('max-h-[88dvh]')],
  ['bottom sheet can dismiss with downward drag', verseList.includes('dragStartY') && verseList.includes('event.clientY - dragStartY.current > 64')],
  ['highlight colors are persisted', verseList.includes('HIGHLIGHT_COLORS') && verseList.includes('localStorage.setItem(annotationKey(activeVerse)')],
  ['highlight is applied to text only', verseList.includes("backgroundColor: annotation ? HIGHLIGHT_COLORS[annotation.color] : 'transparent'") && verseList.includes("boxDecorationBreak: 'clone'")],
  ['default text decoration is explicitly none', verseList.includes("style={{ fontSize, whiteSpace: 'pre-wrap', textDecoration: 'none' }}") && verseList.includes("activeAnnotation.underline === 'none'")],
  ['underline controls visibly expose none solid and dashed states', verseList.includes('밑줄 없음') && verseList.includes('실선') && verseList.includes('점선')],
  ['bottom sheet has explanation meditation prayer and question tabs', verseList.includes("setDetailTab('explanation')") && verseList.includes("setDetailTab('meditation')") && verseList.includes("setDetailTab('prayer')") && verseList.includes("setDetailTab('question')")],
  ['devotion panel can render one selected tab while sharing one generated devotion', devotionPanel.includes("type VisibleSection = 'all' | 'explanation' | 'meditation' | 'prayer' | 'question'") && devotionPanel.includes('visibleSection = \'all\'') && devotionPanel.includes('getOrGenerateVerseDevotion')],
  ['question tab reuses the generated devotion context', devotionPanel.includes("visibleSection === 'question'") && devotionPanel.includes('<VerseQuestionPanel verse={selectedVerse} devotion={devotion} />')],
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
