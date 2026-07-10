import { useState } from 'react';
import { BookOpen, Check, Cross, Heart, RefreshCw, Send, Sparkles } from 'lucide-react';
import { askVerseQuestion, type VerseQuestionAnswer } from '../../services/verseQuestionApi';
import type { VerseDevotionResult } from '../../services/verseDevotionApi';

const QUESTION_GROUPS = [
  {
    id: 'understanding',
    title: '본문 이해',
    icon: <BookOpen size={18} />,
    color: 'orange',
    questions: ['핵심 메시지는?', '앞뒤 흐름은?', '핵심 단어는?'],
  },
  {
    id: 'god',
    title: '하나님 관점',
    icon: <Heart size={18} />,
    color: 'rose',
    questions: ['하나님은 어떤 분이신가요?', '이 말씀이 비추는 내 마음은?'],
  },
  {
    id: 'jesus',
    title: '예수님 연결',
    icon: <Cross size={18} />,
    color: 'purple',
    questions: ['예수님과 어떻게 연결되나요?'],
  },
  {
    id: 'apply',
    title: '오늘 적용',
    icon: <Check size={18} />,
    color: 'green',
    questions: ['오늘 무엇에 순종할까요?', '내려놓을 것은 무엇인가요?'],
  },
  {
    id: 'prayer',
    title: '기도와 암송',
    icon: <Sparkles size={18} />,
    color: 'yellow',
    questions: ['어떻게 기도하면 좋을까요?', '붙들 핵심 단어는?'],
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
  const [selectedQuestion, setSelectedQuestion] = useState('');
  const [answer, setAnswer] = useState<VerseQuestionAnswer | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleAsk(nextQuestion: string) {
    const trimmed = nextQuestion.trim();
    if (!trimmed || loading) return;

    setQuestion(trimmed);
    setSelectedQuestion(trimmed);
    setLoading(true);
    setAnswer(null);
    setError('');

    try {
      const result = await askVerseQuestion({
        ref: verse.ref,
        verseText: verse.text,
        meditation: devotion.meditation,
        prayer: devotion.prayer,
        question: trimmed,
      });
      setAnswer({ ...result, answer: result.answer.replace(/\*\*/g, '') });
    } catch (askError) {
      setError(askError instanceof Error
        ? askError.message
        : '질문 답변을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="meditation-question-panel" aria-label="묵상 질문하기">
      <div className="meditation-question-title">
        <div className="meditation-question-leaf" aria-hidden="true">⌁</div>
        <h2>묵상 질문하기</h2>
        <p>본문을 중심으로 말씀을 더 깊이 살펴보세요</p>
      </div>

      <div className="meditation-question-input">
        <input
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void handleAsk(question);
          }}
          placeholder="본문이나 묵상에서 궁금한 점을 적어보세요."
          aria-label="묵상 질문 입력"
        />
        <button type="button" disabled={!question.trim() || loading} onClick={() => void handleAsk(question)}>
          <span>{loading ? '준비 중' : '질문'}</span>
          <Send size={16} />
        </button>
      </div>

      {loading && (
        <div className="meditation-question-loading" role="status">
          <div />
          <p>본문과 질문을 함께 살펴보고 있어요</p>
        </div>
      )}

      {error && !loading && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold leading-6 text-red-700" role="alert">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => void handleAsk(question)}
            className="mt-3 inline-flex items-center gap-1 rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-black text-red-700"
          >
            <RefreshCw size={14} />다시 시도
          </button>
        </div>
      )}

      {answer && !loading && (
        <article className="meditation-answer-card">
          <div>
            <span>질문</span>
            <p>{answer.question}</p>
          </div>
          <div className="meditation-answer-divider" />
          <div>
            <span>답변</span>
            <p>{answer.answer}</p>
          </div>
          {answer.followUpQuestion && (
            <div className="meditation-followup">
              <span>이어 묵상할 질문</span>
              <p>{answer.followUpQuestion}</p>
            </div>
          )}
        </article>
      )}

      <div className="meditation-question-guide">궁금한 질문을 선택해보세요</div>

      <div className="meditation-question-list">
        {QUESTION_GROUPS.map((group) => (
          <article key={group.id} className="meditation-question-card">
            <div className="meditation-category-title">
              <div className={`meditation-category-icon ${group.color}`}>{group.icon}</div>
              <h3>{group.title}</h3>
            </div>
            <div className="meditation-chip-list">
              {group.questions.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={`meditation-question-chip ${selectedQuestion === item ? 'active' : ''}`}
                  onClick={() => void handleAsk(item)}
                  disabled={loading}
                >
                  {item}
                </button>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
