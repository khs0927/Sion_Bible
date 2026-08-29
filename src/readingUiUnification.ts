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
    .sion-saved-content-icon {
      width: 28px !important;
      height: 28px !important;
      object-fit: contain !important;
      pointer-events: none !important;
      filter: drop-shadow(0 2px 3px rgba(87,65,40,.08));
    }
    .sion-reading-exit-button { display: none !important; }
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

function isSavedContentMenuButton(button: HTMLButtonElement) {
  if (!Object.prototype.hasOwnProperty.call(savedContentIcons, text(button))) return false;
  const parent = button.parentElement;
  if (!parent) return false;

  const matchingSiblingCount = [...parent.children]
    .filter((child): child is HTMLButtonElement => child instanceof HTMLButtonElement)
    .map((child) => text(child))
    .filter((label) => Object.prototype.hasOwnProperty.call(savedContentIcons, label))
    .length;

  // The saved-content selector is a grouped menu (말씀/해설/묵상/기도문/적용).
  // Requiring at least three matching siblings prevents the same labels in the
  // verse action sheet from receiving a second decorative icon.
  return matchingSiblingCount >= 3;
}

function cleanupMisplacedSavedContentIcons() {
  const decoratedButtons = [...document.querySelectorAll<HTMLButtonElement>('main button[data-sion-saved-icon]')];
  for (const button of decoratedButtons) {
    if (isSavedContentMenuButton(button)) continue;
    button.querySelectorAll('.sion-saved-content-icon').forEach((icon) => icon.remove());
    delete button.dataset.sionSavedIcon;
  }
}

function decorateSavedContentButtons() {
  cleanupMisplacedSavedContentIcons();

  const buttons = [...document.querySelectorAll<HTMLButtonElement>('main button')]
    .filter(isSavedContentMenuButton);

  for (const button of buttons) {
    const label = text(button);
    if (!savedContentIcons[label] || button.dataset.sionSavedIcon === label) continue;
    const icon = document.createElement('img');
    icon.src = savedContentIcons[label];
    icon.alt = '';
    icon.className = 'sion-saved-content-icon';
    icon.setAttribute('aria-hidden', 'true');
    button.prepend(icon);
    button.dataset.sionSavedIcon = label;
  }
}

function removeLegacyReadingRoomExit() {
  document.querySelectorAll('.sion-reading-exit-button').forEach((element) => element.remove());
}

function apply() {
  installStyles();
  decorateSavedContentButtons();
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
