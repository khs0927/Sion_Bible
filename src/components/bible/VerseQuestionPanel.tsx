import { useState } from 'react';
import { askVerseQuestion, type VerseQuestionAnswer } from '../../services/verseQuestionApi';
import type { VerseDevotionResult } from '../../services/verseDevotionApi';

const QUESTION_GROUPS = [
  {
    label: '본문 이해',
    questions: [
      '이 구절의 핵심 메시지는 무엇인가요?',
      '이 말씀의 배경과 앞뒤 흐름을 알려주세요.',
      '이 본문에서 가장 중요한 단어나 표현은 무엇인가요?',
    ],
  },
  {
    label: '하나님 관점',
    questions: [
      '하나님의 관점에서 이 구절은 무엇을 보여주나요?',
      '이 구절은 내 안의 어떤 두려움이나 불신을 비추나요?',
    ],
  },
  {
    label: '예수님 의지',
    questions: [
      '이 말씀은 예수 그리스도를 의지하는 삶과 어떻게 연결되나요?',
      '이 구절을 잘못 적용하지 않으려면 무엇을 조심해야 하나요?',
    ],
  },
  {
    label: '성령 동행',
    questions: [
      '이 말씀을 성령과 동행하는 삶에 어떻게 적용할 수 있나요?',
      '성령께 어떤 도움을 구하며 이 말씀을 살아내야 할까요?',
    ],
  },
  {
    label: '오늘 적용',
    questions: [
      '오늘 이 말씀에 순종한다면 구체적으로 무엇을 해야 할까요?',
      '이 말씀과 연결되는 다른 성경 주제는 무엇인가요?',
    ],
  },
  {
    label: '기도와 암송',
    questions: [
      '이 말씀으로 어떻게 기도하면 좋을까요?',
      '이 말씀을 암송할 때 붙들 핵심 단어는 무엇인가요?',
    ],
  },
];

interface VerseQuestionPanelProps {
  verse: {
    ref: string;
    text: string;
  };
  devotion: VerseDevotionResult;
}

export function VerseQuestionPanel({ verse, devotion }: VerseQuestionPanelProps) {
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
      // Strip markdown bold markers (asterisks)
      if (result.answer) {
        result.answer = result.answer.replace(/\*\*/g, '');
      }
      setAnswer(result);
    } catch {
      alert('질문 답변을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mt-2 rounded-[24px] bg-white/40 p-4 backdrop-blur-sm border border-white/50 shadow-sm">
      <div className="space-y-4">
        {/* Input at the top */}
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
          <div className="rounded-[22px] bg-white/60 p-5 text-center shadow-sm border border-white/80">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#F5C292] border-t-transparent mb-2" />
            <p className="text-sm font-bold text-[#3D3129]">답변을 준비하고 있어요.</p>
          </div>
        )}

        {answer && !loading && (
          <article className="rounded-[22px] bg-[#FFF8F1]/90 p-5 shadow-inner border border-[#F5E6D3] animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="mb-3">
              <p className="text-[10px] font-bold text-[#A17C5B] mb-1">질문</p>
              <p className="text-sm font-bold text-[#3D3129] leading-6">{answer.question}</p>
            </div>

            <div className="h-px bg-[#F5E6D3] mb-3" />

            <div>
              <p className="text-[10px] font-bold text-[#A17C5B] mb-1">답변</p>
              <p className="text-[15px] whitespace-pre-line leading-7 text-[#5C4D42]">{answer.answer}</p>
            </div>

            {answer.followUpQuestion && (
              <div className="mt-3 rounded-2xl bg-white/70 p-4 border border-[#F5E6D3]">
                <p className="text-[10px] font-bold text-[#A17C5B] mb-1">이어서 묵상할 질문</p>
                <p className="text-sm font-black leading-6 text-[#3D3129]">{answer.followUpQuestion}</p>
              </div>
            )}
          </article>
        )}

        {/* Example Questions at the bottom */}
        <div className="space-y-3">
          <p className="px-1 text-xs text-[#7B6A5D] font-bold">
            궁금한 질문을 선택해보세요!
          </p>

          <div className="space-y-4">
            {QUESTION_GROUPS.map((group) => (
              <div key={group.label} className="space-y-2">
                <p className="px-1 text-[10px] font-black text-[#A17C5B]">{group.label}</p>
                <div className="grid gap-2">
                  {group.questions.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => handleAsk(item)}
                      className="w-full text-left rounded-2xl bg-white/80 px-4 py-3 text-[12px] font-bold text-[#5C4D42] border border-[#E8D8C8] hover:bg-[#FDF2E7] hover:border-[#F5C292] transition-all shadow-sm leading-relaxed"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
