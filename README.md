# Sion Bible (시온 성경)

성경 읽기, 검색, 암송 및 AI 묵상 기능을 제공하는 현대적이고 아름다운 Bible PWA 앱입니다.

## 🚀 프로젝트 개요
- **기술 스택**: React, Vite, TypeScript, Tailwind CSS
- **배포 플랫폼**: Vercel (Serverless Functions 포함)
- **주요 기능**:
  - 홈탭: 매일의 말씀, 묵상, 기도문 제공 (정적 데이터 우선)
  - 성경탭: 전체 성경 구절 색인 검색 (Vercel CDN 최적화)
  - 통독탭: 읽기 계획 및 진행률 관리, 성경 읽기 화면 연동
  - 암송탭: 단계별 암송 연습 (읽기, 빈칸, 배열, 힌트), 알림 설정
  - AI 기능: NVIDIA API 기반 맞춤형 묵상/기도문/질문 답변
  - PWA: 오프라인 지원 및 모바일 홈 화면 설치 가능

## 📱 PWA 설치 가이드

시온성경은 웹 브라우저에서 앱처럼 설치하여 사용할 수 있습니다.

1. **Android (Chrome/Edge)**:
   - 홈 화면에서 **"APP 설치"** 버튼을 누르거나, 브라우저 메뉴에서 '앱 설치'를 선택하세요.
2. **iOS (Safari)**:
   - **"홈 화면에 추가"** 버튼을 누른 후 가이드에 따라 '공유' -> '홈 화면에 추가'를 눌러주세요.
3. **iOS (Chrome/Edge)**:
   - Safari 브라우저로 접속하여 설치해 주세요.
4. **PC (Chrome/Edge)**:
   - 주소창 우측의 설치 아이콘을 클릭하세요.

## 💻 로컬 개발 환경 설정

### 1. 의존성 설치
```bash
npm install
```

### 2. 환경변수 설정
`.env.local` 파일을 생성하고 아래 내용을 입력하세요 (자세한 내용은 `.env.example` 참고).
```bash
NVIDIA_API_KEY=your_api_key_here
```

### 3. 개발 서버 실행
- **화면 디자인/로직만 테스트**:
  ```bash
  npm run dev
  ```
