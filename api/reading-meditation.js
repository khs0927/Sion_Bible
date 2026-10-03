import {
  DEFAULT_PRIMARY_FAST_MODEL,
  DEFAULT_SECONDARY_FAST_MODEL,
  DEFAULT_QUALITY_MODEL,
  callNvidiaChat,
  getNvidiaApiKey,
  normalizeError,
  parseJsonLoose,
  sendJson,
  validateVerseDevotion,
} from './_lib/nvidia.js';
import { hedgedNvidiaRace } from './_lib/hedgedAiRace.js';

const MAX_CHAPTERS_TEXT_LENGTH = 28000;
const CHAPTER_CONCURRENCY = 2; // Reduced for stability

function validateChapter(parsed) {
  const chapterTitle = String(parsed?.chapterTitle ?? parsed?.title ?? '').trim();
  const summary = String(parsed?.summary ?? '').trim();
  const meditation = String(parsed?.meditation ?? '').trim();
  const application = String(parsed?.application ?? parsed?.todayApplication ?? '').trim();
  if (!summary || !meditation) return null;
  return { chapterTitle, summary, meditation, application };
}

function validatePrayerApplications(parsed) {
  const applications = Array.isArray(parsed?.applications)
    ? parsed.applications.map((item) => String(item).trim()).filter(Boolean).slice(0, 3)
    : [];
  const prayer = String(parsed?.prayer ?? '').trim();
  if (applications.length === 0 || !prayer) return null;
  return { applications, prayer };
}

function splitChapters(chaptersText) {
  const text = String(chaptersText ?? '').trim();
  const matches = [...text.matchAll(/\[([^\]\n]+)\]\s*([\s\S]*?)(?=\n\n\[|$)/g)];
  if (matches.length > 0) {
    return matches.map((match, index) => ({
      title: match[1].trim() || `${index + 1}장`,
      text: match[2].trim(),
    })).filter((item) => item.text);
  }
  return [{ title: '본문', text }];
}

async function runWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

function chapterMessages(passageTitle, chapter) {
  return [
    {
      role: 'system',
      content: '너는 한국어 성경 통독 묵상을 돕는 목회적 글쓰기 도우미다. JSON만 반환하고, 본문에 없는 내용을 억지로 만들지 않는다.',
    },
    {
      role: 'user',
      content: `아래 통독 본문의 한 장에 대한 묵상을 JSON으로 작성해줘.
JSON 형식: {"chapterTitle":"장 제목","summary":"핵심 요약","meditation":"묵상 내용","application":"오늘 적용"}

통독 제목: ${passageTitle}
장: ${chapter.title}
본문: ${chapter.text.slice(0, 6000)}`,
    },
  ];
}

function sermonMessages(passageTitle, chapters) {
  return [
    {
      role: 'system',
      content: '너는 성경 본문을 차분하게 연결해 설교문 형태의 묵상 글을 쓰는 한국어 목회적 글쓰기 도우미다. JSON만 반환한다.',
    },
    {
      role: 'user',
      content: `아래 통독 본문 전체 흐름을 하나로 연결한 설교문 형태의 묵상 글을 작성해줘.
JSON 형식: {"title":"설교문 제목","body":"설교문 형태의 묵상 글"}

통독 제목: ${passageTitle}
${chapters.map((chapter) => `[${chapter.title}]\n${chapter.text.slice(0, 2000)}`).join('\n\n')}`,
    },
  ];
}

function prayerMessages(passageTitle, chapters) {
  return [
    {
      role: 'system',
      content: '너는 한국어 성경 묵상 적용과 기도문을 돕는 목회적 글쓰기 도우미다. JSON만 반환한다.',
    },
    {
      role: 'user',
      content: `아래 통독 본문의 전체 흐름을 바탕으로 오늘 적용 3가지와 기도문을 JSON으로 작성해줘.
JSON 형식: {"applications":["적용 1","적용 2","적용 3"],"prayer":"기도문"}

통독 제목: ${passageTitle}
${chapters.map((chapter) => `[${chapter.title}]\n${chapter.text.slice(0, 1000)}`).join('\n\n')}`,
    },
  ];
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      return sendJson(res, 200, { status: 'ok', message: 'Reading Meditation API is running' });
    }

    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST, GET');
      return sendJson(res, 405, { error: 'Method not allowed' });
    }

    const apiKey = getNvidiaApiKey();
    if (!apiKey) {
      return sendJson(res, 500, { error: 'NVIDIA_API_KEY가 설정되지 않았습니다.', detail: '서버 환경 변수를 확인해주세요.' });
    }

    const { passageTitle, chaptersText } = req.body ?? {};
    if (!passageTitle || !chaptersText) {
      return sendJson(res, 400, { error: 'passageTitle and chaptersText are required' });
    }

    const fastModels = [
      process.env.NVIDIA_PRIMARY_MODEL || process.env.NVIDIA_FAST_MODEL_1 || DEFAULT_PRIMARY_FAST_MODEL,
      process.env.NVIDIA_SECONDARY_MODEL || process.env.NVIDIA_FAST_MODEL_2 || DEFAULT_SECONDARY_FAST_MODEL,
    ];
    const qualityModel = process.env.NVIDIA_QUALITY_MODEL || DEFAULT_QUALITY_MODEL;
    const chapters = splitChapters(chaptersText);

    try {
      const [chapterResults, sermonResponse, prayerResponse] = await Promise.all([
        runWithConcurrency(chapters, CHAPTER_CONCURRENCY, async (chapter) => {
          const race = await hedgedNvidiaRace({
            apiKey,
            models: fastModels,
            messages: chapterMessages(passageTitle, chapter),
            validate: validateChapter,
            maxTokens: 800,
            timeoutMs: 9000, // Stay within serverless limits
          });
          return race.result;
        }),
        callNvidiaChat({
          apiKey,
          model: qualityModel,
          messages: sermonMessages(passageTitle, chapters),
          maxTokens: 1600,
        }).catch(err => {
          console.warn('Sermon generation failed:', err.message);
          return { content: '{"title":"말씀 묵상","body":"본문을 읽으며 오늘 하루 하나님의 뜻을 구해보세요."}' };
        }),
        hedgedNvidiaRace({
          apiKey,
          models: fastModels,
          messages: prayerMessages(passageTitle, chapters),
          validate: validatePrayerApplications,
          maxTokens: 800,
          timeoutMs: 9000,
        }),
      ]);

      let sermon;
      try {
        const parsed = parseJsonLoose(sermonResponse.content);
        sermon = {
          title: String(parsed?.title ?? '본문을 잇는 묵상').trim(),
          body: String(parsed?.body ?? sermonResponse.content).trim(),
        };
      } catch {
        sermon = { title: '본문을 잇는 묵상', body: sermonResponse.content };
      }

      const overview = chapterResults.map((chapter) => `${chapter.chapterTitle || ''}: ${chapter.summary}`).join(' ');

      return sendJson(res, 200, {
        title: `${passageTitle} 통독 묵상`,
        overview,
        chapters: chapterResults,
        sermon,
        applications: prayerResponse.result.applications,
        prayer: prayerResponse.result.prayer,
      });
    } catch (error) {
      console.error('Reading Meditation Generation Error:', error);
      const normalized = normalizeError(error);
      return sendJson(res, normalized.status, {
        error: '통독 묵상 생성에 실패했습니다.',
        detail: normalized.detail,
      });
    }
  } catch (fatalError) {
    console.error('Fatal Reading API Error:', fatalError);
    return sendJson(res, 500, { error: '서버 내부 오류가 발생했습니다.', detail: fatalError.message });
  }
}
