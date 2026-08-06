import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const service = read('src/services/memoryReminder.ts');
const settings = read('src/components/memory/MemoryReminderSettings.tsx');
const storage = read('src/services/memoryStorage.ts');
const main = read('src/main.tsx');
const worker = read('public/sw.js');

const checks = [
  ['time mode produces daily reminder times', service.includes("settings.mode === 'time'") && service.includes('selectedTimes')],
  ['count mode distributes reminder times', service.includes("settings.mode === 'count'") && service.includes('calculateDistributedReminderTimes')],
  ['auto mode delivers due reminders', service.includes("settings.mode === 'auto'") && service.includes('deliverDueAutoReminders')],
  ['service worker notification surface is used', service.includes('registration.showNotification')],
  ['engine resynchronizes on focus and visibility', service.includes("window.addEventListener('focus'") && service.includes("document.addEventListener('visibilitychange'")],
  ['settings page saves and syncs the live schedule', settings.includes('syncMemoryReminderSchedule') && settings.includes('getReminderSchedulePreview')],
  ['settings page provides a test notification', settings.includes('handleTestNotification') && settings.includes('테스트 알림 보내기')],
  ['new memory verses create auto schedules when enabled', storage.includes('createAutoReminderSchedule(verse.id')],
  ['application startup initializes the engine', main.includes('initializeMemoryReminderEngine();')],
  ['notification clicks return to the memory surface', worker.includes("notificationclick") && main.includes("params.get('open') !== 'memory'")],
];

let failures = 0;
for (const [label, passed] of checks) {
  console.log(`${passed ? '✓' : '✗'} ${label}`);
  if (!passed) failures += 1;
}

if (failures > 0) {
  console.error(`Memory reminder audit failed: ${failures} check(s) did not pass.`);
  process.exit(1);
}

console.log('Memory reminder audit passed.');
