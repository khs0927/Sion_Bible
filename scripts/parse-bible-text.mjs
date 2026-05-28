/**
 * Parse Korean Bible text file (성경(구약+신약).md) and generate
 * a JSON data file for use in the Sion Bible app.
 *
 * Format per line: 창1:1 <천지 창조> 태초에 하나님이 천지를 창조하시니라
 *                  {abbr}{chapter}:{verse} [<section>] {content}
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Abbreviation → full name mapping (must match bibleBooks.ts)
const ABBR_TO_FULL = {
  '창': '창세기', '출': '출애굽기', '레': '레위기', '민': '민수기', '신': '신명기',
  '수': '여호수아', '삿': '사사기', '룻': '룻기', '삼상': '사무엘상', '삼하': '사무엘하',
  '왕상': '열왕기상', '왕하': '열왕기하', '대상': '역대상', '대하': '역대하',
  '스': '에스라', '느': '느헤미야', '에': '에스더', '욥': '욥기',
  '시': '시편', '잠': '잠언', '전': '전도서', '아': '아가',
  '사': '이사야', '렘': '예레미야', '애': '예레미야애가', '겔': '에스겔', '단': '다니엘',
  '호': '호세아', '욜': '요엘', '암': '아모스', '옵': '오바댜', '욘': '요나',
  '미': '미가', '나': '나훔', '합': '하박국', '습': '스바냐', '학': '학개',
  '슥': '스가랴', '말': '말라기',
  '마': '마태복음', '막': '마가복음', '눅': '누가복음', '요': '요한복음',
  '행': '사도행전', '롬': '로마서', '고전': '고린도전서', '고후': '고린도후서',
  '갈': '갈라디아서', '엡': '에베소서', '빌': '빌립보서', '골': '골로새서',
  '살전': '데살로니가전서', '살후': '데살로니가후서', '딤전': '디모데전서', '딤후': '디모데후서',
  '딛': '디도서', '몬': '빌레몬서', '히': '히브리서', '약': '야고보서',
  '벧전': '베드로전서', '벧후': '베드로후서', '요일': '요한일서', '요이': '요한이서',
  '요삼': '요한삼서', '유': '유다서', '계': '요한계시록',
};

// Sort abbreviations by length descending so longer ones match first
const SORTED_ABBRS = Object.keys(ABBR_TO_FULL).sort((a, b) => b.length - a.length);

function findAbbr(lineStart) {
  for (const abbr of SORTED_ABBRS) {
    if (lineStart.startsWith(abbr)) {
      return abbr;
    }
  }
  return null;
}

async function main() {
  // Find the bible text file
  const downloadsDir = path.join(process.env.USERPROFILE || process.env.HOME, 'Downloads');
  let biblePath = null;
  for (const f of fs.readdirSync(downloadsDir)) {
    if (f.endsWith('.md') && f.includes('성경') || f.endsWith('.md') && f.includes('bible')) {
      biblePath = path.join(downloadsDir, f);
      break;
    }
  }

  // Fallback: try direct path
  if (!biblePath) {
    const candidates = fs.readdirSync(downloadsDir).filter(f => f.endsWith('.md'));
    if (candidates.length > 0) {
      biblePath = path.join(downloadsDir, candidates[0]);
    }
  }

  if (!biblePath) {
    console.error('Bible text file not found in Downloads folder');
    process.exit(1);
  }

  console.log('Reading:', biblePath);

  // Try reading with UTF-8 first, then EUC-KR via Buffer
  let rawText;
  const rawBytes = fs.readFileSync(biblePath);

  // Check if valid UTF-8 by trying to decode
  rawText = rawBytes.toString('utf-8');

  // Verify: first line should start with a Korean abbreviation
  const firstLine = rawText.split('\n')[0].trim();
  const firstAbbr = findAbbr(firstLine);

  if (!firstAbbr) {
    console.log('UTF-8 decode did not produce valid Korean. First line:', firstLine.substring(0, 40));
    console.log('The file might be EUC-KR encoded. Please convert it to UTF-8 first.');
    // Attempt to treat bytes as CP949
    // Node.js doesn't have built-in CP949, so we try iconv-lite if available
    try {
      const iconv = await import('iconv-lite');
      rawText = iconv.default.decode(rawBytes, 'cp949');
      const line1 = rawText.split('\n')[0].trim();
      const abbr1 = findAbbr(line1);
      if (!abbr1) {
        console.error('CP949 decode also failed. First line:', line1.substring(0, 40));
        process.exit(1);
      }
      console.log('Successfully decoded as CP949');
    } catch {
      console.error('Cannot decode file. Please convert to UTF-8 manually.');
      process.exit(1);
    }
  } else {
    console.log('File is valid UTF-8. First abbreviation found:', firstAbbr);
  }

  const lines = rawText.split('\n');
  console.log('Total lines:', lines.length);

  // Parse each line
  // Format: {abbr}{chapter}:{verse} [<section_title>] {content}
  const bibleData = {}; // { bookFullName: { chapter: { verse: { content, section? } } } }
  let parsed = 0;
  let skipped = 0;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const abbr = findAbbr(line);
    if (!abbr) {
      skipped++;
      continue;
    }

    const rest = line.substring(abbr.length);
    // Match chapter:verse content
    const match = rest.match(/^(\d+):(\d+)\s+(.+)$/);
    if (!match) {
      skipped++;
      continue;
    }

    const chapter = match[1];
    const verse = match[2];
    let content = match[3];
    let section = null;

    // Extract optional section title: <section_title>
    const sectionMatch = content.match(/^<([^>]+)>\s*/);
    if (sectionMatch) {
      section = sectionMatch[1];
      content = content.substring(sectionMatch[0].length);
    }

    const bookName = ABBR_TO_FULL[abbr];

    if (!bibleData[bookName]) bibleData[bookName] = {};
    if (!bibleData[bookName][chapter]) bibleData[bookName][chapter] = {};
    bibleData[bookName][chapter][verse] = { content, ...(section ? { section } : {}) };
    parsed++;
  }

  console.log('Parsed:', parsed, 'verses');
  console.log('Skipped:', skipped, 'lines');
  console.log('Books:', Object.keys(bibleData).length);

  // Show book summary
  for (const [book, chapters] of Object.entries(bibleData)) {
    const totalVerses = Object.values(chapters).reduce((sum, ch) => sum + Object.keys(ch).length, 0);
    console.log(`  ${book}: ${Object.keys(chapters).length} chapters, ${totalVerses} verses`);
  }

  // Save as JSON
  const outDir = path.join(__dirname, '..', 'src', 'data', 'generated');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const outPath = path.join(outDir, 'fullBible.json');
  fs.writeFileSync(outPath, JSON.stringify(bibleData, null, 0), 'utf-8');
  console.log('\nSaved to:', outPath);
  console.log('File size:', (fs.statSync(outPath).size / 1024 / 1024).toFixed(2), 'MB');
}

main().catch(err => { console.error(err); process.exit(1); });
