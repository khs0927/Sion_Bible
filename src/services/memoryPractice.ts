const CHOSEONG = [
  'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ',
  'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ',
];

export function splitVerseIntoTokens(text: string) {
  return text.replace(/[“”"']/g, '').split(/\s+/).map((token) => token.trim()).filter(Boolean);
}

export function splitVerseIntoChunks(text: string) {
  const tokens = splitVerseIntoTokens(text);
  if (tokens.length <= 12) return tokens;
  const size = tokens.length > 30 ? 4 : tokens.length > 18 ? 3 : 2;
  const chunks: string[] = [];
  for (let index = 0; index < tokens.length; index += size) {
    chunks.push(tokens.slice(index, index + size).join(' '));
  }
  return chunks;
}

export function shuffleTokens<T>(tokens: T[]) {
  const copy = [...tokens];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[target]] = [copy[target], copy[index]];
  }
  return copy;
}

export function createClozeText(text: string, ratio = 0.3) {
  const tokens = splitVerseIntoTokens(text);
  const hiddenCount = Math.max(1, Math.round(tokens.length * ratio));
  const hiddenIndexes = new Set<number>();
  
  const allIndexes = Array.from({ length: tokens.length }, (_, i) => i);
  const shuffled = shuffleTokens(allIndexes);
  shuffled.slice(0, hiddenCount).forEach(idx => hiddenIndexes.add(idx));

  return {
    hiddenIndexes,
    parts: tokens.map((token, index) => ({
      token,
      hidden: hiddenIndexes.has(index),
      blank: '＿'.repeat(Math.min(6, Math.max(2, token.length))),
    })),
  };
}

export function getKoreanInitials(text: string) {
  return text.split('').map((char) => {
    const code = char.charCodeAt(0);
    if (code < 0xac00 || code > 0xd7a3) return char;
    const choseongIndex = Math.floor((code - 0xac00) / 588);
    return CHOSEONG[choseongIndex] ?? char;
  }).join('');
}

export function compareTokenOrder(answer: string[], correct: string[]) {
  const matches = answer.filter((token, index) => token === correct[index]).length;
  return {
    correct: matches === correct.length && answer.length === correct.length,
    matches,
    total: correct.length,
    percent: correct.length ? Math.round((matches / correct.length) * 100) : 0,
  };
}

export function compareTypedAnswer(answer: string, correct: string) {
  const normalize = (value: string) => value.replace(/\s+/g, '').replace(/[.,;:!?'"“”]/g, '').trim();
  const a = normalize(answer);
  const c = normalize(correct);
  let matches = 0;
  for (let index = 0; index < Math.min(a.length, c.length); index += 1) {
    if (a[index] === c[index]) matches += 1;
  }
  return {
    correct: a === c,
    percent: c.length ? Math.round((matches / c.length) * 100) : 0,
  };
}
