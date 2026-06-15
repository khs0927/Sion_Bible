import type { BibleVerseRecord } from '../types/bible';
import { loadBibleVerseIndex } from './bibleIndex';
import { normalizeKoreanSearchText } from './bibleSearch';

type SectionTemplate = {
  id: string;
  title: string;
  description: string;
  terms: string[];
};

type TopicProfile = {
  id: string;
  label: string;
  triggers: string[];
  keywords: string[];
  related: string[];
  sections: SectionTemplate[];
  guide: string;
};

export type AiBibleSearchSection = {
  id: string;
  title: string;
  description: string;
  verseIds: string[];
};

export type AiBibleSearchMeta = {
  summary: string;
  guide: string;
  terms: string[];
  topics: string[];
  sections: AiBibleSearchSection[];
  usedRemoteExpansion?: boolean;
};

type RemoteAiExpansion = {
  terms?: string[];
  topics?: string[];
  sections?: Array<Partial<SectionTemplate> & { title: string }>;
};

const STOP_WORDS = new Set([
  '관련', '구절', '성경', '말씀', '보여줘', '찾아줘', '알려줘', '쉽게', '이해', '문맥', '문맥적', '순차적',
  '순차', '흐름', '정리', '설명', '대한', '대해', '것을', '있는', '없는', '하게', '하고', '처럼', '질문',
  '묵상', '기도', '해석', '적용', '중심', '전체', '모든', '관련된', '순서대로', '자세히', '간단히', '쫙',
  '나열', '주제별', '앞에', '뒤에', '마다', '먼저', '다음', '그리고', '또한', '해주세요', '해줘', '되도록'
]);

