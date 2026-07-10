# Sion Bible · 시온성경

성경 읽기, 정확한 위치 검색, 질문형 말씀 검색, 통독 계획, 암송, 묵상 기록을 하나의 모바일 PWA로 제공하는 React 애플리케이션입니다.

## 현재 구조

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS
- **Hosting/API**: Vercel Static Hosting + Serverless Functions
- **Bible data**: 사용자 제공 한국어 성경 색인을 정적 파일로 제공
- **AI providers**: NVIDIA API 우선, Gemini 서버 측 fallback, 로컬 안전 fallback
- **Storage**: 브라우저 Local Storage 기반 저장 말씀·통독 진행·암송·묵상 기록
- **PWA**: 홈 화면 설치 및 기본 오프라인 셸 지원

## 주요 기능

### 홈
- 오늘의 말씀과 정적 묵상 우선 표시
- 기분·상황별 말씀 추천
- 말씀 복사, 저장, 암송, 듣기
- 구절별 묵상 및 질문

### 성경
- 66권 전체 장·절 읽기
- 성경 위치 검색: `마가복음 1:1`, `요 3:16-18`, 여러 범위 검색
- 일반 단어 검색
- 질문 검색: 질문의 의도를 주제별로 나누고 실제 성경 색인에서 관련 구절만 선별
- 여러 절 연속 선택·복사·저장·암송

### 통독
- 추천 통독 코스와 사용자 코스
- 시작 버튼을 누르면 첫날 본문으로 직접 이동
- 오늘 읽기, 완료 처리, 실제 진행률과 연속 기록
- 읽기 기록과 배지·포인트
- 날짜별 묵상 기록

### 암송
- 저장 말씀 또는 성경에서 구절 추가
- 단계별 연습과 복습 일정
- 앱 내부 복습 알림

## AI 요청 구조

브라우저에서 API 키를 직접 사용하지 않습니다. 모든 비밀키는 Vercel Serverless Function에서만 읽습니다.

### `/api/verse-devotion`
1. 브라우저 캐시 확인
2. NVIDIA 추천 모델을 지연 경합 방식으로 호출
3. 응답 JSON과 본문 연관성 검증
4. 실패 시 Gemini 호출 및 동일 검증
5. 모두 실패하면 본문을 벗어나지 않는 로컬 묵상 안내 반환

### `/api/verse-question`
- 질문·본문 길이 제한
- NVIDIA 동적 모델 선택과 경합
- Gemini fallback
- 결과 한국어·길이·JSON 구조 검증
- 정상 답변은 브라우저에 30일 캐시

### `/api/bible-search-intent`
- 질문에서 검색어·주제·구조만 생성
- AI가 성경 본문을 만들거나 인용하지 않음
- 실제 결과는 로컬 한국어 성경 색인에서만 가져옴
- AI 사용이 불가능해도 로컬 주제 검색으로 계속 동작

### `/api/health`
배포 환경에서 AI 설정과 선택 모델을 확인하는 진단 endpoint입니다. 비밀키 자체는 반환하지 않습니다.

## 로컬 실행

```bash
npm install
cp .env.example .env.local
npm run dev:vercel
```

화면만 빠르게 확인할 때는 다음 명령을 사용합니다.

```bash
npm run dev
```

Vite 단독 서버에서는 `/api/*` 서버리스 함수가 실행되지 않으므로 AI 기능은 로컬 fallback으로 동작할 수 있습니다.

## 필수 환경변수

```env
NVIDIA_API_KEY=
```

Gemini fallback을 함께 사용하려면 다음을 추가합니다.

```env
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.1-flash-lite
```

모델을 직접 고정하지 않으면 NVIDIA 모델 목록을 확인한 뒤 추천 모델을 일정 시간 메모리에 캐시합니다.

```env
NVIDIA_PRIMARY_MODEL=
NVIDIA_SECONDARY_MODEL=
NVIDIA_QUALITY_MODEL=
NVIDIA_DEEP_MODEL=
NVIDIA_MODEL_DISCOVERY=1
```

비밀키에는 절대로 `VITE_` 접두사를 붙이지 마세요. `VITE_` 변수는 브라우저 번들에 노출될 수 있습니다.

## 검증

```bash
npm run typecheck
npm run build
```

`main` 브랜치 push와 pull request마다 GitHub Actions가 위 검사를 실행합니다.

배포 후 확인 항목:

1. `/api/health`가 JSON을 반환하는지 확인
2. 성경탭에서 `마가복음 1:1` 검색 및 1장 첫 절 표시 확인
3. 질문 검색에서 주제별 실제 구절이 표시되는지 확인
4. 구절 묵상과 질문이 정상 응답 또는 안전 fallback을 반환하는지 확인
5. 통독 코스 `시작하기`가 첫날 본문으로 이동하는지 확인
6. 통독 오늘·기록·보상 페이지가 새로고침 없이 전환되는지 확인
7. 설치형 PWA를 완전히 종료 후 다시 열어 최신 캐시가 반영되는지 확인

## 배포

Vercel 프로젝트 설정:

- Framework Preset: **Vite**
- Build Command: `npm run build`
- Output Directory: `dist`
- Node.js: 22 권장
- Production 환경변수: `.env.example`의 서버 측 변수 중 실제 사용하는 값

Git 연동 프로젝트는 `main` 브랜치에 push되면 Production 배포가 생성됩니다.

## 보안 원칙

- API 키는 서버에서만 사용
- 요청 본문 길이 제한
- 외부 응답 JSON 검증
- Production에서 디버그 세부정보 숨김
- 성경 본문은 AI가 생성하지 않고 로컬 색인을 단일 진실 원천으로 사용
- AI 장애 시 앱 기능 전체가 멈추지 않도록 로컬 fallback 제공
