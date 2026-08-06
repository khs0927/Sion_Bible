import { classifyAiFailure, type AiFailure } from './services/aiError';

const STATUS_ID = 'sion-ai-status-surface';
const AI_API_PATTERN = /^\/api\/(verse-devotion|verse-question|ai-bible-search|reading-meditation|reading-meditation-chat|ai-health)(?:\/|$)/;

let initialized = false;
let currentFailure: AiFailure | null = null;
let currentEndpoint = '';
let renderScheduled = false;

function endpointLabel(endpoint: string) {
  if (endpoint.includes('verse-devotion')) return '말씀 묵상';
  if (endpoint.includes('verse-question')) return '묵상 질문';
  if (endpoint.includes('ai-bible-search')) return '질문 검색';
  if (endpoint.includes('reading-meditation')) return '통독 묵상';
  if (endpoint.includes('ai-health')) return 'AI 연결';
  return 'AI 기능';
}

function isAiRequest(input: RequestInfo | URL) {
  try {
    const value = input instanceof Request ? input.url : String(input);
    const url = new URL(value, window.location.origin);
    return url.origin === window.location.origin && AI_API_PATTERN.test(url.pathname);
  } catch {
    return false;
  }
}

function requestEndpoint(input: RequestInfo | URL) {
  try {
    const value = input instanceof Request ? input.url : String(input);
    return new URL(value, window.location.origin).pathname;
  } catch {
    return '';
  }
}

function removeStatus() {
  document.getElementById(STATUS_ID)?.remove();
}

function retryVisibleAiAction() {
  const candidates = [...document.querySelectorAll<HTMLButtonElement>('button')].filter((button) => {
    if (button.disabled || !button.offsetParent) return false;
    const text = `${button.getAttribute('aria-label') || ''} ${button.textContent || ''}`.replace(/\s+/g, ' ');
    return /다시 시도|질문으로 말씀 찾기|질문$|묵상 다시|연결 다시/i.test(text);
  });

  const target = candidates[0];
  if (target) {
    target.click();
    return true;
  }

  window.dispatchEvent(new CustomEvent('sion:ai-retry', { detail: { endpoint: currentEndpoint } }));
  return false;
}

function renderStatus() {
  removeStatus();
  if (!currentFailure) return;

  const surface = document.createElement('aside');
  surface.id = STATUS_ID;
  surface.setAttribute('role', currentFailure.kind === 'offline' ? 'status' : 'alert');
  surface.setAttribute('aria-live', currentFailure.kind === 'offline' ? 'polite' : 'assertive');
  Object.assign(surface.style, {
    position: 'fixed',
    left: '50%',
    bottom: 'calc(82px + env(safe-area-inset-bottom))',
    transform: 'translateX(-50%)',
    zIndex: '1800',
    width: 'min(440px, calc(100vw - 24px))',
    padding: '14px',
    border: currentFailure.kind === 'offline' ? '1px solid #D8CDAE' : '1px solid #E7C7C2',
    borderRadius: '20px',
    background: currentFailure.kind === 'offline' ? '#FFF8E7' : '#FFF5F3',
    color: '#3D3129',
    boxShadow: '0 16px 40px rgba(45, 38, 32, .22)',
  });

  const header = document.createElement('div');
  Object.assign(header.style, { display: 'flex', alignItems: 'flex-start', gap: '10px' });

  const icon = document.createElement('span');
  icon.textContent = currentFailure.kind === 'offline' ? '📴' : currentFailure.kind === 'rate-limit' ? '⏳' : '⚠️';
  Object.assign(icon.style, { fontSize: '20px', lineHeight: '1.2' });

  const content = document.createElement('div');
  Object.assign(content.style, { flex: '1', minWidth: '0' });
  const eyebrow = document.createElement('p');
  eyebrow.textContent = endpointLabel(currentEndpoint);
  Object.assign(eyebrow.style, { margin: '0 0 3px', color: '#8A6E58', fontSize: '10px', fontWeight: '900' });
  const title = document.createElement('p');
  title.textContent = currentFailure.title;
  Object.assign(title.style, { margin: '0', fontSize: '14px', fontWeight: '900' });
  const message = document.createElement('p');
  message.textContent = currentFailure.message;
  Object.assign(message.style, { margin: '5px 0 0', color: '#71665D', fontSize: '11px', lineHeight: '1.55', fontWeight: '700' });
  content.append(eyebrow, title, message);

  const close = document.createElement('button');
  close.type = 'button';
  close.setAttribute('aria-label', 'AI 상태 안내 닫기');
  close.textContent = '×';
  Object.assign(close.style, {
    width: '32px', height: '32px', border: '0', borderRadius: '999px', background: 'rgba(255,255,255,.72)',
    color: '#665A50', fontSize: '20px', lineHeight: '1', cursor: 'pointer',
  });
  close.addEventListener('click', () => {
    currentFailure = null;
    removeStatus();
  });
  header.append(icon, content, close);
  surface.appendChild(header);

  if (currentFailure.retryable) {
    const actions = document.createElement('div');
    Object.assign(actions.style, { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '11px' });

    const dismiss = document.createElement('button');
    dismiss.type = 'button';
    dismiss.textContent = '나중에';
    Object.assign(dismiss.style, {
      minHeight: '40px', border: '1px solid #E1D7CC', borderRadius: '13px', background: '#FFFFFF',
      color: '#756B61', fontSize: '12px', fontWeight: '900', cursor: 'pointer',
    });
    dismiss.addEventListener('click', () => {
      currentFailure = null;
      removeStatus();
    });

    const retry = document.createElement('button');
    retry.type = 'button';
    retry.textContent = navigator.onLine ? '다시 시도' : '연결 확인';
    Object.assign(retry.style, {
      minHeight: '40px', border: '0', borderRadius: '13px', background: '#6F8F72',
      color: '#FFFFFF', fontSize: '12px', fontWeight: '900', cursor: 'pointer',
    });
    retry.addEventListener('click', () => {
      if (!navigator.onLine) {
        currentFailure = classifyAiFailure(new Error('offline'));
        scheduleRender();
        return;
      }
      const retried = retryVisibleAiAction();
      if (!retried) window.location.reload();
      currentFailure = null;
      removeStatus();
    });

    actions.append(dismiss, retry);
    surface.appendChild(actions);
  }

  document.body.appendChild(surface);
}

