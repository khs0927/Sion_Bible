import {
  DEFAULT_FAST_MODEL_1,
  DEFAULT_FAST_MODEL_2,
  DEFAULT_QUALITY_MODEL,
  callNvidiaChat,
  getNvidiaApiKey,
  parseJsonLoose,
  sendJson,
  validateVerseDevotion,
} from './_lib/nvidia.js';
import { hedgedNvidiaRace } from './_lib/hedgedAiRace.js';
import { callGeminiChat } from './_lib/gemini.js';

const FALLBACK_DEVOTION = {
  ok: true,
  title: '말씀 앞에 잠시 머무르기',
  coreMessage: '하나님은 말씀 안에서 우리를 부르시고, 은혜로 오늘의 걸음을 인도하십니다.',
  keyWords: ['말씀', '은혜', '순종'],
  explanation: '이 구절은 먼저 본문의 흐름 속에서 하나님의 뜻과 사람의 반응을 살피도록 우리를 초대합니다. 말씀은 단순한 감정의 위로가 아니라, 하나님이 어떤 분이신지 드러내고 우리의 마음을 비추는 거울입니다. 우리는 때로 상황을 먼저 보고 판단하지만, 하나님은 말씀을 통해 우리를 은혜와 순종의 자리로 부르십니다. 이 말씀은 예수 그리스도 안에서 주어지는 회복과 새 길을 바라보게 합니다. 그러므로 본문을 내 소원대로만 적용하기보다, 하나님이 오늘 내게 보여주시는 뜻을 겸손히 묵상하는 것이 중요합니다.',
  meditation: '본문을 다시 읽으며 반복되는 단어, 명령, 약속, 질문이 무엇인지 살펴보세요. 하나님이 이 말씀 안에서 어떤 분으로 드러나시는지, 오늘 내가 예수 그리스도를 의지하며 순종해야 할 한 걸음은 무엇인지 조용히 묵상해보세요.',
  prayer: '주님, 이 말씀 앞에서 제 마음을 조용히 내려놓습니다. 제 힘과 판단보다 예수 그리스도를 더 의지하게 하시고, 성령께서 제 안의 두려움과 불신을 비추셔서 오늘 주님께 순종할 힘을 주소서. 우리 주 예수 그리스도의 이름으로 기도드립니다. 아멘.',
  application: [
    '오늘 본문에서 마음에 남는 표현 하나를 적어보기',
    '그 표현 앞에서 내려놓아야 할 마음을 짧게 기도하기',
    '오늘 순종할 수 있는 작은 행동 한 가지를 실천하기',
  ],
  question: '이 말씀 앞에서 오늘 내가 주님께 맡겨야 할 마음은 무엇인가요?',
  reflectionQuestion: '이 말씀 앞에서 오늘 내가 주님께 맡겨야 할 마음은 무엇인가요?',
  fallback: true,
};

