# AI 성경탭 묵상 생성 연동 검증 보고서

검증 대상:

- `api/_lib/verseDevotionReferencePrompt.js`
- `api/verse-devotion.js`
- `src/services/verseDevotionApi.ts`

## 1. 프롬프트 파일 생성 여부

통과.

`api/_lib/verseDevotionReferencePrompt.js` 파일이 존재하며 다음 export를 제공한다.

- `VERSE_DEVOTION_REFERENCE_PROMPT_VERSION`
- `VERSE_DEVOTION_REFERENCE_STYLE_GUIDE`
- `buildVerseDevotionReferenceMessages()`

이 파일은 홈탭 60개 깊은 수기 원고의 방향을 기준으로 성경탭 AI 생성 결과가 따라야 할 문체와 구조를 정의한다.

## 2. 프롬프트 품질 기준

통과.

현재 기준 명령문에는 다음 품질 조건이 포함되어 있다.

- 공통 템플릿 반복 금지
- 본문 위치와 본문 내용 변경 금지
- 본문 문맥 중심 해설
- 1인칭 고백형 묵상
- `아버지,`로 시작하는 기도문
- `아버지, 감사합니다. 예수 그리스도의 이름으로 기도드립니다. 아멘.` 고정 마무리
- 고난, 질병, 장애, 가난, 실패를 개인의 죄 때문이라고 단정하지 말 것
- JSON 외 텍스트 출력 금지

## 3. 실제 API 연결 상태

미완료.

`api/verse-devotion.js`는 현재 실제 AI 요청 메시지를 만들 때 `buildCleanMessages(ref, verseText, requestMode)`를 사용하고 있다.

따라서 새로 만든 `buildVerseDevotionReferenceMessages()`는 아직 실제 `/api/verse-devotion` 요청 경로에 연결되지 않았다.

현재 상태는 다음과 같다.

```js
const messages = buildCleanMessages(ref, verseText, requestMode);
```

원하는 최종 상태는 다음과 같다.

```js
import { buildVerseDevotionReferenceMessages } from './_lib/verseDevotionReferencePrompt.js';

const messages = buildVerseDevotionReferenceMessages({
  ref,
  verseText,
  mode: requestMode,
});
```

## 4. 클라이언트 호출 경로

통과.

`src/services/verseDevotionApi.ts`는 성경탭에서 선택한 구절에 대해 `/api/verse-devotion`으로 POST 요청을 보내는 구조다.

요청 body에는 다음 값이 들어간다.

```json
{
  "ref": "성경 위치",
  "verseText": "성경 본문",
  "mode": "fast 또는 deep"
}
```

그러므로 서버 API만 새 프롬프트 빌더로 교체하면 성경탭 AI 생성 경로에 반영된다.

## 5. 결론

현재 검증 결과:

- 프롬프트 기준 파일 생성: 통과
- 프롬프트 내용 품질: 통과
- 클라이언트에서 `/api/verse-devotion` 호출: 통과
- 실제 서버 AI 메시지에 새 프롬프트 연결: 미완료

즉, 지금 상태는 “명령문은 준비되었지만 실제 AI 호출에는 아직 연결되지 않은 상태”다.

## 6. 다음 조치

`api/verse-devotion.js`에서 다음 두 가지를 반영해야 한다.

1. 상단 import 추가

```js
import { buildVerseDevotionReferenceMessages } from './_lib/verseDevotionReferencePrompt.js';
```

2. 메시지 생성부 교체

```js
const messages = buildVerseDevotionReferenceMessages({
  ref,
  verseText,
  mode: requestMode,
});
```

이 작업 후에는 실제 성경탭 AI 생성 결과가 홈탭 60개 깊은 수기 원고의 문체와 기준을 따르게 된다.
