import type { BibleVerse } from '../data/verses';
import { HOME_DEVOTIONS_CURATED } from '../data/homeDevotions.curated';
import { buildLocalDevotionFromVerse, type VerseDevotionResult } from './verseDevotionApi';

const CATEGORY_TITLES: Record<BibleVerse['category'], string> = {
  '위로': '하나님이 가까이 계시는 위로',
  '소망': '하나님의 약속을 붙드는 소망',
  '감사': '은혜를 기억하는 감사',
  '사랑': '그리스도의 사랑을 따라 사는 삶',
  '지혜': '말씀으로 길을 분별하는 지혜',
  '평안': '그리스도 안에서 누리는 평안',
  '축복': '하나님이 주시는 참된 복',
  '능력': '주님 안에서 새 힘을 얻는 삶',
};

const CATEGORY_MESSAGES: Record<BibleVerse['category'], string> = {
  '위로': '하나님은 상한 마음을 외면하지 않으시고 가장 가까이 다가와 붙드십니다.',
  '소망': '하나님의 약속은 지금 보이는 상황보다 크며, 믿는 자에게 다시 일어설 힘을 줍니다.',
  '감사': '감사는 받은 은혜를 기억하며 오늘도 하나님을 신뢰하는 믿음의 고백입니다.',
  '사랑': '복음은 하나님께 받은 사랑을 기억하고 그 사랑을 이웃에게 흘려보내게 합니다.',
  '지혜': '참된 지혜는 내 생각보다 하나님의 말씀을 더 신뢰할 때 시작됩니다.',
  '평안': '주님이 주시는 평안은 환경이 아니라 그리스도께 속한 마음에서 흘러나옵니다.',
  '축복': '성경이 말하는 복은 하나님이 함께하시고 그분의 은혜 안에 거하는 삶입니다.',
  '능력': '믿음의 능력은 내 힘이 아니라 주님께서 공급하시는 은혜에서 나옵니다.',
};

const CATEGORY_APPLICATIONS: Record<BibleVerse['category'], string[]> = {
  '위로': ['오늘 마음을 무겁게 하는 일을 하나님께 솔직히 말씀드리기', '나를 붙드시는 말씀 한 문장을 천천히 반복해 읽기', '위로가 필요한 한 사람에게 짧은 격려를 전하기'],
  '소망': ['상황보다 하나님의 약속을 먼저 바라보겠다고 고백하기', '포기하고 싶었던 일 한 가지를 주님께 다시 맡기기', '오늘 할 수 있는 작은 순종 하나를 정해 실천하기'],
  '감사': ['오늘 받은 은혜 세 가지를 짧게 적어보기', '불평이 올라오는 순간 감사 제목 하나로 마음을 바꾸기', '하나님께 감사의 기도를 한 문장으로 올려드리기'],
  '사랑': ['내가 먼저 받은 그리스도의 사랑을 조용히 묵상하기', '오늘 만나는 사람에게 친절한 말 한마디 건네기', '용서와 긍휼이 필요한 관계를 하나님께 맡기기'],
  '지혜': ['중요한 선택 앞에서 먼저 말씀과 기도로 멈춰 서기', '내 생각만 고집했던 부분을 하나님 앞에 내려놓기', '오늘의 결정 하나를 주님께 맡기고 정직하게 행하기'],
  '평안': ['염려가 떠오를 때마다 짧게 기도로 바꾸기', '주님이 주시는 평안을 마음에 받아들이겠다고 고백하기', '잠들기 전 오늘의 걱정을 하나님께 맡기기'],
  '축복': ['하나님이 이미 주신 은혜와 보호를 기억하기', '복을 내 소유가 아니라 하나님과 동행하는 삶으로 바라보기', '가정과 이웃을 위해 축복의 기도 드리기'],
  '능력': ['내 힘으로 감당하려 했던 일을 주님께 맡기기', '약함 속에서도 주님의 능력이 나타남을 믿고 고백하기', '오늘 해야 할 일 하나를 기도하며 담대히 시작하기'],
};

