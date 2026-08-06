import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const enhancements = read('src/readingRoomEnhancements.ts');
const main = read('src/main.tsx');
const referencePage = read('src/components/reading-room/ReadingRoomReferencePage.tsx');

const checks = [
  ['mission page still exposes the reflection action', referencePage.includes('묵상하기')],
  ['reflection action opens a writable modal', enhancements.includes('openReflectionModal') && enhancements.includes('묵상 저장하기')],
  ['reflection records are persisted by task and date', enhancements.includes('sion_reading_room_reflections_v1') && enhancements.includes('reflectionId(taskLabel)')],
  ['saved reflection can be reopened and updated', enhancements.includes("existing ? '묵상 수정하기'")],
  ['reward store still exposes point items', referencePage.includes('감사 카드 배경') && referencePage.includes('특별 완주 배지')],
  ['reward purchase validates the available balance', enhancements.includes('if (available < item.cost)')],
  ['reward purchase persists spent points and inventory', enhancements.includes('sion_reading_room_rewards_v1') && enhancements.includes('spentPoints: rewards.spentPoints + item.cost')],
  ['purchased rewards are disabled and labeled', enhancements.includes('button.disabled = purchased') && enhancements.includes('구매 완료')],
  ['purchase history rendering is signature-stable', enhancements.includes('purchaseHistorySignature') && enhancements.includes('sionPurchaseSignature')],
  ['application initializes the reading room enhancements', main.includes('initializeReadingRoomEnhancements();')],
];

let failures = 0;
for (const [label, passed] of checks) {
  console.log(`${passed ? '✓' : '✗'} ${label}`);
  if (!passed) failures += 1;
}

if (failures > 0) {
  console.error(`Reading room action audit failed: ${failures} check(s) did not pass.`);
  process.exit(1);
}

console.log('Reading room action audit passed.');
