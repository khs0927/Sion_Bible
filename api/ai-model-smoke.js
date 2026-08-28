import { callGeminiChat } from './_lib/gemini.js';
import { callNvidiaChat, parseJsonLoose } from './_lib/nvidia.js';

const REF = '창세기 22:7';
const VERSE = '이삭이 그 아버지 아브라함에게 말하여 이르되 내 아버지여 하니 그가 이르되 내 아들아 내가 여기 있노라 이삭이 이르되 불과 나무는 있거니와 번제할 어린 양은 어디 있나이까';
const MESSAGES = [
  { role: 'system', content: '성경 본문만 근거로 핵심을 짧고 정확하게 설명한다. JSON 객체만 반환한다. 형식: {"title":"15~32자","coreMessage":"55~120자","explanation":"120~260자"}. 본문 밖 사실은 만들지 않는다.' },
  { role: 'user', content: `구절: ${REF}\n본문: ${VERSE}\n핵심 해설을 작성해줘.` },
];

function valid(content) {
  try {
    const parsed = parseJsonLoose(content);
    return {
      ok: Boolean(parsed?.title && String(parsed?.coreMessage || '').length >= 30 && String(parsed?.explanation || '').length >= 60),
      title: String(parsed?.title || ''),
      coreLength: String(parsed?.coreMessage || '').length,
      explanationLength: String(parsed?.explanation || '').length,
    };
  } catch {
    return { ok: false, title: '', coreLength: 0, explanationLength: 0 };
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false });
  const kind = String(req.query?.model || 'gemini');
  const startedAt = Date.now();
  try {
    let response;
    let provider;
    if (kind === 'oss20') {
      provider = 'nvidia';
      response = await callNvidiaChat({ model: 'openai/gpt-oss-20b', messages: MESSAGES, temperature: 0.1, maxTokens: 520, timeoutMs: 12000, responseFormat: { type: 'json_object' } });
    } else if (kind === 'oss120') {
      provider = 'nvidia';
      response = await callNvidiaChat({ model: 'openai/gpt-oss-120b', messages: MESSAGES, temperature: 0.1, maxTokens: 520, timeoutMs: 14000, responseFormat: { type: 'json_object' } });
    } else {
      provider = 'gemini';
      response = await callGeminiChat({ model: 'gemini-3.5-flash', messages: MESSAGES, temperature: 0.1, maxTokens: 520, timeoutMs: 7000, thinkingLevel: 'minimal' });
    }
    const check = valid(response?.content || '');
    return res.status(200).json({ provider, model: response?.model || null, elapsedMs: Date.now() - startedAt, ...check });
  } catch (error) {
    return res.status(200).json({ ok: false, model: kind, elapsedMs: Date.now() - startedAt, error: error instanceof Error ? error.message : String(error) });
  }
}
