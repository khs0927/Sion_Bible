export type AiFailureKind = 'offline' | 'timeout' | 'rate-limit' | 'auth' | 'provider' | 'empty' | 'network' | 'unknown';

export type AiFailure = {
  kind: AiFailureKind;
  title: string;
  message: string;
  retryable: boolean;
  status?: number;
};

function statusFromError(error: unknown) {
  if (!error || typeof error !== 'object') return undefined;
  const record = error as Record<string, unknown>;
  const value = Number(record.status || record.statusCode || record.code);
  return Number.isFinite(value) && value >= 100 && value <= 599 ? value : undefined;
}

function errorText(error: unknown) {
  if (error instanceof Error) return `${error.name} ${error.message}`.trim().toLowerCase();
  return String(error || '').toLowerCase();
}

export function isBrowserOffline() {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

export function classifyAiFailure(error: unknown, statusOverride?: number): AiFailure {
  const status = statusOverride ?? statusFromError(error);
  const text = errorText(error);

  if (isBrowserOffline() || text.includes('offline')) {
    return {
      kind: 'offline',
      title: '인터넷 연결이 없습니다',
      message: '저장된 말씀과 기본 묵상은 계속 볼 수 있습니다. 연결이 복구되면 다시 시도해주세요.',
      retryable: true,
      status,
    };
  }

  if (
    text.includes('aborterror')
    || text.includes('aborted')
    || text.includes('timeout')
    || text.includes('시간 초과')
    || status === 408
    || status === 504
  ) {
    return {
      kind: 'timeout',
      title: '응답 시간이 길어지고 있습니다',
      message: 'AI 응답 시간이 초과되었습니다. 잠시 후 다시 요청하면 이어서 사용할 수 있습니다.',
      retryable: true,
      status,
    };
  }

  if (status === 429 || text.includes('rate limit') || text.includes('too many requests') || text.includes('사용량')) {
    return {
      kind: 'rate-limit',
      title: '요청이 잠시 많습니다',
      message: 'AI 사용량 제한에 도달했습니다. 잠시 쉬었다가 다시 시도해주세요.',
      retryable: true,
      status,
    };
  }

  if (status === 401 || status === 403 || text.includes('unauthorized') || text.includes('forbidden')) {
    return {
      kind: 'auth',
      title: 'AI 연결 설정을 확인해주세요',
      message: '서버의 AI 공급자 인증 또는 권한 설정이 필요합니다. 일반 성경 읽기와 로컬 검색은 계속 사용할 수 있습니다.',
      retryable: false,
      status,
    };
  }

  if (status && status >= 500) {
    return {
      kind: 'provider',
      title: 'AI 공급자가 잠시 응답하지 않습니다',
      message: '서버 또는 AI 공급자에 일시적인 문제가 있습니다. 잠시 후 다시 시도해주세요.',
      retryable: true,
      status,
    };
  }

  if (text.includes('empty') || text.includes('빈 응답') || text.includes('내용이 없습니다')) {
    return {
      kind: 'empty',
      title: '답변 내용이 비어 있습니다',
      message: '응답은 도착했지만 표시할 내용이 없습니다. 질문을 조금 다르게 작성해 다시 시도해주세요.',
      retryable: true,
      status,
    };
  }

  if (
    text.includes('failed to fetch')
    || text.includes('networkerror')
    || text.includes('load failed')
    || text.includes('network request failed')
  ) {
    return {
      kind: 'network',
      title: '네트워크 요청을 완료하지 못했습니다',
      message: '연결 상태를 확인한 뒤 다시 시도해주세요. 저장된 성경 데이터는 오프라인에서도 사용할 수 있습니다.',
      retryable: true,
      status,
    };
  }

  return {
    kind: 'unknown',
    title: 'AI 요청을 완료하지 못했습니다',
    message: error instanceof Error && error.message
      ? error.message
      : '잠시 후 다시 시도해주세요.',
    retryable: true,
    status,
  };
}

export function assertNonEmptyAiText(value: unknown, label = 'AI 답변') {
  const text = String(value || '').trim();
  if (!text) throw new Error(`${label} 내용이 없습니다.`);
  return text;
}
