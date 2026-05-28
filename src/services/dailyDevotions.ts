import type { BibleVerse } from '../data/verses';
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

function refOf(verse: BibleVerse) {
  return `${verse.book} ${verse.chapter}:${verse.verse}`;
}

function pickKeyPhrase(verse: BibleVerse) {
  const normalized = verse.content.replace(/[“”"'.,!?]/g, '').trim();
  const words = normalized.split(/\s+/).filter(Boolean);
  if (words.length <= 7) return normalized;
  return words.slice(0, 7).join(' ');
}

function buildExplanation(verse: BibleVerse) {
  const ref = refOf(verse);
  const message = CATEGORY_MESSAGES[verse.category];
  return `${ref} 말씀은 ${message} 이 말씀은 단순한 종교적 위로가 아니라, 오늘의 삶 속에서 하나님을 신뢰하도록 우리를 초대합니다. 우리는 상황과 감정에 쉽게 흔들리지만, 하나님은 말씀을 통해 우리의 시선을 다시 그분께로 돌리십니다. 그러므로 이 구절을 읽을 때 핵심은 더 잘해내야 한다는 부담이 아니라, 먼저 주님의 은혜 안에 머무르는 것입니다. 예수 그리스도 안에서 하나님은 우리를 버려두지 않으시고, 말씀으로 마음을 새롭게 하시며 오늘 걸어갈 길을 비추십니다.`;
}

function buildMeditation(verse: BibleVerse) {
  return `${verse.meditation} 오늘 이 말씀 앞에서 저는 제 감정보다 하나님의 말씀을 더 신뢰하기 원합니다. 주님은 멀리 계신 분이 아니라, 지금 제 삶의 자리에서 은혜로 함께하시는 아버지이십니다. 그래서 오늘은 두려움이나 조급함에 끌려가기보다, 말씀 안에 담긴 하나님의 마음을 붙들고 한 걸음씩 걸어갈 수 있습니다.`;
}

function buildPrayer(verse: BibleVerse) {
  const cleanPrayer = verse.prayer.replace(/\s*아멘[.!?。．…]*\s*$/i, '').trim();
  return `${cleanPrayer} 제 생각과 감정보다 아버지의 말씀을 더 신뢰합니다. 오늘도 이 말씀을 제 마음에 새기고, 작은 순종으로 아버지의 길을 걷습니다. 아버지, 감사합니다. 예수 그리스도의 이름으로 기도드립니다. 아멘.`;
}

export function getDailyDevotion(verse: BibleVerse): VerseDevotionResult {
  const ref = refOf(verse);

  return buildLocalDevotionFromVerse(ref, verse.content, {
    reference: ref,
    title: CATEGORY_TITLES[verse.category],
    coreMessage: CATEGORY_MESSAGES[verse.category],
    keyWords: [verse.category, '말씀', '은혜'],
    keyPhrase: pickKeyPhrase(verse),
    explanation: buildExplanation(verse),
    meditation: buildMeditation(verse),
    prayer: buildPrayer(verse),
    application: CATEGORY_APPLICATIONS[verse.category],
    question: '오늘 이 말씀 앞에서 하나님께 맡기고 순종해야 할 한 가지는 무엇일까?',
    reflectionQuestion: '오늘 이 말씀 앞에서 하나님께 맡기고 순종해야 할 한 가지는 무엇일까?',
    fallback: false,
    model: 'curated-ko-v1',
  });
}