const TOPICS: TopicProfile[] = [
  {
    id: 'love',
    label: '사랑',
    triggers: ['사랑', '이웃사랑', '서로사랑', '형제사랑', '하나님사랑'],
    keywords: ['사랑', '사랑하', '인애', '자비', '긍휼', '용서', '화평', '친절'],
    related: ['하나님', '예수', '그리스도', '이웃', '형제', '계명', '성령', '열매', '은혜'],
    guide: '하나님 사랑의 근원에서 시작해, 예수 그리스도의 사랑, 서로 사랑하라는 명령, 사랑의 성품과 열매 순서로 정리했습니다.',
    sections: [
      { id: 'love-source', title: '사랑의 근원', description: '사랑이 하나님께로부터 시작됨을 보여주는 말씀입니다.', terms: ['하나님', '여호와', '사랑', '인애', '자비', '긍휼', '영원', '먼저'] },
      { id: 'love-command', title: '사랑의 계명', description: '하나님 사랑과 이웃 사랑, 서로 사랑하라는 명령의 흐름입니다.', terms: ['사랑하', '계명', '이웃', '서로', '마음', '뜻', '힘', '형제'] },
      { id: 'love-christ', title: '그리스도의 사랑', description: '예수님 안에서 드러난 십자가의 사랑입니다.', terms: ['예수', '그리스도', '친구', '목숨', '십자가', '위하여', '내어주', '은혜'] },
      { id: 'love-nature', title: '사랑의 본질', description: '사랑이 어떤 성품으로 나타나는지 보여주는 말씀입니다.', terms: ['오래', '참고', '온유', '시기', '자랑', '무례', '진리', '견디', '소망'] },
      { id: 'love-fruit', title: '사랑의 열매', description: '성령 안에서 사랑이 삶의 열매와 실천으로 나타나는 말씀입니다.', terms: ['성령', '열매', '용서', '섬기', '행함', '화평', '선행', '긍휼'] },
    ],
  },
  {
    id: 'comfort',
    label: '위로',
    triggers: ['위로', '고난', '상한', '낙심', '힘들', '눈물', '아픔'],
    keywords: ['위로', '고난', '상한', '눈물', '환난', '도우', '붙들', '쉼', '건지'],
    related: ['하나님', '여호와', '예수', '평안', '소망', '함께', '마음'],
    guide: '상한 마음을 가까이하시는 하나님, 두려움 속의 붙드심, 예수님의 쉼, 환난 중의 소망 순서로 정리했습니다.',
    sections: [
      { id: 'comfort-near', title: '가까이하시는 하나님', description: '상한 마음과 고난 중에 가까이하시는 하나님을 보여줍니다.', terms: ['상한', '마음', '가까이', '여호와', '하나님', '눈물'] },
      { id: 'comfort-help', title: '붙드심과 도우심', description: '두려움과 약함 속에서 하나님이 붙드시는 말씀입니다.', terms: ['두려워', '도우', '붙들', '건지', '힘', '피난처'] },
      { id: 'comfort-rest', title: '예수님의 쉼과 평안', description: '예수님께 나아갈 때 주시는 쉼과 평안을 보여줍니다.', terms: ['예수', '수고', '무거운', '쉼', '평안', '근심'] },
      { id: 'comfort-hope', title: '환난 중의 소망', description: '고난이 끝이 아니라 소망으로 이어지는 말씀입니다.', terms: ['환난', '고난', '소망', '인내', '위로', '영광'] },
    ],
  },
  {
    id: 'peace',
    label: '평안',
    triggers: ['평안', '평강', '불안', '염려', '두려움', '걱정'],
    keywords: ['평안', '평강', '염려', '두려워', '두려움', '근심', '마음', '안식'],
    related: ['기도', '감사', '믿음', '함께', '예수', '성령', '보혜사'],
    guide: '하나님을 신뢰함, 염려를 맡김, 예수님이 주시는 평안, 기도 가운데 지켜지는 마음 순서로 정리했습니다.',
    sections: [
      { id: 'peace-trust', title: '신뢰에서 오는 평안', description: '하나님을 의지할 때 마음이 지켜지는 말씀입니다.', terms: ['평안', '평강', '신뢰', '의지', '마음', '견고'] },
      { id: 'peace-prayer', title: '염려를 맡기는 기도', description: '염려를 기도와 감사로 하나님께 맡기는 흐름입니다.', terms: ['염려', '기도', '간구', '감사', '구하', '맡기'] },
      { id: 'peace-christ', title: '예수님이 주시는 평안', description: '세상이 주는 것과 다른 예수님의 평안입니다.', terms: ['예수', '평안', '근심', '두려워', '세상', '이기'] },
      { id: 'peace-spirit', title: '성령 안의 평강', description: '성령 안에서 누리는 평강과 생명의 흐름입니다.', terms: ['성령', '영', '생명', '평안', '평강', '열매'] },
    ],
  },
  {
    id: 'forgiveness',
    label: '용서/회개',
    triggers: ['용서', '회개', '죄사함', '자백', '죄'],
    keywords: ['용서', '사하', '죄', '회개', '자백', '깨끗', '긍휼', '자비'],
    related: ['예수', '그리스도', '은혜', '화목', '새롭게', '피'],
    guide: '죄를 깨닫는 마음, 하나님의 긍휼, 그리스도 안의 사함, 서로 용서하는 삶 순서로 정리했습니다.',
    sections: [
      { id: 'forgive-return', title: '돌이키는 마음', description: '죄를 인정하고 하나님께 돌아가는 말씀입니다.', terms: ['죄', '회개', '자백', '돌이', '마음', '깨끗'] },
      { id: 'forgive-mercy', title: '하나님의 긍휼', description: '용서의 근거가 하나님의 자비와 긍휼에 있음을 보여줍니다.', terms: ['긍휼', '자비', '인자', '용서', '사하', '기억'] },
      { id: 'forgive-christ', title: '그리스도 안의 사함', description: '예수님의 피와 은혜로 받는 죄 사함입니다.', terms: ['예수', '그리스도', '피', '은혜', '속량', '사함'] },
      { id: 'forgive-oneanother', title: '서로 용서하는 삶', description: '받은 용서가 관계 속의 용서로 이어지는 말씀입니다.', terms: ['서로', '용서', '사랑', '형제', '화목', '불쌍'] },
    ],
  },
  {
    id: 'wisdom',
    label: '지혜',
    triggers: ['지혜', '분별', '선택', '결정', '인도', '계획'],
    keywords: ['지혜', '명철', '분별', '길', '인도', '계획', '마음', '훈계', '말씀'],
    related: ['여호와', '하나님', '구하', '의뢰', '정직', '선하'],
    guide: '하나님 경외, 내 명철을 내려놓음, 말씀의 빛, 구하는 지혜 순서로 정리했습니다.',
    sections: [
      { id: 'wisdom-fear', title: '지혜의 시작', description: '지혜가 하나님을 경외함에서 시작됨을 보여줍니다.', terms: ['지혜', '여호와', '경외', '명철', '지식'] },
      { id: 'wisdom-trust', title: '길을 맡기는 믿음', description: '내 판단보다 하나님께 길을 맡기는 말씀입니다.', terms: ['길', '의뢰', '인도', '계획', '마음', '맡기'] },
      { id: 'wisdom-word', title: '말씀의 빛', description: '말씀이 길과 선택을 밝히는 흐름입니다.', terms: ['말씀', '등', '빛', '훈계', '계명', '길'] },
      { id: 'wisdom-ask', title: '구하는 지혜', description: '부족할 때 하나님께 지혜를 구하는 말씀입니다.', terms: ['구하', '기도', '후히', '지혜', '믿음'] },
    ],
  },
  {
    id: 'faith',
    label: '믿음',
    triggers: ['믿음', '신뢰', '의심', '확신', '바라는', '보이지'],
    keywords: ['믿음', '믿는', '믿고', '신뢰', '의지', '확신', '바라는', '보이지'],
    related: ['예수', '하나님', '구원', '말씀', '소망', '의롭'],
    guide: '하나님을 신뢰함, 말씀을 들음, 보이지 않는 것을 붙듦, 믿음으로 사는 삶 순서로 정리했습니다.',
    sections: [
      { id: 'faith-trust', title: '하나님을 신뢰함', description: '믿음이 하나님을 의지하는 마음임을 보여줍니다.', terms: ['믿음', '신뢰', '의지', '여호와', '하나님'] },
      { id: 'faith-word', title: '말씀에서 나는 믿음', description: '말씀을 들음으로 믿음이 자라는 흐름입니다.', terms: ['믿음', '말씀', '들음', '복음', '증거'] },
      { id: 'faith-unseen', title: '보이지 않는 확신', description: '눈에 보이지 않아도 붙드는 믿음의 본질입니다.', terms: ['바라는', '실상', '보이지', '증거', '확신'] },
      { id: 'faith-life', title: '믿음으로 사는 삶', description: '믿음이 삶의 순종과 구원으로 이어지는 말씀입니다.', terms: ['믿음', '살리라', '의롭', '구원', '행함'] },
    ],
  },
  {
    id: 'salvation',
    label: '구원/복음',
    triggers: ['구원', '복음', '영생', '십자가', '은혜', '거듭남'],
    keywords: ['구원', '복음', '영생', '은혜', '믿음', '십자가', '부활', '그리스도', '예수'],
    related: ['죄', '사망', '생명', '의', '하나님', '아들', '주'],
    guide: '죄와 사망의 현실, 예수 그리스도의 십자가와 부활, 믿음으로 받는 은혜, 새 생명 순서로 정리했습니다.',
    sections: [
      { id: 'salvation-need', title: '구원이 필요한 이유', description: '죄와 사망의 현실을 보여주는 말씀입니다.', terms: ['죄', '사망', '심판', '잃어', '어둠'] },
      { id: 'salvation-christ', title: '예수 그리스도의 복음', description: '예수님의 십자가와 부활에 복음의 중심이 있음을 보여줍니다.', terms: ['예수', '그리스도', '십자가', '부활', '복음', '아들'] },
      { id: 'salvation-grace', title: '은혜로 받는 구원', description: '행위가 아니라 믿음과 은혜로 받는 구원입니다.', terms: ['은혜', '믿음', '구원', '선물', '의롭'] },
      { id: 'salvation-life', title: '새 생명과 영생', description: '구원이 새 생명과 영생으로 이어지는 말씀입니다.', terms: ['생명', '영생', '거듭', '새', '하나님 나라'] },
    ],
  },
  {
    id: 'holySpirit',
    label: '성령',
    triggers: ['성령', '보혜사', '충만', '열매', '인도하심'],
    keywords: ['성령', '보혜사', '영', '충만', '열매', '인도', '능력', '거하'],
    related: ['예수', '하나님', '진리', '마음', '기도', '새'],
    guide: '새 마음의 약속, 보혜사 성령, 능력과 인도하심, 성령의 열매 순서로 정리했습니다.',
    sections: [
      { id: 'spirit-promise', title: '새 영과 새 마음', description: '하나님이 새 마음과 새 영을 주시는 약속입니다.', terms: ['새', '영', '마음', '성령', '부드러운'] },
      { id: 'spirit-helper', title: '보혜사 성령', description: '예수님이 약속하신 보혜사 성령의 사역입니다.', terms: ['보혜사', '성령', '진리', '가르치', '생각'] },
      { id: 'spirit-power', title: '능력과 인도하심', description: '성령이 능력과 인도하심으로 역사하시는 말씀입니다.', terms: ['능력', '권능', '인도', '기도', '도우'] },
      { id: 'spirit-fruit', title: '성령의 열매', description: '성령 안에서 맺히는 성품과 삶의 열매입니다.', terms: ['열매', '사랑', '희락', '화평', '오래', '온유', '절제'] },
    ],
  },
  {
    id: 'prayer',
    label: '기도',
    triggers: ['기도', '간구', '구하', '응답', '중보'],
    keywords: ['기도', '간구', '구하', '응답', '부르짖', '감사', '중보'],
    related: ['하나님', '아버지', '믿음', '성령', '평안', '뜻'],
    guide: '하나님께 나아감, 구하고 찾고 두드림, 염려를 맡김, 성령의 도우심 순서로 정리했습니다.',
    sections: [
      { id: 'prayer-near', title: '하나님께 나아감', description: '기도가 하나님께 가까이 나아가는 길임을 보여줍니다.', terms: ['기도', '아버지', '하나님', '은밀', '부르짖'] },
      { id: 'prayer-ask', title: '구하고 찾고 두드림', description: '하나님께 구하는 믿음의 기도입니다.', terms: ['구하', '찾으', '두드리', '응답', '믿음'] },
      { id: 'prayer-peace', title: '염려를 맡기는 기도', description: '염려가 감사와 간구를 통해 평강으로 바뀌는 흐름입니다.', terms: ['염려', '간구', '감사', '평강', '마음'] },
      { id: 'prayer-spirit', title: '성령의 도우심', description: '마땅히 기도할 바를 모를 때 도우시는 성령의 말씀입니다.', terms: ['성령', '도우', '간구', '탄식', '뜻'] },
    ],
  },
  {
    id: 'humility',
    label: '겸손/섬김',
    triggers: ['겸손', '섬김', '낮아', '낮은', '종', '교만'],
    keywords: ['겸손', '낮추', '섬기', '종', '교만', '온유', '비우'],
    related: ['예수', '그리스도', '마음', '형제', '사랑', '자기'],
    guide: '하나님 앞에서 낮아짐, 예수님의 종의 형체, 서로 섬김, 하나님이 높이심 순서로 정리했습니다.',
    sections: [
      { id: 'humility-before', title: '하나님 앞의 낮아짐', description: '겸손이 하나님 앞에서 시작됨을 보여줍니다.', terms: ['겸손', '낮추', '교만', '은혜', '하나님'] },
      { id: 'humility-christ', title: '예수님의 섬김', description: '예수님이 종의 모습으로 낮아지신 말씀입니다.', terms: ['예수', '그리스도', '종', '비우', '낮추', '섬기'] },
      { id: 'humility-oneanother', title: '서로 섬기는 마음', description: '겸손이 공동체 안에서 섬김으로 나타나는 말씀입니다.', terms: ['서로', '섬기', '남', '낮게', '온유', '사랑'] },
      { id: 'humility-exalt', title: '하나님이 높이심', description: '스스로 낮추는 자를 하나님이 높이시는 말씀입니다.', terms: ['낮추', '높이', '때', '주', '하나님'] },
    ],
  },
];

