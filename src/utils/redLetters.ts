export const RED_LETTER_COLOR = '#8B1E1E';

interface VerseRange {
  book: string;
  start: [chapter: number, verse: number];
  end: [chapter: number, verse: number];
}

const GOSPEL_BOOKS = new Set(['마태복음', '마가복음', '누가복음', '요한복음']);

const JESUS_WORD_RANGES: VerseRange[] = [
  // 마태복음: 예수님의 주요 직접 발화와 긴 강화 중심
  { book: '마태복음', start: [3, 15], end: [3, 15] },
  { book: '마태복음', start: [4, 4], end: [4, 4] },
  { book: '마태복음', start: [4, 7], end: [4, 7] },
  { book: '마태복음', start: [4, 10], end: [4, 10] },
  { book: '마태복음', start: [4, 17], end: [4, 19] },
  { book: '마태복음', start: [5, 3], end: [7, 27] },
  { book: '마태복음', start: [8, 3], end: [8, 4] },
  { book: '마태복음', start: [8, 7], end: [8, 13] },
  { book: '마태복음', start: [8, 20], end: [8, 22] },
  { book: '마태복음', start: [8, 26], end: [8, 26] },
  { book: '마태복음', start: [8, 32], end: [8, 32] },
  { book: '마태복음', start: [9, 2], end: [9, 6] },
  { book: '마태복음', start: [9, 9], end: [9, 9] },
  { book: '마태복음', start: [9, 12], end: [9, 17] },
  { book: '마태복음', start: [9, 22], end: [9, 22] },
  { book: '마태복음', start: [9, 24], end: [9, 24] },
  { book: '마태복음', start: [9, 28], end: [9, 30] },
  { book: '마태복음', start: [9, 37], end: [10, 42] },
  { book: '마태복음', start: [11, 4], end: [11, 30] },
  { book: '마태복음', start: [12, 3], end: [12, 45] },
  { book: '마태복음', start: [12, 48], end: [12, 50] },
  { book: '마태복음', start: [13, 3], end: [13, 52] },
  { book: '마태복음', start: [14, 16], end: [14, 18] },
  { book: '마태복음', start: [14, 27], end: [14, 31] },
  { book: '마태복음', start: [15, 3], end: [15, 20] },
  { book: '마태복음', start: [15, 24], end: [15, 28] },
  { book: '마태복음', start: [15, 32], end: [15, 34] },
  { book: '마태복음', start: [16, 2], end: [16, 4] },
  { book: '마태복음', start: [16, 6], end: [16, 11] },
  { book: '마태복음', start: [16, 13], end: [16, 28] },
  { book: '마태복음', start: [17, 7], end: [17, 21] },
  { book: '마태복음', start: [17, 25], end: [17, 27] },
  { book: '마태복음', start: [18, 3], end: [18, 35] },
  { book: '마태복음', start: [19, 4], end: [20, 28] },
  { book: '마태복음', start: [21, 2], end: [21, 3] },
  { book: '마태복음', start: [21, 13], end: [21, 46] },
  { book: '마태복음', start: [22, 2], end: [25, 46] },
  { book: '마태복음', start: [26, 2], end: [26, 64] },
  { book: '마태복음', start: [27, 11], end: [27, 11] },
  { book: '마태복음', start: [27, 46], end: [27, 46] },
  { book: '마태복음', start: [28, 9], end: [28, 10] },
  { book: '마태복음', start: [28, 18], end: [28, 20] },

  // 마가복음
  { book: '마가복음', start: [1, 15], end: [1, 17] },
  { book: '마가복음', start: [1, 25], end: [1, 25] },
  { book: '마가복음', start: [1, 38], end: [1, 44] },
  { book: '마가복음', start: [2, 5], end: [2, 28] },
  { book: '마가복음', start: [3, 3], end: [3, 35] },
  { book: '마가복음', start: [4, 3], end: [4, 40] },
  { book: '마가복음', start: [5, 8], end: [5, 43] },
  { book: '마가복음', start: [6, 4], end: [6, 50] },
  { book: '마가복음', start: [7, 6], end: [7, 29] },
  { book: '마가복음', start: [8, 2], end: [8, 38] },
  { book: '마가복음', start: [9, 1], end: [9, 50] },
  { book: '마가복음', start: [10, 3], end: [10, 52] },
  { book: '마가복음', start: [11, 2], end: [13, 37] },
  { book: '마가복음', start: [14, 6], end: [14, 72] },
  { book: '마가복음', start: [15, 2], end: [15, 2] },
  { book: '마가복음', start: [15, 34], end: [15, 34] },
  { book: '마가복음', start: [16, 15], end: [16, 18] },

  // 누가복음
  { book: '누가복음', start: [2, 49], end: [2, 49] },
  { book: '누가복음', start: [4, 4], end: [4, 12] },
  { book: '누가복음', start: [4, 18], end: [4, 27] },
  { book: '누가복음', start: [4, 35], end: [4, 43] },
  { book: '누가복음', start: [5, 4], end: [5, 39] },
  { book: '누가복음', start: [6, 3], end: [6, 49] },
  { book: '누가복음', start: [7, 9], end: [7, 50] },
  { book: '누가복음', start: [8, 5], end: [8, 56] },
  { book: '누가복음', start: [9, 3], end: [9, 62] },
  { book: '누가복음', start: [10, 2], end: [10, 42] },
  { book: '누가복음', start: [11, 2], end: [12, 59] },
  { book: '누가복음', start: [13, 2], end: [14, 35] },
  { book: '누가복음', start: [15, 3], end: [17, 37] },
  { book: '누가복음', start: [18, 2], end: [19, 27] },
  { book: '누가복음', start: [19, 30], end: [21, 36] },
  { book: '누가복음', start: [22, 8], end: [22, 71] },
  { book: '누가복음', start: [23, 3], end: [23, 46] },
  { book: '누가복음', start: [24, 17], end: [24, 49] },

  // 요한복음: 대부분 긴 대화와 강화가 이어지므로 장별 주요 발화 범위를 넓게 적용
  { book: '요한복음', start: [1, 38], end: [1, 51] },
  { book: '요한복음', start: [2, 4], end: [2, 19] },
  { book: '요한복음', start: [3, 3], end: [3, 21] },
  { book: '요한복음', start: [4, 7], end: [4, 38] },
  { book: '요한복음', start: [4, 48], end: [4, 53] },
  { book: '요한복음', start: [5, 6], end: [5, 47] },
  { book: '요한복음', start: [6, 5], end: [6, 70] },
  { book: '요한복음', start: [7, 6], end: [8, 58] },
  { book: '요한복음', start: [9, 3], end: [10, 38] },
  { book: '요한복음', start: [11, 4], end: [11, 44] },
  { book: '요한복음', start: [12, 7], end: [12, 50] },
  { book: '요한복음', start: [13, 7], end: [17, 26] },
  { book: '요한복음', start: [18, 4], end: [18, 37] },
  { book: '요한복음', start: [19, 11], end: [19, 30] },
  { book: '요한복음', start: [20, 15], end: [21, 22] },

  // 사도행전과 요한계시록에 기록된 부활하신 예수님의 말씀
  { book: '사도행전', start: [1, 4], end: [1, 8] },
  { book: '사도행전', start: [9, 4], end: [9, 6] },
  { book: '사도행전', start: [18, 9], end: [18, 10] },
  { book: '사도행전', start: [22, 7], end: [22, 10] },
  { book: '사도행전', start: [23, 11], end: [23, 11] },
  { book: '사도행전', start: [26, 14], end: [26, 18] },
  { book: '요한계시록', start: [1, 8], end: [1, 20] },
  { book: '요한계시록', start: [2, 1], end: [3, 22] },
  { book: '요한계시록', start: [16, 15], end: [16, 15] },
  { book: '요한계시록', start: [21, 5], end: [21, 8] },
  { book: '요한계시록', start: [22, 7], end: [22, 20] },
];

function compareRef(chapter: number, verse: number, target: [number, number]) {
  if (chapter !== target[0]) return chapter - target[0];
  return verse - target[1];
}

function inRange(bookName: string, chapter: number, verse: number, range: VerseRange) {
  return bookName === range.book
    && compareRef(chapter, verse, range.start) >= 0
    && compareRef(chapter, verse, range.end) <= 0;
}

function hasExplicitJesusSpeechMarker(bookName: string, text: string) {
  if (!GOSPEL_BOOKS.has(bookName) && bookName !== '사도행전' && bookName !== '요한계시록') return false;
  return /(예수(?:님)?께서|주께서|주님께서|인자가|나는\s+길이요|내가\s+진실로|진실로\s+진실로|가라사대|이르시되|말씀하시되|대답하시되)/.test(text);
}

export function isJesusSpokenVerse(bookName: string, chapter: number, verse: number, text = '') {
  const normalizedBook = String(bookName || '').trim();
  const normalizedText = String(text || '').trim();
  return JESUS_WORD_RANGES.some((range) => inRange(normalizedBook, chapter, verse, range))
    || hasExplicitJesusSpeechMarker(normalizedBook, normalizedText);
}