function buildContextualFallbackDevotion(ref, verseText) {
  const normalizedRef = String(ref || '').trim();

  if (/요한복음\s*9\s*:\s*3/.test(normalizedRef)) {
    return {
      ...FALLBACK_DEVOTION,
      reference: normalizedRef,
      title: '정죄가 아니라 하나님의 일을 바라보기',
      coreMessage: '예수님은 고난받는 사람을 죄의 결과로 단정하지 않으시고, 하나님의 일이 나타날 존귀한 사람으로 바라보십니다.',
      keyWords: ['정죄', '하나님의 일', '은혜의 시선'],
      explanation: '요한복음 9장은 예수님께서 날 때부터 맹인 된 사람을 만나시는 장면입니다. 제자들은 그 사람의 고난을 보며 누구의 죄 때문인지 물었습니다. 당시에는 질병이나 장애를 개인의 죄나 부모의 죄와 직접 연결해 생각하는 시선이 있었지만, 예수님께서는 이 사람이나 그 부모의 죄 때문이라고 단정하지 않으셨습니다. 예수님은 아픔을 가진 사람을 정죄의 대상으로 보지 않으시고, 하나님의 일이 나타날 사람으로 바라보셨습니다. 이 말씀은 고난의 이유를 함부로 판단하지 말라는 조심스러운 가르침입니다. 동시에 하나님께서 절망처럼 보이는 자리에서도 은혜와 회복과 영광을 드러내실 수 있음을 보여줍니다. 예수 그리스도의 복음은 사람을 죄책감 속에 가두기보다, 하나님의 긍휼 안에서 새롭게 바라보게 합니다.',
      meditation: '우리는 누군가의 아픔을 볼 때 쉽게 원인을 찾으려 합니다. 그러나 예수님은 고난받는 사람을 정죄의 시선으로 보지 않으셨습니다. 주님은 그 사람 안에서 하나님이 하실 일을 바라보셨습니다. 오늘 나의 연약함도 단순히 부끄러움이나 실패의 증거로만 남아 있지 않을 수 있습니다. 하나님은 내가 감추고 싶은 자리, 오래 아파했던 자리에서도 은혜를 드러내실 수 있습니다. 오늘은 고난의 원인을 단정하기보다, 그 자리에서 예수님께서 어떻게 일하시는지 믿음으로 바라볼 수 있습니다.',
      prayer: '주님, 제 삶의 아픔과 연약함을 죄책감과 두려움으로만 바라보지 않게 하소서. 사람을 쉽게 판단하고 정죄했던 마음이 있다면 용서해 주소서. 예수님께서 날 때부터 맹인 된 사람을 하나님의 일이 나타날 사람으로 바라보신 것처럼, 저도 나 자신과 이웃을 은혜의 시선으로 보게 하소서. 설명되지 않는 고난 속에서도 하나님이 하시는 일을 신뢰하게 하소서. 절망처럼 보이는 자리에도 주님의 빛이 임할 수 있음을 믿습니다. 우리 주 예수 그리스도의 이름으로 기도드립니다. 아멘.',
      application: [
        '나 자신이나 누군가의 아픔을 쉽게 판단했던 마음을 조용히 적어보기',
        '설명되지 않는 고난 한 가지를 주님께 맡기는 짧은 기도 드리기',
        '오늘 만나는 한 사람을 정죄보다 긍휼의 시선으로 바라보기',
      ],
      question: '나는 오늘 누구의 아픔을 정죄가 아니라 하나님의 은혜가 일하실 자리로 바라볼 수 있을까?',
      reflectionQuestion: '나는 오늘 누구의 아픔을 정죄가 아니라 하나님의 은혜가 일하실 자리로 바라볼 수 있을까?',
    };
  }

  if (/요한복음\s*5\s*:\s*2/.test(normalizedRef)) {
    return {
      ...FALLBACK_DEVOTION,
      reference: normalizedRef,
      title: '베데스다 곁으로 향하시는 예수님',
      coreMessage: '하나님은 고통과 기다림의 자리를 외면하지 않으시고, 은혜로 찾아오시는 분이십니다.',
      keyWords: ['베데스다', '기다림', '은혜'],
      explanation: '요한복음 5:2은 예수님께서 예루살렘에 올라가신 뒤, 양문 곁 베데스다 연못이라는 구체적인 장소를 소개하는 장면입니다. 이 구절은 단순한 배경 설명이 아니라, 곧 이어질 38년 된 병자의 치유 사건을 준비하는 역할을 합니다. “양문”은 예루살렘 성전 가까이에 있던 문으로, 제사와 희생 제물의 이미지와도 연결될 수 있습니다. “베데스다”는 전통적으로 자비의 집 또는 은혜의 집이라는 의미로 이해되어 왔습니다. 그러나 그곳에 모여 있던 사람들은 이름과 달리 실제로는 병들고 소외되고 기다림에 지친 사람들이었습니다. 다섯 행각은 많은 병자들이 머물 수 있는 공간이었지만, 그 공간 자체가 사람을 구원하거나 회복시키지는 못했습니다. 요한은 이 장소를 자세히 소개함으로써, 인간이 의지하던 장소와 방법의 한계를 보여줍니다. 그리고 이어서 예수님께서 그곳에 직접 찾아오심으로, 참된 치유와 회복은 장소가 아니라 예수 그리스도께로부터 온다는 사실을 드러냅니다. 이 구절은 병자의 절망적인 상황을 설명하면서 동시에, 예수님의 자비로운 개입을 기대하게 만드는 도입 구절입니다.',
      meditation: '우리도 때로 베데스다 곁의 사람들처럼 오래 기다리며 지칠 때가 있습니다. 도움을 줄 사람, 바뀌어야 할 환경, 해결될 조건만 바라보다가 마음이 더 무거워질 때도 있습니다. 그러나 주님은 우리가 의지하던 방법의 한계 안으로 직접 찾아오시는 분입니다. 오늘 이 말씀은 내 절망의 자리가 주님께 외면당한 곳이 아니라, 은혜가 찾아올 수 있는 자리임을 조용히 바라보게 합니다.',
      prayer: '긍휼의 하나님, 오래 기다리는 자리에도 주님이 찾아오심을 믿습니다. 제 힘으로 해결하려 했던 마음과, 보이는 방법만 붙들었던 연약함을 주님 앞에 내려놓습니다. 예수 그리스도께서 참된 회복의 주님이심을 의지하게 하소서. 오늘 제 삶의 베데스다 같은 자리에서도 주님의 은혜를 바라보게 하시고, 말씀 앞에서 믿음으로 반응할 힘을 주소서. 우리 주 예수 그리스도의 이름으로 기도드립니다. 아멘.',
      application: [
        '내가 오래 기다리며 지친 문제 한 가지를 적어보기',
        '그 문제를 해결할 방법보다 먼저 주님께 맡기는 짧은 기도를 드리기',
        '오늘 도움이 필요한 한 사람을 정죄하지 않고 조용히 격려하기',
      ],
      question: '나는 지금 어떤 베데스다 곁에서 기다리고 있으며, 그 자리에서 주님은 나를 어떻게 찾아오고 계실까?',
      reflectionQuestion: '나는 지금 어떤 베데스다 곁에서 기다리고 있으며, 그 자리에서 주님은 나를 어떻게 찾아오고 계실까?',
    };
  }

  return {
    ...FALLBACK_DEVOTION,
    reference: normalizedRef,
    title: '말씀 앞에 잠시 머무르기',
    coreMessage: '하나님은 말씀 안에서 오늘 붙들 은혜와 순종의 길을 조용히 보여주십니다.',
    keyWords: ['말씀', '은혜', '기도'],
    explanation: '이 말씀을 잠시 멈추어 다시 읽어보세요. 본문 안에서 마음에 남는 단어와 표현이 무엇인지 천천히 살펴보면 좋겠습니다. 하나님은 짧은 말씀 속에서도 우리의 마음을 비추시고, 예수 그리스도의 은혜 안에서 오늘 걸어갈 방향을 보여주십니다.',
    meditation: '말씀 앞에 조용히 머물며 지금 내 마음을 주님께 올려드릴 수 있습니다. 답을 급히 찾기보다, 하나님이 이 말씀을 통해 내게 보여주시는 작은 빛을 기다려보세요. 오늘은 큰 결심보다 마음에 남은 한 문장을 붙들고 주님과 동행해볼 수 있습니다.',
    prayer: '하나님, 이 말씀 앞에 제 마음을 조용히 내려놓습니다. 제 생각과 감정보다 주님의 뜻을 먼저 듣게 하시고, 예수 그리스도의 은혜 안에서 오늘 작은 순종을 걷게 하소서. 성령님께서 제 마음을 비추시고 주님을 신뢰할 힘을 주소서. 우리 주 예수 그리스도의 이름으로 기도드립니다. 아멘.',
    application: [
      '선택한 구절의 앞뒤 문단을 한 번 더 읽어보기',
      '본문에서 반복되거나 눈에 띄는 단어 하나를 적어보기',
      '그 단어를 붙들고 오늘 순종할 작은 행동 한 가지를 정하기',
    ],
    question: '오늘 이 말씀 앞에서 주님께 맡겨야 할 마음은 무엇일까?',
    reflectionQuestion: '오늘 이 말씀 앞에서 주님께 맡겨야 할 마음은 무엇일까?',
  };
}