function scheduleRender() {
  if (renderScheduled) return;
  renderScheduled = true;
  window.requestAnimationFrame(() => {
    renderScheduled = false;
    renderStatus();
  });
}

function reportFailure(failure: AiFailure, endpoint: string) {
  currentFailure = failure;
  currentEndpoint = endpoint;
  scheduleRender();
  window.dispatchEvent(new CustomEvent('sion:ai-failure', { detail: { failure, endpoint } }));
}

function reportRecovery(endpoint: string) {
  if (currentFailure && (!currentEndpoint || currentEndpoint === endpoint)) {
    currentFailure = null;
    currentEndpoint = '';
    removeStatus();
  }
  window.dispatchEvent(new CustomEvent('sion:ai-recovered', { detail: { endpoint } }));
}

async function inspectSuccessfulResponse(response: Response, endpoint: string) {
  try {
    const type = response.headers.get('content-type') || '';
    if (!type.includes('application/json')) return;
    const payload = await response.clone().json() as Record<string, unknown>;
    const likelyText = payload.answer
      || payload.content
      || payload.result
      || payload.summary
      || payload.items;
    if (
      likelyText === ''
      || likelyText === null
      || (Array.isArray(likelyText) && likelyText.length === 0 && endpoint.includes('verse-question'))
    ) {
      reportFailure(classifyAiFailure(new Error('빈 응답 내용이 없습니다.')), endpoint);
      return;
    }
    reportRecovery(endpoint);
  } catch {
    // 응답 본문 검사는 사용자 기능을 차단하지 않습니다.
  }
}

export function initializeAiExperience() {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    if (!isAiRequest(input)) return originalFetch(input, init);
    const endpoint = requestEndpoint(input);

    if (!navigator.onLine) {
      const error = new TypeError('offline');
      reportFailure(classifyAiFailure(error), endpoint);
      throw error;
    }

    try {
      const response = await originalFetch(input, init);
      if (!response.ok) {
        reportFailure(classifyAiFailure(new Error(`HTTP ${response.status}`), response.status), endpoint);
      } else {
        void inspectSuccessfulResponse(response, endpoint);
      }
      return response;
    } catch (error) {
      reportFailure(classifyAiFailure(error), endpoint);
      throw error;
    }
  };

  window.addEventListener('offline', () => {
    reportFailure(classifyAiFailure(new Error('offline')), '');
  });
  window.addEventListener('online', () => {
    if (currentFailure?.kind === 'offline') {
      currentFailure = null;
      removeStatus();
      window.dispatchEvent(new CustomEvent('sion:ai-online'));
    }
  });
}
