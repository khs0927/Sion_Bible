import { useState } from 'react';
import { askVerseQuestion, type VerseQuestionAnswer } from '../../services/verseQuestionApi';
import type { VerseDevotionResult } from '../../services/verseDevotionApi';

const EXAMPLE_QUESTIONS = [
  '이 구절에서 가장 중요한 단어는 무엇인가요?',
  '이 본문의 배경이나 상황을 쉽게 설명해줘.',
  '이 묵상을 오늘 내 삶에 어떻게 적용할 수 있을까요?',
  '본문에서 하나님은 어떤 분으로 드러나나요?',
  '기도문을 더 개인적인 고백으로 바꿔줘.',
  '아이에게 설명하듯 쉽게 풀어줘.',
];

interface VerseQuestionPanelProps {
  verse: {
    ref: string;
    text: string;
  };
  devotion: VerseDevotionResult;
}

export function VerseQuestionPanel({ verse, devotion }: VerseQuestionPanelProps) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<VerseQuestionAnswer | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleAsk(nextQuestion: string) {
    if (!nextQuestion.trim()) return;
    setQuestion(nextQuestion);
    setLoading(true);
    setAnswer(null);

    try {
      const result = await askVerseQuestion({
        ref: verse.ref,
        verseText: verse.text,
        meditation: devotion.meditation,
        prayer: devotion.prayer,
        question: nextQuestion,
      });
      setAnswer(result);
    } catch {
      alert('질문 답변을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mt-4 rounded-[24px] bg-white/40 p-4 backdrop-blur-sm border border-white/50 shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="w-full rounded-full bg-white px-4 py-3.5 font-black text-[#3D3129] shadow-sm hover:bg-[#FDF2E7] transition-colors border border-white/60"
      >
        더 궁금한 것 질문하기
      </button>

      {open && (
        <div className="mt-4 space-y-5">
          <div className="space-y-3">
            <p className="px-1 text-xs leading-6 text-[#7B6A5D] font-bold">
              예시 질문을 눌러 바로 물어보거나, 직접 궁금한 내용을 적어보세요.
            </p>

            <div className="flex flex-wrap gap-2">
              {EXAMPLE_QUESTIONS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => handleAsk(item)}
                  className="rounded-full bg-white/80 px-4 py-2.5 text-xs font-bold text-[#5C4D42] border border-[#E8D8C8] hover:bg-[#F5C292] hover:text-[#3D3129] transition-all shadow-sm"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white/50 rounded-2xl p-1 shadow-inner">
            <div className="flex gap-2 p-1">
              <input
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && question.trim() && !loading) handleAsk(question);
                }}
                placeholder="본문이나 묵상에서 궁금한 점을 적어보세요."
                className="min-w-0 flex-1 rounded-xl border border-[#E8D8C8] bg-white px-4 py-3.5 text-sm outline-none focus:border-[#F5C292] transition-colors shadow-sm"
              />
              <button
                type="button"
                disabled={!question.trim() || loading}
                onClick={() => handleAsk(question)}
                className="rounded-xl bg-[#F5C292] px-5 py-3.5 font-black text-[#3D3129] disabled:opacity-50 shadow-sm hover:bg-[#F3B070] transition-colors"
              >
                {loading ? '...' : '질문'}
              </button>
            </div>
          </div>

          {loading && (
            <div className="rounded-[22px] bg-white/60 p-6 text-center shadow-sm border border-white/80">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#F5C292] border-t-transparent mb-2" />
              <p className="text-sm font-bold text-[#3D3129]">답변을 준비하고 있어요.</p>
            </div>
          )}

          {answer && !loading && (
            <article className="rounded-[22px] bg-[#FFF8F1]/90 p-5 shadow-inner border border-[#F5E6D3] animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="mb-4">
                <p className="text-[10px] font-bold text-[#A17C5B] mb-1">질문</p>
                <p className="text-sm font-bold text-[#3D3129] leading-6">{answer.question}</p>
              </div>

              <div className="h-px bg-[#F5E6D3] mb-4" />

              <div>
                <p className="text-[10px] font-bold text-[#A17C5B] mb-1">답변</p>
                <p className="text-[15px] whitespace-pre-line leading-7 text-[#5C4D42]">{answer.answer}</p>
              </div>
            </article>
          )}
        </div>
      )}
    </section>
  );
}
