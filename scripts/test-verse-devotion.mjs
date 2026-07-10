const baseUrl = (process.env.SION_BIBLE_BASE_URL || 'http://127.0.0.1:3000').replace(/\/+$/, '');

async function requestJson(path, init) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch(`${baseUrl}${path}`, { ...init, signal: controller.signal });
    const raw = await response.text();
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      throw new Error(`${path} returned non-JSON content: ${raw.slice(0, 160)}`);
    }
    return { response, data };
  } finally {
    clearTimeout(timeout);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function runCheck(name, fn) {
  process.stdout.write(`\n--- ${name} ---\n`);
  try {
    await fn();
    console.log('PASS');
    return true;
  } catch (error) {
    console.error('FAIL:', error instanceof Error ? error.message : error);
    return false;
  }
}

const results = [];

results.push(await runCheck('API Health', async () => {
  const { response, data } = await requestJson('/api/health');
  assert(response.ok, `HTTP ${response.status}`);
  assert(data?.ok === true, 'health.ok must be true');
  assert(data?.runtime === 'vercel-function', 'unexpected runtime');
  console.log(JSON.stringify(data, null, 2));
}));

results.push(await runCheck('Verse Devotion', async () => {
  const { response, data } = await requestJson('/api/verse-devotion', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ref: '요한복음 4:41',
      verseText: '예수의 말씀을 인하여 믿는 자가 더욱 많아',
      mode: 'fast',
    }),
  });
  assert(response.ok, `HTTP ${response.status}`);
  assert(typeof data?.title === 'string' && data.title.length > 0, 'missing title');
  assert(typeof data?.meditation === 'string' && data.meditation.length > 0, 'missing meditation');
  assert(typeof data?.prayer === 'string' && data.prayer.includes('아멘'), 'invalid prayer');
  console.log(JSON.stringify({ provider: data.provider, model: data.model, fallback: data.fallback, title: data.title }, null, 2));
}));

results.push(await runCheck('Verse Question', async () => {
  const { response, data } = await requestJson('/api/verse-question', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ref: '마가복음 1:1',
      verseText: '하나님의 아들 예수 그리스도의 복음의 시작이라',
      question: '이 구절이 말하는 복음의 중심은 무엇인가요?',
    }),
  });
  assert(response.ok, `HTTP ${response.status}`);
  assert(typeof data?.answer === 'string' && data.answer.length > 20, 'missing answer');
  console.log(JSON.stringify({ provider: data.provider, model: data.model, fallback: data.fallback, answer: data.answer.slice(0, 160) }, null, 2));
}));

results.push(await runCheck('Bible Search Intent', async () => {
  const { response, data } = await requestJson('/api/bible-search-intent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: '사랑에 관한 말씀을 문맥에 맞게 순서대로 보여줘' }),
  });
  assert(response.ok, `HTTP ${response.status}`);
  assert(Array.isArray(data?.terms) && data.terms.length > 0, 'missing terms');
  assert(Array.isArray(data?.sections) && data.sections.length > 0, 'missing sections');
  console.log(JSON.stringify({ provider: data.provider, model: data.model, fallback: data.fallback, topics: data.topics, sections: data.sections.map((section) => section.title) }, null, 2));
}));

const passed = results.filter(Boolean).length;
console.log(`\n${passed}/${results.length} checks passed against ${baseUrl}`);
if (passed !== results.length) process.exitCode = 1;
