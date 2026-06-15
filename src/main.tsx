import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Saved verses bulk-copy interaction patch.
// This runs outside React because the saved-card copy controls are injected from index.html.
(() => {
  const CHECK_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"></path></svg>';

  const isSavedScreen = () =>
    document.body.innerText.includes('저장한 말씀') ||
    document.body.innerText.includes('다시 읽는 말씀');

  const refSpanForCard = (card: Element) =>
    [...card.querySelectorAll('span')].find((span) => /\s\d+:\d+/.test(span.textContent?.trim() || ''));

  const isSavedVerseCard = (card: Element | null): card is HTMLElement =>
    Boolean(card && refSpanForCard(card) && card.querySelector('.serif-verse'));

  const getSavedCardFromTarget = (target: EventTarget | null) => {
    if (!(target instanceof Element)) return null;
    const card = target.closest('main button');
    return isSavedVerseCard(card) ? card : null;
  };

  const getSelectedCards = () =>
    [...document.querySelectorAll('main button.sion-saved-card-selected')].filter(isSavedVerseCard);

  const updateCheckVisual = (card: HTMLElement) => {
    const checked = card.classList.contains('sion-saved-card-selected');
    const check = card.querySelector<HTMLElement>('.sion-card-check');
    if (!check) return;
    check.dataset.checked = String(checked);
    check.setAttribute('aria-checked', String(checked));
    check.innerHTML = checked ? CHECK_ICON : '';
  };

  const updateBulkCount = () => {
    const count = getSelectedCards().length;
    const label = document.querySelector<HTMLElement>('[data-sion-copy-selected]');
    if (label) label.textContent = `선택 ${count}개 복사`;
    document.querySelectorAll('main button').forEach((card) => {
      if (isSavedVerseCard(card)) updateCheckVisual(card);
    });
  };

  const toggleCard = (card: HTMLElement) => {
    card.classList.toggle('sion-saved-card-selected');
    updateCheckVisual(card);
    updateBulkCount();
  };

  const writeClipboard = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = value;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      textarea.remove();
    }
  };

  const cardToText = (card: Element) => {
    const ref = refSpanForCard(card)?.textContent?.trim() || '';
    const text = card.querySelector('.serif-verse')?.textContent?.trim() || '';
    return `${ref}\n${text}`.trim();
  };

  document.addEventListener(
    'click',
    async (event) => {
      if (!isSavedScreen()) return;
      const target = event.target instanceof Element ? event.target : null;
      const bulkBar = document.querySelector('.sion-bulk-copy-bar');
      if (!bulkBar) return;

      if (target?.closest('[data-sion-copy-selected]')) {
        event.preventDefault();
        event.stopPropagation();
        const blocks = getSelectedCards().map(cardToText).filter(Boolean);
        if (blocks.length === 0) {
          alert('복사할 말씀을 선택해주세요.');
          return;
        }
        await writeClipboard(blocks.join('\n\n'));
        alert(`${blocks.length}개 말씀이 복사되었습니다!`);
        return;
      }

      if (target?.closest('[data-sion-copy-cancel]')) {
        document.querySelectorAll('main button.sion-saved-card-selected').forEach((card) => {
          card.classList.remove('sion-saved-card-selected');
          if (card instanceof HTMLElement) updateCheckVisual(card);
        });
        updateBulkCount();
        return;
      }

      const card = getSavedCardFromTarget(target);
      if (!card) return;

      const isCheck = Boolean(target?.closest('.sion-card-check'));
      const isAction = Boolean(target?.closest('.sion-card-actions'));
      if (isAction && !isCheck) return;

      event.preventDefault();
      event.stopPropagation();
      toggleCard(card);
    },
    true
  );

  const observer = new MutationObserver(updateBulkCount);
  window.addEventListener('load', () => observer.observe(document.body, { childList: true, subtree: true }));
})();
