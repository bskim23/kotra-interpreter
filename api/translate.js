// Vercel Serverless Function - GPT 번역
export default async function handler(req, res) {
  // CORS 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 환경변수에서 API 키 읽기
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'API key not configured' });
    }

    const { text, from, to } = req.body;
    
    if (!text || !from || !to) {
      return res.status(400).json({ error: 'Missing required fields: text, from, to' });
    }

    const langNames = {
      ko: "Korean",
      en: "English", 
      ja: "Japanese",
      zh: "Chinese"
    };
    
    const fromName = langNames[from] || from;
    const toName = langNames[to] || to;

    // OpenAI API 호출
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.3,
        max_tokens: 1024,
        messages: [
          {
            role: 'system',
            content: `You are a real-time interpreter. The input is in ${fromName}. Translate it to ${toName}. Output ONLY the translated text. Do NOT output the original language. Keep it natural and conversational.`
          },
          {
            role: 'user',
            content: text
          }
        ]
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return res.status(response.status).json({ 
        error: error.error?.message || 'GPT API error' 
      });
    }

    const data = await response.json();
    const translatedText = data.choices?.[0]?.message?.content?.trim() || '';
    
    res.status(200).json({ text: translatedText });
    
  } catch (error) {
    console.error('Translate error:', error);
    res.status(500).json({ error: error.message });
  }
}
