import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const verseList = read('src/components/bible/BibleVerseSelectableList.tsx');
const devotionPanel = read('src/components/bible/VerseDevotionPanel.tsx');
const uiPatches = read('src/sionUiPatches.ts');
const main = read('src/main.tsx');

const checks = [
  ['bookmark remains compact and borderless in the verse rail', verseList.includes('inline-flex h-7 w-7 items-center justify-center bg-transparent p-0')],
  ['copy action is an icon beside the sheet close action', verseList.includes('aria-label="선택한 구절 복사"') && verseList.includes('verseCopyIcon') && verseList.includes('aria-label="구절 도구 닫기"') && !verseList.includes('aria-label={`${verse.verse}절 복사`}')],
  ['verse rows use tighter vertical spacing', verseList.includes("'relative w-full px-3 py-1.5 text-left transition-all'")],
  ['active verse selection is visually distinct', verseList.includes("bg-[#FFF6DD] ring-2 ring-inset ring-[#D0A13D]") && verseList.includes("bg-[#D0A13D] text-white")],
  ['verse click activates the bottom sheet', verseList.includes('setActiveVerse(verse.verse)') && verseList.includes('setDetailTab(null)')],
  ['bottom sheet covers the app navigation area', verseList.includes('fixed inset-x-0 bottom-0 z-[1400]') && verseList.includes('max-h-[88dvh]')],
  ['bottom sheet can dismiss with downward drag', verseList.includes('dragStartY') && verseList.includes('event.clientY - dragStartY.current > 64')],
  // Highlights are stored per reference scope, so the persisted call passes
  // referenceLabel before the active verse number.
  ['highlight colors are persisted', verseList.includes('HIGHLIGHT_COLORS') && verseList.includes('localStorage.setItem(annotationKey(referenceLabel, activeVerse)') && verseList.includes('localStorage.removeItem(annotationKey(referenceLabel, activeVerse))')],
  ['highlight is applied to text only', verseList.includes("backgroundColor: annotation ? HIGHLIGHT_COLORS[annotation.color] : 'transparent'") && verseList.includes("boxDecorationBreak: 'clone'")],
  ['clear marking action sits in the highlighter row', verseList.includes('표시 지우기') && verseList.includes('flex min-w-0 flex-1 items-center gap-2 overflow-x-auto')],
  ['default text decoration is explicitly none', verseList.includes("style={{ fontSize, whiteSpace: 'pre-wrap', textDecoration: 'none' }}") && verseList.includes("activeAnnotation.underline === 'none'")],
  ['underline controls visibly expose none solid and dashed states', verseList.includes('밑줄 없음') && verseList.includes('실선') && verseList.includes('점선')],
  ['bottom sheet has explanation meditation prayer and question tabs', verseList.includes("setDetailTab('explanation')") && verseList.includes("setDetailTab('meditation')") && verseList.includes("setDetailTab('prayer')") && verseList.includes("setDetailTab('question')")],
  ['bottom sheet requests deep devotion content', verseList.includes('generationMode="deep"') && devotionPanel.includes("generationMode = 'fast'") && devotionPanel.includes('mode: generationMode')],
  ['deep devotion refreshes older shallow cache once', devotionPanel.includes('deep-v1') && devotionPanel.includes('localStorage.removeItem(cacheKey)') && devotionPanel.includes("localStorage.setItem(deepMarkerKey, '1')")],
  ['devotion panel can render one selected tab while sharing one generated devotion', devotionPanel.includes("type VisibleSection = 'all' | 'explanation' | 'meditation' | 'prayer' | 'question'") && devotionPanel.includes("visibleSection = 'all'") && devotionPanel.includes('getOrGenerateVerseDevotion')],
  ['question tab reuses the generated devotion context', devotionPanel.includes("visibleSection === 'question'") && devotionPanel.includes('<VerseQuestionPanel verse={selectedVerse} devotion={devotion} />')],
  // The saved screen is unified by src/sionUiPatches.ts (with its saved-screen CSS
  // injected from index.html), so these checks assert that implementation.
  ['saved screen duplicate headings are consolidated', uiPatches.includes('sion-card-title-hidden') && uiPatches.includes('body.sion-saved-screen .sion-card-title-hidden { display: none !important; }') && uiPatches.includes("'다시 읽는 말씀', '다시 읽는 해설', '다시 읽는 묵상', '다시 읽는 기도문', '다시 읽는 적용'")],
  ['saved controls are grouped into one layout zone', uiPatches.includes("contentGroup.classList.add('sion-clean-menu-group')") && uiPatches.includes("group.classList.add('sion-clean-menu-group')") && uiPatches.includes("body.sion-saved-screen .sion-clean-menu-group") && uiPatches.includes("label.textContent = '내용 메뉴'") && uiPatches.includes("label.textContent = '정렬/분류 메뉴'")],
  ['saved cards have a dedicated visual hierarchy', uiPatches.includes('applyCardVisual') && uiPatches.includes("child.classList.add('sion-clean-action-box')") && uiPatches.includes("check.className = 'sion-clean-check'") && uiPatches.includes("card.classList.toggle('sion-clean-card-selected'")],
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
