const STYLE_ID = 'sion-reading-ui-unification-style';
let initialized = false;
let scheduled = false;

function text(element: Element | null) {
  return element?.textContent?.replace(/\s+/g, ' ').trim() || '';
}

function installStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .sion-unified-screen-header { margin-bottom: 10px !important; }
    .sion-duplicate-screen-header { display: none !important; }
    .sion-saved-control-zone { display: grid !important; grid-template-columns: 1fr !important; gap: 9px !important; padding: 12px !important; border: 1px solid #E4D8CA !important; border-radius: 22px !important; background: rgba(255,252,247,.92) !important; box-shadow: 0 8px 22px rgba(52,45,39,.07) !important; }
    .sion-saved-control-zone > * { margin: 0 !important; }
    .sion-reading-exit-button { min-width: 72px !important; min-height: 48px !important; display: inline-flex !important; flex-direction: column !important; align-items: center !important; justify-content: center !important; gap: 2px !important; border: 0 !important; background: transparent !important; color: #66584E !important; font: inherit !important; font-size: 10px !important; font-weight: 900 !important; }
    .sion-reading-exit-button svg { width: 21px !important; height: 21px !important; }
    .sion-reading-mobile-tools { padding-bottom: calc(8px + env(safe-area-inset-bottom)) !important; }
    @media (max-width: 520px) {
      .sion-saved-control-zone { padding: 10px !important; border-radius: 19px !important; }
      body.sion-saved-screen main { padding-left: 12px !important; padding-right: 12px !important; }
      body.sion-saved-screen button { min-height: 42px; }
    }
  `;
  document.head.appendChild(style);
}

function unifySavedHeader() {
  const bodyText = document.body.innerText;
  if (!bodyText.includes('저장한 말씀') && !bodyText.includes('다시 읽는 말씀')) return;

  const headings = [...document.querySelectorAll<HTMLElement>('h1,h2,h3,.title-font')]
    .filter((element) => /저장한 말씀|다시 읽는 말씀/.test(text(element)));
  if (headings.length > 0) headings[0].closest<HTMLElement>('header,section,div')?.classList.add('sion-unified-screen-header');
  headings.slice(1).forEach((heading) => heading.closest<HTMLElement>('header,section,div')?.classList.add('sion-duplicate-screen-header'));

  const contentMenuButton = [...document.querySelectorAll<HTMLButtonElement>('main button')]
    .find((button) => ['말씀', '해설', '묵상', '기도문', '적용'].includes(text(button)));
  const sortMenuButton = [...document.querySelectorAll<HTMLButtonElement>('main button')]
    .find((button) => ['일별', '주별', '월별', '주제별', '권별'].includes(text(button)));
  const toolbarButton = [...document.querySelectorAll<HTMLButtonElement>('main button')]
    .find((button) => text(button).includes('순서변경'));

  const contentGroup = contentMenuButton?.parentElement as HTMLElement | null;
  const sortGroup = sortMenuButton?.parentElement as HTMLElement | null;
  const toolbar = toolbarButton?.parentElement as HTMLElement | null;
  const commonParent = contentGroup?.parentElement as HTMLElement | null;

  if (commonParent && sortGroup?.parentElement === commonParent) {
    commonParent.classList.add('sion-saved-control-zone');
    if (toolbar && toolbar.parentElement !== commonParent) {
      const toolbarContainer = toolbar.closest<HTMLElement>('section,div');
      if (toolbarContainer && toolbarContainer !== commonParent && commonParent.parentElement === toolbarContainer.parentElement) {
        commonParent.insertBefore(toolbar, commonParent.firstChild);
        toolbarContainer.classList.add('sion-duplicate-screen-header');
      }
    }
  }
}

function exitReadingRoom() {
  window.history.pushState({}, '', '/reading-room/today');
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function ensureReadingRoomExit() {
  const readingContext = location.pathname.startsWith('/reading-room') || document.body.innerText.includes('통독 본문 읽기');
  if (!readingContext) {
    document.querySelector('.sion-reading-exit-button')?.remove();
    return;
  }

  const moreButton = [...document.querySelectorAll<HTMLButtonElement>('nav button, footer button, [class*="bottom"] button')]
    .find((button) => text(button) === '더보기' || button.getAttribute('aria-label')?.includes('더보기'));
  if (!moreButton || moreButton.parentElement?.querySelector('.sion-reading-exit-button')) return;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'sion-reading-exit-button';
  button.setAttribute('aria-label', '통독방 나가기');
  button.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 17l5-5-5-5"></path><path d="M15 12H3"></path><path d="M21 19V5a2 2 0 0 0-2-2h-6"></path></svg><span>통독방 나가기</span>';
  button.addEventListener('click', exitReadingRoom);
  moreButton.parentElement?.classList.add('sion-reading-mobile-tools');
  moreButton.insertAdjacentElement('beforebegin', button);
}

function apply() {
  installStyles();
  unifySavedHeader();
  ensureReadingRoomExit();
}

function schedule() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    apply();
  });
}

export function initializeReadingUiUnification() {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;
  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('popstate', schedule);
  schedule();
}
