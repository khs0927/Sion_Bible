import { callGeminiChat } from './_lib/gemini.js';
import { parseJsonLoose } from './_lib/nvidia.js';

const CASES = [
  ['창세기 1:1', '태초에 하나님이 천지를 창조하시니라'],
  ['창세기 22:7', '이삭이 그 아버지 아브라함에게 말하여 이르되 내 아버지여 하니 그가 이르되 내 아들아 내가 여기 있노라 이삭이 이르되 불과 나무는 있거니와 번제할 어린 양은 어디 있나이까'],
  ['시편 23:1', '여호와는 나의 목자시니 내게 부족함이 없으리로다'],
  ['잠언 3:5', '너는 마음을 다하여 여호와를 신뢰하고 네 명철을 의지하지 말라'],
  ['이사야 41:10', '두려워하지 말라 내가 너와 함께 함이라 놀라지 말라 나는 네 하나님이 됨이라'],
  ['마태복음 5:9', '화평하게 하는 자는 복이 있나니 그들이 하나님의 아들이라 일컬음을 받을 것임이요'],
  ['요한복음 3:16', '하나님이 세상을 이처럼 사랑하사 독생자를 주셨으니 이는 그를 믿는 자마다 멸망하지 않고 영생을 얻게 하려 하심이라'],
  ['로마서 8:28', '우리가 알거니와 하나님을 사랑하는 자 곧 그의 뜻대로 부르심을 입은 자들에게는 모든 것이 합력하여 선을 이루느니라'],
  ['빌립보서 4:6', '아무 것도 염려하지 말고 다만 모든 일에 기도와 간구로 너희 구할 것을 감사함으로 하나님께 아뢰라'],
  ['히브리서 12:2', '믿음의 주요 또 온전하게 하시는 이인 예수를 바라보자 그는 그 앞에 있는 기쁨을 위하여 십자가를 참으사 부끄러움을 개의치 아니하시더니 하나님 보좌 우편에 앉으셨느니라'],
];

function messages(ref, verseText) {
  return [
    {
      role: 'system',
      content: [
        '너는 시온성경의 즉시 해설자다.',
        '성경 본문을 최우선 근거로 삼고 본문에 없는 사실을 만들지 않는다.',
        '첫 화면에 바로 읽을 수 있도록 짧고 분명하게 쓴다.',
        '과도한 단정, 억지 복음 연결, 출처 없는 역사 배경은 쓰지 않는다.',
        '반드시 JSON 객체만 반환한다.',
        '형식: {"title":"12~28자","coreMessage":"한 문장 45~90자","explanation":"2~3문장 90~190자","keyWords":["단어1","단어2","단어3"]}',
      ].join('\n'),
    },
    { role: 'user', content: `구절: ${ref}\n본문: ${verseText}\n\n이 구절의 핵심 해설만 바로 작성해줘.` },
  ];
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false });
  const results = [];
  for (const [ref, verseText] of CASES) {
    const startedAt = Date.now();
    try {
      const response = await callGeminiChat({
        model: 'gemini-3.5-flash', messages: messages(ref, verseText), temperature: 0.08,
        maxTokens: 360, timeoutMs: 3200, thinkingLevel: 'minimal',
      });
      const parsed = parseJsonLoose(response?.content || '');
      results.push({ ref, ok: Boolean(parsed?.title && parsed?.explanation), ms: Date.now() - startedAt });
    } catch (error) {
      results.push({ ref, ok: false, ms: Date.now() - startedAt, error: error instanceof Error ? error.message : String(error) });
    }
  }
  const okTimes = results.filter((item) => item.ok).map((item) => item.ms).sort((a, b) => a - b);
  const avgMs = okTimes.length ? Math.round(okTimes.reduce((sum, value) => sum + value, 0) / okTimes.length) : null;
  const p50Ms = okTimes.length ? okTimes[Math.floor((okTimes.length - 1) * 0.5)] : null;
  const p90Ms = okTimes.length ? okTimes[Math.floor((okTimes.length - 1) * 0.9)] : null;
  return res.status(200).json({ ok: results.every((item) => item.ok), count: results.length, avgMs, p50Ms, p90Ms, results });
}
