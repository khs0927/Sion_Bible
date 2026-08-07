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
    .sion-unified-screen-header { margin-bottom: 8px !important; }
    .sion-duplicate-screen-header { display: none !important; }

    body.sion-saved-screen main {
      padding-left: 14px !important;
      padding-right: 14px !important;
      padding-bottom: 118px !important;
    }

    body.sion-saved-screen .sion-saved-card-shell {
      border: 0 !important;
      background: transparent !important;
      box-shadow: none !important;
      padding: 0 !important;
      overflow: visible !important;
    }

    body.sion-saved-screen .sion-saved-card-header { display: none !important; }

    body.sion-saved-screen .sion-saved-control-zone {
      display: grid !important;
      grid-template-columns: 1fr !important;
      gap: 12px !important;
      margin: 0 0 18px !important;
      padding: 16px !important;
      border: 1px solid #E8DED1 !important;
      border-radius: 24px !important;
      background: rgba(255,253,248,.97) !important;
      box-shadow: 0 10px 30px rgba(72,58,42,.07) !important;
    }

    body.sion-saved-screen .sion-saved-control-zone > * { margin: 0 !important; }

    body.sion-saved-screen .sion-saved-toolbar {
      display: flex !important;
      justify-content: flex-end !important;
      margin: 0 0 -2px !important;
    }

    body.sion-saved-screen .sion-saved-toolbar button {
      min-height: 34px !important;
      height: 34px !important;
      padding: 0 11px !important;
      border-radius: 12px !important;
      border: 1px solid #E3D9CC !important;
      background: #FFFDF9 !important;
      box-shadow: none !important;
      font-size: 11px !important;
      font-weight: 850 !important;
    }

    body.sion-saved-screen .sion-saved-content-tabs,
    body.sion-saved-screen .sion-saved-sort-tabs {
      position: relative !important;
      margin: 0 !important;
    }

    body.sion-saved-screen .sion-saved-content-tabs {
      display: grid !important;
      grid-template-columns: repeat(5,minmax(0,1fr)) !important;
      gap: 7px !important;
      padding-top: 23px !important;
    }

    body.sion-saved-screen .sion-saved-content-tabs::before,
    body.sion-saved-screen .sion-saved-sort-tabs::before {
      position: absolute;
      left: 1px;
      top: 0;
      color: #756C62;
      font-size: 11px;
      line-height: 1;
      font-weight: 900;
      letter-spacing: -.02em;
    }

    body.sion-saved-screen .sion-saved-content-tabs::before { content: '저장 콘텐츠'; }
    body.sion-saved-screen .sion-saved-sort-tabs::before { content: '모아보기'; }

    body.sion-saved-screen .sion-saved-content-tabs > button {
      min-width: 0 !important;
      min-height: 70px !important;
      height: 70px !important;
      padding: 7px 2px 6px !important;
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 3px !important;
      border-radius: 17px !important;
      border: 1px solid #E4DACE !important;
      background: #FFFDF9 !important;
      color: #645B53 !important;
      box-shadow: none !important;
      font-size: 11px !important;
      font-weight: 850 !important;
      line-height: 1.1 !important;
    }

    body.sion-saved-screen .sion-saved-content-icon {
      width: 29px !important;
      height: 29px !important;
      object-fit: contain !important;
      margin: 0 !important;
      pointer-events: none !important;
      filter: drop-shadow(0 2px 3px rgba(87,65,40,.08));
    }

    body.sion-saved-screen .sion-saved-content-tabs > button.sion-active-saved-tab {
      border-color: #78A487 !important;
      background: linear-gradient(180deg,#F1F7EE,#E7F1E4) !important;
      color: #3F704C !important;
      box-shadow: inset 0 0 0 1px rgba(78,127,89,.08) !important;
    }

    body.sion-saved-screen .sion-saved-sort-tabs {
      display: grid !important;
      grid-template-columns: repeat(5,minmax(0,1fr)) !important;
      gap: 5px !important;
      padding: 23px 4px 4px !important;
      border-top: 1px solid #EEE6DC !important;
    }

    body.sion-saved-screen .sion-saved-sort-tabs > button {
      min-width: 0 !important;
      min-height: 38px !important;
      height: 38px !important;
      padding: 0 3px !important;
      border-radius: 999px !important;
      border: 1px solid #E4DACE !important;
      background: #FAF7F1 !important;
      color: #746B62 !important;
      box-shadow: none !important;
      font-size: 11px !important;
      font-weight: 850 !important;
      white-space: nowrap !important;
    }

    body.sion-saved-screen .sion-saved-sort-tabs > button.sion-active-saved-tab {
      border-color: transparent !important;
      background: #79A78D !important;
      color: #fff !important;
    }

    body.sion-saved-screen .sion-saved-groups {
      display: grid !important;
      gap: 18px !important;
    }

    body.sion-saved-screen .sion-saved-group {
      display: grid !important;
      gap: 9px !important;
      margin: 0 !important;
    }

    body.sion-saved-screen .sion-saved-group-label {
      display: flex !important;
      align-items: center !important;
      gap: 7px !important;
      min-height: 30px !important;
      margin: 0 3px !important;
      color: #655C54 !important;
      font-size: 13px !important;
      line-height: 1.2 !important;
      font-weight: 900 !important;
      letter-spacing: -.02em !important;
    }

    body.sion-saved-screen .sion-saved-group-label svg,
    body.sion-saved-screen .sion-saved-group-label img {
      width: 22px !important;
      height: 22px !important;
    }

    body.sion-saved-screen .sion-saved-item {
      width: 100% !important;
      min-height: 0 !important;
      padding: 15px 16px 16px !important;
      text-align: left !important;
      border: 1px solid #E4DACE !important;
      border-radius: 20px !important;
      background: rgba(255,253,249,.98) !important;
      color: #352F29 !important;
      box-shadow: 0 5px 16px rgba(70,57,42,.045) !important;
      overflow: hidden !important;
    }

    body.sion-saved-screen .sion-saved-item:hover,
    body.sion-saved-screen .sion-saved-item:focus-visible { border-color: #B8CAB8 !important; }

    body.sion-saved-screen .sion-saved-item > div:first-child {
      min-height: 32px !important;
      margin-bottom: 7px !important;
      align-items: center !important;
    }

    body.sion-saved-screen .sion-saved-item > div:first-child > span:first-child {
      color: #5F8D6C !important;
      font-size: 14px !important;
      line-height: 1.2 !important;
      font-weight: 900 !important;
      letter-spacing: -.02em !important;
    }

    body.sion-saved-screen .sion-saved-item > div:first-child > span:last-child {
      width: 32px !important;
      height: 32px !important;
      display: grid !important;
      place-items: center !important;
      border-radius: 11px !important;
      background: #F8F3EC !important;
      color: #8A8076 !important;
      flex: 0 0 32px !important;
    }

    body.sion-saved-screen .sion-saved-item .serif-verse {
      font-size: 1rem !important;
      line-height: 1.78 !important;
      color: #37312B !important;
      letter-spacing: -.014em !important;
      word-break: keep-all !important;
    }

    body.sion-saved-screen .sion-saved-empty {
      margin: 3px 0 16px !important;
      padding: 30px 18px !important;
      text-align: center !important;
      border: 1px dashed #DCCFC0 !important;
      border-radius: 22px !important;
      background: #FFFDF9 !important;
      color: #81776D !important;
      font-size: 13px !important;
      line-height: 1.6 !important;
    }

    @media (max-width:430px) {
      body.sion-saved-screen main { padding-left: 11px !important; padding-right: 11px !important; }
      body.sion-saved-screen .sion-saved-control-zone { padding: 13px !important; border-radius: 21px !important; gap: 11px !important; }
      body.sion-saved-screen .sion-saved-content-tabs { gap: 5px !important; }
      body.sion-saved-screen .sion-saved-content-tabs > button { min-height: 64px !important; height: 64px !important; border-radius: 15px !important; font-size: 10px !important; }
      body.sion-saved-screen .sion-saved-content-icon { width: 25px !important; height: 25px !important; }
      body.sion-saved-screen .sion-saved-sort-tabs { gap: 4px !important; padding-inline: 0 !important; }
      body.sion-saved-screen .sion-saved-sort-tabs > button { font-size: 10px !important; }
      body.sion-saved-screen .sion-saved-item { padding: 14px 14px 15px !important; border-radius: 18px !important; }
      body.sion-saved-screen .sion-saved-item .serif-verse { font-size: .98rem !important; }
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

function decorateSavedContentButtons(buttons: HTMLButtonElement[]) {
  for (const button of buttons) {
    const label = text(button);
    if (!savedContentIcons[label]) continue;
    if (button.dataset.sionSavedIcon !== label) {
      button.querySelector('.sion-saved-content-icon')?.remove();
      const icon = document.createElement('img');
      icon.src = savedContentIcons[label];
      icon.alt = '';
      icon.className = 'sion-saved-content-icon';
      icon.setAttribute('aria-hidden', 'true');
      button.prepend(icon);
      button.dataset.sionSavedIcon = label;
    }
  }
}

function markActive(buttons: HTMLButtonElement[]) {
  buttons.forEach((button) => {
    button.classList.remove('sion-active-saved-tab');
    const style = window.getComputedStyle(button);
    const bg = style.backgroundColor;
    const color = style.color;
    if (color.includes('255, 255, 255') || bg.includes('111, 143, 114') || bg.includes('121, 167, 141')) {
      button.classList.add('sion-active-saved-tab');
    }
  });
}

function clearSavedState() {
  document.body.classList.remove('sion-saved-screen');
}

function unifySavedScreen() {
  const contentButtons = [...document.querySelectorAll<HTMLButtonElement>('main button')]
    .filter((button) => ['말씀','해설','묵상','기도문','적용'].includes(text(button)));

  if (contentButtons.length < 5) {
    clearSavedState();
    return;
  }

  document.body.classList.add('sion-saved-screen');
  decorateSavedContentButtons(contentButtons);
  markActive(contentButtons);

  const contentGroup = contentButtons[0].parentElement as HTMLElement | null;
  if (!contentGroup) return;
  contentGroup.classList.add('sion-saved-content-tabs');

  const sortButtons = [...document.querySelectorAll<HTMLButtonElement>('main button')]
    .filter((button) => ['일별','주별','월별','주제별','권별'].includes(text(button)));
  const sortGroup = sortButtons[0]?.parentElement as HTMLElement | null;
  if (sortGroup) {
    sortGroup.classList.add('sion-saved-sort-tabs');
    markActive(sortButtons);
  }

  const commonParent = contentGroup.parentElement as HTMLElement | null;
  if (commonParent && (!sortGroup || sortGroup.parentElement === commonParent)) {
    commonParent.classList.add('sion-saved-control-zone');
  }

  const card = contentGroup.closest<HTMLElement>('section.surface-card') || contentGroup.closest<HTMLElement>('section');
  if (card) {
    card.classList.add('sion-saved-card-shell');
    const header = [...card.children].find((child): child is HTMLElement => child instanceof HTMLElement && child.tagName === 'DIV' && child !== commonParent);
    if (header) header.classList.add('sion-saved-card-header');
  }

  const reorderButton = [...document.querySelectorAll<HTMLButtonElement>('main button')].find((button) => text(button).includes('순서변경'));
  const toolbar = reorderButton?.parentElement as HTMLElement | null;
  if (toolbar) toolbar.classList.add('sion-saved-toolbar');

  const empty = [...document.querySelectorAll<HTMLElement>('main div')]
    .find((element) => /저장된 .*없습니다/.test(text(element)) && element.children.length === 0);
  if (empty) empty.classList.add('sion-saved-empty');

  if (!card) return;
  const groupSections = [...card.querySelectorAll<HTMLElement>('section')].filter((section) => {
    if (section === card) return false;
    return [...section.querySelectorAll<HTMLButtonElement>('button')].some((button) => button.querySelector('.serif-verse'));
  });

  if (groupSections.length > 0) groupSections[0].parentElement?.classList.add('sion-saved-groups');
  groupSections.forEach((section) => {
    section.classList.add('sion-saved-group');
    const label = section.firstElementChild as HTMLElement | null;
    if (label?.tagName === 'DIV') label.classList.add('sion-saved-group-label');
    section.querySelectorAll<HTMLButtonElement>('button').forEach((button) => {
      if (button.querySelector('.serif-verse')) button.classList.add('sion-saved-item');
    });
  });
}

function removeLegacyReadingRoomExit() {
  document.querySelectorAll('.sion-reading-exit-button').forEach((element) => element.remove());
}

function apply() {
  installStyles();
  unifySavedScreen();
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
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  window.addEventListener('popstate', schedule);
  window.addEventListener('resize', schedule);
  schedule();
}