const REF_TITLES: Record<string, string> = {
  '요한복음 14:27': '그리스도께서 주시는 평안',
  '시편 23:1': '목자 되신 주님의 돌보심',
  '이사야 41:10': '두려움 속에서 붙드시는 하나님',
  '데살로니가전서 5:16-18': '기쁨과 기도와 감사의 삶',
  '빌립보서 4:13': '주님 안에서 감당하는 힘',
  '잠언 3:5-6': '마음을 다해 하나님을 신뢰하기',
  '로마서 8:28': '합력하여 선을 이루시는 하나님',
  '고린도전서 13:13': '가장 큰 은사인 사랑',
  '시편 46:1': '환난 중의 피난처',
  '예레미야 29:11': '미래와 희망을 주시는 하나님',
  '여호수아 1:9': '강하고 담대하라',
  '시편 119:105': '길을 비추는 말씀',
  '베드로전서 5:7': '염려를 맡기는 믿음',
  '빌립보서 4:6-7': '염려를 기도로 바꾸는 평강',
  '마태복음 11:28': '수고한 영혼에게 주시는 쉼',
  '요한일서 4:18': '두려움을 내쫓는 사랑',
  '시편 103:2': '은택을 잊지 않는 마음',
  '시편 16:11': '생명의 길과 충만한 기쁨',
  '야고보서 1:5': '후히 주시는 지혜',
  '갈라디아서 6:9': '낙심하지 않는 선한 수고',
  '요한일서 1:9': '자백하는 자에게 주시는 용서',
  '시편 51:10': '정한 마음을 새롭게 하소서',
  '에베소서 4:32': '받은 용서로 용서하기',
  '마태복음 6:14': '용서의 통로가 되는 삶',
  '시편 34:18': '상한 마음에 가까우신 주님',
  '이사야 40:31': '앙망하는 자가 얻는 새 힘',
  '시편 100:4': '감사로 들어가는 예배',
  '요한복음 3:16': '독생자를 주신 사랑',
  '잠언 9:10': '지혜의 시작인 경외',
  '요한복음 16:33': '세상을 이기신 주님의 평안',
  '민수기 6:24-26': '얼굴을 비추시는 축복',
  '에베소서 6:10': '주 안에서 강건하여지라',
  '시편 147:3': '상처를 싸매시는 하나님',
  '히브리서 11:1': '보이지 않는 약속을 붙드는 믿음',
  '골로새서 3:15': '마음을 주장하는 그리스도의 평강',
  '로마서 5:8': '죄인을 위해 죽으신 사랑',
  '잠언 16:3': '행사를 맡기는 지혜',
  '이사야 26:3': '견고한 마음에 임하는 평강',
  '신명기 28:6': '삶의 자리마다 함께하는 복',
  '고린도후서 12:9': '약함에서 온전해지는 은혜',
  '시편 55:22': '짐을 맡기면 붙드시는 주님',
  '로마서 15:13': '소망이 넘치게 하시는 성령',
  '시편 107:1': '영원한 인자하심에 감사',
  '요한복음 15:12': '예수님처럼 사랑하라',
  '잠언 2:6': '입에서 나오는 지혜와 명철',
  '시편 4:8': '안전히 살게 하시는 평안',
  '시편 1:1-3': '시냇가에 심은 나무 같은 복',
  '이사야 40:29': '피곤한 자에게 주시는 능력',
  '나훔 1:7': '환난 날의 산성이신 여호와',
  '시편 37:5': '길을 맡길 때 이루시는 주님',
  '시편 136:1': '영원한 인자하심을 찬양',
  '로마서 8:38-39': '끊을 수 없는 그리스도의 사랑',
  '미가 6:8': '정의와 인자와 겸손의 길',
  '시편 91:1-2': '전능자의 그늘 아래 거하는 평안',
  '창세기 12:2': '복의 근원이 되는 부르심',
  '디모데후서 1:7': '두려움이 아닌 능력의 영',
  '시편 30:5': '아침에 찾아오는 기쁨',
  '예레미야애가 3:22-23': '아침마다 새로운 긍휼',
  '시편 118:24': '주께서 만드신 오늘',
  '시편 139:14': '존귀하게 지으신 나',
};

function refOf(verse: BibleVerse) {
  return `${verse.book} ${verse.chapter}:${verse.verse}`;
}

