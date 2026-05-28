import handler from '../api/verse-devotion.js';

// Setup environment variables
process.env.NVIDIA_API_KEY = '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';

async function runTest() {
  const req = {
    method: 'POST',
    body: {
      ref: '시편 46:1',
      verseText: '하나님은 우리의 피난처시요 힘이시니 환난 중에 만날 큰 도움이시라',
      mode: 'fast'
    }
  };

  const res = {
    headers: {},
    statusCode: 200,
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      console.log('Status Code:', this.statusCode);
      console.log('Response JSON:', JSON.stringify(data, null, 2));
    }
  };

  console.log('Running local verse-devotion handler test for 시편 46:1...');
  await handler(req, res);
}

runTest().catch(err => console.error('Fatal Test Error:', err));
