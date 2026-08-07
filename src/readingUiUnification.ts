import { designDecorations } from './assets/design';

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
    .sion-saved-content-button { min-height: 58px !important; display: flex !important; flex-direction: column !important; align-items: center !important; justify-content: center !important; gap: 2px !important; padding: 5px 3px !important; }
    .sion-saved-content-icon { width: 30px !important; height: 30px !important; object-fit: contain !important; pointer-events: none !important; filter: drop-shadow(0 2px 3px rgba(87,65,40,.08)); }
    @media (max-width: 520px) {
      .sion-saved-control-zone { padding: 10px !important; border-radius: 19px !important; }
      body.sion-saved-screen main { padding-left: 12px !important; padding-right: 12px !important; }
      body.sion-saved-screen button { min-height: 42px; }
      .sion-saved-content-button { min-height: 56px !important; font-size: 10px !important; }
      .sion-saved-content-icon { width: 27px !important; height: 27px !important; }
    }
  `;
  document.head.appendChild(style);
}

const savedContentIcons: Record<string, string> = {
  '말씀': designDecorations.openBibleFlowers,
  '해설': designDecorations.shieldCross,
  '묵상': designDecorations.leafSprig,
  '기도문': designDecorations.doveBranch,
  '적용': designDecorations.pottedSprout,
};

function decorateSavedContentButtons() {
  const buttons = [...document.querySelectorAll<HTMLButtonElement>('main button')]
    .filter((button) => Object.prototype.hasOwnProperty.call(savedContentIcons, text(button)));

  for (const button of buttons) {
    const label = text(button);
    if (button.dataset.sionSavedIcon === label) continue;
    const icon = document.createElement('img');
    icon.src = savedContentIcons[label];
    icon.alt = '';
    icon.className = 'sion-saved-content-icon';
    icon.setAttribute('aria-hidden', 'true');
    button.prepend(icon);
    button.dataset.sionSavedIcon = label;
    button.classList.add('sion-saved-content-button');
  }
}

function unifySavedHeader() {
  const bodyText = document.body.innerText;
  const savedScreen = /저장한 말씀|다시 읽는 (말씀|해설|묵상|기도문|적용)/.test(bodyText);
  document.body.classList.toggle('sion-saved-screen', savedScreen);
  if (!savedScreen) return;

  const headings = [...document.querySelectorAll<HTMLElement>('h1,h2,h3,.title-font')]
    .filter((element) => /저장한 말씀|다시 읽는 (말씀|해설|묵상|기도문|적용)/.test(text(element)));
  if (headings.length > 0) headings[0].closest<HTMLElement>('header,section,div')?.classList.add('sion-unified-screen-header');
  headings.slice(1).forEach((heading) => heading.closest<HTMLElement>('header,section,div')?.classList.add('sion-duplicate-screen-header'));

  decorateSavedContentButtons();

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
