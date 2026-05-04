# Sion_Bible

성경 PWA 앱 _ Product by SionBible

ARENA.AI에서 생성한 React/Vite 기반 성경말씀 PWA입니다.

## 실행

```bash
npm install
npm run dev
```

## 빌드

```bash
npm run build
npm run preview
```

## 배포

Vercel, Cloudflare Pages, Netlify 같은 정적 사이트 호스팅에 배포할 수 있습니다.

Vercel/Vite 기본 설정:

```txt
Build Command: npm run build
Output Directory: dist
```

## 환경변수

현재 앱은 클라이언트 전용 PWA라서 필수 환경변수가 없습니다.
API 키가 필요한 기능을 추가할 경우 키를 프론트엔드에 직접 넣지 말고 서버 API, Cloudflare Workers, 또는 Vercel Functions 같은 프록시를 통해 호출하세요.
