import {
  DEFAULT_FAST_MODEL_1,
  getNvidiaApiKey,
  parseJsonLoose,
  sendJson,
  normalizeError,
  callNvidiaChat,
} from './_lib/nvidia.js';
import { callGeminiChat } from './_lib/gemini.js';

function buildPrompt({ ref, verseText, meditation, prayer, question }) {
  return `
너는 한국어 성경 묵상 질문에 답하는 신중하고 따뜻한 성경 도우미다.

사용자는 특정 성경구절과 그 구절에 대한 묵상/기도문을 읽고 궁금한 점을 질문한다.

성경구절:
${ref}
${verseText}

기존 묵상:
${meditation || ''}

기존 기도문:
${prayer || ''}

사용자 질문:
${question}

답변 규칙:
- 한국어로 답변한다.
- 본문에 없는 내용을 억지로 단정하지 않는다.
- 신학적으로 논쟁적인 부분은 겸손하게 설명한다.
- 너무 길지 않게 700자 이내로 답변한다.
- 사용자가 묵상할 수 있도록 따뜻하게 답변한다.
- 반드시 JSON만 반환한다.
- 마크다운 코드블록을 쓰지 않는다.

JSON 형식:
{
  "question": "${question.replace(/"/g, '\\"')}",
  "answer": "답변 내용"
}
`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, { error: 'Method Not Allowed' });
  }

  const { ref, verseText, meditation, prayer, question } = req.body || {};
  if (!ref || !verseText || !question) {
    return sendJson(res, 400, { error: 'ref, verseText, question are required' });
  }

  const apiKey = getNvidiaApiKey();
  const model = process.env.NVIDIA_FAST_MODEL_1 || DEFAULT_FAST_MODEL_1;

  const messages = [
    {
      role: 'system',
      content: '너는 한국어 성경 묵상 질문에 따뜻하고 신중하게 답하는 도우미다.',
    },
    {
      role: 'user',
      content: buildPrompt({ ref, verseText, meditation, prayer, question }),
    },
  ];

  try {
    if (!apiKey) throw new Error('NVIDIA_API_KEY_MISSING');

    const response = await callNvidiaChat({
      apiKey,
      model,
      messages,
      temperature: 0.45,
      maxTokens: 1200,
    });

    const parsed = parseJsonLoose(response.content);
    return sendJson(res, 200, {
      ok: true,
      question: parsed.question || question,
      answer: parsed.answer || response.content,
      provider: 'nvidia',
      model: response.model,
    });
  } catch (nvidiaError) {
    console.warn('NVIDIA Question API failed, trying Gemini fallback:', nvidiaError.message);

    if (process.env.GEMINI_API_KEY) {
      try {
        const geminiResponse = await callGeminiChat({
          messages,
          temperature: 0.4,
          maxTokens: 1200,
        });

        if (geminiResponse?.content) {
          const parsed = parseJsonLoose(geminiResponse.content);
          return sendJson(res, 200, {
            ok: true,
            question: parsed.question || question,
            answer: parsed.answer || geminiResponse.content,
            provider: 'gemini',
            model: geminiResponse.model,
          });
        }
      } catch (geminiError) {
        console.error('Gemini Question fallback failed:', geminiError.message);
      }
    }

    const errorInfo = normalizeError(nvidiaError);
    return sendJson(res, errorInfo.status, {
      ok: false,
      error: '답변을 생성할 수 없습니다.',
      detail: errorInfo.detail,
    });
  }
}
