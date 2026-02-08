// Vercel Serverless Function - Whisper 음성인식
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

    // multipart/form-data 파싱 (Vercel이 자동 처리)
    const formData = new FormData();
    
    // body에서 오디오 데이터 가져오기
    const { audioBase64, langHint } = req.body;
    
    // Base64 디코딩
    const audioBuffer = Buffer.from(audioBase64, 'base64');
    const audioBlob = new Blob([audioBuffer], { type: 'audio/webm' });
    
    formData.append('file', audioBlob, 'audio.webm');
    formData.append('model', 'whisper-1');
    formData.append('response_format', 'verbose_json');
    if (langHint) {
      formData.append('language', langHint);
    }

    // OpenAI API 호출
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      body: formData
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return res.status(response.status).json({ 
        error: error.error?.message || 'Whisper API error' 
      });
    }

    const data = await response.json();
    res.status(200).json(data);
    
  } catch (error) {
    console.error('Transcribe error:', error);
    res.status(500).json({ error: error.message });
  }
}
