import type { ReadingDayTask, ReadingPlanTemplate, ReadingReference } from '../../types/readingPlan';

export const BOOK_NAME_BY_ID: Record<string, string> = {
  gen: '창세기',
  exo: '출애굽기',
  lev: '레위기',
  num: '민수기',
  deu: '신명기',
  jos: '여호수아',
  jdg: '사사기',
  rut: '룻기',
  '1sa': '사무엘상',
  '2sa': '사무엘하',
  '1ki': '열왕기상',
  '2ki': '열왕기하',
  '1ch': '역대상',
  '2ch': '역대하',
  ezr: '에스라',
  neh: '느헤미야',
  est: '에스더',
  job: '욥기',
  psa: '시편',
  pro: '잠언',
  ecc: '전도서',
  sng: '아가',
  isa: '이사야',
  jer: '예레미야',
  lam: '예레미야애가',
  ezk: '에스겔',
  dan: '다니엘',
  hos: '호세아',
  jol: '요엘',
  amo: '아모스',
  oba: '오바댜',
  jon: '요나',
  mic: '미가',
  nam: '나훔',
  hab: '하박국',
  zep: '스바냐',
  hag: '학개',
  zec: '스가랴',
  mal: '말라기',
  mat: '마태복음',
  mrk: '마가복음',
  luk: '누가복음',
  jhn: '요한복음',
  act: '사도행전',
  rom: '로마서',
  '1co': '고린도전서',
  '2co': '고린도후서',
  gal: '갈라디아서',
  eph: '에베소서',
  php: '빌립보서',
  col: '골로새서',
  '1th': '데살로니가전서',
  '2th': '데살로니가후서',
  '1ti': '디모데전서',
  '2ti': '디모데후서',
  tit: '디도서',
  phm: '빌레몬서',
  heb: '히브리서',
  jas: '야고보서',
  '1pe': '베드로전서',
  '2pe': '베드로후서',
  '1jn': '요한일서',
  '2jn': '요한이서',
  '3jn': '요한삼서',
  jud: '유다서',
  rev: '요한계시록',
};

const PLAN_LABEL_BY_ID: Record<string, { title: string; description: string }> = {
  full365: {
    title: '성경 365',
    description: '구약과 신약 전체를 매일 부담 없는 분량으로 읽습니다.',
  },
  fast180: {
    title: '성경 180',
    description: '하루 분량을 조금 늘려 성경 전체 흐름을 빠르게 잡습니다.',
  },
  nt100: {
    title: '신약 100일',
    description: '마태복음부터 요한계시록까지 신약의 흐름을 차분히 읽습니다.',
  },
  gospels30: {
    title: '사복음서 30일',
    description: '예수님의 말씀과 사역을 한 달 동안 가까이 따라갑니다.',
  },
};

export function formatReadingRoomReference(ref: ReadingReference) {
  const bookName = BOOK_NAME_BY_ID[ref.bookId] ?? ref.bookName ?? '성경';
  if (!ref.endChapter || ref.endChapter === ref.startChapter) {
    return `${bookName} ${ref.startChapter}장`;
  }
  return `${bookName} ${ref.startChapter}-${ref.endChapter}장`;
}

export function formatReadingRoomTask(task: ReadingDayTask | null | undefined) {
  if (!task) return '창세기 1-3장';
  return task.references.map(formatReadingRoomReference).join(', ');
}

export function getReadingRoomPlanLabel(template: ReadingPlanTemplate | null | undefined) {
  if (!template) {
    return {
      title: '아침 10분 코스',
      description: '매일 짧은 분량으로 말씀 읽기 리듬을 만듭니다.',
    };
  }

  if (PLAN_LABEL_BY_ID[template.id]) return PLAN_LABEL_BY_ID[template.id];

  if (template.editable) {
    return {
      title: template.title && !containsBrokenText(template.title) ? template.title : '나의 통독 코스',
      description: '직접 만든 코스를 내 속도에 맞춰 이어갑니다.',
    };
  }

  if (template.days >= 300) return PLAN_LABEL_BY_ID.full365;
  if (template.days >= 150) return PLAN_LABEL_BY_ID.fast180;
  if (template.tone === 'new-testament') return PLAN_LABEL_BY_ID.nt100;
  if (template.tone === 'gospels') return PLAN_LABEL_BY_ID.gospels30;

  return {
    title: `${template.days}일 통독`,
    description: '오늘의 분량을 꾸준히 읽어 말씀의 흐름을 따라갑니다.',
  };
}

function containsBrokenText(value: string) {
  return /[�?\uFFFD]|[吏뚮쓽꾩젙꽌]/.test(value);
}
