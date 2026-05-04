const DEFAULT_MODEL = 'meta/llama-3.3-70b-instruct';

function sendJson(res, status, body) {
  res.status(status).json(body);
}

function stripJsonFence(value) {
  return String(value ?? '')
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, { error: 'Method not allowed', detail: 'Use POST /api/insight' });
  }

  const apiKey = process.env.NVIDIA_API_KEY;
  const model = process.env.NVIDIA_MODEL || DEFAULT_MODEL;
  if (!apiKey) {
    return sendJson(res, 500, {
      error: 'NVIDIA_API_KEY is not configured',
      detail: 'Set NVIDIA_API_KEY in the server environment. Do not expose it with a VITE_ prefix.',
    });
  }

  const { ref, text } = req.body ?? {};
  if (!ref || !text) return sendJson(res, 400, { error: 'ref and text are required' });

  const prompt = [
    '너는 한국어 성경 묵상과 기도문을 돕는 목회적 글쓰기 조력자다.',
    '모든 값은 반드시 자연스러운 한국어로 작성한다. 영어로 쓰지 않는다.',
    '입력된 성경 구절과 직접 관련된 묵상과 기도문만 작성한다.',
    '다른 구절을 임의로 덧붙이지 말고, 과장된 표현을 피한다.',
    '반드시 유효한 JSON만 반환한다. 마크다운 코드블록을 쓰지 않는다.',
    'JSON 형식: {"meditation":"묵상 내용","prayer":"기도문"}',
    `구절: ${ref}`,
    `본문: ${text}`,
  ].join('\n\n');

  let response;
  try {
    response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0.45,
        max_tokens: 900,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'Return only valid JSON. No markdown. All JSON string values must be written in Korean.' },
          { role: 'user', content: prompt },
        ],
      }),
    });
  } catch (error) {
    return sendJson(res, 502, {
      error: 'NVIDIA API request failed',
      detail: error instanceof Error ? error.message : String(error),
    });
  }

  if (!response.ok) {
    const detail = await response.text();
    return sendJson(res, response.status, {
      error: 'NVIDIA API request failed',
      detail: detail || response.statusText,
    });
  }

  const data = await response.json();
  const raw = data?.choices?.[0]?.message?.content ?? '';
  let parsed;
  try {
    parsed = JSON.parse(stripJsonFence(raw));
  } catch {
    parsed = {
      meditation: raw,
      prayer: '주님, 이 말씀을 오늘 제 마음에 새기고 순종하게 하소서. 아멘.',
    };
  }

  return sendJson(res, 200, {
    meditation: String(parsed.meditation ?? '').trim(),
    prayer: String(parsed.prayer ?? '').trim(),
    model,
  });
}
