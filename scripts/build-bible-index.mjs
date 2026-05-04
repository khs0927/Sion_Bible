import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Mock data to avoid complex imports in a script
const BIBLE_BOOKS = [
  { id: 'gen', name: '창세기', testament: 'old' },
  { id: 'exo', name: '출애굽기', testament: 'old' },
  { id: 'lev', name: '레위기', testament: 'old' },
  { id: 'psa', name: '시편', testament: 'old' },
  { id: 'pro', name: '잠언', testament: 'old' },
  { id: 'isa', name: '이사야', testament: 'old' },
  { id: 'jer', name: '예레미야', testament: 'old' },
  { id: 'mat', name: '마태복음', testament: 'new' },
  { id: 'luk', name: '누가복음', testament: 'new' },
  { id: 'jhn', name: '요한복음', testament: 'new' },
  { id: 'rom', name: '로마서', testament: 'new' },
  { id: '1co', name: '고린도전서', testament: 'new' },
  { id: 'gal', name: '갈라디아서', testament: 'new' },
  { id: 'php', name: '빌립보서', testament: 'new' },
  { id: '1th', name: '데살로니가전서', testament: 'new' },
  { id: '1pe', name: '베드로전서', testament: 'new' },
  { id: '1jn', name: '요한일서', testament: 'new' },
];

const BIBLE_VERSES = [
  { book: '요한복음', chapter: '14', verse: '27', content: '평안을 너희에게 끼치노니 곧 나의 평안을 너희에게 주노라 내가 너희에게 주는 것은 세상이 주는 것과 같지 아니하니라 너희는 마음에 근심하지도 말고 두려워하지도 말라' },
  { book: '시편', chapter: '23', verse: '1', content: '여호와는 나의 목자시니 내게 부족함이 없으리로다' },
  { book: '이사야', chapter: '41', verse: '10', content: '두려워하지 말라 내가 너와 함께 함이라 놀라지 말라 나는 네 하나님이 됨이라 내가 너를 굳세게 하리라 참으로 너를 도와 주리라 참으로 나의 의로운 오른손으로 너를 붙들리라' },
  { book: '데살로니가전서', chapter: '5', verse: '16-18', content: '항상 기뻐하라 쉬지 말고 기도하라 범사에 감사하라 이것이 그리스도 예수 안에서 너희를 향하신 하나님의 뜻이니라' },
  { book: '빌립보서', chapter: '4', verse: '13', content: '내게 능력 주시는 자 안에서 내가 모든 것을 할 수 있느니라' },
  { book: '잠언', chapter: '3', verse: '5-6', content: '너는 마음을 다하여 여호와를 신뢰하고 네 명철을 의지하지 말라 너는 범사에 그를 인정하라 그리하면 네 길을 지도하시리라' },
  { book: '로마서', chapter: '8', verse: '28', content: '우리가 알거니와 하나님을 사랑하는 자 곧 그의 뜻대로 부르심을 입은 자들에게는 모든 것이 합력하여 선을 이루느니라' },
  { book: '고린도전서', chapter: '13', verse: '13', content: '그런즉 믿음, 소망, 사랑, 이 세 가지는 항상 있을 것인데 그 중의 제일은 사랑이라' },
  { book: '시편', chapter: '46', verse: '1', content: '하나님은 우리의 피난처시요 힘이시니 환난 중에 만날 큰 도움이시라' },
  { book: '예레미야', chapter: '29', verse: '11', content: '여호와의 말씀이니라 너희를 향한 나의 생각을 내가 아나니 평안이요 재앙이 아니니라 너희에게 미래와 희망을 주는 것이니라' },
  { book: '요한복음', chapter: '3', verse: '16', content: '하나님이 세상을 이처럼 사랑하사 독생자를 주셨으니 이는 그를 믿는 자마다 멸망하지 않고 영생을 얻게 하려 하심이라' },
  { book: '시편', chapter: '103', verse: '2', content: '내 영혼아 여호와를 송축하며 그의 모든 은택을 잊지 말지어다' },
  { book: '야고보서', chapter: '1', verse: '5', content: '너희 중에 누구든지 지혜가 부족하거든 모든 사람에게 후히 주시고 꾸짖지 아니하시는 하나님께 구하라 그리하면 주시리라' },
  { book: '갈라디아서', chapter: '6', verse: '9', content: '우리가 선을 행하되 낙심하지 말지니 포기하지 아니하면 때가 이르매 거두리라' },
];

function normalize(text) {
  return text.replace(/\s+/g, '').replace(/[.,\/#!$%\^&\*;:{}=\-_`~()\[\]]/g, '').trim();
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = path.join(__dirname, '../src/data/generated/bibleVerseIndex.ts');

function buildIndex() {
  console.log('Generating Bible index from curated verses...');
  
  const records = BIBLE_VERSES.map(v => {
    const book = BIBLE_BOOKS.find(b => b.name === v.book);
    const [startVerse] = v.verse.split('-').map(Number);
    return {
      bookId: book ? book.id : 'unknown',
      bookName: v.book,
      testament: book ? book.testament : 'new',
      chapter: Number(v.chapter),
      verse: startVerse,
      text: v.content,
      searchText: normalize(v.content)
    };
  });

  const content = `
import { BibleVerseRecord } from '../../types/bible';

export const BIBLE_VERSE_INDEX: BibleVerseRecord[] = ${JSON.stringify(records, null, 2)};
`;

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, content);
  console.log(`Index generated with ${records.length} records at ${OUTPUT_PATH}`);
}

buildIndex();