const FLOW_BOOK_WEIGHT: Record<string, number> = {
  창세기: 1, 출애굽기: 2, 레위기: 3, 신명기: 4, 시편: 5, 잠언: 6, 이사야: 7,
  마태복음: 8, 마가복음: 9, 누가복음: 10, 요한복음: 11, 사도행전: 12, 로마서: 13,
  고린도전서: 14, 고린도후서: 15, 갈라디아서: 16, 에베소서: 17, 빌립보서: 18,
  히브리서: 19, 야고보서: 20, 베드로전서: 21, 요한일서: 22,
};

const normalize = (value: string) => normalizeKoreanSearchText(value).toLowerCase();

function splitQueryTerms(query: string) {
  return [...new Set(query
    .replace(/[!?.,/\\()[\]{}:;"'“”‘’]/g, ' ')
    .split(/\s+/)
    .flatMap(term => {
      const cleaned = term.trim();
      if (cleaned.length < 2) return [];
      const pieces = [cleaned];
      if (cleaned.endsWith('으로') || cleaned.endsWith('에게') || cleaned.endsWith('에서') || cleaned.endsWith('부터')) {
        pieces.push(cleaned.slice(0, -2));
      }
      if (cleaned.endsWith('하게') || cleaned.endsWith('하고')) pieces.push(cleaned.slice(0, -2));
      if (cleaned.endsWith('적인') || cleaned.endsWith('적으로')) pieces.push(cleaned.slice(0, -2));
      return pieces;
    })
    .map(term => term.trim())
    .filter(term => term.length >= 2)
    .filter(term => !STOP_WORDS.has(term))
  )];
}

function findProfiles(query: string, extraTopics: string[] = []) {
  const normalized = normalize(`${query} ${extraTopics.join(' ')}`);
  return TOPICS
    .map(profile => {
      const triggerHits = profile.triggers.filter(trigger => normalized.includes(normalize(trigger))).length;
      const keywordHits = profile.keywords.filter(keyword => normalized.includes(normalize(keyword))).length;
      const relatedHits = profile.related.filter(keyword => normalized.includes(normalize(keyword))).length;
      return { profile, score: triggerHits * 4 + keywordHits * 2 + relatedHits };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(item => item.profile);
}

function instructionFlags(query: string) {
  const normalized = normalize(query);
  return {
    wantsFlow: ['순차', '문맥', '흐름', '이해', '쉽게', '정리', '주제별'].some(word => normalized.includes(normalize(word))),
    wantsChrist: ['예수', '그리스도', '복음', '십자가'].some(word => normalized.includes(normalize(word))),
    wantsApply: ['적용', '실천', '삶', '오늘'].some(word => normalized.includes(normalize(word))),
    wantsGrouped: ['주제', '구분', '나누', '묶', '분류', '순차', '문맥'].some(word => normalized.includes(normalize(word))),
  };
}

async function getRemoteExpansion(query: string): Promise<RemoteAiExpansion | null> {
  const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  const endpoint = env?.VITE_AI_BIBLE_SEARCH_ENDPOINT || env?.VITE_DEVOTION_AI_ENDPOINT;
  if (!endpoint) return null;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'bible-search-intent',
        query,
        instruction: 'Return concise Korean Bible-search intent JSON: terms, topics, sections[{title,description,terms}]. Do not include verse text.',
      }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (!data || typeof data !== 'object') return null;
    return data as RemoteAiExpansion;
  } catch {
    return null;
  }
}

function makeDefaultSections(userTerms: string[], remoteSections: RemoteAiExpansion['sections'] = []): SectionTemplate[] {
  const normalizedRemote = remoteSections
    ?.filter(section => section.title)
    .slice(0, 5)
    .map((section, index) => ({
      id: section.id || `remote-${index}`,
      title: section.title,
      description: section.description || '질문의 의도를 기준으로 묶은 관련 말씀입니다.',
      terms: [...new Set([...(section.terms || []), ...userTerms])].filter(Boolean),
    })) || [];

  if (normalizedRemote.length > 0) return normalizedRemote;

  return [
    {
      id: 'core',
      title: '핵심 관련 말씀',
      description: '질문에서 직접 드러난 핵심 단어와 가장 가까운 구절입니다.',
      terms: userTerms,
    },
    {
      id: 'god-gospel',
      title: '하나님과 복음의 관점',
      description: '질문을 하나님, 예수 그리스도, 은혜의 관점에서 이어 봅니다.',
      terms: [...userTerms, '하나님', '예수', '그리스도', '복음', '은혜', '생명', '믿음'],
    },
    {
      id: 'heart-response',
      title: '마음의 응답과 적용',
      description: '말씀이 마음과 삶의 반응으로 이어지는 구절입니다.',
      terms: [...userTerms, '마음', '행하', '순종', '기도', '사랑', '평안', '선하'],
    },
  ];
}

function scoreVerseByTerms(verse: BibleVerseRecord, terms: string[], baseBoost = 0) {
  const searchText = verse.searchText || normalize(verse.text);
  let score = baseBoost;
  const matchedTerms: string[] = [];

  for (const term of terms) {
    const normalized = normalize(term);
    if (normalized.length < 2) continue;
    if (searchText.includes(normalized)) {
      score += normalized.length >= 3 ? 14 : 9;
      matchedTerms.push(term);
    }
  }

  return { score, matchedTerms };
}

function flowWeight(verse: BibleVerseRecord) {
  return FLOW_BOOK_WEIGHT[verse.bookName] || verse.bookOrder + 30;
}

function uniqueById(verses: BibleVerseRecord[]) {
  const seen = new Set<string>();
  return verses.filter(verse => {
    if (seen.has(verse.id)) return false;
    seen.add(verse.id);
    return true;
  });
}

export async function aiSearchBibleVerses(
  query: string,
  options: { limit?: number; offset?: number } = {}
): Promise<{ items: BibleVerseRecord[]; totalCount: number; hasMore: boolean; meta: AiBibleSearchMeta }> {
  const trimmed = query.trim();
  const limit = options.limit || 50;
  const offset = options.offset || 0;
  if (!trimmed) {
    return { items: [], totalCount: 0, hasMore: false, meta: { summary: '', guide: '', terms: [], topics: [], sections: [] } };
  }

  const [index, remoteExpansion] = await Promise.all([
    loadBibleVerseIndex(),
    getRemoteExpansion(trimmed),
  ]);

  const remoteTerms = remoteExpansion?.terms?.filter(Boolean) || [];
  const remoteTopics = remoteExpansion?.topics?.filter(Boolean) || [];
  const profiles = findProfiles(trimmed, remoteTopics);
  const userTerms = splitQueryTerms(trimmed);
  const flags = instructionFlags(trimmed);
  const activeTerms = [...new Set([
    ...userTerms,
    ...remoteTerms,
    ...profiles.flatMap(profile => profile.keywords),
    ...profiles.flatMap(profile => profile.related),
  ])].filter(Boolean).slice(0, 32);

  const sectionTemplates = profiles.length > 0
    ? profiles.flatMap(profile => profile.sections).slice(0, 7)
    : makeDefaultSections(userTerms.length > 0 ? userTerms : remoteTerms, remoteExpansion?.sections);

  const globalTerms = [...new Set([...activeTerms, ...sectionTemplates.flatMap(section => section.terms)])];
  const exact = normalize(trimmed);

  const globalScored = index
    .map(verse => {
      const searchText = verse.searchText || normalize(verse.text);
      const globalScore = scoreVerseByTerms(verse, globalTerms).score;
      let score = globalScore;
      if (exact && searchText.includes(exact)) score += 80;
      if (flags.wantsChrist && ['요한복음', '로마서', '고린도후서', '갈라디아서', '에베소서', '빌립보서', '요한일서'].includes(verse.bookName)) score += 7;
      if (flags.wantsApply && ['잠언', '마태복음', '누가복음', '로마서', '야고보서', '요한일서'].includes(verse.bookName)) score += 5;
      if (flags.wantsFlow && FLOW_BOOK_WEIGHT[verse.bookName]) score += Math.max(0, 10 - Math.abs(flowWeight(verse) - 11));
      return { verse, score };
    })
    .filter(item => item.score >= (profiles.length > 0 ? 18 : 14));

  const usedVerseIds = new Set<string>();
  const sectionResults = sectionTemplates.map((section, sectionIndex) => {
    const terms = [...new Set([...section.terms, ...userTerms])];
    const candidates = index
      .map(verse => {
        const sectionScore = scoreVerseByTerms(verse, terms, 0).score;
        const globalScore = globalScored.find(item => item.verse.id === verse.id)?.score || 0;
        const score = sectionScore * 1.7 + globalScore * 0.45;
        return { verse, score };
      })
      .filter(item => item.score >= (profiles.length > 0 ? 18 : 12))
      .sort((a, b) => {
        if (flags.wantsFlow || flags.wantsGrouped || profiles.length > 0) {
          if (Math.abs(b.score - a.score) > 22) return b.score - a.score;
          const flowDiff = flowWeight(a.verse) - flowWeight(b.verse);
          if (flowDiff !== 0) return flowDiff;
        }
        if (b.score !== a.score) return b.score - a.score;
        if (a.verse.bookOrder !== b.verse.bookOrder) return a.verse.bookOrder - b.verse.bookOrder;
        if (a.verse.chapter !== b.verse.chapter) return a.verse.chapter - b.verse.chapter;
        return a.verse.verse - b.verse.verse;
      });

    const takeCount = sectionTemplates.length >= 5 ? 7 : 10;
    const verses: BibleVerseRecord[] = [];
    for (const candidate of candidates) {
      if (usedVerseIds.has(candidate.verse.id)) continue;
      verses.push(candidate.verse);
      usedVerseIds.add(candidate.verse.id);
      if (verses.length >= takeCount) break;
    }

    return {
      id: section.id || `section-${sectionIndex}`,
      title: section.title,
      description: section.description,
      verses,
    };
  }).filter(section => section.verses.length > 0);

  const groupedItems = sectionResults.flatMap(section => section.verses);
  const fallbackItems = globalScored
    .sort((a, b) => {
      if (flags.wantsFlow || profiles.length > 0) {
        if (Math.abs(b.score - a.score) > 28) return b.score - a.score;
        const flowDiff = flowWeight(a.verse) - flowWeight(b.verse);
        if (flowDiff !== 0) return flowDiff;
      }
      if (b.score !== a.score) return b.score - a.score;
      if (a.verse.bookOrder !== b.verse.bookOrder) return a.verse.bookOrder - b.verse.bookOrder;
      if (a.verse.chapter !== b.verse.chapter) return a.verse.chapter - b.verse.chapter;
      return a.verse.verse - b.verse.verse;
    })
    .map(item => item.verse)
    .filter(verse => !usedVerseIds.has(verse.id));

  const maxResults = profiles.length > 0 ? 140 : 100;
  const finalItems = uniqueById([...groupedItems, ...fallbackItems]).slice(0, maxResults);
  const topics = [...new Set([...profiles.map(profile => profile.label), ...remoteTopics])];
  const sections: AiBibleSearchSection[] = sectionResults.map(section => ({
    id: section.id,
    title: section.title,
    description: section.description,
    verseIds: section.verses.map(verse => verse.id),
  }));

  const meta: AiBibleSearchMeta = {
    summary: topics.length > 0
      ? `질문을 ${topics.join(', ')} 주제로 이해했습니다.`
      : '질문에서 핵심 단어와 의도를 뽑아 관련 구절을 찾았습니다.',
    guide: profiles[0]?.guide || '질문을 핵심 말씀, 하나님과 복음의 관점, 마음의 응답과 적용 흐름으로 나누어 정리했습니다.',
    terms: activeTerms.slice(0, 14),
    topics,
    sections,
    usedRemoteExpansion: Boolean(remoteExpansion),
  };

  return {
    items: finalItems.slice(offset, offset + limit),
    totalCount: finalItems.length,
    hasMore: offset + limit < finalItems.length,
    meta,
  };
}
