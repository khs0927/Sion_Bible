
async function test() {
  const baseUrl = 'http://127.0.0.1:3000';
  
  console.log('--- Checking API Health ---');
  try {
    const healthRes = await fetch(`${baseUrl}/api/health`);
    const healthData = await healthRes.json();
    console.log('Health Status:', healthRes.status);
    console.log('Health Data:', JSON.stringify(healthData, null, 2));
  } catch (err) {
    console.error('Health check failed:', err.message);
  }

  console.log('\n--- Testing Verse Devotion API ---');
  try {
    const postData = {
      ref: '요한복음 4:41',
      verseText: '예수의 말씀을 인하여 믿는 자가 더욱 많아'
    };
    
    const res = await fetch(`${baseUrl}/api/verse-devotion`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(postData)
    });
    
    const contentType = res.headers.get('content-type');
    const data = await res.json();
    
    console.log('Status:', res.status);
    console.log('Content-Type:', contentType);
    console.log('Fallback:', data.fallback);
    console.log('ErrorCode:', data.errorCode || 'none');
    console.log('Body:', JSON.stringify(data, null, 2));
    
  } catch (err) {
    console.error('API test failed:', err.message);
  }
}

test();
