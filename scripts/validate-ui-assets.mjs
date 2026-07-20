import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';

const requiredFiles = [
  'public/illustrations/reading-bible.svg',
  'public/illustrations/memory-child.svg',
  'public/illustrations/reading-meadow.svg',
  'public/illustrations/leaf-divider.svg',
];

const css = await readFile('src/noonnu.css', 'utf8');
assert.match(css, /font-family:\s*'Paperlogy'/);
assert.match(css, /font-family:\s*'GowunBatang'/);
assert.match(css, /#root \*/);
assert.match(css, /#root \.serif-verse/);
assert.match(css, /font-display:\s*swap/);

const designIndex = await readFile('src/assets/design/index.ts', 'utf8');
for (const file of requiredFiles) {
  const fileStats = await stat(file);
  assert.ok(fileStats.size > 1_000, `${file} is unexpectedly small`);
  assert.ok(designIndex.includes(file.replace('public', '')), `${file} is not referenced by the design registry`);
}

const main = await readFile('src/main.tsx', 'utf8');
assert.match(main, /activateSionFonts/);

console.log('UI font and generated illustration validation passed.');
