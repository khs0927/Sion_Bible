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
// The saved-card action buttons are injected outside React from index.html, so this
// keeps the selected state in one stable Set and reapplies the visual state after
// React/MutationObserver updates.
(() => {
  const CHECK_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"></path></svg>';
  const selectedRefs = new Set<string>();

  const isSavedScreen = () =>
    document.body.innerText.includes('저장한 말씀') ||
    document.body.innerText.includes('다시 읽는 말씀');

  const isBulkMode = () => Boolean(document.querySelector('.sion-bulk-copy-bar'));

  const refSpanForCard = (card: Element) =>
    [...card.querySelectorAll('span')].find((span) => /\s\d+:\d+/.test(span.textContent?.trim() || ''));

  const cardRef = (card: Element) => refSpanForCard(card)?.textContent?.trim() || '';

  const isSavedVerseCard = (card: Element | null): card is HTMLElement =>
    Boolean(card && refSpanForCard(card) && card.querySelector('.serif-verse'));

  const getSavedCardFromTarget = (target: EventTarget | null) => {
    if (!(target instanceof Element)) return null;
    const card = target.closest('main button');
    return isSavedVerseCard(card) ? card : null;
  };

  const getSavedCards = () =>
    [...document.querySelectorAll('main button')].filter(isSavedVerseCard);

  const getSelectedCards = () =>
    getSavedCards().filter((card) => selectedRefs.has(cardRef(card)));

  const applyCardVisual = (card: HTMLElement) => {
    const ref = cardRef(card);
    const checked = Boolean(ref && selectedRefs.has(ref));
    const check = card.querySelector<HTMLElement>('.sion-card-check');

    card.classList.toggle('sion-saved-card-selected', checked);
    card.style.background = checked ? 'rgba(111, 143, 114, 0.12)' : '';
    card.style.borderColor = checked ? 'rgba(111, 143, 114, 0.72)' : '';
    card.style.boxShadow = checked ? '0 10px 22px rgba(111, 143, 114, 0.14)' : '';

    if (check) {
      check.dataset.checked = String(checked);
      check.setAttribute('aria-checked', String(checked));
      check.innerHTML = checked ? CHECK_ICON : '';
      check.style.background = checked ? 'linear-gradient(145deg, #6F8F72, #86B7AD)' : '#fff';
      check.style.borderColor = checked ? 'transparent' : '#E4D8CA';
      check.style.color = checked ? '#fff' : 'transparent';
    }
  };

  const applyAllVisuals = () => {
    if (!isSavedScreen()) return;
    getSavedCards().forEach(applyCardVisual);
    const count = getSelectedCards().length;
    const label = document.querySelector<HTMLElement>('[data-sion-copy-selected]');
    if (label) label.textContent = `선택 ${count}개 복사`;
  };

  const scheduleApply = () => {
    applyAllVisuals();
    window.requestAnimationFrame(applyAllVisuals);
    window.setTimeout(applyAllVisuals, 60);
  };

  const toggleCard = (card: HTMLElement) => {
    const ref = cardRef(card);
    if (!ref) return;
    if (selectedRefs.has(ref)) selectedRefs.delete(ref);
    else selectedRefs.add(ref);
    scheduleApply();
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
    const ref = cardRef(card);
    const text = card.querySelector('.serif-verse')?.textContent?.trim() || '';
    return `${ref}\n${text}`.trim();
  };

  document.addEventListener(
    'pointerup',
    (event) => {
      if (!isSavedScreen() || !isBulkMode()) return;
      const target = event.target instanceof Element ? event.target : null;
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

  document.addEventListener(
    'click',
    async (event) => {
      if (!isSavedScreen()) return;
      const target = event.target instanceof Element ? event.target : null;

      if (!isBulkMode()) {
        if (selectedRefs.size > 0) selectedRefs.clear();
        scheduleApply();
        return;
      }

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
        selectedRefs.clear();
        scheduleApply();
      }
    },
    true
  );

  const observer = new MutationObserver(scheduleApply);
  window.addEventListener('load', () => observer.observe(document.body, { childList: true, subtree: true }));
  window.setInterval(() => {
    if (isSavedScreen()) scheduleApply();
  }, 500);
})();
