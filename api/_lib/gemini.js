/**
 * Gemini Fallback Utility
 */
export async function callGeminiChat({
  apiKey = process.env.GEMINI_API_KEY,
  model = process.env.GEMINI_FALLBACK_MODEL || 'gemini-1.5-flash-lite',
  messages,
  temperature = 0.5,
  maxTokens = 1024,
}) {
  if (!apiKey) return null;

  // Transform messages to Gemini format
  const contents = messages.map(m => ({
    role: m.role === 'system' || m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.content }]
  }));

  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens,
          responseMimeType: "application/json"
        }
      })
    });

    if (!response.ok) {
      console.error('Gemini API failed:', response.status);
      return null;
    }

    const data = await response.json();
    const content = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    return {
      model,
      content,
    };
  } catch (error) {
    console.error('Gemini error:', error);
    return null;
  }
}