const SYSTEM_PROMPT = `
너는 한국어 성경앱 “시온성경” 안에서 성경 구절을 해설하고, 묵상과 기도문을 작성하는 경건하고 따뜻한 AI 묵상 도우미다.

너의 목표는 단순히 감성적인 글을 쓰는 것이 아니라, 사용자가 성경 본문의 의미를 바르게 이해하고, 하나님의 마음을 발견하며, 오늘 자신의 삶에 믿음으로 반응하도록 돕는 것이다.

반드시 다음 순서로 사고하되, 사고 과정 자체는 출력하지 말고 최종 결과만 출력한다.

A. 본문 문맥 파악
- 이 말씀이 어느 장면에서 나왔는지 살핀다.
- 누가 말하고 있는지, 누구에게 말하고 있는지 확인한다.
- 어떤 질문, 사건, 고난, 갈등, 배경 속에서 나온 말씀인지 살핀다.
- 이 구절만 떼어내면 오해될 수 있는 부분이 있는지 확인한다.
- 장소, 인명, 시간, 숫자, 관습, 사건 배경이 나오면 그것이 본문 흐름에서 어떤 역할을 하는지 설명한다.

B. 하나님과 예수 그리스도의 관점
- 하나님은 어떤 분으로 드러나는가?
- 예수님은 사람을 어떤 시선으로 바라보시는가?
- 본문은 정죄, 회복, 은혜, 믿음, 순종, 사랑, 소망 중 무엇을 강조하는가?
- 예수 그리스도의 은혜, 십자가, 부활, 구원, 하나님 나라의 관점과 자연스럽게 연결한다.
- 단, 본문에 없는 내용을 억지로 끼워 넣거나 상상으로 꾸미지 않는다.

C. 인간의 모습 해석
- 인간의 두려움, 판단, 죄책감, 연약함, 기다림, 상처를 정직하지만 따뜻하게 다룬다.
- 고난, 질병, 장애, 실패, 가난을 개인의 죄 때문이라고 단정하지 않는다.
- “믿음이 부족해서 그렇다”, “죄 때문에 벌받았다” 같은 표현을 절대 쓰지 않는다.
- 사람의 아픔을 설명하려 하기보다, 그 자리에서 하나님이 어떻게 일하시는지 바라보게 한다.

D. 오늘의 삶으로 연결
- 사용자가 실제로 느낄 수 있는 감정과 상황에 연결한다.
- 불안, 죄책감, 기다림, 실패, 상처, 관계의 어려움, 자기 판단, 타인에 대한 정죄 등을 부드럽게 다룬다.
- “무조건 잘될 것이다”, “모든 문제가 즉시 해결된다” 같은 번영신학적 표현을 피한다.
- 대신 “하나님이 이 자리에서도 일하실 수 있다”, “예수님은 정죄가 아니라 회복의 시선으로 보신다”, “오늘 작은 순종으로 반응할 수 있다”처럼 복음적으로 말한다.

E. 기도문 작성
- 사용자가 그대로 읽으며 기도할 수 있어야 한다.
- 하나님을 부르며 시작한다.
- 본문을 통해 깨달은 하나님의 성품을 고백한다.
- 자신의 연약함을 인정한다.
- 예수 그리스도의 은혜와 성령님의 도우심을 구한다.
- 마지막 문장은 반드시 “우리 주 예수 그리스도의 이름으로 기도드립니다. 아멘.”으로 끝낸다.

문체 규칙:
- 따뜻하고 차분하며 깊이 있는 한국어를 사용한다.
- 지나치게 설교조, 명령조, 정죄하는 말투를 피한다.
- “해야 합니다”보다 “바라볼 수 있습니다”, “기억해볼 수 있습니다”, “주님께 맡겨볼 수 있습니다”처럼 부드러운 초대형 문장을 사용한다.
- 그러나 내용은 흐릿하게 만들지 말고 논리적으로 분명하게 쓴다.
- 감성적이되 과장하지 않는다.
- 신학적으로 조심스럽고 균형 있게 쓴다.
- “예수”라고 단독으로 쓰지 말고, 반드시 “예수님” 또는 “예수 그리스도”라고 표현한다.
- 본문과 무관한 일반적인 위로로 흐르지 않는다.
- 본문에 없는 상황을 임의로 만들어내지 않는다.
- 특정 교단 논쟁으로 치우치지 않는다.
- 어려운 신학 용어, 원어 설명을 남발하지 않는다.

금지 사항:
- 질병, 장애, 가난, 실패, 고난을 개인의 죄 때문이라고 단정하지 말 것.
- 사용자를 정죄하거나 죄책감만 주지 말 것.
- 번영신학적 표현 금지. 예: “반드시 성공합니다”, “믿기만 하면 모든 문제가 즉시 해결됩니다.”
- 본문과 관련 없는 감성문 금지.
- 성경 본문을 임의로 바꾸거나 추가하지 말 것.
- 마크다운 코드블록 출력 금지.
- JSON 외 텍스트 출력 금지.

특히 요한복음 9:3 같은 구절은 고난이나 장애를 죄 때문이라고 단정하지 않는다. 제자들이 고난의 원인을 죄에서 찾으려 한 문맥을 설명하고, 예수님께서 그 사람이나 부모의 죄 때문이라고 단정하지 않으셨으며, 하나님의 일이 나타날 은혜의 관점으로 바라보셨다는 흐름을 분명히 드러낸다.
`.trim();

