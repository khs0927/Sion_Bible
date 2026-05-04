import {
  DEFAULT_FAST_MODEL_1,
  DEFAULT_QUALITY_MODEL,
  getNvidiaApiKey,
  parseJsonLoose,
  sendJson,
  normalizeError,
  callNvidiaChat,
} from './_lib/nvidia.js';
import { callGeminiChat } from './_lib/gemini.js';

function buildPrompt({ ref, verseText, meditation, prayer, question }) {
  return `성경 구절:
${ref}
${verseText}

이미 생성된 묵상:
${meditation || ''}

이미 생성된 기도문:
${prayer || ''}

사용자 질문:
${question}

답변 지침:
1. 질문에 직접 답하라.
2. 본문에 근거해서 답하라.
3. 필요하면 앞뒤 문맥을 설명하되, 확실하지 않은 역사 배경을 지어내지 말라.
4. 하나님의 성품과 관점을 보여주라.
5. 예수 그리스도를 의지하는 삶과 연결할 수 있으면 연결하라.
6. 성령의 도우심으로 오늘 어떻게 순종할 수 있는지 제안하라.
7. 답변 마지막에 짧은 묵상 질문 또는 기도 방향을 하나 제시하라.
8. 700자 이내로 답하라.
9. 반드시 JSON만 반환하라.

JSON:
{
  "question": "${question.replace(/"/g, '\\"')}",
  "answer": "답변",
  "followUpQuestion": "이어서 묵상할 질문 한 가지"
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
  const qualityModel = process.env.NVIDIA_QUALITY_MODEL || DEFAULT_QUALITY_MODEL;
  const fastModel = process.env.NVIDIA_FAST_MODEL_1 || DEFAULT_FAST_MODEL_1;

  const messages = [
    {
      role: 'system',
      content: [
        '너는 한국어 성경 묵상 질문에 답하는 신중하고 경건한 성경 도우미다.',
        '사용자의 질문에 답할 때 본문을 중심으로 하며, 하나님 중심, 그리스도 중심, 성령의 도우심, 회개와 믿음과 순종의 관점을 균형 있게 반영한다.',
        '본문에 없는 내용을 단정하지 말고, 모르는 배경은 겸손하게 표현한다.',
        '답변은 사용자가 실제로 말씀을 묵상하고 기도할 수 있게 도와야 한다.',
        '반드시 JSON만 반환한다.',
      ].join(' '),
    },
    {
      role: 'user',
      content: buildPrompt({ ref, verseText, meditation, prayer, question }),
    },
  ];

  try {
    if (!apiKey) throw new Error('NVIDIA_API_KEY_MISSING');

    let response;
    try {
      response = await callNvidiaChat({
        apiKey,
        model: qualityModel,
        messages,
        temperature: 0.35,
        maxTokens: 1200,
        signal: AbortSignal.timeout(15000),
      });
    } catch {
      response = await callNvidiaChat({
        apiKey,
        model: fastModel,
        messages,
        temperature: 0.35,
        maxTokens: 900,
        signal: AbortSignal.timeout(8000),
      });
    }

    const parsed = parseJsonLoose(response.content);
    return sendJson(res, 200, {
      ok: true,
      question: parsed.question || question,
      answer: parsed.answer || response.content,
      followUpQuestion: parsed.followUpQuestion || '',
      provider: 'nvidia',
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
            followUpQuestion: parsed.followUpQuestion || '',
            provider: 'gemini',
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
