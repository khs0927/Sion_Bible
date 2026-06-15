// UI patches for the Sion Bible PWA.
// Saved-screen controls are partially injected from index.html, so this module
// keeps their iOS PWA interactions stable without changing the main React tree.

(() => {
  const CHECK_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"></path></svg>';
  const COPY_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
  const selectedRefs = new Set<string>();
  let selectMode = false;

  const $all = <T extends Element = Element>(selector: string) => [...document.querySelectorAll<T>(selector)];
  const buttonText = (button: Element | null) => button?.textContent?.replace(/\s+/g, '').trim() || '';
  const isSavedScreen = () => document.body.innerText.includes('저장한 말씀') || document.body.innerText.includes('다시 읽는 말씀');
  const syncSavedClass = () => document.body.classList.toggle('sion-saved-screen', isSavedScreen());

  const installStyle = () => {
    if (document.getElementById('sion-ui-patch-style')) return;
    const style = document.createElement('style');
    style.id = 'sion-ui-patch-style';
    style.textContent = `
      body.sion-saved-screen .sion-card-title-hidden { display: none !important; }
      body.sion-saved-screen .sion-clean-toolbar { display: inline-flex !important; align-items: center !important; justify-content: flex-end !important; gap: 6px !important; margin-left: auto !important; }
      body.sion-saved-screen .sion-clean-toolbar > button { height: 32px !important; min-height: 32px !important; padding: 0 10px !important; border-radius: 12px !important; font-size: 10px !important; font-weight: 900 !important; white-space: nowrap !important; }
      body.sion-saved-screen .sion-clean-menu-group { padding: 8px !important; border: 1px solid rgba(228,216,202,.82) !important; border-radius: 18px !important; background: rgba(255,252,247,.62) !important; margin-bottom: 9px !important; }
      body.sion-saved-screen .sion-clean-menu-label { display: block !important; margin: 0 0 6px 2px !important; color: #756B61 !important; font-size: 10px !important; font-weight: 900 !important; letter-spacing: -.02em !important; }
      body.sion-saved-screen .sion-clean-check,
      body.sion-saved-screen .sion-clean-action-box { width: 30px !important; height: 30px !important; min-width: 30px !important; min-height: 30px !important; padding: 0 !important; border-radius: 11px !important; border: 1px solid #E4D8CA !important; background: #fff !important; color: #756B61 !important; display: inline-flex !important; align-items: center !important; justify-content: center !important; box-shadow: 0 6px 12px rgba(52,45,39,0.05) !important; flex: 0 0 auto !important; }
      body.sion-saved-screen .sion-clean-check { color: transparent !important; }
      body.sion-saved-screen .sion-clean-check[data-checked="true"] { border-color: transparent !important; background: linear-gradient(145deg, #6F8F72, #86B7AD) !important; color: #fff !important; }
      body.sion-saved-screen .sion-clean-check svg,
      body.sion-saved-screen .sion-clean-action-box svg { width: 16px !important; height: 16px !important; display: block !important; }
      body.sion-saved-screen .sion-clean-card-selected { background: rgba(111, 143, 114, 0.12) !important; border-color: rgba(111, 143, 114, 0.76) !important; box-shadow: 0 10px 22px rgba(111, 143, 114, 0.16) !important; }
      body.sion-saved-screen .sion-clean-bulk-bar { position: fixed !important; left: 12px !important; right: 12px !important; bottom: calc(82px + env(safe-area-inset-bottom)) !important; z-index: 10020 !important; display: flex !important; justify-content: center !important; pointer-events: none !important; }
      body.sion-saved-screen .sion-clean-bulk-inner { width: min(100%, 420px) !important; display: grid !important; grid-template-columns: 1fr 92px !important; gap: 8px !important; padding: 10px !important; border: 1px solid #E4D8CA !important; border-radius: 18px !important; background: rgba(255,252,247,.97) !important; box-shadow: 0 14px 34px rgba(52,45,39,.16) !important; pointer-events: auto !important; }
      body.sion-saved-screen .sion-clean-bulk-copy,
      body.sion-saved-screen .sion-clean-bulk-cancel { border: 1px solid #E4D8CA !important; border-radius: 14px !important; padding: 12px !important; font: inherit !important; font-weight: 900 !important; }
      body.sion-saved-screen .sion-clean-bulk-copy { border-color: transparent !important; color: #fff !important; background: linear-gradient(145deg, #6F8F72, #86B7AD) !important; }
      body.sion-saved-screen .sion-clean-bulk-cancel { color: #756B61 !important; background: #fff !important; }
      body.sion-saved-screen .sion-bulk-copy-bar { display: none !important; }
      .sion-nav-verified { min-height: 60px !important; touch-action: manipulation !important; }
      .sion-nav-verified.active { transform: translateY(-2px) !important; }
      nav .sion-nav-verified:nth-child(1) { order: 1 !important; }
      nav .sion-nav-verified:nth-child(2) { order: 3 !important; }
      nav .sion-nav-verified:nth-child(3) { order: 2 !important; }
      nav .sion-nav-verified:nth-child(4) { order: 4 !important; }
      nav .sion-nav-verified:nth-child(5) { order: 5 !important; }
    `;
    document.head.appendChild(style);
  };

  const refSpanForCard = (card: Element) => $all<HTMLSpanElement>('span').find(span => card.contains(span) && /\s\d+:\d+/.test(span.textContent?.trim() || ''));
  const cardRef = (card: Element) => refSpanForCard(card)?.textContent?.trim() || '';
  const isSavedVerseCard = (card: Element | null): card is HTMLElement => Boolean(card && refSpanForCard(card) && card.querySelector('.serif-verse'));
  const getSavedCards = () => $all<HTMLElement>('main button').filter(isSavedVerseCard);
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

  const cardToText = (card: Element) => `${cardRef(card)}\n${card.querySelector('.serif-verse')?.textContent?.trim() || ''}`.trim();

  const updateBulkBar = () => {
    document.querySelector('.sion-clean-bulk-bar')?.remove();
    if (!selectMode || !isSavedScreen()) return;
    const bar = document.createElement('div');
    bar.className = 'sion-clean-bulk-bar';
    bar.innerHTML = `<div class="sion-clean-bulk-inner"><button type="button" class="sion-clean-bulk-copy">선택 ${getSelectedCards().length}개 복사</button><button type="button" class="sion-clean-bulk-cancel">취소</button></div>`;
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
          actions.appendChild(child);
        }
      });

      let copy = actions.querySelector<HTMLElement>('.sion-card-copy');
      if (!copy) {
        copy = document.createElement('span');
        copy.className = 'sion-card-copy sion-clean-action-box';
        copy.setAttribute('role', 'button');
        copy.setAttribute('aria-label', '복사');
        copy.innerHTML = COPY_ICON;
        copy.addEventListener('click', async event => {
          event.preventDefault();
          event.stopPropagation();
          await writeClipboard(cardToText(card));
          alert('복사되었습니다!');
        });
        actions.insertBefore(copy, actions.firstChild);
      }

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
    card.style.background = checked && selectMode ? 'rgba(111, 143, 114, 0.12)' : '';
    card.style.borderColor = checked && selectMode ? 'rgba(111, 143, 114, 0.76)' : '';
    card.style.boxShadow = checked && selectMode ? '0 10px 22px rgba(111, 143, 114, 0.16)' : '';
  };

  const applyMenuCleanup = () => {
    if (!isSavedScreen()) return;
    $all<HTMLElement>('main .title-font')
      .filter(el => ['다시 읽는 말씀', '다시 읽는 해설', '다시 읽는 묵상', '다시 읽는 기도문', '다시 읽는 적용'].includes(el.textContent?.trim() || ''))
      .forEach(title => title.closest('div')?.classList.add('sion-card-title-hidden'));

    $all<HTMLButtonElement>('button').forEach(button => {
      const text = buttonText(button);
      if (text.includes('선택복사')) button.textContent = '선택';
    });

    const reorderButton = $all<HTMLButtonElement>('button').find(button => button.textContent?.includes('순서변경'));
    reorderButton?.parentElement?.classList.add('sion-clean-toolbar');

    const contentButton = $all<HTMLButtonElement>('button').find(button => ['말씀', '해설', '묵상', '기도문', '적용'].includes(button.textContent?.trim() || ''));
    const contentGroup = contentButton?.parentElement;
    if (contentGroup && !contentGroup.querySelector('.sion-clean-menu-label')) {
      contentGroup.classList.add('sion-clean-menu-group');
      const label = document.createElement('span');
      label.className = 'sion-clean-menu-label';
      label.textContent = '내용 메뉴';
      contentGroup.insertBefore(label, contentGroup.firstChild);
    }

    const groupButton = $all<HTMLButtonElement>('button').find(button => ['일별', '주별', '월별', '주제별', '권별'].includes(button.textContent?.trim() || ''));
    const group = groupButton?.parentElement;
    if (group && !group.querySelector('.sion-clean-menu-label')) {
      group.classList.add('sion-clean-menu-group');
      const label = document.createElement('span');
      label.className = 'sion-clean-menu-label';
      label.textContent = '정렬/분류 메뉴';
      group.insertBefore(label, group.firstChild);
    }
  };

  const applyNavCleanup = () => {
    $all<HTMLButtonElement>('nav button').forEach(button => {
      button.classList.add('sion-nav-verified');
      if (!button.getAttribute('aria-label')) button.setAttribute('aria-label', `${buttonText(button)} 탭`);
    });
  };

  const verifyButtons = () => {
    const missing = ['홈', '성경', '통독', '암송', '저장']
      .filter(label => !$all<HTMLButtonElement>('nav button').some(button => buttonText(button) === label || button.getAttribute('aria-label') === `${label} 탭`));
    if (missing.length > 0 && !location.pathname.startsWith('/reading-room')) {
      console.warn('[Sion Bible] Missing nav buttons:', missing.join(', '));
    }
  };

  const applyAll = () => {
    installStyle();
    syncSavedClass();
    applyNavCleanup();
    verifyButtons();

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
    const text = buttonText(button);
    if (text === '선택' || text.includes('선택복사')) {
      toggleSelectMode();
      return true;
    }
    return false;
  };

  const stop = (event: Event) => {
    event.preventDefault();
    event.stopPropagation();
    if ('stopImmediatePropagation' in event) event.stopImmediatePropagation();
  };

  document.addEventListener('pointerup', event => {
    const target = event.target instanceof Element ? event.target : null;
    if (handleSelectionButton(target)) {
      stop(event);
      return;
    }
    if (!isSavedScreen() || !selectMode) return;
    if (target?.closest('.sion-clean-bulk-copy') || target?.closest('.sion-clean-bulk-cancel')) return;
    const card = getCardFromTarget(target);
    if (!card) return;
    const inActions = Boolean(target?.closest('.sion-card-actions'));
    const inCheck = Boolean(target?.closest('.sion-clean-check'));
    if (inActions && !inCheck) return;
    stop(event);
    toggleCard(card);
  }, true);

  document.addEventListener('click', async event => {
    const target = event.target instanceof Element ? event.target : null;
    if (handleSelectionButton(target)) {
      stop(event);
      return;
    }
    if (!isSavedScreen()) return;
    if (target?.closest('.sion-clean-bulk-copy')) {
      stop(event);
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
      stop(event);
      selectMode = false;
      selectedRefs.clear();
      scheduleApply();
    }
  }, true);

  const observer = new MutationObserver(scheduleApply);
  window.addEventListener('load', () => observer.observe(document.body, { childList: true, subtree: true }));
  window.setInterval(scheduleApply, 700);
})();