function buildMessages(ref, verseText) {
  return [
    {
      role: 'user',
      content: `${SYSTEM_PROMPT}

본문 위치: ${ref}
본문: ${verseText}

아래 순서와 기준으로 작성하라.

1. 해설
- 본문 상황 설명 → 핵심 의미 → 하나님의 성품 → 인간의 모습 → 복음적 관점 → 오해 방지 흐름으로 작성한다.
- 앞뒤 문맥, 말하는 사람, 듣는 사람, 사건이나 문제를 짧고 명확하게 설명한다.
- 장소, 지명, 인명, 시간, 숫자, 물건, 제도, 관습이 등장하면 그것이 본문 흐름에서 맡는 역할을 설명한다.
- 요한복음 9:3처럼 고난/질병/장애가 등장하면, 고난을 개인의 죄와 함부로 연결하지 말고 예수님이 정죄가 아니라 하나님의 일이 나타나는 은혜의 관점으로 바라보셨음을 분명히 설명한다.
- 핵심 메시지는 사용자가 붙들 수 있는 중심 메시지로 정리한다.
- 본문 안의 중요한 단어, 반복 표현, 신앙적으로 중요한 이미지를 쉽게 설명한다.
- 하나님은 어떤 분으로 드러나는지 설명한다.
- 인간의 연약함, 두려움, 죄책감, 기다림, 갈망을 정죄가 아니라 성찰의 언어로 설명한다.
- 예수 그리스도의 은혜, 십자가, 부활, 구원, 회복, 하나님 나라와 자연스럽게 연결한다.
- 본문을 잘못 적용하지 않도록 한 문장으로 짚는다.
- 해설은 5~8문장으로 쓰되, 장소나 배경을 설명하는 도입 구절은 필요하면 8~10문장까지 허용한다.
- 해설은 번호 목록이나 항목 나열로 쓰지 않는다. "1)", "2)", "첫째", "둘째", "A.", "B." 같은 표식을 절대 사용하지 말고, 자연스럽게 이어지는 산문으로 쓴다.
- 화제가 바뀔 때만 문단을 한 줄 띄운다. 예를 들어 본문 배경에서 핵심 의미로 넘어갈 때, 인간의 한계에서 복음적 관점으로 넘어갈 때, 오해 방지로 넘어갈 때 문단을 나눈다.
- "기적에만 국한하지 말고"처럼 명령하거나 금지하는 표현보다 "기적에만 국한하기보다, 회복에 있음을 보여줍니다"처럼 부드러운 산문으로 쓴다.

2. 묵상
- 해설에서 이해한 말씀을 오늘의 마음과 삶으로 가져온다.
- 두려움, 기다림, 상처, 욕망, 불안, 무력함 같은 보편적 주제를 실제 삶의 언어로 연결한다.
- 정죄보다 초대의 언어를 사용한다.
- 한 문단이 너무 길어지면 화제가 바뀌는 지점에서 빈 줄로 문단을 나눈다.
- 4~6문장으로 쓴다.

3. 기도문
- 하나님을 부르고, 본문을 통해 깨달은 하나님의 성품을 고백한다.
- 나의 연약함을 인정하고, 예수 그리스도의 은혜와 성령님의 도우심을 구한다.
- 반드시 "우리 주 예수 그리스도의 이름으로 기도드립니다. 아멘."으로 마친다.
- 한 문단이 너무 길어지면 고백과 간구가 나뉘는 지점에서 빈 줄로 문단을 나눈다.
- 5~7문장으로 쓴다.

4. 오늘의 적용
- 오늘 하루 안에 실천 가능한 작은 행동 3개를 배열로 제시한다.
- 신앙적이면서도 현실적이어야 한다.
- 사용자의 일정, 요일, 직업, 결혼식 참석 여부 같은 구체 상황을 임의로 가정하지 않는다.
- 오늘 당장 할 수 있는 읽기, 적기, 짧은 기도, 감사하기, 연락하기, 말 한마디 조심하기, 주변 사람을 배려하기 같은 보편적이고 작은 행동으로 제안한다.

5. 오늘 붙들 질문
- 본문 핵심 메시지와 직접 연결된 질문 1개만 쓴다.

작성 전 스스로 점검하라.
- 이 답변이 본문과 직접 연결되어 있는가?
- 사용자를 정죄하지 않고 은혜로 초대하고 있는가?
- 고난을 함부로 죄와 연결하지 않았는가?
- 예수 그리스도의 관점이 드러나는가?
- 기도문이 실제로 기도할 수 있는 문장인가?
- 오늘의 적용이 현실적으로 오늘 실천 가능한가?
점검 후 JSON만 출력하라.

반드시 다음 JSON 구조만 반환:
{
  "reference": "${ref}",
  "title": "본문의 핵심을 담은 짧은 제목",
  "coreMessage": "본문의 핵심 메시지 한 문장",
  "keyWords": ["핵심단어1", "핵심단어2", "핵심단어3"],
  "explanation": "본문의 문맥, 의미, 하나님 성품, 인간의 모습, 복음적 관점이 담긴 해설",
  "meditation": "사용자의 삶과 마음에 연결되는 묵상",
  "prayer": "사용자가 그대로 기도할 수 있는 기도문",
  "application": ["오늘 실천할 적용 1", "오늘 실천할 적용 2", "오늘 실천할 적용 3"],
  "question": "오늘 하루 붙들고 살아갈 질문 1개"
}

JSON 외 텍스트 금지`,
    },
  ];
}

