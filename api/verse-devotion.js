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
  keyPhrase: '',
  meditation: 'AI 응답이 지연되어 기본 안내를 먼저 보여드립니다. 본문을 다시 읽으며 반복되는 단어, 명령, 약속, 질문이 무엇인지 살펴보세요. 하나님이 이 말씀 안에서 어떤 분으로 드러나시는지, 오늘 내가 예수 그리스도를 의지하며 순종해야 할 한 걸음은 무엇인지 조용히 묵상해보세요.',
  prayer: '주님, 이 말씀 앞에서 제 마음을 조용히 내려놓습니다. 제 힘과 판단보다 예수 그리스도를 더 의지하게 하시고, 성령께서 제 안의 두려움과 불신을 비추셔서 오늘 주님께 순종할 힘을 주소서. 아멘.',
  application: '오늘 본문에서 마음에 남는 표현 하나를 적고, 그 표현 앞에서 내려놓아야 할 마음 한 가지와 순종할 행동 한 가지를 짧게 기도해보세요.',
  reflectionQuestion: '이 말씀 앞에서 오늘 내가 주님께 맡겨야 할 마음은 무엇인가요?',
  fallback: true,
};

const SYSTEM_PROMPT = `
너는 한국어 성경 묵상과 기도문을 작성하는 신중하고 경건하면서도, 사용자에게 따뜻하게 다가가는 성경 묵상 도우미다.

단순히 좋은 말을 나열하지 말고 사용자가 본문을 깊이 읽고, 하나님 앞에서 마음을 살피며, 예수 그리스도를 의지하고, 성령의 인도하심 안에서 실제 순종으로 나아가도록 돕는다.
본문에 없는 내용을 만들지 말고, 단어와 흐름과 문맥과 강조점을 우선한다. 누가 말하는지, 누구에게 말하는지, 본문 흐름상 어떤 상황인지 겸손하게 살핀다.
하나님의 주권, 거룩하심, 사랑, 긍휼, 신실하심, 인도하심, 심판과 은혜를 균형 있게 보고, 사람 중심 자기계발 메시지로 축소하지 않는다.

**특별히 기도문에 대한 지침:**
1. '주님'이라는 호칭을 문장마다 반복하지 말라. (아버지, 하나님, 사랑의 주님, 나의 피난처 등 본문에 어울리는 다양한 호칭을 사용하거나, 문맥상 생략하라.)
2. 딱딱하고 형식적인 문체보다는, 마치 친한 아버지나 친구에게 진솔한 속마음을 털어놓는 듯한 '따뜻하고 친숙한 구어체'를 사용하라.
3. 깊은 감정과 갈망이 담긴 표현을 사용하여, 사용자가 자신의 진심을 담아 기도할 수 있도록 하라.
4. 성령의 도우심을 구하고 예수 그리스도의 이름으로 아멘하며 끝내라.

반드시 JSON만 반환하고 마크다운 코드블록을 쓰지 않는다.
`.trim();

function buildMessages(ref, verseText) {
  return [
    {
      role: 'user',
      content: `너는 한국어 성경 묵상과 기도문을 작성하는 신중하고 따뜻한 도우미다.
본문: ${ref}
${verseText}

다음 지침을 지켜 묵상과 기도문을 작성하라:
1. 본문 중심 묵상: 본문에 없는 배경을 꾸미지 말고, 본문의 핵심 메시지를 깊이 있게 전달하라.
2. 따뜻한 문체: 사용자에게 위로와 도전이 되는 따뜻하고 경건한 한국어를 사용하라.
3. 감정이 담긴 기도문: 
   - '주님'이라는 표현을 너무 자주 반복하지 말 것. 
   - 딱딱한 문장 대신 마음 깊은 곳에서 나오는 고백과 같은 감성적이고 친숙한 표현을 쓸 것.
   - 하나님의 성품에 대한 감탄과 자신의 연약함에 대한 고백이 자연스럽게 어우러지게 할 것.
4. 구체적 적용: 마음의 태도 변화와 오늘 실천할 작은 행동을 포함하라.

반드시 JSON만 반환:
{
  "title": "본문의 핵심을 담은 묵상 제목",
  "keyPhrase": "본문에서 붙들 핵심 단어 또는 표현",
  "meditation": "본문 중심 묵상 250~450자",
  "prayer": "마음 깊은 곳의 진솔한 고백을 담은 따뜻한 기도문 160~300자",
  "application": "오늘 실천할 한 가지 90~180자",
  "reflectionQuestion": "하루 동안 붙들고 생각할 질문"
}

JSON 외 텍스트 금지`,
    },
  ];
}

async function callQualityFirst({ apiKey, messages, verseText }) {
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
      maxTokens: 1400,
      signal: AbortSignal.timeout(15000),
    });
    const parsed = parseJsonLoose(response.content);
    const result = validateVerseDevotion(parsed, { verseText });
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
      maxTokens: 1200,
      responseFormat: null,
      validate: (parsed) => validateVerseDevotion(parsed, { verseText }),
    });
    return { result: raceResult.result, mode: 'fast-fallback' };
  }
}

async function callFastThenQuality({ apiKey, messages, fastModels, verseText }) {
  return hedgedNvidiaRace({
    apiKey,
    models: fastModels,
    messages,
    firstDelayMs: 1200,
    timeoutMs: 14000,
    temperature: 0.25,
    maxTokens: 1200,
    responseFormat: null,
    validate: (parsed) => validateVerseDevotion(parsed, { verseText }),
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
      const raceResult = mode === 'deep'
        ? await callQualityFirst({ apiKey, messages, verseText })
        : await callFastThenQuality({ apiKey, messages, fastModels, verseText });

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
            const validated = validateVerseDevotion(parsed, { verseText });
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
