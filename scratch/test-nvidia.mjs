// node 18+ has global fetch

async function test() {
  const apiKey = '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';
  const model = 'meta/llama-3.1-8b-instruct';
  const endpoint = 'https://integrate.api.nvidia.com/v1/chat/completions';

  console.log('Calling NVIDIA API...');
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'Say hello in Korean' }],
        max_tokens: 50,
      }),
    });

    console.log('Status:', response.status);
    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error:', err.message);
  }
}

test();
