const FIRST_PERSON_PATTERN = /(저는|제가|저도|저를|저의|제\s+(?:마음|삶|생각|감정|걸음|믿음))/;
const PLAIN_ENDING_PATTERN = /(?:한다|된다|이다|있다|없다|싶다|바란다|믿는다|기억한다|노력한다|생각한다|살아간다|걸어간다|나아간다|따른다|느낀다|배운다|깨닫는다|바라본다|맡긴다|고백한다|기대한다|기도한다|실천한다|원한다|드린다|준비한다|정리한다|갖는다|수\s+있다|수\s+없다|것이다|듯하다|필요하다)(?=\s*[.!?…]|$)/g;
const PRAYER_ADDRESSEE_PATTERN = /^(?:하나님|주님|사랑의\s+하나님|긍휼의\s+하나님|은혜의\s+하나님|사랑의\s+주님)[,，]\s*/;

const ENDING_RULES = [
  [/수\s+없다(?=\s*[.!?…]|$)/g, '수 없습니다'],
  [/수\s+있다(?=\s*[.!?…]|$)/g, '수 있습니다'],
  [/것이다(?=\s*[.!?…]|$)/g, '것입니다'],
  [/듯하다(?=\s*[.!?…]|$)/g, '듯합니다'],
  [/필요하다(?=\s*[.!?…]|$)/g, '필요합니다'],
  [/바란다(?=\s*[.!?…]|$)/g, '바랍니다'],
  [/믿는다(?=\s*[.!?…]|$)/g, '믿습니다'],
  [/기억한다(?=\s*[.!?…]|$)/g, '기억합니다'],
  [/노력한다(?=\s*[.!?…]|$)/g, '노력합니다'],
  [/생각한다(?=\s*[.!?…]|$)/g, '생각합니다'],
  [/살아간다(?=\s*[.!?…]|$)/g, '살아갑니다'],
  [/걸어간다(?=\s*[.!?…]|$)/g, '걸어갑니다'],
  [/나아간다(?=\s*[.!?…]|$)/g, '나아갑니다'],
  [/따른다(?=\s*[.!?…]|$)/g, '따릅니다'],
  [/느낀다(?=\s*[.!?…]|$)/g, '느낍니다'],
  [/배운다(?=\s*[.!?…]|$)/g, '배웁니다'],
  [/깨닫는다(?=\s*[.!?…]|$)/g, '깨닫습니다'],
  [/바라본다(?=\s*[.!?…]|$)/g, '바라봅니다'],
  [/맡긴다(?=\s*[.!?…]|$)/g, '맡깁니다'],
  [/고백한다(?=\s*[.!?…]|$)/g, '고백합니다'],
  [/기대한다(?=\s*[.!?…]|$)/g, '기대합니다'],
  [/기도한다(?=\s*[.!?…]|$)/g, '기도합니다'],
  [/실천한다(?=\s*[.!?…]|$)/g, '실천합니다'],
  [/원한다(?=\s*[.!?…]|$)/g, '원합니다'],
  [/드린다(?=\s*[.!?…]|$)/g, '드립니다'],
  [/준비한다(?=\s*[.!?…]|$)/g, '준비합니다'],
  [/정리한다(?=\s*[.!?…]|$)/g, '정리합니다'],
  [/갖는다(?=\s*[.!?…]|$)/g, '갖습니다'],
  [/싶다(?=\s*[.!?…]|$)/g, '싶습니다'],
  [/없다(?=\s*[.!?…]|$)/g, '없습니다'],
  [/있다(?=\s*[.!?…]|$)/g, '있습니다'],
  [/된다(?=\s*[.!?…]|$)/g, '됩니다'],
  [/이다(?=\s*[.!?…]|$)/g, '입니다'],
  [/한다(?=\s*[.!?…]|$)/g, '합니다'],
];

function normalizeWhitespace(value) {
  return String(value || '')
    .replace(/\u0000/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s+([,.!?…])/g, '$1')
    .trim();
}

export function normalizeFormalKorean(value) {
  let normalized = normalizeWhitespace(value);
  for (const [pattern, replacement] of ENDING_RULES) {
    normalized = normalized.replace(pattern, replacement);
  }
  return normalized;
}

export function hasSpeechLevelMismatch(value) {
  PLAIN_ENDING_PATTERN.lastIndex = 0;
  return PLAIN_ENDING_PATTERN.test(String(value || ''));
}

function ensurePrayerAddress(value) {
  const normalized = normalizeFormalKorean(value);
  if (/^아버지[,，]/.test(normalized)) return normalized;
  const withoutGenericAddress = normalized.replace(PRAYER_ADDRESSEE_PATTERN, '');
  return `아버지, ${withoutGenericAddress}`.trim();
}

function containsFormalEnding(value) {
  return /(?:합니다|됩니다|입니다|있습니다|없습니다|믿습니다|바랍니다|드립니다|주십시오|주소서|하소서)(?=\s*[.!?…]|$)/.test(String(value || ''));
}

export function normalizeDevotionSpeechLevel(devotion) {
  if (!devotion || typeof devotion !== 'object') return null;
  return {
    ...devotion,
    explanation: normalizeFormalKorean(devotion.explanation),
    meditation: normalizeFormalKorean(devotion.meditation),
    prayer: ensurePrayerAddress(devotion.prayer),
  };
}

export function validateDevotionSpeechLevel(devotion) {
  if (!devotion) return false;
  const explanation = String(devotion.explanation || '');
  const meditation = String(devotion.meditation || '');
  const prayer = String(devotion.prayer || '');

  if (!FIRST_PERSON_PATTERN.test(meditation)) return false;
  if (!/^아버지[,，]/.test(prayer)) return false;
  if (hasSpeechLevelMismatch(meditation) || hasSpeechLevelMismatch(prayer)) return false;
  if (!containsFormalEnding(meditation) || !containsFormalEnding(prayer)) return false;
  if (hasSpeechLevelMismatch(explanation)) return false;
  return true;
}

export function normalizeAndValidateDevotionSpeechLevel(devotion) {
  const normalized = normalizeDevotionSpeechLevel(devotion);
  return validateDevotionSpeechLevel(normalized) ? normalized : null;
}
