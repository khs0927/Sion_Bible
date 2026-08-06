import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const consistency = read('src/designConsistency.ts');
const devotion = read('src/components/bible/VerseDevotionPanel.tsx');
const question = read('src/components/bible/VerseQuestionPanel.tsx');
const main = read('src/main.tsx');

const checks = [
  ['global title scale defines page section and card levels', consistency.includes('--sion-title-xl') && consistency.includes('--sion-title-lg') && consistency.includes('--sion-title-md')],
  ['meditation question title follows the shared section scale', consistency.includes('.meditation-question-title h2') && consistency.includes('var(--sion-title-lg)')],
  ['meditation card labels use one shared label scale', consistency.includes('.meditation-category-title h3') && consistency.includes('var(--sion-label)')],
  ['meditation answer text uses one shared body scale', consistency.includes('.meditation-answer-card p') && consistency.includes('var(--sion-body)')],
  ['devotion cards use shared title and body line height', consistency.includes('말씀 해설·묵상·기도 카드') && consistency.includes('var(--sion-line-body)')],
  ['duplicate headings are grouped by normalized title', consistency.includes('consolidateDuplicateTitles') && consistency.includes('groups.set(key, list)')],
  ['only nearby duplicate headings are hidden', consistency.includes('Math.abs(currentTop - primaryTop) <= 520')],
  ['duplicate title hiding is reversible before every scan', consistency.includes('clearDuplicateMarks()')],
  ['title companion labels are simplified', consistency.includes('simplifyTitleCompanions') && consistency.includes('sion-title-companion-hidden')],
  ['touch controls have a consistent minimum height', consistency.includes('main button') && consistency.includes('min-height: 40px')],
  ['existing devotion and question screens remain present', devotion.includes('VerseQuestionPanel') && question.includes('묵상 질문하기')],
  ['application initializes design consistency before render', main.includes('initializeDesignConsistency();')],
];

let failures = 0;
for (const [label, passed] of checks) {
  console.log(`${passed ? '✓' : '✗'} ${label}`);
  if (!passed) failures += 1;
}

if (failures > 0) {
  console.error(`Design consistency audit failed: ${failures} check(s) did not pass.`);
  process.exit(1);
}

console.log('Design consistency audit passed.');
