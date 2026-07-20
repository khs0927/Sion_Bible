import test from 'node:test';
import assert from 'node:assert/strict';
import {
  hasSpeechLevelMismatch,
  normalizeAndValidateDevotionSpeechLevel,
  normalizeFormalKorean,
} from './devotionStyleGuard.js';

test('반말형 서술어를 합니다체로 정규화한다', () => {
  const source = '저는 오늘 주님의 길을 생각한다. 그 은혜를 기억한다. 작은 순종을 실천하고 싶다.';
  const normalized = normalizeFormalKorean(source);
  assert.equal(
    normalized,
    '저는 오늘 주님의 길을 생각합니다. 그 은혜를 기억합니다. 작은 순종을 실천하고 싶습니다.',
  );
  assert.equal(hasSpeechLevelMismatch(normalized), false);
});

test('묵상과 기도문의 1인칭 존댓말 조건을 통과시킨다', () => {
  const result = normalizeAndValidateDevotionSpeechLevel({
    explanation: '이 말씀은 하나님께서 기다림 속에서도 은혜를 베푸시는 분임을 보여줍니다.',
    meditation: '저는 오늘 바쁜 일상 속에서 잠시 멈추어 주님의 말씀을 기억한다. 작은 순종을 실천하고 싶다.',
    prayer: '주님, 제 마음을 살피시고 믿음으로 기다릴 수 있도록 도와주소서.',
  });
  assert.ok(result);
  assert.match(result.meditation, /기억합니다/);
  assert.match(result.meditation, /싶습니다/);
  assert.match(result.prayer, /^아버지,/);
});

test('1인칭 고백이 없는 묵상은 거부한다', () => {
  const result = normalizeAndValidateDevotionSpeechLevel({
    explanation: '이 말씀은 하나님의 은혜를 보여줍니다.',
    meditation: '오늘 말씀을 천천히 읽습니다. 은혜를 기억합니다.',
    prayer: '아버지, 말씀을 붙들게 하소서.',
  });
  assert.equal(result, null);
});
