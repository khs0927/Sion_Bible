import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const page = read('src/components/reading-room/ReadingRoomReferencePage.tsx');
const layout = read('src/components/reading-room/ReadingRoomLayout.tsx');
const header = read('src/components/reading-room/ReadingRoomHeader.tsx');
const bottomNavigation = read('src/components/navigation/ReadingRoomBottomNavigation.tsx');

const checks = [
  ['course detail route is recognized', page.includes("path.startsWith('/reading-room/course-detail')")],
  ['mission route is recognized', page.includes("path.startsWith('/reading-room/mission')")],
  ['completion route is recognized', page.includes("path.startsWith('/reading-room/course-complete')")],
  ['course detail screen is rendered', page.includes("section === 'detail'") && page.includes('<CourseDetailScreen')],
  ['mission screen is rendered', page.includes("section === 'mission'") && page.includes('<MissionScreen')],
  ['completion screen is rendered', page.includes("section === 'completion'") && page.includes('<CompletionScreen')],
  ['detail and completion hide bottom navigation', layout.includes('hideBottomNavigation: detail || completion')],
  ['subpage header is suppressed', header.includes('if (meta.subpage) return null;')],
  ['subpages map to my courses navigation', bottomNavigation.includes("path.startsWith('/reading-room/course-detail')")],
];

let failures = 0;
for (const [label, passed] of checks) {
  console.log(`${passed ? '✓' : '✗'} ${label}`);
  if (!passed) failures += 1;
}

if (failures > 0) {
  console.error(`Reading room route audit failed: ${failures} check(s) did not pass.`);
  process.exit(1);
}

console.log('Reading room route audit passed.');