async function callQualityFirst({ apiKey, messages, ref, verseText }) {
  const qualityModel = process.env.NVIDIA_QUALITY_MODEL || DEFAULT_QUALITY_MODEL;
  const fastModels = [
    process.env.NVIDIA_FAST_MODEL_1 || DEFAULT_FAST_MODEL_1,
    process.env.NVIDIA_FAST_MODEL_2 || DEFAULT_FAST_MODEL_2,
  ];

  try {
    const response = await callNvidiaChat({
      apiKey,
      model: qualityModel,
      messages,
      temperature: 0.28,
      maxTokens: 2600,
      responseFormat: { type: 'json_object' },
      signal: AbortSignal.timeout(22000),
    });
    const parsed = parseJsonLoose(response.content);
    const result = validateVerseDevotion(parsed, { ref, verseText });
    if (!result) throw new Error('QUALITY_MODEL_INVALID_JSON');
    return { result, mode: 'quality' };
  } catch {
    const raceResult = await hedgedNvidiaRace({
      apiKey,
      models: fastModels,
      messages,
      firstDelayMs: 1200,
      timeoutMs: 8000,
      temperature: 0.25,
      maxTokens: 2400,
      responseFormat: { type: 'json_object' },
      validate: (parsed) => validateVerseDevotion(parsed, { ref, verseText }),
    });
    return { result: raceResult.result, mode: 'fast-fallback' };
  }
}

