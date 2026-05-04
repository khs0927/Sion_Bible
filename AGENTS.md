# AGENTS.md

## 프로젝트 개요

이 프로젝트는 ARENA.AI에서 생성된 React/Vite 기반 성경말씀 PWA입니다. GitHub에서 관리하고 Vercel 같은 무료 정적 호스팅에 배포하는 것을 목표로 합니다.

## 작업 원칙

- 기존 기능을 임의로 삭제하지 않는다.
- 수정 전 관련 파일을 먼저 읽고 영향 범위를 확인한다.
- 한 번에 대규모 구조 변경을 하지 않는다.
- 작은 단위로 수정하고 commit 가능한 상태로 만든다.
- 실행 가능한 코드만 작성한다.
- 설명은 한국어로 한다.

## 보안 규칙

- `.env` 파일을 commit하지 않는다.
- API Key를 코드에 직접 쓰지 않는다.
- API Key, DATABASE_URL, JWT_SECRET은 환경변수 또는 서버 측 설정으로만 사용한다.
- `.env.example`에는 키 이름만 작성하고 실제 값은 넣지 않는다.

## 배포 목표

- 프론트엔드는 Vercel, Cloudflare Pages, Netlify 중 하나에 배포한다.
- 서버 API가 필요한 경우 Cloudflare Workers, Vercel Functions, Koyeb 중 하나를 사용한다.
- DB가 필요한 경우 Supabase 또는 Neon을 사용한다.

## 코드 스타일

- TypeScript를 우선 사용한다.
- React 컴포넌트는 기존 구조를 먼저 존중하고, 커질 때만 `components`, `features`, `lib` 등으로 분리한다.
- API 호출 코드는 `services` 또는 `lib` 폴더에 분리한다.
- 에러 처리와 로딩 상태를 포함한다.

## 금지 사항

- `node_modules`를 수정하지 않는다.
- build 결과물을 직접 수정하지 않는다.
- 비밀키를 로그에 출력하지 않는다.
- 사용하지 않는 대규모 라이브러리를 임의로 추가하지 않는다.
