export interface BibleVerse {
  id: number;
  book: string;
  chapter: string;
  verse: string;
  content: string;
  contentEn: string;
  category: '위로' | '소망' | '감사' | '사랑' | '지혜' | '평안' | '축복' | '능력';
  meditation: string;
  prayer: string;
}

export const BIBLE_VERSES: BibleVerse[] = [
  {
    id: 1,
    book: '요한복음',
    chapter: '14',
    verse: '27',
    content: '평안을 너희에게 끼치노니 곧 나의 평안을 너희에게 주노라 내가 너희에게 주는 것은 세상이 주는 것과 같지 아니하니라 너희는 마음에 근심하지도 말고 두려워하지도 말라',
    contentEn: 'Peace I leave with you; my peace I give you. I do not give to you as the world gives. Do not let your hearts be troubled and do not be afraid.',
    category: '평안',
    meditation: '주님이 주시는 평안은 세상의 환경이나 조건에 좌우되지 않는 영원하고 참된 평강입니다. 세상의 안락함은 잠시 뿐이지만, 예수 그리스도 안에서 누리는 평안은 어떤 폭풍 속에서도 흔들리지 않는 굳건한 평화입니다.',
    prayer: '평강의 왕이신 주님, 흔들리고 요동치는 세상 한가운데서 주님의 참된 평안을 구합니다. 제 마음에 자리 잡은 두려움과 걱정의 구름을 걷어주시고, 주님의 완전한 사랑 안에 거하는 평온함을 오늘 하루 온전히 누리게 하옵소서. 아멘.'
  },
  {
    id: 2,
    book: '시편',
    chapter: '23',
    verse: '1',
    content: '여호와는 나의 목자시니 내게 부족함이 없으리로다',
    contentEn: 'The LORD is my shepherd, I lack nothing.',
    category: '축복',
    meditation: '참 목자이신 주님을 따르는 양은 부족함을 느끼지 못합니다. 목자 되신 하나님께서는 우리에게 무엇이 필요한지 가장 잘 아시며, 가장 좋은 때에 가장 적합한 길로 우리의 걸음을 인도해 주십니다.',
    prayer: '선한 목자 되신 하나님, 저의 삶을 푸른 풀밭과 쉴 만한 물가로 인도하시니 감사드립니다. 제 뜻대로 가려던 길을 멈추고 주의 지팡이와 막대기를 의지하오니, 저의 모든 걸음을 선한 은혜로만 인도하여 주옵소서. 아멘.'
  },
  {
    id: 3,
    book: '이사야',
    chapter: '41',
    verse: '10',
    content: '두려워하지 말라 내가 너와 함께 함이라 놀라지 말라 나는 네 하나님이 됨이라 내가 너를 굳세게 하리라 참으로 너를 도와 주리라 참으로 나의 의로운 오른손으로 너를 붙들리라',
    contentEn: 'So do not fear, for I am with you; do not be dismayed, for I am your God. I will strengthen you and help you; I will uphold you with my righteous right hand.',
    category: '위로',
    meditation: '아무도 내 곁에 없다고 느껴지는 고립의 순간에도 하나님의 약속은 변하지 않습니다. 하나님께서는 당신을 홀로 두지 않으시고 그분의 강하고 의로운 손으로 꽉 붙잡아 주시며, 끝까지 포기하지 않으십니다.',
    prayer: '두려움에 떨던 저에게 찾아오셔서 "내가 너와 함께한다" 말씀해 주시는 은혜의 주님. 마음이 약해질 때마다 저를 붙들어 주시고, 저의 연약함을 뛰어넘는 주님의 권능의 손길을 온전히 신뢰하며 담대하게 나아가게 하옵소서. 아멘.'
  },
  {
    id: 4,
    book: '데살로니가전서',
    chapter: '5',
    verse: '16-18',
    content: '항상 기뻐하라 쉬지 말고 기도하라 범사에 감사하라 이것이 그리스도 예수 안에서 너희를 향하신 하나님의 뜻이니라',
    contentEn: 'Rejoice always, pray continually, give thanks in all circumstances; for this is God’s will for you in Christ Jesus.',
    category: '감사',
    meditation: '감사는 좋은 상황에서만 나오는 것이 아니라, 모든 상황 속에서 하나님의 일하심을 인정하는 믿음의 태도입니다. 감사와 기도의 영성으로 살아갈 때, 삶의 그늘졌던 곳마다 기쁨의 꽃이 피어나게 됩니다.',
    prayer: '감사받기에 합당하신 주님, 원망과 불평이 가득한 마음을 회개합니다. 오늘도 숨 쉴 수 있음에, 사랑할 수 있음에, 주님을 부를 수 있음에 감사드립니다. 어떤 상황 속에서도 감사의 눈을 들어 기쁨을 선택하게 하옵소서. 아멘.'
  },
  {
    id: 5,
    book: '빌립보서',
    chapter: '4',
    verse: '13',
    content: '내게 능력 주시는 자 안에서 내가 모든 것을 할 수 있느니라',
    contentEn: 'I can do all things through him who gives me strength.',
    category: '능력',
    meditation: '나의 자원이나 한계로 일하는 것이 아니라, 내 안에 계신 그리스도의 공급하시는 힘으로 살아가는 것입니다. 내 힘으로 도저히 감당할 수 없는 일 앞에서 주저앉지 말고 주님의 능력을 덧입으십시오.',
    prayer: '능력의 원천이신 주님, 제 한계와 부족함에 갇혀 절망하지 않게 하소서. 주님의 능력이 저를 통해 나타나기를 간절히 원합니다. 주님께서 주시는 무한한 능력과 성령의 충만함을 덧입고 세상에 선한 영향력을 끼치는 삶이 되게 하옵소서. 아멘.'
  },
  {
    id: 6,
    book: '잠언',
    chapter: '3',
    verse: '5-6',
    content: '너는 마음을 다하여 여호와를 신뢰하고 네 명철을 의지하지 말라 너는 범사에 그를 인정하라 그리하면 네 길을 지도하시리라',
    contentEn: 'Trust in the LORD with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight.',
    category: '지혜',
    meditation: '우리의 지혜는 단편적이며 내일 일도 알지 못합니다. 반면 완전하신 하나님께 모든 것을 내어 맡기고 인정할 때, 주님께서는 가장 온전하고 안전한 형통의 길로 우리의 인생을 인도하십니다.',
    prayer: '전지전능하신 하나님, 제 얕은 생각과 경험으로 미래를 계획하고 판단하려 했던 교만을 내려놓습니다. 매 순간 저의 지식보다 크신 주님을 의지하오니, 어리석음에 빠지지 않게 하시고 하나님의 완전한 지혜로 저를 인도해 주옵소서. 아멘.'
  },
  {
    id: 7,
    book: '로마서',
    chapter: '8',
    verse: '28',
    content: '우리가 알거니와 하나님을 사랑하는 자 곧 그의 뜻대로 부르심을 입은 자들에게는 모든 것이 합력하여 선을 이루느니라',
    contentEn: 'And we know that in all things God works for the good of those who love him, who have been called according to his purpose.',
    category: '소망',
    meditation: '이해할 수 없는 고난과 역경, 심지어 우리의 뼈아픈 실수까지도 하나님의 섭리 안에서는 하나로 모여 아름다운 선을 만들어 냅니다. 고난의 조각들을 맞춰 가장 완벽한 그림을 완성하실 주님을 소망 중에 바라보십시오.',
    prayer: '선하신 주님, 지금 당장 제 눈앞에 닥친 어려움에 낙심치 않게 하소서. 비록 이해할 수 없는 아픔일지라도, 결국에는 이를 통해 하나님의 영광을 나타내실 것을 믿습니다. 소망을 잃지 않고 인내하는 은혜를 더하여 주옵소서. 아멘.'
  },
  {
    id: 8,
    book: '고린도전서',
    chapter: '13',
    verse: '13',
    content: '그런즉 믿음, 소망, 사랑, 이 세 가지는 항상 있을 것인데 그 중의 제일은 사랑이라',
    contentEn: 'And now these three remain: faith, hope and love. But the greatest of these is love.',
    category: '사랑',
    meditation: '기독교의 본질이자 성도의 가장 큰 자산은 바로 사랑입니다. 사랑 없는 열심은 울리는 꽹과리와 같습니다. 주님의 아가페 사랑을 깊이 깨달아 다른 이들에게 흘려보내는 것이 삶의 가장 핵심 가치입니다.',
    prayer: '사랑 그 자체이신 하나님 아버지, 저에게 아낌없이 주신 그 거대한 십자가의 사랑을 기억합니다. 그 큰 사랑을 받았으니 저 또한 내 이웃과 연약한 자들을 아끼며 넓은 마음으로 품을 수 있도록 성령님께서 제 마음을 가득 채워 주옵소서. 아멘.'
  },
  {
    id: 9,
    book: '시편',
    chapter: '46',
    verse: '1',
    content: '하나님은 우리의 피난처시요 힘이시니 환난 중에 만날 큰 도움이시라',
    contentEn: 'God is our refuge and strength, an ever-present help in trouble.',
    category: '평안',
    meditation: '삶의 비바람이 강하게 몰아칠 때 우리는 가장 안전한 피난처가 되시는 하나님께로 피해야 합니다. 주님은 우리를 숨겨주시고 감싸주시며, 다시 일어설 수 있는 새로운 새 힘을 부어 주십니다.',
    prayer: '안전한 요새이신 주님, 힘에 부치는 일들 속에서 안전하게 숨을 수 있는 참된 안식처가 되어주셔서 감사드립니다. 환난의 한복판에서도 오직 주님만이 나의 완전한 힘이심을 노래하며 신뢰하게 하옵소서. 아멘.'
  },
  {
    id: 10,
    book: '예레미야',
    chapter: '29',
    verse: '11',
    content: '여호와의 말씀이니라 너희를 향한 나의 생각을 내가 아나니 평안이요 재앙이 아니니라 너희에게 미래와 희망을 주는 것이니라',
    contentEn: 'For I know the plans I have for you,” declares the LORD, “plans to prosper you and not to harm you, plans to give you hope and a future.',
    category: '소망',
    meditation: '때로 인생의 광야를 지날 때 우리는 하나님을 의심하기 쉽습니다. 그러나 우리를 향한 하나님의 본심은 파멸이 아닌 영원한 구원과 미래의 소망입니다. 하나님의 계획은 언제나 선하십니다.',
    prayer: '미래를 주관하시는 주님, 앞날에 대한 막연한 불안감이 엄습할 때마다 우리에게 평안과 소망을 주고자 하시는 주님의 뜻을 기억하게 하옵소서. 약속된 승리를 바라보며 믿음의 날갯짓을 멈추지 않게 하옵소서. 아멘.'
  },
  {
    id: 11,
    book: '여호수아',
    chapter: '1',
    verse: '9',
    content: '내가 네게 명령한 것이 아니냐 강하고 담대하라 두려워하지 말며 놀라지 말라 네가 어디로 가든지 네 하나님 여호와가 너와 함께 하느니라 하시니라',
    contentEn: 'Have I not commanded you? Be strong and courageous. Do not be afraid; do not be discouraged, for the LORD your God will be with you wherever you go.',
    category: '능력',
    meditation: '새로운 도전이나 막막한 과제 앞에 섰을 때, 우리의 용기는 상황이 아닌 하나님이 함께 하신다는 사실에서 비롯됩니다. 하나님이 함께 하시면 어떤 장애물도 뛰어넘을 수 있습니다.',
    prayer: '동행하시는 전능의 주님, 새로운 출발점에 선 저에게 필요한 믿음의 용기를 부어 주시옵소서. "강하고 담대하라" 명령하신 주님의 권위를 힘입어, 세상과 타협하지 않고 힘차게 전진해 나아가게 하소서. 아멘.'
  },
  {
    id: 12,
    book: '시편',
    chapter: '119',
    verse: '105',
    content: '주의 말씀은 내 발에 등이요 내 길에 빛이니이다',
    contentEn: 'Your word is a lamp for my feet, a light on my path.',
    category: '지혜',
    meditation: '어두운 밤길을 걸어갈 때 조그만 등불이 발 앞을 비추듯, 혼란스러운 세상의 풍파 속에서 하나님의 말씀은 우리가 내딛어야 할 다음 발걸음을 선명하게 인도하는 영적 이정표가 됩니다.',
    prayer: '진리의 빛이신 주님, 수많은 선택과 유혹 가운데 흔들리지 않도록 주의 말씀으로 제 영혼을 밝혀 주옵소서. 세상의 달콤한 속삭임 대신 오직 기록된 하나님의 말씀을 유일한 삶의 기준 삼고 살아가게 하소서. 아멘.'
  },
  {
    id: 13,
    book: '베드로전서',
    chapter: '5',
    verse: '7',
    content: '너희 염려를 다 주께 맡기라 이는 그가 너희를 돌보심이라',
    contentEn: 'Cast all your anxiety on him because he cares for you.',
    category: '위로',
    meditation: '우리가 지고 있는 염려의 보따리를 하나님께 완전히 던져버리는 것이 "맡기는 것"입니다. 하나님께서는 세심한 사랑의 눈빛으로 우리의 연약함을 돌보시며 살피고 계십니다.',
    prayer: '사랑의 아버지 하나님, 밤잠을 설치며 끙끙 앓던 저의 모든 근심과 불안을 오늘 이 시간 십자가 앞에 모두 쏟아놓습니다. 저를 자녀 삼으시고 끝까지 책임져 주시는 아버지만을 굳게 믿고 가벼운 마음으로 살아가게 하옵소서. 아멘.'
  },
  {
    id: 14,
    book: '빌립보서',
    chapter: '4',
    verse: '6-7',
    content: '아무 것도 염려하지 말고 다만 모든 일에 기도와 간구로, 너희 구할 것을 감사함으로 하나님께 아뢰라 그리하면 모든 지각에 뛰어난 하나님의 평강이 그리스도 예수 안에서 너희 마음과 생각을 지키시리라',
    contentEn: 'Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God. And the peace of God, which transcends all understanding, will guard your hearts and your minds in Christ Jesus.',
    category: '평안',
    meditation: '염려를 기도로 바꾸는 것은 믿음의 놀라운 연금술입니다. 감사함으로 아뢰는 자에게는 상황의 즉각적 변화보다 먼저, 초자연적인 하늘의 평화가 마음과 생각의 파수꾼이 되어 상처 입지 않도록 지켜 주십니다.',
    prayer: '지혜가 무궁하신 하나님, 불안이 밀려올 때 한숨 대신 기도를, 두려움 대신 감사를 고백하게 하소서. 상황을 뛰어넘는 하나님의 평강이 오늘 저의 요동치는 마음의 문을 든든히 지켜 주시기를 기도합니다. 아멘.'
  },
  {
    id: 15,
    book: '마태복음',
    chapter: '11',
    verse: '28',
    content: '수고하고 무거운 짐 진 자들아 다 내게로 오라 내가 너희를 쉬게 하리라',
    contentEn: 'Come to me, all you who are weary and burdened, and I will give you rest.',
    category: '위로',
    meditation: '세상은 우리에게 더 높은 성과와 끝없는 수고를 요구하지만, 주님께서는 지친 우리의 영혼을 있는 그대로 품어주시며 온전한 쉼과 회복을 선물로 주십니다.',
    prayer: '자비로우신 예수님, 삶의 고단한 무게와 책임감에 짓눌려 숨쉬기조차 버겁던 제가 주님 품으로 나아갑니다. 제 영혼의 닻을 주님께 내리오니 참된 안식과 위로를 경험하는 복된 시간이 되게 하옵소서. 아멘.'
  },
  {
    id: 16,
    book: '요한일서',
    chapter: '4',
    verse: '18',
    content: '사랑 안에 두려움이 없고 온전한 사랑이 두려움을 내쫓나니 두려움에는 형벌이 있음이라 두려워하는 자는 사랑 안에서 온전히 이루지 못하였느니라',
    contentEn: 'There is no fear in love. But perfect love drives out fear, because fear has to do with punishment. The one who fears is not made perfect in love.',
    category: '사랑',
    meditation: '하나님의 온전한 사랑을 깨달을 때 비로소 우리는 미래나 심판, 거절에 대한 모든 두려움에서 완전히 해방될 수 있습니다. 사랑은 세상에서 가장 강력한 해독제입니다.',
    prayer: '완전하신 사랑의 하나님, 날마다 십자가를 통해 부어주시는 갚을 길 없는 사랑을 묵상합니다. 어떤 두려움도 저를 삼키지 못하도록, 완벽한 주님의 사랑으로 제 영혼을 가득 채우사 자유케 하소서. 아멘.'
  },
  {
    id: 17,
    book: '시편',
    chapter: '103',
    verse: '2',
    content: '내 영혼아 여호와를 송축하며 그의 모든 은택을 잊지 말지어다',
    contentEn: 'Praise the LORD, my soul, and forget not all his benefits.',
    category: '감사',
    meditation: '은혜를 잊어버리는 것이 영적 질병의 시작입니다. 과거에 베풀어 주셨던 수많은 기적과 도우심의 손길들을 하나하나 기억하며 감사할 때, 우리의 영혼은 생기를 되찾고 주님을 높여 찬양하게 됩니다.',
    prayer: '찬양받으실 주님, 당연하게 여겼던 모든 일상들이 주님의 기적 같은 은혜였음을 기억합니다. 받은 은혜를 잊지 않고 늘 마음 판에 새겨, 날마다 찬양의 고백으로 영광 돌리는 삶이 되게 하옵소서. 아멘.'
  },
  {
    id: 18,
    book: '시편',
    chapter: '16',
    verse: '11',
    content: '주께서 생명의 길을 내게 보이시리니 주의 앞에는 충만한 기쁨이 있고 주의 오른쪽에는 영원한 즐거움이 있나이다',
    contentEn: 'You make known to me the path of life; you will fill me with joy in your presence, with eternal pleasures at your right hand.',
    category: '축복',
    meditation: '주님과 동행하는 삶은 생명의 길을 걷는 것입니다. 일시적인 쾌락이 아닌 영원한 기쁨과 비교할 수 없는 충만한 즐거움이 주님의 존전 안에 언제나 마련되어 있습니다.',
    prayer: '기쁨의 근원이신 주님, 죽음과 절망의 골짜기가 아닌 영생과 축복의 길로 저를 인도하시니 기쁩니다. 매 순간 주님의 임재 안으로 깊이 들어가, 참되고 영원한 하늘의 희락을 맛보며 살아가게 하소서. 아멘.'
  },
  {
    id: 19,
    book: '야고보서',
    chapter: '1',
    verse: '5',
    content: '너희 중에 누구든지 지혜가 부족하거든 모든 사람에게 후히 주시고 꾸짖지 아니하시는 하나님께 구하라 그리하면 주시리라',
    contentEn: 'If any of you lacks wisdom, you should ask God, who gives generously to all without finding fault, and it will be given to you.',
    category: '지혜',
    meditation: '인생의 복잡한 문제들 앞에서 혼자 고민할 필요가 전혀 없습니다. 하나님께서는 지혜를 구하는 자를 결코 책망하지 않으시고, 가장 넉넉하게 하늘의 통찰력을 채워주십니다.',
    prayer: '관대하신 하나님 아버지, 현재 제가 마주한 중요한 선택들 가운데 참된 지혜가 절실히 필요합니다. 제 부족함을 아시고 꾸짖지 않으시며 후히 주시는 주님께서 명철한 분별력을 더하여 주옵소서. 아멘.'
  },
  {
    id: 20,
    book: '갈라디아서',
    chapter: '6',
    verse: '9',
    content: '우리가 선을 행하되 낙심하지 말지니 포기하지 아니하면 때가 이르매 거두리라',
    contentEn: 'Let us not become weary in doing good, for at the proper time we will reap a harvest if we do not give up.',
    category: '소망',
    meditation: '기도의 응답이 더디고 선한 행동에 대한 열매가 당장 보이지 않더라도 절대 낙심해서는 안 됩니다. 하나님의 정하신 완벽한 타이밍에 가장 아름다운 열매를 수확하게 될 것입니다.',
    prayer: '인내하게 하시는 주님, 계속되는 수고와 눈물 속에서도 낙담하지 않고 기도의 씨앗을 뿌리게 하소서. 포기하고 싶을 때마다 성령님의 위로와 능력을 부어주셔서 마침내 풍성히 거두는 승리를 보게 하옵소서. 아멘.'
  }
];
