import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const backup = read('src/dataBackup.ts');
const main = read('src/main.tsx');

const checks = [
  ['backup format and version are explicit', backup.includes("format: 'sion-bible-backup'") && backup.includes('version: 1')],
  ['only managed application keys are included', backup.includes("key.startsWith('gb_')") && backup.includes("key.startsWith('sion_')")],
  ['sensitive key names are excluded', backup.includes('token|secret|api[_-]?key|authorization|credential|password')],
  ['export file contains a checksum', backup.includes('checksum: checksum(canonicalStorage(storage))')],
  ['restore validates format version and checksum', backup.includes("candidate.format !== BACKUP_FORMAT") && backup.includes('candidate.version !== BACKUP_VERSION') && backup.includes('candidate.checksum !== expected')],
  ['restore enforces a file size limit', backup.includes('MAX_BACKUP_BYTES = 5 * 1024 * 1024') && backup.includes('file.size > MAX_BACKUP_BYTES')],
  ['backup export creates a downloadable JSON file', backup.includes("type: 'application/json;charset=utf-8'") && backup.includes('anchor.download =')],
  ['restore creates a rollback snapshot', backup.includes('saveRollbackSnapshot();') && backup.includes('restoreRollback()')],
  ['settings panel exposes export import and rollback controls', backup.includes('백업 파일 내보내기') && backup.includes('백업 파일 복원') && backup.includes('마지막 복원 되돌리기')],
  ['application initializes backup tools', main.includes('initializeDataBackup();')],
];

let failures = 0;
for (const [label, passed] of checks) {
  console.log(`${passed ? '✓' : '✗'} ${label}`);
  if (!passed) failures += 1;
}

if (failures > 0) {
  console.error(`Data backup audit failed: ${failures} check(s) did not pass.`);
  process.exit(1);
}

console.log('Data backup audit passed.');
