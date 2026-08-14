import fs from 'node:fs';
import path from 'node:path';

const input = path.resolve('public/bible/korean-bible-index.json');
const outputDir = path.dirname(input);
const maxBytes = 2_700_000;
const verses = JSON.parse(fs.readFileSync(input, 'utf8'));
const chunks = [];
let current = [];
let currentBytes = 2;

for (const verse of verses) {
  const verseBytes = Buffer.byteLength(JSON.stringify(verse));
  const separatorBytes = current.length > 0 ? 1 : 0;
  if (current.length > 0 && currentBytes + separatorBytes + verseBytes > maxBytes) {
    chunks.push(current);
    current = [verse];
    currentBytes = 2 + verseBytes;
  } else {
    current.push(verse);
    currentBytes += separatorBytes + verseBytes;
  }
}
if (current.length > 0) chunks.push(current);

for (const file of fs.readdirSync(outputDir)) {
  if (/^korean-bible-index-\d+\.json$/.test(file)) fs.unlinkSync(path.join(outputDir, file));
}
chunks.forEach((chunk, index) => {
  const name = `korean-bible-index-${String(index + 1).padStart(2, '0')}.json`;
  fs.writeFileSync(path.join(outputDir, name), JSON.stringify(chunk));
});
fs.writeFileSync(path.join(outputDir, 'korean-bible-index-manifest.json'), JSON.stringify({ chunks: chunks.length, totalVerses: verses.length }));
console.log(JSON.stringify({ chunks: chunks.length, totalVerses: verses.length, maxBytes, sizes: chunks.map((chunk) => Buffer.byteLength(JSON.stringify(chunk))) }, null, 2));