- **AI 묵상/기도문 기능 포함 테스트 (권장)**:
  ```bash
  npm run dev:vercel
  ```
  *(127.0.0.1:3000 포트에서 실행되며, /api/* 경로의 서버리스 함수가 함께 작동합니다.)*

## 🔍 AI 디버깅 및 트러블슈팅

AI 호출이 안 되거나 "올바르지 않은 응답" 메시지가 뜰 때 아래 순서대로 확인하세요.

### 1. 실행 방식 확인
반드시 `npm run dev:vercel`로 실행해야 합니다. `npm run dev`(Vite 단독 실행)는 `/api` 경로를 처리하지 못해 HTML(index.html)을 반환하게 됩니다.

### 2. API Health 체크
브라우저에서 `http://127.0.0.1:3000/api/health`에 접속하여 아래 항목을 확인하세요.
- `hasNvidiaKey`: `true`여야 합니다. (`false`인 경우 `.env.local` 설정 확인)
- API 경로가 404가 아닌 JSON을 반환해야 합니다.

### 3. 직접 API 테스트 (CLI)
터미널에서 아래 스크립트를 실행하여 API 응답 구조를 확인하세요.
```bash
node scripts/test-verse-devotion.mjs
```
또는 cURL을 사용하세요:
```bash
curl -X POST http://127.0.0.1:3000/api/verse-devotion \
  -H "Content-Type: application/json" \
  -d "{\"ref\":\"요한복음 4:41\",\"verseText\":\"예수의 말씀을 인하여 믿는 자가 더욱 많아\"}"
```

### 4. 캐시 초기화
이전의 실패한 응답(Fallback)이 브라우저에 남아있을 수 있습니다.
- 브라우저 개발자 도구(F12) → Application → Local Storage에서 `sion_verse_devotion_v3_`로 시작하는 키를 삭제하거나 `localStorage.clear()`를 실행하세요.

### 5. 환경변수 주의사항
- `NVIDIA_API_KEY`는 서버 측 환경변수이므로 `VITE_` 접두사를 붙이지 않습니다.
- 수정 후에는 반드시 터미널을 종료하고 다시 `npm run dev:vercel`을 실행해야 반영됩니다.

## 🛠 빌드 및 배포

### 1. 빌드 전 점검
```bash
# 타입 체크
npm run typecheck

# 빌드 실행
npm run build

# 빌드 결과 미리보기
npm run preview
```

### 2. GitHub 배포
```bash
git add .
git commit -m "Prepare Sion Bible for Vercel deployment"
git push origin main
```

### 3. Vercel 배포 설정
Vercel 대시보드에서 프로젝트를 연결할 때 아래 설정을 확인하세요.
- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Environment Variables**: 아래 항목들을 Vercel 설정에 등록해야 합니다.

## ⚡️ AI 속도 최적화 구조 (Hedged Request)

사용자 경험을 극대화하기 위해 다층적인 최적화 구조를 적용했습니다.

1.  **Cache First (캐시 우선)**: 로컬 스토리지에 저장된 결과가 있으면 AI 호출 없이 즉시 표시합니다.
2.  **Hedged Request (지연 병렬 호출)**:
    *   첫 번째 빠른 모델(`NVIDIA_FAST_MODEL_1`)을 즉시 호출합니다.
    *   1.2초 내에 응답이 없으면 두 번째 모델(`NVIDIA_FAST_MODEL_2`)을 추가로 호출하여 경합(Race)시킵니다.
    *   가장 먼저 유효한 JSON을 반환한 결과를 사용하고 나머지는 중단(Abort)합니다.
3.  **Quality Model (깊은 묵상/질문)**:
    *   `mode: "deep"` 묵상 요청과 구절 질문 답변은 `NVIDIA_QUALITY_MODEL`을 우선 사용합니다.
    *   품질 모델이 지연되거나 실패하면 빠른 모델로 fallback합니다.
4.  **Timeout & Fallback (타임아웃 및 폴백)**:
    *   일반 구절 묵상은 빠른 모델 경합을 우선하며, 깊은 묵상/질문은 품질 모델에 최대 15초를 허용합니다.
    *   모든 모델이 실패하면 **Gemini API**를 통해 2차 시도를 수행합니다.
    *   모든 AI 서비스가 불가한 경우, 정중한 안내가 담긴 **기본 묵상 템플릿**을 즉시 제공하여 끊김 없는 경험을 보장합니다.

## 🔑 환경변수 (Vercel Environment Variables)

| 변수명 | 설명 | 비고 |
| :--- | :--- | :--- |
| `NVIDIA_API_KEY` | NVIDIA AI API 키 | Sensitive (Secret) |
| `NVIDIA_FAST_MODEL_1` | 1순위 빠른 모델 | `meta/llama-3.1-8b-instruct` |
| `NVIDIA_FAST_MODEL_2` | 2순위 빠른 모델 | `openai/gpt-oss-20b` |
| `NVIDIA_QUALITY_MODEL`| 고품질 모델 (통독용) | `nvidia/llama-3.3-nemotron-super-49b-v1` |
| `GEMINI_API_KEY` | Gemini API 키 | Optional (Fallback 용) |
| `VITE_APP_NAME` | 앱 이름 | `SION BIBLE` |

## 🛡 무료 한도 보호 및 정책
- **캐시 활용**: 동일 구절에 대한 중복 AI 호출을 원천 차단합니다.
- **지연 병렬**: 무조건적인 병렬 호출이 아닌, 지연 시간(1.2s)을 둔 선별적 호출로 API 할당량을 보호합니다.
- **데이터 제한**: 본문 길이를 제한하고 `max_tokens`를 최적화하여 비용과 속도를 동시에 잡았습니다.
- **정적 데이터**: 홈탭의 '오늘의 말씀'은 실시간 AI 호출 없이 사전 생성된 데이터를 사용하여 안정성을 확보합니다.

## ✅ 배포 후 테스트 체크리스트
- [ ] **성경 읽기**: 구절 클릭 시 1~2초 내외로 묵상이 뜨는지 확인 (네트워크 환경에 따라 상이)
- [ ] **캐시 확인**: 한 번 읽은 구절을 다시 클릭했을 때 0.1초 내로 즉시 뜨는지 확인
- [ ] **로딩 UI**: 2.5초 이상 지연 시 로딩 문구가 단계별로 변하는지 확인
- [ ] **통독**: 긴 본문(예: 창세기 1-6장) 요청 시 타임아웃 없이 순차 생성되는지 확인

## 🧪 API 테스트 (cURL)
```bash
curl -X POST https://your-app-domain.vercel.app/api/verse-devotion \
  -H "Content-Type: application/json" \
  -d '{"ref":"요한복음 14:27","verseText":"평안을 너희에게 끼치노니..."}'
```
