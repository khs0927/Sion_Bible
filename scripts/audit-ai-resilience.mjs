import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const classifier = read('src/services/aiError.ts');
const experience = read('src/aiExperience.ts');
const question = read('src/components/bible/VerseQuestionPanel.tsx');
const search = read('src/components/bible/BibleSearchSheet.tsx');
const devotion = read('src/components/bible/VerseDevotionPanel.tsx');
const main = read('src/main.tsx');

const checks = [
  ['offline failures are classified', classifier.includes("kind: 'offline'") && classifier.includes('navigator.onLine === false')],
  ['timeouts are classified', classifier.includes("kind: 'timeout'") && classifier.includes('AbortError'.toLowerCase())],
  ['rate limits are classified', classifier.includes("kind: 'rate-limit'") && classifier.includes('status === 429')],
  ['authentication failures are classified', classifier.includes("kind: 'auth'") && classifier.includes('status === 401')],
  ['provider failures are classified', classifier.includes("kind: 'provider'") && classifier.includes('status >= 500')],
  ['empty AI text is rejected', classifier.includes('assertNonEmptyAiText') && classifier.includes('내용이 없습니다')],
  ['AI API requests are centrally observed', experience.includes('AI_API_PATTERN') && experience.includes('window.fetch = async')],
  ['global AI status is accessible and retryable', experience.includes("setAttribute('role'") && experience.includes('다시 시도') && experience.includes('sion:ai-retry')],
  ['online and offline browser events are handled', experience.includes("addEventListener('offline'") && experience.includes("addEventListener('online'")],
  ['question requests stop immediately while offline', question.includes('if (isBrowserOffline())')],
  ['question answers reject empty content', question.includes("assertNonEmptyAiText(result.answer, 'AI 답변')")],
  ['question error card explains and retries', question.includes('failure.title') && question.includes('failure.message') && question.includes('다시 시도')],
  ['Bible search already exposes error and empty states', search.includes('검색을 완료하지 못했습니다') && search.includes('검색 결과가 없습니다')],
  ['devotion retains a local contextual fallback', devotion.includes('createContextualFallback') && devotion.includes('LOCAL_INITIAL')],
  ['application initializes AI resilience before rendering', main.includes('initializeAiExperience();')],
];

let failures = 0;
for (const [label, passed] of checks) {
  console.log(`${passed ? '✓' : '✗'} ${label}`);
  if (!passed) failures += 1;
}

if (failures > 0) {
  console.error(`AI resilience audit failed: ${failures} check(s) did not pass.`);
  process.exit(1);
}

console.log('AI resilience audit passed.');