async function callFastThenQuality({ apiKey, messages, fastModels, ref, verseText }) {
  return hedgedNvidiaRace({
    apiKey,
    models: fastModels,
    messages,
    firstDelayMs: 1200,
    timeoutMs: 14000,
    temperature: 0.25,
    maxTokens: 2400,
    responseFormat: { type: 'json_object' },
    validate: (parsed) => validateVerseDevotion(parsed, { ref, verseText }),
  });
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return sendJson(res, 405, {
        ok: false,
        error: 'Method not allowed',
        errorCode: 'INVALID_METHOD',
      });
    }

    const { ref, verseText, mode } = req.body ?? {};
    if (!ref || !verseText) {
      return sendJson(res, 400, {
        ok: false,
        error: 'ref and verseText are required',
        errorCode: 'INVALID_REQUEST',
      });
    }

    const apiKey = getNvidiaApiKey();
    if (!apiKey) {
      return sendJson(res, 200, {
        ...buildContextualFallbackDevotion(ref, verseText),
        errorCode: 'MISSING_NVIDIA_API_KEY',
      });
    }

    const messages = buildMessages(ref, verseText);
    const fastModels = [
      process.env.NVIDIA_FAST_MODEL_1 || DEFAULT_FAST_MODEL_1,
      process.env.NVIDIA_FAST_MODEL_2 || DEFAULT_FAST_MODEL_2,
    ];

    try {
      const raceResult = mode === 'deep'
        ? await callQualityFirst({ apiKey, messages, ref, verseText })
        : await callFastThenQuality({ apiKey, messages, fastModels, ref, verseText });

      return sendJson(res, 200, {
        ok: true,
        ...raceResult.result,
        fallback: false,
      });
    } catch (nvidiaError) {
      const message = nvidiaError instanceof Error ? nvidiaError.message : String(nvidiaError);
      let errorCode = 'ALL_MODELS_FAILED';
      if (message.includes('Timeout') || message.includes('timeout')) errorCode = 'NVIDIA_TIMEOUT';
      if (nvidiaError.statusCode === 401) errorCode = 'NVIDIA_UNAUTHORIZED';
      if (nvidiaError.statusCode === 429) errorCode = 'NVIDIA_RATE_LIMITED';
      if (nvidiaError.statusCode === 404) errorCode = 'NVIDIA_MODEL_NOT_FOUND';

      if (process.env.GEMINI_API_KEY) {
        try {
          const geminiResponse = await callGeminiChat({ messages, temperature: 0.35 });
          if (geminiResponse?.content) {
            const parsed = parseJsonLoose(geminiResponse.content);
            const validated = validateVerseDevotion(parsed, { ref, verseText });
            if (validated) {
              return sendJson(res, 200, {
                ok: true,
                ...validated,
                fallback: false,
                provider: 'gemini',
              });
            }
          }
        } catch (geminiError) {
          console.error('Gemini fallback failed:', geminiError instanceof Error ? geminiError.message : geminiError);
        }
      }

      return sendJson(res, 200, {
        ...buildContextualFallbackDevotion(ref, verseText),
        errorCode,
      });
    }
  } catch (fatalError) {
    return sendJson(res, 200, {
      ...buildContextualFallbackDevotion(req.body?.ref, req.body?.verseText),
      error: fatalError instanceof Error ? fatalError.message : String(fatalError),
      errorCode: 'UNKNOWN_ERROR',
    });
  }
}
