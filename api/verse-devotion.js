import {
  DEFAULT_FAST_MODEL_1,
  DEFAULT_FAST_MODEL_2,
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
  meditation: '이 말씀을 천천히 다시 읽으며 마음에 남는 단어를 붙들어보세요. 하나님께서 오늘 내게 주시는 위로와 초대를 조용히 바라보는 시간이 되길 바랍니다.',
  prayer: '주님, 이 말씀을 오늘 제 마음에 새기고 순종하게 하소서. 제 생각과 마음을 주님께 맞추게 하시고, 말씀 안에서 평안을 누리게 하소서. 아멘.',
  application: '오늘 이 말씀 앞에서 내가 붙들 한 단어를 적고, 하루 중 한 번 다시 떠올려보세요.',
  fallback: true,
};

function buildMessages(ref, verseText) {
  return [
    {
      role: 'system',
      content: [
        '너는 한국어 성경 묵상과 기도문을 돕는 목회적 글쓰기 도우미다.',
        '반드시 JSON만 반환한다. 마크다운과 코드블록은 쓰지 않는다.',
        '입력된 본문에 없는 내용을 억지로 만들거나 다른 장절을 인용하지 않는다.',
        '한자나 영어를 섞지 말고 따뜻하고 경건한 한국어로 쓴다.',
      ].join(' '),
    },
    {
      role: 'user',
      content: [
        '아래 성경 구절을 바탕으로 짧고 깊이 있는 묵상과 기도문을 작성해줘.',
        '응답은 반드시 아래 JSON 구조를 지켜줘.',
        '{"title":"짧은 묵상 제목","meditation":"본문의 핵심 의미와 오늘의 마음에 주는 위로를 2~3문장으로","prayer":"말씀을 붙드는 고백과 간구의 기도 2문장","application":"오늘 실천할 수 있는 한 가지"}',
        `구절: ${ref}`,
        `본문: ${verseText}`,
      ].join('\n\n'),
    },
  ];
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

    const { ref, verseText } = req.body ?? {};
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
        ...FALLBACK_DEVOTION,
        errorCode: 'MISSING_NVIDIA_API_KEY',
      });
    }

    const messages = buildMessages(ref, verseText);
    const fastModels = [
      process.env.NVIDIA_FAST_MODEL_1 || DEFAULT_FAST_MODEL_1,
      process.env.NVIDIA_FAST_MODEL_2 || DEFAULT_FAST_MODEL_2,
    ];

    try {
      const raceResult = await hedgedNvidiaRace({
        apiKey,
        models: fastModels,
        messages,
        firstDelayMs: 1800,
        timeoutMs: 5200,
        temperature: 0.25,
        maxTokens: 420,
        validate: validateVerseDevotion,
      });

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
            const validated = validateVerseDevotion(parsed);
            if (validated) {
              return sendJson(res, 200, {
                ok: true,
                ...validated,
                fallback: true,
                provider: 'gemini',
              });
            }
          }
        } catch (geminiError) {
          console.error('Gemini fallback failed:', geminiError instanceof Error ? geminiError.message : geminiError);
        }
      }

      return sendJson(res, 200, {
        ...FALLBACK_DEVOTION,
        errorCode,
      });
    }
  } catch (fatalError) {
    return sendJson(res, 200, {
      ...FALLBACK_DEVOTION,
      error: fatalError instanceof Error ? fatalError.message : String(fatalError),
      errorCode: 'UNKNOWN_ERROR',
    });
  }
}
