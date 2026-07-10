import type { BibleVerseRecord } from '../types/bible';
import { loadBibleVerseIndex } from './bibleIndex';
import { normalizeKoreanSearchText, parseMultiReferenceQuery, searchBibleVerses } from './bibleSearch';

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
  guide: string;
  sections: SectionTemplate[];
};

type RemoteAiExpansion = {
  terms?: string[];
  topics?: string[];
  sections?: Array<Partial<SectionTemplate> & { title: string }>;
  fallback?: boolean;
};

const STOP_WORDS = new Set([
  '관련', '구절', '성경', '말씀', '보여줘', '찾아줘', '알려줘', '쉽게', '이해', '문맥', '문맥적',
  '순차적', '순차', '흐름', '정리', '설명', '주제별', '질문', '대한', '대해', '해줘', '해주세요',
  '있는', '없는', '하게', '하고', '처럼', '전체', '모든', '자세히', '간단히', '먼저', '다음', '그리고',
]);

const TOPICS: TopicProfile[] = [
  {
    id: 'love',
    label: '사랑',
    triggers: ['사랑', '이웃사랑', '서로사랑', '하나님사랑'],
    keywords: ['사랑', '사랑하', '인애', '자비', '긍휼', '용서'],
    related: ['하나님', '예수', '그리스도', '이웃', '계명', '성령', '열매'],
    guide: '사랑의 근원, 그리스도의 사랑, 사랑의 계명과 삶의 열매 순서로 정리했습니다.',
    sections: [
      { id: 'love-source', title: '사랑의 근원', description: '사랑이 하나님께로부터 시작됨을 보여주는 말씀입니다.', terms: ['하나님', '사랑', '인애', '자비', '긍휼', '먼저'] },
      { id: 'love-christ', title: '그리스도의 사랑', description: '예수 그리스도 안에서 드러난 희생과 은혜의 사랑입니다.', terms: ['예수', '그리스도', '목숨', '십자가', '위하여', '은혜'] },
      { id: 'love-command', title: '사랑의 계명', description: '하나님과 이웃, 서로를 사랑하라는 말씀입니다.', terms: ['사랑하', '계명', '이웃', '서로', '형제'] },
      { id: 'love-fruit', title: '사랑의 성품과 열매', description: '사랑이 관계와 삶 속에서 나타나는 모습입니다.', terms: ['오래', '참고', '온유', '용서', '섬기', '행함', '열매'] },
    ],
  },
  {
    id: 'comfort',
    label: '위로',
    triggers: ['위로', '고난', '상한', '낙심', '힘들', '눈물', '아픔'],
    keywords: ['위로', '고난', '상한', '눈물', '환난', '도우', '붙들', '쉼'],
    related: ['하나님', '예수', '평안', '소망', '함께', '마음'],
    guide: '가까이하시는 하나님, 붙드심과 쉼, 고난 중의 소망 순서로 정리했습니다.',
    sections: [
      { id: 'comfort-near', title: '가까이하시는 하나님', description: '상한 마음과 눈물 가운데 가까이하시는 하나님입니다.', terms: ['상한', '마음', '가까이', '하나님', '눈물'] },
      { id: 'comfort-help', title: '붙드심과 도우심', description: '두려움과 약함 속에서 붙드시고 도우시는 말씀입니다.', terms: ['두려워', '도우', '붙들', '건지', '피난처'] },
      { id: 'comfort-rest', title: '예수님의 쉼과 평안', description: '예수님께 나아갈 때 누리는 쉼과 평안입니다.', terms: ['예수', '수고', '무거운', '쉼', '평안'] },
      { id: 'comfort-hope', title: '고난 중의 소망', description: '환난 속에서도 소망과 인내로 이어지는 말씀입니다.', terms: ['환난', '고난', '소망', '인내', '영광'] },
    ],
  },
  {
    id: 'peace',
    label: '평안',
    triggers: ['평안', '평강', '불안', '염려', '걱정', '두려움'],
    keywords: ['평안', '평강', '염려', '두려워', '근심', '안식'],
    related: ['기도', '감사', '믿음', '예수', '성령', '마음'],
    guide: '하나님을 신뢰함, 염려를 맡기는 기도, 예수님과 성령 안의 평안으로 정리했습니다.',
    sections: [
      { id: 'peace-trust', title: '신뢰에서 오는 평안', description: '하나님을 의지할 때 마음이 지켜지는 말씀입니다.', terms: ['평안', '평강', '의지', '신뢰', '마음'] },
      { id: 'peace-prayer', title: '염려를 맡기는 기도', description: '염려를 기도와 감사로 하나님께 맡기는 말씀입니다.', terms: ['염려', '기도', '간구', '감사', '맡기'] },
      { id: 'peace-christ', title: '예수님이 주시는 평안', description: '세상이 주는 것과 다른 예수님의 평안입니다.', terms: ['예수', '평안', '근심', '두려워', '세상'] },
      { id: 'peace-spirit', title: '성령 안의 평강', description: '성령 안에서 누리는 생명과 평강의 흐름입니다.', terms: ['성령', '생명', '평안', '평강', '열매'] },
    ],
  },
  {
    id: 'forgiveness',
    label: '용서와 회개',
    triggers: ['용서', '회개', '죄사함', '자백', '죄'],
    keywords: ['용서', '사하', '죄', '회개', '자백', '깨끗', '긍휼'],
    related: ['예수', '그리스도', '은혜', '화목', '피'],
    guide: '돌이키는 마음, 하나님의 긍휼, 그리스도 안의 사함, 서로 용서하는 삶으로 정리했습니다.',
    sections: [
      { id: 'forgive-return', title: '돌이키는 마음', description: '죄를 인정하고 하나님께 돌아가는 말씀입니다.', terms: ['죄', '회개', '자백', '돌이', '깨끗'] },
      { id: 'forgive-mercy', title: '하나님의 긍휼', description: '용서의 근거가 하나님의 자비에 있음을 보여줍니다.', terms: ['긍휼', '자비', '인자', '용서', '사하'] },
      { id: 'forgive-christ', title: '그리스도 안의 사함', description: '예수님의 은혜와 피로 받는 죄 사함입니다.', terms: ['예수', '그리스도', '피', '은혜', '속량', '사함'] },
      { id: 'forgive-life', title: '서로 용서하는 삶', description: '받은 용서가 관계 속의 용서로 이어지는 말씀입니다.', terms: ['서로', '용서', '사랑', '화목', '불쌍'] },
    ],
  },
  {
    id: 'wisdom',
    label: '지혜와 인도',
    triggers: ['지혜', '분별', '선택', '결정', '인도', '계획'],
    keywords: ['지혜', '명철', '분별', '길', '인도', '계획', '훈계'],
    related: ['하나님', '여호와', '구하', '의뢰', '말씀'],
    guide: '하나님 경외, 길을 맡기는 믿음, 말씀의 빛, 구하는 지혜 순서로 정리했습니다.',
    sections: [
      { id: 'wisdom-start', title: '지혜의 시작', description: '지혜가 하나님을 경외함에서 시작됨을 보여줍니다.', terms: ['지혜', '여호와', '경외', '명철', '지식'] },
      { id: 'wisdom-trust', title: '길을 맡기는 믿음', description: '내 판단보다 하나님께 길을 맡기는 말씀입니다.', terms: ['길', '의뢰', '인도', '계획', '맡기'] },
      { id: 'wisdom-word', title: '말씀의 빛', description: '말씀이 선택과 길을 밝히는 흐름입니다.', terms: ['말씀', '등', '빛', '훈계', '계명'] },
      { id: 'wisdom-ask', title: '구하는 지혜', description: '부족할 때 하나님께 지혜를 구하는 말씀입니다.', terms: ['구하', '기도', '후히', '지혜', '믿음'] },
    ],
  },
  {
    id: 'faith',
    label: '믿음과 소망',
    triggers: ['믿음', '신뢰', '의심', '확신', '소망', '기다림'],
    keywords: ['믿음', '믿는', '신뢰', '의지', '확신', '소망', '기다'],
    related: ['예수', '하나님', '구원', '말씀', '약속'],
    guide: '하나님의 약속, 예수 그리스도를 믿음, 시험 속의 인내와 소망으로 정리했습니다.',
    sections: [
      { id: 'faith-promise', title: '하나님의 약속', description: '믿음이 하나님의 말씀과 약속을 붙드는 데서 시작됩니다.', terms: ['약속', '말씀', '신실', '이루', '언약'] },
      { id: 'faith-christ', title: '그리스도를 믿는 믿음', description: '예수 그리스도 안에서 받는 구원과 생명입니다.', terms: ['예수', '그리스도', '믿음', '구원', '생명'] },
      { id: 'faith-endure', title: '시험 속의 인내', description: '보이지 않아도 믿음으로 견디는 말씀입니다.', terms: ['시험', '인내', '견디', '보이지', '믿음'] },
      { id: 'faith-hope', title: '소망으로 기다림', description: '하나님을 바라며 기다리는 소망의 말씀입니다.', terms: ['소망', '기다', '새 힘', '바라', '영원'] },
    ],
  },
  {
    id: 'prayer',
    label: '기도',
    triggers: ['기도', '간구', '응답', '구하', '중보'],
    keywords: ['기도', '간구', '구하', '찾으', '두드리', '감사'],
    related: ['하나님', '아버지', '예수', '성령', '뜻'],
    guide: '하나님께 나아감, 예수님의 이름, 성령의 도우심, 하나님의 뜻을 구하는 기도로 정리했습니다.',
    sections: [
      { id: 'prayer-near', title: '하나님께 나아가는 기도', description: '아버지께 마음을 열고 가까이 나아가는 말씀입니다.', terms: ['기도', '아버지', '가까이', '은밀', '구하'] },
      { id: 'prayer-jesus', title: '예수님의 이름으로', description: '예수 그리스도를 의지해 드리는 기도입니다.', terms: ['예수', '이름', '구하', '중보', '믿음'] },
      { id: 'prayer-spirit', title: '성령의 도우심', description: '연약함 가운데 성령께서 도우시는 기도입니다.', terms: ['성령', '도우', '연약', '탄식', '마음'] },
      { id: 'prayer-will', title: '하나님의 뜻을 구함', description: '내 뜻보다 하나님의 뜻을 구하는 말씀입니다.', terms: ['뜻', '순종', '응답', '감사', '맡기'] },
    ],
  },
  {
    id: 'humility',
    label: '겸손과 섬김',
    triggers: ['겸손', '섬김', '낮아', '종', '교만'],
    keywords: ['겸손', '낮추', '섬기', '종', '교만', '온유', '비우'],
    related: ['예수', '그리스도', '마음', '형제', '사랑'],
    guide: '하나님 앞의 낮아짐, 예수님의 섬김, 서로 섬기는 삶과 하나님이 높이심으로 정리했습니다.',
    sections: [
      { id: 'humility-before', title: '하나님 앞의 낮아짐', description: '겸손이 하나님 앞에서 시작됨을 보여줍니다.', terms: ['겸손', '낮추', '교만', '은혜', '하나님'] },
      { id: 'humility-christ', title: '예수님의 섬김', description: '예수님이 종의 모습으로 낮아지신 말씀입니다.', terms: ['예수', '그리스도', '종', '비우', '섬기'] },
      { id: 'humility-life', title: '서로 섬기는 마음', description: '겸손이 공동체 안에서 섬김으로 나타나는 말씀입니다.', terms: ['서로', '섬기', '온유', '사랑', '낮게'] },
      { id: 'humility-exalt', title: '하나님이 높이심', description: '스스로 낮추는 자를 하나님이 높이시는 말씀입니다.', terms: ['낮추', '높이', '하나님', '때'] },
    ],
  },
];

