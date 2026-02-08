// Vercel Serverless Function - 대화록 생성
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

    const { chatLog, today } = req.body;
    
    if (!chatLog || !Array.isArray(chatLog)) {
      return res.status(400).json({ error: 'Invalid chatLog' });
    }

    // OpenAI API 호출
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.4,
        max_tokens: 2048,
        messages: [
          {
            role: 'system',
            content: `당신은 비즈니스 통역 대화록 작성 전문가입니다. 아래 통역 대화 기록을 바탕으로 한국어 대화록을 작성해주세요.

작성 규칙:
- 제목: 통역 대화록
- 날짜: ${today || '날짜 정보 없음'}
- 모든 내용을 한국어로 정리
- 외국어 발언은 한국어 번역을 기준으로 작성
- 화자를 "한국측"과 "외국측"으로 구분
- 시간 표시 포함
- 마지막에 주요 논의 사항을 간단히 요약
- 깔끔하고 공식적인 문서 형태로 작성`
          },
          {
            role: 'user',
            content: '다음 통역 대화를 한국어 대화록으로 정리해주세요:\n\n' + JSON.stringify(chatLog)
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
    const transcript = data.choices?.[0]?.message?.content?.trim() || '';
    
    res.status(200).json({ transcript });
    
  } catch (error) {
    console.error('Transcript error:', error);
    res.status(500).json({ error: error.message });
  }
}
