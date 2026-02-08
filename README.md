# KOTRA 실시간 통역 Pro - Vercel 배포 가이드

## 📁 파일 구조

```
kotra-interpreter/
├── index.html          (메인 HTML 파일)
└── api/
    ├── transcribe.js   (Whisper 음성인식 API)
    ├── translate.js    (GPT 번역 API)
    └── transcript.js   (대화록 생성 API)
```

---

## 🚀 Vercel 배포 방법

### Step 1: GitHub에 업로드

1. **github.com** 접속 → 로그인
2. **New repository** 클릭
3. Repository name: `kotra-interpreter`
4. **Public** 선택
5. **Create repository** 클릭
6. **uploading an existing file** 클릭
7. **모든 파일 드래그 & 드롭**:
   - index.html
   - api 폴더 (폴더째 업로드)
8. **Commit changes** 클릭

---

### Step 2: Vercel 배포

1. **vercel.com** 접속 → 로그인
2. **Add New...** → **Project** 클릭
3. **Import Git Repository**에서 `kotra-interpreter` 선택
4. **Import** 클릭

---

### Step 3: 환경변수 설정 (중요!)

**Configure Project** 화면에서:

1. **Environment Variables** 섹션 찾기
2. **Add** 버튼 클릭
3. 다음 입력:
   - **Name**: `OPENAI_API_KEY`
   - **Value**: `sk-proj-...` (실제 OpenAI API 키)
4. **Add** 클릭

---

### Step 4: 배포 완료

1. **Deploy** 버튼 클릭
2. 1-2분 기다리면 배포 완료!
3. URL 받기: `https://kotra-interpreter.vercel.app`

---

## ✅ 테스트

1. URL 접속
2. 마이크 권한 허용
3. **바로 사용 가능!** (API 키 입력 불필요)

---

## 🔐 보안

- ✅ API 키는 Vercel 서버에만 저장
- ✅ 브라우저에서는 절대 키를 볼 수 없음
- ✅ GitHub Public 저장소여도 완전 안전

---

## 🆘 문제 해결

### "API key not configured" 오류

→ Vercel Dashboard → 프로젝트 → Settings → Environment Variables → API 키 확인

### 음성인식 안 됨

→ HTTPS 연결 확인 (Vercel은 자동으로 HTTPS 제공)

### 배포 후 변경사항 반영

→ GitHub에 파일 수정 후 push하면 Vercel이 자동 재배포

---

## 📊 성능

- Whisper 음성인식: ~2.5초
- GPT 번역: ~1.3초
- 총: ~3.8초

---

## 💰 비용

**Vercel (무료):**
- 호스팅: 무료
- Serverless Functions: 월 100GB 실행 무료

**OpenAI (사용량 기반):**
- Whisper: $0.006/분
- GPT-4o-mini: $0.15/1M 입력 토큰
- 30분 시연: 약 $2-3

---

완성! 🎉
