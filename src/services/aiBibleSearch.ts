import type { BibleVerseRecord } from '../types/bible';
import { loadBibleVerseIndex } from './bibleIndex';
import { normalizeKoreanSearchText } from './bibleSearch';

type TopicProfile = {
  label: string;
  triggers: string[];
  keywords: string[];
  related: string[];
  guide: string;
};

export type AiBibleSearchMeta = {
  summary: string;
  guide: string;
  terms: string[];
  topics: string[];
};

const STOP_WORDS = new Set([
  '관련', '구절', '성경', '말씀', '보여줘', '찾아줘', '알려줘', '쉽게', '이해', '문맥', '문맥적', '순차적',
  '순차', '흐름', '정리', '설명', '대한', '대해', '것을', '있는', '없는', '하게', '하고', '처럼', '질문',
  '묵상', '기도', '해석', '적용', '중심', '전체', '모든', '관련된', '순서대로', '자세히', '간단히'
]);

const TOPICS: TopicProfile[] = [
  { label: '사랑', triggers: ['사랑', '이웃사랑', '서로사랑'], keywords: ['사랑', '사랑하', '자비', '긍휼', '용서', '인애'], related: ['하나님', '예수', '그리스도', '이웃', '형제', '계명', '성령', '열매'], guide: '하나님 사랑의 근원, 예수님의 사랑, 서로 사랑하라는 명령, 사랑의 열매 순서로 정리했습니다.' },
  { label: '위로', triggers: ['위로', '고난', '상한', '낙심', '힘들'], keywords: ['위로', '고난', '상한', '눈물', '도우', '붙들', '쉼'], related: ['하나님', '여호와', '예수', '평안', '소망', '함께'], guide: '하나님의 가까우심, 두려움 속의 붙드심, 예수님의 쉼, 믿음의 위로 순서로 정리했습니다.' },
  { label: '평안', triggers: ['평안', '평강', '불안', '염려', '두려움'], keywords: ['평안', '평강', '염려', '두려워', '근심', '마음', '안식'], related: ['기도', '감사', '믿음', '함께', '예수', '성령'], guide: '하나님을 신뢰함, 염려를 맡김, 예수님이 주시는 평안, 기도 가운데 지켜지는 마음 순서로 정리했습니다.' },
  { label: '용서/회개', triggers: ['용서', '회개', '죄사함', '자백'], keywords: ['용서', '사하', '회개', '자백', '깨끗', '긍휼', '자비'], related: ['예수', '그리스도', '은혜', '화목', '새롭게'], guide: '돌이키는 마음, 하나님의 긍휼, 그리스도의 용서, 서로 용서하는 삶 순서로 정리했습니다.' },
  { label: '지혜', triggers: ['지혜', '분별', '선택', '결정', '인도'], keywords: ['지혜', '명철', '분별', '길', '인도', '계획', '훈계', '말씀'], related: ['여호와', '하나님', '구하', '의뢰', '정직'], guide: '하나님을 경외함, 내 생각을 내려놓음, 말씀의 빛, 하나님께 구하는 지혜 순서로 정리했습니다.' },
  { label: '믿음', triggers: ['믿음', '신뢰', '의심', '확신'], keywords: ['믿음', '믿는', '신뢰', '의지', '확신', '바라는', '보이지'], related: ['예수', '하나님', '구원', '말씀', '소망'], guide: '하나님을 신뢰함, 말씀을 들음, 보이지 않는 것을 붙듦, 믿음으로 사는 삶 순서로 정리했습니다.' },
  { label: '구원/복음', triggers: ['구원', '복음', '영생', '십자가', '은혜'], keywords: ['구원', '복음', '영생', '은혜', '믿음', '십자가', '부활', '그리스도', '예수'], related: ['생명', '의', '하나님', '아들', '주'], guide: '죄와 사망의 현실, 예수 그리스도의 십자가와 부활, 믿음으로 받는 은혜, 새 생명 순서로 정리했습니다.' },
  { label: '성령', triggers: ['성령', '보혜사', '충만', '열매'], keywords: ['성령', '보혜사', '영', '충만', '열매', '인도', '능력', '거하'], related: ['예수', '하나님', '진리', '마음', '기도'], guide: '새 마음의 약속, 보혜사 성령, 능력과 인도하심, 성령의 열매 순서로 정리했습니다.' },
  { label: '기도', triggers: ['기도', '간구', '구하', '응답', '중보'], keywords: ['기도', '간구', '구하', '응답', '부르짖', '감사', '중보'], related: ['하나님', '아버지', '믿음', '성령', '평안', '뜻'], guide: '하나님께 나아감, 구하고 찾고 두드림, 염려를 맡김, 성령의 도우심 순서로 정리했습니다.' },
  { label: '겸손/섬김', triggers: ['겸손', '섬김', '낮아', '낮은', '종'], keywords: ['겸손', '낮추', '섬기', '종', '온유', '비우'], related: ['예수', '그리스도', '마음', '형제', '사랑'], guide: '하나님 앞에서 낮아짐, 예수님의 섬김, 서로 섬김, 하나님이 높이심 순서로 정리했습니다.' },
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
    .map(term => term.trim())
    .filter(term => term.length >= 2)
    .filter(term => !STOP_WORDS.has(term))
  )];
}