function pickKeyPhrase(verse: BibleVerse) {
  const normalized = verse.content.replace(/[“”"'.,!?]/g, '').trim();
  const words = normalized.split(/\s+/).filter(Boolean);
  if (words.length <= 7) return normalized;
  return words.slice(0, 7).join(' ');
}

function buildExplanation(ref: string, verse: BibleVerse) {
  const message = CATEGORY_MESSAGES[verse.category];
  return `${ref} 말씀은 ${message} 이 말씀은 단순한 종교적 위로가 아니라, 오늘의 삶 속에서 하나님을 신뢰하도록 우리를 초대합니다. 우리는 상황과 감정에 쉽게 흔들리지만, 하나님은 말씀을 통해 우리의 시선을 다시 그분께로 돌리십니다. 그러므로 이 구절을 읽을 때 핵심은 더 잘해내야 한다는 부담이 아니라, 먼저 주님의 은혜 안에 머무르는 것입니다. 예수 그리스도 안에서 하나님은 우리를 버려두지 않으시고, 말씀으로 마음을 새롭게 하시며 오늘 걸어갈 길을 비추십니다.`;
}

function buildMeditation(verse: BibleVerse, keyPhrase: string) {
  return `${verse.meditation} 오늘 저는 '${keyPhrase}'라는 말씀 앞에 조용히 머뭅니다. 제 마음은 상황과 감정에 쉽게 흔들리지만, 하나님의 말씀은 저를 다시 바른 자리로 부릅니다. 오늘은 완벽한 결심보다 작은 믿음의 방향을 붙듭니다. 아버지께서 이 말씀으로 제 생각을 새롭게 하시고, 제 걸음을 주님의 은혜 안에 머물게 하심을 믿습니다.`;
}

function buildPrayer(ref: string, keyPhrase: string) {
  return `아버지, 오늘 ${ref} 말씀을 제 마음에 새깁니다. '${keyPhrase}'라는 말씀을 통해 아버지의 마음을 바라봅니다. 제 생각과 감정보다 아버지의 말씀을 더 신뢰합니다. 오늘도 이 말씀을 붙들고 작은 순종으로 아버지의 길을 걷습니다. 아버지, 감사합니다. 예수 그리스도의 이름으로 기도드립니다. 아멘.`;
}


function buildCuratedHomeDevotion(ref: string, verse: BibleVerse, curated: VerseDevotionResult) {
  const keyPhrase = curated.keyPhrase || pickKeyPhrase(verse);
  const categoryMessage = CATEGORY_MESSAGES[verse.category];
  return buildLocalDevotionFromVerse(ref, verse.content, {
    ...curated,
    reference: ref,
    title: curated.title || REF_TITLES[ref] || CATEGORY_TITLES[verse.category],
    coreMessage: curated.coreMessage || categoryMessage,
    keyWords: curated.keyWords?.length ? curated.keyWords : [verse.category, '말씀', '오늘'],
    keyPhrase,
    explanation: `${ref} 말씀은 오늘의 상황을 해석하기 전에 먼저 하나님을 바라보게 합니다. ${categoryMessage} 이 구절은 단순한 위로나 교훈에 머물지 않고, 지금 내 마음이 어디를 향하고 있는지 조용히 비추어 줍니다. ${verse.meditation}`,
    meditation: verse.meditation,
    prayer: verse.prayer,
    application: CATEGORY_APPLICATIONS[verse.category],
    question: `오늘 '${keyPhrase}' 말씀 앞에서 하나님께 맡기고 순종해야 할 한 가지는 무엇일까?`,
    reflectionQuestion: `오늘 '${keyPhrase}' 말씀 앞에서 하나님께 맡기고 순종해야 할 한 가지는 무엇일까?`,
    fallback: false,
    model: curated.model || 'curated-home-ko-v1',
  });
}

export function getDailyDevotion(verse: BibleVerse): VerseDevotionResult {
  const ref = refOf(verse);
  const curated = HOME_DEVOTIONS_CURATED[ref];
  if (curated) return buildCuratedHomeDevotion(ref, verse, curated);

  const keyPhrase = pickKeyPhrase(verse);

  return buildLocalDevotionFromVerse(ref, verse.content, {
    reference: ref,
    title: REF_TITLES[ref] || CATEGORY_TITLES[verse.category],
    coreMessage: CATEGORY_MESSAGES[verse.category],
    keyWords: [verse.category, '말씀', '은혜'],
    keyPhrase,
    explanation: buildExplanation(ref, verse),
    meditation: buildMeditation(verse, keyPhrase),
    prayer: buildPrayer(ref, keyPhrase),
    application: CATEGORY_APPLICATIONS[verse.category],
    question: '오늘 이 말씀 앞에서 하나님께 맡기고 순종해야 할 한 가지는 무엇일까?',
    reflectionQuestion: '오늘 이 말씀 앞에서 하나님께 맡기고 순종해야 할 한 가지는 무엇일까?',
    fallback: false,
    model: 'curated-home-ko-v1',
  });
}
