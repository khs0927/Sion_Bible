export interface AskVerseQuestionParams {
  ref: string;
  verseText: string;
  meditation?: string;
  prayer?: string;
  question: string;
}

export interface VerseQuestionAnswer {
  question: string;
  answer: string;
  followUpQuestion?: string;
}

export async function askVerseQuestion(
  params: AskVerseQuestionParams
): Promise<VerseQuestionAnswer> {
  const response = await fetch('/api/verse-question', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error || '질문 답변 생성에 실패했습니다.');
  }

  return data;
}
