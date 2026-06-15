import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Saved screen UI/selection patch.
// This replaces the fragile injected "선택복사" behavior with a stable DOM layer.
(() => {
  const CHECK_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"></path></svg>';
  const selectedRefs = new Set<string>();
  let selectMode = false;

  const installStyle = () => {
    if (document.getElementById('sion-saved-clean-style')) return;
    const style = document.createElement('style');
    style.id = 'sion-saved-clean-style';
    style.textContent = `
      body.sion-saved-screen .sion-card-title-hidden { display: none !important; }
      body.sion-saved-screen .sion-clean-toolbar {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: flex-end !important;
        gap: 6px !important;
        margin-left: auto !important;
      }
      body.sion-saved-screen .sion-clean-toolbar > button {
        height: 32px !important;
        min-height: 32px !important;
        padding: 0 10px !important;
        border-radius: 12px !important;
        font-size: 10px !important;
        font-weight: 900 !important;
        white-space: nowrap !important;
      }
      body.sion-saved-screen .sion-clean-menu-group {
        padding: 8px !important;
        border: 1px solid rgba(228,216,202,.82) !important;
        border-radius: 18px !important;
        background: rgba(255,252,247,.62) !important;
        margin-bottom: 9px !important;
      }
      body.sion-saved-screen .sion-clean-menu-label {
        display: block !important;
        margin: 0 0 6px 2px !important;
        color: #756B61 !important;
        font-size: 10px !important;
        font-weight: 900 !important;
        letter-spacing: -.02em !important;
      }
      body.sion-saved-screen .sion-clean-check {
        width: 30px !important;
        height: 30px !important;
        min-width: 30px !important;
        min-height: 30px !important;
        padding: 0 !important;
        border-radius: 11px !important;
        border: 1px solid #E4D8CA !important;
        background: #fff !important;
        color: transparent !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        box-shadow: 0 6px 12px rgba(52,45,39,0.05) !important;
        flex: 0 0 auto !important;
      }
      body.sion-saved-screen .sion-clean-check[data-checked="true"] {
        border-color: transparent !important;
        background: linear-gradient(145deg, #6F8F72, #86B7AD) !important;
        color: #fff !important;
      }
      body.sion-saved-screen .sion-clean-check svg { width: 16px !important; height: 16px !important; display: block !important; }
      body.sion-saved-screen .sion-clean-card-selected {
        background: rgba(111, 143, 114, 0.12) !important;
        border-color: rgba(111, 143, 114, 0.76) !important;
        box-shadow: 0 10px 22px rgba(111, 143, 114, 0.16) !important;
      }
      body.sion-saved-screen .sion-clean-action-box {
        width: 30px !important;
        height: 30px !important;
        min-width: 30px !important;
        min-height: 30px !important;
        padding: 0 !important;
        border: 1px solid #E4D8CA !important;
        border-radius: 11px !important;
        background: #fff !important;
        color: #756B61 !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        box-shadow: 0 6px 12px rgba(52,45,39,0.05) !important;
        flex: 0 0 auto !important;
      }
      body.sion-saved-screen .sion-clean-bulk-bar {
        position: fixed !important;
        left: 12px !important;
        right: 12px !important;
        bottom: calc(82px + env(safe-area-inset-bottom)) !important;
        z-index: 10020 !important;
        display: flex !important;
        justify-content: center !important;
        pointer-events: none !important;
      }
      body.sion-saved-screen .sion-clean-bulk-inner {
        width: min(100%, 420px) !important;
        display: grid !important;
        grid-template-columns: 1fr 92px !important;
        gap: 8px !important;
        padding: 10px !important;
        border: 1px solid #E4D8CA !important;
        border-radius: 18px !important;
        background: rgba(255,252,247,.97) !important;
        box-shadow: 0 14px 34px rgba(52,45,39,.16) !important;
        pointer-events: auto !important;
      }
      body.sion-saved-screen .sion-clean-bulk-copy,
      body.sion-saved-screen .sion-clean-bulk-cancel {
        border: 1px solid #E4D8CA !important;
        border-radius: 14px !important;
        padding: 12px !important;
        font: inherit !important;
        font-weight: 900 !important;
      }
      body.sion-saved-screen .sion-clean-bulk-copy { border-color: transparent !important; color: #fff !important; background: linear-gradient(145deg, #6F8F72, #86B7AD) !important; }
      body.sion-saved-screen .sion-clean-bulk-cancel { color: #756B61 !important; background: #fff !important; }
      body.sion-saved-screen .sion-bulk-copy-bar { display: none !important; }
    `;
    document.head.appendChild(style);
  };

  const isSavedScreen = () =>
    document.body.innerText.includes('저장한 말씀') ||
    document.body.innerText.includes('다시 읽는 말씀');

  const syncSavedClass = () => document.body.classList.toggle('sion-saved-screen', isSavedScreen());

  const refSpanForCard = (card: Element) =>
    [...card.querySelectorAll('span')].find((span) => /\s\d+:\d+/.test(span.textContent?.trim() || ''));

  const cardRef = (card: Element) => refSpanForCard(card)?.textContent?.trim() || '';

  const isSavedVerseCard = (card: Element | null): card is HTMLElement =>
    Boolean(card && refSpanForCard(card) && card.querySelector('.serif-verse'));

  const getSavedCards = () =>
    [...document.querySelectorAll('main button')].filter(isSavedVerseCard);

  const getCardFromTarget = (target: EventTarget | null) => {
    if (!(target instanceof Element)) return null;
    const card = target.closest('main button');
    return isSavedVerseCard(card) ? card : null;
  };

  const getSelectedCards = () => getSavedCards().filter(card => selectedRefs.has(cardRef(card)));

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

  const updateBulkBar = () => {
    document.querySelector('.sion-clean-bulk-bar')?.remove();
    if (!selectMode || !isSavedScreen()) return;

    const bar = document.createElement('div');
    bar.className = 'sion-clean-bulk-bar';
    bar.innerHTML = `
      <div class="sion-clean-bulk-inner">
        <button type="button" class="sion-clean-bulk-copy">선택 ${getSelectedCards().length}개 복사</button>
        <button type="button" class="sion-clean-bulk-cancel">취소</button>
      </div>
    `;
    document.body.appendChild(bar);
  };

  const applyCardVisual = (card: HTMLElement) => {
    const ref = cardRef(card);
    const checked = Boolean(ref && selectedRefs.has(ref));
    const topRow = card.firstElementChild as HTMLElement | null;
    const refSpan = refSpanForCard(card) as HTMLElement | undefined;

    if (topRow && refSpan) {
      topRow.style.display = 'flex';
      topRow.style.alignItems = 'center';
      topRow.style.gap = '8px';
      refSpan.style.flex = '1 1 auto';
      refSpan.style.textAlign = 'left';
      refSpan.style.minWidth = '0';

      let actions = topRow.querySelector<HTMLElement>('.sion-card-actions');
      if (!actions) {
        actions = document.createElement('span');
        actions.className = 'sion-card-actions';
        actions.style.marginLeft = 'auto';
        actions.style.display = 'inline-flex';
        actions.style.alignItems = 'center';
        actions.style.justifyContent = 'flex-end';
        actions.style.gap = '6px';
        topRow.appendChild(actions);
      }

      [...topRow.children].forEach(child => {
        if (child === refSpan || child === actions || child.classList.contains('sion-clean-check')) return;
        if (child.tagName === 'SPAN' && child.querySelector('svg')) {
          child.classList.add('sion-clean-action-box');
          actions!.appendChild(child);
        }
      });

      let check = actions.querySelector<HTMLElement>('.sion-clean-check');
      if (selectMode) {
        if (!check) {
          check = document.createElement('span');
          check.className = 'sion-clean-check';
          check.setAttribute('role', 'checkbox');
          check.setAttribute('aria-label', '말씀 선택');
          actions.insertBefore(check, actions.firstChild);
        }
        check.dataset.checked = String(checked);
        check.setAttribute('aria-checked', String(checked));
        check.innerHTML = checked ? CHECK_ICON : '';
      } else {
        check?.remove();
      }
    }

    card.classList.toggle('sion-clean-card-selected', checked && selectMode);
    if (checked && selectMode) {
      card.style.background = 'rgba(111, 143, 114, 0.12)';
      card.style.borderColor = 'rgba(111, 143, 114, 0.76)';
      card.style.boxShadow = '0 10px 22px rgba(111, 143, 114, 0.16)';
    } else {
      card.style.background = '';
      card.style.borderColor = '';
      card.style.boxShadow = '';
    }
  };

  const applyMenuCleanup = () => {
    if (!isSavedScreen()) return;

    // Hide the large card title/subtitle area: "다시 읽는 말씀" and subtitle.
    const titleNodes = [...document.querySelectorAll('main .title-font')]
      .filter(el => ['다시 읽는 말씀', '다시 읽는 해설', '다시 읽는 묵상', '다시 읽는 기도문', '다시 읽는 적용'].includes(el.textContent?.trim() || ''));
    titleNodes.forEach(title => {
      const row = title.closest('div');
      row?.classList.add('sion-card-title-hidden');
    });

    // Rename injected button and make toolbar visually cleaner.
    [...document.querySelectorAll('button')].forEach(button => {
      const text = button.textContent?.trim() || '';
      if (text.includes('선택복사')) button.textContent = '선택';
    });

    const reorderButton = [...document.querySelectorAll('button')]
      .find(button => button.textContent?.includes('순서변경'));
    const toolbar = reorderButton?.parentElement;
    toolbar?.classList.add('sion-clean-toolbar');

    // Distinguish the two menu rows.
    const savedContentButton = [...document.querySelectorAll('button')]
      .find(button => ['말씀', '해설', '묵상', '기도문', '적용'].includes(button.textContent?.trim() || ''));
    const contentGroup = savedContentButton?.parentElement;
    if (contentGroup && !contentGroup.querySelector('.sion-clean-menu-label')) {
      contentGroup.classList.add('sion-clean-menu-group');
      const label = document.createElement('span');
      label.className = 'sion-clean-menu-label';
      label.textContent = '내용 메뉴';
      contentGroup.insertBefore(label, contentGroup.firstChild);
    }

    const groupButton = [...document.querySelectorAll('button')]
      .find(button => ['일별', '주별', '월별', '주제별', '권별'].includes(button.textContent?.trim() || ''));
    const group = groupButton?.parentElement;
    if (group && !group.querySelector('.sion-clean-menu-label')) {
      group.classList.add('sion-clean-menu-group');
      const label = document.createElement('span');
      label.className = 'sion-clean-menu-label';
      label.textContent = '정렬/분류 메뉴';
      group.insertBefore(label, group.firstChild);
    }
  };

  const applyAll = () => {
    installStyle();
    syncSavedClass();
    if (!isSavedScreen()) {
      selectMode = false;
      selectedRefs.clear();
      document.querySelector('.sion-clean-bulk-bar')?.remove();
      return;
    }
    applyMenuCleanup();
    getSavedCards().forEach(applyCardVisual);
    updateBulkBar();
  };

  const scheduleApply = () => {
    applyAll();
    window.requestAnimationFrame(applyAll);
    window.setTimeout(applyAll, 80);
  };

  const toggleSelectMode = () => {
    selectMode = !selectMode;
    selectedRefs.clear();
    scheduleApply();
  };

  const toggleCard = (card: HTMLElement) => {
    const ref = cardRef(card);
    if (!ref) return;
    if (selectedRefs.has(ref)) selectedRefs.delete(ref);
    else selectedRefs.add(ref);
    scheduleApply();
  };

  const handleSelectionButton = (target: Element | null) => {
    const button = target?.closest('button');
    if (!button || !isSavedScreen()) return false;
    const text = button.textContent?.trim() || '';
    if (text === '선택' || text.includes('선택복사')) {
      toggleSelectMode();
      return true;
    }
    return false;
  };

  document.addEventListener('pointerup', (event) => {
    const target = event.target instanceof Element ? event.target : null;

    if (handleSelectionButton(target)) {
      event.preventDefault();
      event.stopPropagation();
      if ('stopImmediatePropagation' in event) event.stopImmediatePropagation();
      return;
    }

    if (!isSavedScreen() || !selectMode) return;

    if (target?.closest('.sion-clean-bulk-copy') || target?.closest('.sion-clean-bulk-cancel')) return;

    const card = getCardFromTarget(target);
    if (!card) return;

    const inActions = Boolean(target?.closest('.sion-card-actions'));
    const inCheck = Boolean(target?.closest('.sion-clean-check'));
    if (inActions && !inCheck) return;

    event.preventDefault();
    event.stopPropagation();
    if ('stopImmediatePropagation' in event) event.stopImmediatePropagation();
    toggleCard(card);
  }, true);

  document.addEventListener('click', async (event) => {
    const target = event.target instanceof Element ? event.target : null;

    if (handleSelectionButton(target)) {
      event.preventDefault();
      event.stopPropagation();
      if ('stopImmediatePropagation' in event) event.stopImmediatePropagation();
      return;
    }

    if (!isSavedScreen()) return;

    if (target?.closest('.sion-clean-bulk-copy')) {
      event.preventDefault();
      event.stopPropagation();
      if ('stopImmediatePropagation' in event) event.stopImmediatePropagation();
      const blocks = getSelectedCards().map(cardToText).filter(Boolean);
      if (blocks.length === 0) {
        alert('복사할 말씀을 선택해주세요.');
        return;
      }
      await writeClipboard(blocks.join('\n\n'));
      alert(`${blocks.length}개 말씀이 복사되었습니다!`);
      return;
    }

    if (target?.closest('.sion-clean-bulk-cancel')) {
      event.preventDefault();
      event.stopPropagation();
      if ('stopImmediatePropagation' in event) event.stopImmediatePropagation();
      selectMode = false;
      selectedRefs.clear();
      scheduleApply();
    }
  }, true);

  const observer = new MutationObserver(scheduleApply);
  window.addEventListener('load', () => observer.observe(document.body, { childList: true, subtree: true }));
  window.setInterval(scheduleApply, 600);
})();