const FLOW_BOOK_WEIGHT: Record<string, number> = {
  창세기: 1, 출애굽기: 2, 신명기: 3, 시편: 4, 잠언: 5, 이사야: 6,
  마태복음: 7, 마가복음: 8, 누가복음: 9, 요한복음: 10, 사도행전: 11, 로마서: 12,
  고린도전서: 13, 고린도후서: 14, 갈라디아서: 15, 에베소서: 16, 빌립보서: 17,
  히브리서: 18, 야고보서: 19, 베드로전서: 20, 요한일서: 21,
};

const REMOTE_CACHE_PREFIX = 'sion_bible_intent_v2_';
const normalize = (value: string) => normalizeKoreanSearchText(value).toLowerCase();

function hashString(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash) + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function unique(values: string[], limit = Number.POSITIVE_INFINITY) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].slice(0, limit);
}

function splitQueryTerms(query: string) {
  return unique(query
    .replace(/[!?.,/\\()[\]{}:;"'“”‘’]/g, ' ')
    .split(/\s+/)
    .flatMap((term) => {
      const cleaned = term.trim();
      if (cleaned.length < 2) return [];
      const pieces = [cleaned];
      for (const suffix of ['으로', '에게', '에서', '부터', '하게', '하고', '적인', '적으로']) {
        if (cleaned.endsWith(suffix) && cleaned.length > suffix.length + 1) pieces.push(cleaned.slice(0, -suffix.length));
      }
      return pieces;
    })
    .filter((term) => term.length >= 2 && !STOP_WORDS.has(term)), 16);
}

function instructionFlags(query: string) {
  const normalized = normalize(query);
  return {
    wantsFlow: ['순차', '문맥', '흐름', '이해', '쉽게', '정리', '주제별'].some((word) => normalized.includes(normalize(word))),
    wantsChrist: ['예수', '그리스도', '복음', '십자가'].some((word) => normalized.includes(normalize(word))),
    wantsApply: ['적용', '실천', '삶', '오늘', '순종'].some((word) => normalized.includes(normalize(word))),
  };
}

function findProfiles(query: string, remoteTopics: string[]) {
  const normalized = normalize(`${query} ${remoteTopics.join(' ')}`);
  return TOPICS
    .map((profile) => ({
      profile,
      score: profile.triggers.filter((term) => normalized.includes(normalize(term))).length * 4
        + profile.keywords.filter((term) => normalized.includes(normalize(term))).length * 2
        + profile.related.filter((term) => normalized.includes(normalize(term))).length,
    }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 3)
    .map((item) => item.profile);
}

function readRemoteCache(query: string): RemoteAiExpansion | null {
  try {
    const raw = window.sessionStorage.getItem(`${REMOTE_CACHE_PREFIX}${hashString(query)}`);
    return raw ? JSON.parse(raw) as RemoteAiExpansion : null;
  } catch {
    return null;
  }
}

function writeRemoteCache(query: string, value: RemoteAiExpansion) {
  try {
    window.sessionStorage.setItem(`${REMOTE_CACHE_PREFIX}${hashString(query)}`, JSON.stringify(value));
  } catch {
    // 세션 저장이 실패해도 로컬 검색은 계속 동작합니다.
  }
}

async function getRemoteExpansion(query: string): Promise<RemoteAiExpansion | null> {
  const cached = readRemoteCache(query);
  if (cached) return cached;

  const publicEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  const endpoint = publicEnv?.VITE_AI_BIBLE_SEARCH_ENDPOINT || '/api/bible-search-intent';
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 8500);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    if (!response.ok) return null;
    const data = await response.json() as RemoteAiExpansion;
    if (!data || typeof data !== 'object') return null;
    writeRemoteCache(query, data);
    return data;
  } catch {
    return null;
  } finally {
    window.clearTimeout(timeout);
  }
}

function defaultSections(terms: string[], remoteSections: RemoteAiExpansion['sections']): SectionTemplate[] {
  const fromRemote = (remoteSections || [])
    .filter((section) => section.title)
    .slice(0, 5)
    .map((section, index) => ({
      id: section.id || `remote-${index}`,
      title: section.title,
      description: section.description || '질문의 의도를 기준으로 묶은 관련 말씀입니다.',
      terms: unique([...(section.terms || []), ...terms], 14),
    }));
  if (fromRemote.length > 0) return fromRemote;

  return [
    { id: 'core', title: '질문의 핵심 말씀', description: '질문에서 직접 드러난 핵심 표현과 가까운 말씀입니다.', terms },
    { id: 'gospel', title: '하나님과 복음의 관점', description: '하나님과 예수 그리스도의 은혜 안에서 이어 보는 말씀입니다.', terms: unique([...terms, '하나님', '예수', '그리스도', '복음', '은혜', '믿음'], 14) },
    { id: 'response', title: '마음의 응답과 삶', description: '기도와 순종, 실제 삶의 반응으로 이어지는 말씀입니다.', terms: unique([...terms, '마음', '기도', '순종', '사랑', '행함'], 14) },
  ];
}

function scoreVerse(verse: BibleVerseRecord, terms: string[]) {
  const searchable = verse.searchText || normalize(verse.text);
  let score = 0;
  for (const term of terms) {
    const normalized = normalize(term);
    if (normalized.length < 2) continue;
    if (searchable.includes(normalized)) score += normalized.length >= 4 ? 16 : normalized.length >= 3 ? 13 : 9;
  }
  return score;
}

function flowWeight(verse: BibleVerseRecord) {
  return FLOW_BOOK_WEIGHT[verse.bookName] || verse.bookOrder + 30;
}

function sortScored(
  left: { verse: BibleVerseRecord; score: number },
  right: { verse: BibleVerseRecord; score: number },
  flow: boolean,
) {
  if (Math.abs(right.score - left.score) > 22 || !flow) {
    if (right.score !== left.score) return right.score - left.score;
  }
  if (flow) {
    const flowDifference = flowWeight(left.verse) - flowWeight(right.verse);
    if (flowDifference !== 0) return flowDifference;
  }
  if (right.score !== left.score) return right.score - left.score;
  if (left.verse.bookOrder !== right.verse.bookOrder) return left.verse.bookOrder - right.verse.bookOrder;
  if (left.verse.chapter !== right.verse.chapter) return left.verse.chapter - right.verse.chapter;
  return left.verse.verse - right.verse.verse;
}

function uniqueVerses(verses: BibleVerseRecord[]) {
  const seen = new Set<string>();
  return verses.filter((verse) => {
    if (seen.has(verse.id)) return false;
    seen.add(verse.id);
    return true;
  });
}

export async function aiSearchBibleVerses(
  query: string,
  options: { limit?: number; offset?: number } = {},
): Promise<{ items: BibleVerseRecord[]; totalCount: number; hasMore: boolean; meta: AiBibleSearchMeta }> {
  const trimmed = query.trim();
  const limit = options.limit || 50;
  const offset = options.offset || 0;
  const emptyMeta: AiBibleSearchMeta = { summary: '', guide: '', terms: [], topics: [], sections: [] };
  if (!trimmed) return { items: [], totalCount: 0, hasMore: false, meta: emptyMeta };

  if (parseMultiReferenceQuery(trimmed)) {
    const direct = await searchBibleVerses(trimmed, { limit: 500, offset: 0 });
    if (direct.totalCount > 0) {
      return {
        items: direct.items.slice(offset, offset + limit),
        totalCount: direct.totalCount,
        hasMore: offset + limit < direct.totalCount,
        meta: {
          summary: '입력한 성경 위치를 정확히 찾았습니다.',
          guide: '요청한 순서대로 본문을 표시합니다.',
          terms: [],
          topics: [],
          sections: [],
        },
      };
    }
  }

  const indexPromise = loadBibleVerseIndex();
  const remotePromise = getRemoteExpansion(trimmed);
  const [index, remote] = await Promise.all([indexPromise, remotePromise]);
  const userTerms = splitQueryTerms(trimmed);
  const remoteTerms = unique(remote?.terms || [], 16);
  const remoteTopics = unique(remote?.topics || [], 5);
  const profiles = findProfiles(trimmed, remoteTopics);
  const flags = instructionFlags(trimmed);

  const activeTerms = unique([
    ...userTerms,
    ...remoteTerms,
    ...profiles.flatMap((profile) => profile.keywords),
    ...profiles.flatMap((profile) => profile.related),
  ], 36);
  const sectionTemplates = profiles.length > 0
    ? profiles.flatMap((profile) => profile.sections).slice(0, 7)
    : defaultSections(activeTerms.length > 0 ? activeTerms : userTerms, remote?.sections);
  const globalTerms = unique([...activeTerms, ...sectionTemplates.flatMap((section) => section.terms)], 64);
  const exact = normalize(trimmed);

  const globalScored = index.map((verse) => {
    let score = scoreVerse(verse, globalTerms);
    const searchable = verse.searchText || normalize(verse.text);
    if (exact && searchable.includes(exact)) score += 90;
    if (flags.wantsChrist && ['마태복음', '마가복음', '누가복음', '요한복음', '로마서', '갈라디아서', '에베소서', '요한일서'].includes(verse.bookName)) score += 7;
    if (flags.wantsApply && ['잠언', '마태복음', '누가복음', '로마서', '야고보서', '요한일서'].includes(verse.bookName)) score += 5;
    return { verse, score };
  }).filter((item) => item.score >= (profiles.length > 0 ? 18 : 13));

  const globalScoreMap = new Map(globalScored.map((item) => [item.verse.id, item.score]));
  const usedVerseIds = new Set<string>();
  const sectionResults = sectionTemplates.map((section) => {
    const sectionTerms = unique([...section.terms, ...userTerms], 24);
    const candidates = index
      .map((verse) => ({
        verse,
        score: scoreVerse(verse, sectionTerms) * 1.65 + (globalScoreMap.get(verse.id) || 0) * 0.45,
      }))
      .filter((item) => item.score >= (profiles.length > 0 ? 18 : 12))
      .sort((left, right) => sortScored(left, right, flags.wantsFlow || profiles.length > 0));

    const verses: BibleVerseRecord[] = [];
    const takeCount = sectionTemplates.length >= 5 ? 7 : 10;
    for (const candidate of candidates) {
      if (usedVerseIds.has(candidate.verse.id)) continue;
      usedVerseIds.add(candidate.verse.id);
      verses.push(candidate.verse);
      if (verses.length >= takeCount) break;
    }
    return { ...section, verses };
  }).filter((section) => section.verses.length > 0);

  const fallbackItems = globalScored
    .sort((left, right) => sortScored(left, right, flags.wantsFlow || profiles.length > 0))
    .map((item) => item.verse)
    .filter((verse) => !usedVerseIds.has(verse.id));
  const maxResults = profiles.length > 0 ? 140 : 100;
  const finalItems = uniqueVerses([...sectionResults.flatMap((section) => section.verses), ...fallbackItems]).slice(0, maxResults);
  const topics = unique([...profiles.map((profile) => profile.label), ...remoteTopics], 5);

  const meta: AiBibleSearchMeta = {
    summary: topics.length > 0
      ? `질문을 ${topics.join(', ')} 주제로 이해했습니다.`
      : '질문의 핵심 표현과 의도를 기준으로 관련 말씀을 찾았습니다.',
    guide: profiles[0]?.guide || '핵심 말씀에서 시작해 하나님과 복음의 관점, 마음의 응답과 삶의 순서로 정리했습니다.',
    terms: activeTerms.slice(0, 14),
    topics,
    sections: sectionResults.map((section) => ({
      id: section.id,
      title: section.title,
      description: section.description,
      verseIds: section.verses.map((verse) => verse.id),
    })),
    usedRemoteExpansion: Boolean(remote && !remote.fallback),
  };

  return {
    items: finalItems.slice(offset, offset + limit),
    totalCount: finalItems.length,
    hasMore: offset + limit < finalItems.length,
    meta,
  };
}
