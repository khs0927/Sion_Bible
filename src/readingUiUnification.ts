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

function removeLegacyReadingRoomExit() {
  document.querySelectorAll('.sion-reading-exit-button').forEach((element) => element.remove());
}

function apply() {
  installStyles();
  unifySavedHeader();
  removeLegacyReadingRoomExit();
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