function findProfiles(query: string) {
  const normalized = normalize(query);
  return TOPICS
    .map(profile => {
      const triggerHits = profile.triggers.filter(trigger => normalized.includes(normalize(trigger))).length;
      const keywordHits = profile.keywords.filter(keyword => normalized.includes(normalize(keyword))).length;
      return { profile, score: triggerHits * 3 + keywordHits };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(item => item.profile);
}

function instructionFlags(query: string) {
  const normalized = normalize(query);
  return {
    wantsFlow: ['순차', '문맥', '흐름', '이해', '쉽게', '정리'].some(word => normalized.includes(normalize(word))),
    wantsChrist: ['예수', '그리스도', '복음', '십자가'].some(word => normalized.includes(normalize(word))),
    wantsApply: ['적용', '실천', '삶', '오늘'].some(word => normalized.includes(normalize(word))),
  };
}

export async function aiSearchBibleVerses(
  query: string,
  options: { limit?: number; offset?: number } = {}
): Promise<{ items: BibleVerseRecord[]; totalCount: number; hasMore: boolean; meta: AiBibleSearchMeta }> {
  const trimmed = query.trim();
  const limit = options.limit || 50;
  const offset = options.offset || 0;
  if (!trimmed) {
    return { items: [], totalCount: 0, hasMore: false, meta: { summary: '', guide: '', terms: [], topics: [] } };
  }

  const index = await loadBibleVerseIndex();
  const profiles = findProfiles(trimmed);
  const userTerms = splitQueryTerms(trimmed);
  const flags = instructionFlags(trimmed);
  const activeTerms = [...new Set([
    ...userTerms,
    ...profiles.flatMap(profile => profile.keywords),
    ...profiles.flatMap(profile => profile.related),
  ])].slice(0, 24);
  const normalizedTerms = activeTerms.map(normalize).filter(term => term.length >= 2);
  const exact = normalize(trimmed);

  const scored = index.map(verse => {
    const searchText = verse.searchText || normalize(verse.text);
    let score = 0;

    if (exact && searchText.includes(exact)) score += 80;
    for (const term of normalizedTerms) {
      if (searchText.includes(term)) score += userTerms.some(t => normalize(t) === term) ? 18 : 10;
    }
    for (const profile of profiles) {
      score += profile.keywords.filter(keyword => searchText.includes(normalize(keyword))).length * 14;
      score += profile.related.filter(keyword => searchText.includes(normalize(keyword))).length * 4;
    }
    if (flags.wantsChrist && ['요한복음', '로마서', '고린도후서', '갈라디아서', '에베소서', '빌립보서', '요한일서'].includes(verse.bookName)) score += 7;
    if (flags.wantsApply && ['잠언', '마태복음', '누가복음', '로마서', '야고보서', '요한일서'].includes(verse.bookName)) score += 5;
    if (flags.wantsFlow && FLOW_BOOK_WEIGHT[verse.bookName]) score += Math.max(0, 10 - Math.abs((FLOW_BOOK_WEIGHT[verse.bookName] || 30) - 11));

    return { verse, score };
  }).filter(item => item.score >= (profiles.length > 0 ? 22 : 28));

  const finalItems = scored
    .sort((a, b) => {
      if (flags.wantsFlow || profiles.length > 0) {
        const flowA = FLOW_BOOK_WEIGHT[a.verse.bookName] || 50;
        const flowB = FLOW_BOOK_WEIGHT[b.verse.bookName] || 50;
        if (Math.abs(b.score - a.score) > 28) return b.score - a.score;
        if (flowA !== flowB) return flowA - flowB;
      }
      if (b.score !== a.score) return b.score - a.score;
      if (a.verse.bookOrder !== b.verse.bookOrder) return a.verse.bookOrder - b.verse.bookOrder;
      if (a.verse.chapter !== b.verse.chapter) return a.verse.chapter - b.verse.chapter;
      return a.verse.verse - b.verse.verse;
    })
    .slice(0, profiles.length > 0 ? 120 : 80)
    .map(item => item.verse);

  const topics = profiles.map(profile => profile.label);
  const meta: AiBibleSearchMeta = {
    summary: topics.length > 0 ? `질문을 ${topics.join(', ')} 주제로 이해했습니다.` : '질문에서 핵심 단어와 의도를 뽑아 관련 구절을 찾았습니다.',
    guide: profiles[0]?.guide || '핵심 단어, 유사 표현, 성경 전체 흐름, 구절의 위치를 함께 보아 관련도가 높은 순서로 정리했습니다.',
    terms: activeTerms.slice(0, 14),
    topics,
  };

  return {
    items: finalItems.slice(offset, offset + limit),
    totalCount: finalItems.length,
    hasMore: offset + limit < finalItems.length,
    meta,
  };
}
