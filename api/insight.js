const MODEL = 'nvidia/nemotron-3-super-120b-a12b';

function fallbackJson(res, status, message) {
  res.status(status).json({ error: message });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return fallbackJson(res, 405, 'Method not allowed');
  }

  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) return fallbackJson(res, 500, 'NVIDIA_API_KEY is not configured');

  const { ref, text } = req.body ?? {};
  if (!ref || !text) return fallbackJson(res, 400, 'ref and text are required');

  const prompt = [
    '너는 한국어 성경 묵상 앱의 목회적 문체를 돕는 조력자다.',
    '입력된 성경 구절과 직접 관련된 묵상과 기도문만 작성한다.',
    '다른 구절을 임의로 섞지 말고, 과장된 표현은 피한다.',
    'JSON만 반환한다. 형식: {"meditation":"...","prayer":"..."}',
    `구절: ${ref}`,
    `본문: ${text}`,
  ].join('\n');

  const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.45,
      max_tokens: 700,
      messages: [
        { role: 'system', content: 'Return only valid JSON. No markdown.' },
        { role: 'user', content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    return fallbackJson(res, response.status, message || 'NVIDIA API request failed');
  }

  const data = await response.json();
  const raw = data?.choices?.[0]?.message?.content ?? '';
  const jsonText = raw.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    parsed = {
      meditation: raw,
      prayer: '주님, 이 말씀을 오늘 제 마음에 새기고 순종하게 하소서. 아멘.',
    };
  }

  res.status(200).json({
    meditation: String(parsed.meditation ?? '').trim(),
    prayer: String(parsed.prayer ?? '').trim(),
    model: MODEL,
  });
}
