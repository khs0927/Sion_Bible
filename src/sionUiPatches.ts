// UI patches for the Sion Bible PWA.
// These patches intentionally run outside React because a few saved-screen controls
// are injected by index.html and can otherwise fight React re-renders on iOS PWA.

(() => {
  const CHECK_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"></path></svg>';
  const COPY_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
  const selectedRefs = new Set<string>();
  let selectMode = false;
  let allowOneBibleNav = false;

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
      .sion-bible-nav-backdrop { position: fixed; inset: 0; z-index: 10040; display: flex; align-items: flex-end; justify-content: center; padding: 16px; background: rgba(35,29,24,.32); backdrop-filter: blur(4px); }
      .sion-bible-nav-sheet { width: min(100%, 430px); border: 1px solid #E4D8CA; border-radius: 24px; background: #FFFCF7; box-shadow: 0 18px 44px rgba(52,45,39,.18); padding: 16px; color: #342D27; font-family: 'S-Core Dream', Pretendard, system-ui, sans-serif; }
      .sion-bible-nav-title { font-weight: 900; font-size: 18px; margin-bottom: 4px; }
      .sion-bible-nav-desc { color: #756B61; font-size: 12px; line-height: 1.55; margin-bottom: 12px; }
      .sion-bible-nav-options { display: grid; gap: 8px; }
      .sion-bible-nav-option { width: 100%; border: 1px solid #E4D8CA; border-radius: 16px; background: #F8F3EC; color: #342D27; padding: 12px 13px; font: inherit; font-weight: 900; text-align: left; display: flex; justify-content: space-between; align-items: center; gap: 10px; }
      .sion-bible-nav-option.primary { border-color: transparent; background: linear-gradient(145deg, #6F8F72, #86B7AD); color: #fff; }
      .sion-bible-nav-option small { display: block; color: #756B61; font-size: 11px; font-weight: 700; margin-top: 3px; }
      .sion-bible-nav-option.primary small { color: rgba(255,255,255,.86); }
      .sion-bible-nav-close { width: 100%; margin-top: 10px; border: 1px solid #E4D8CA; border-radius: 15px; background: #fff; color: #756B61; padding: 11px; font: inherit; font-weight: 900; }
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

  const bibleNavButton = () => $all<HTMLButtonElement>('nav button').find(button => button.getAttribute('aria-label') === '성경 탭' || buttonText(button) === '성경');
  const clickNav = (label: string) => $all<HTMLButtonElement>('nav button').find(button => button.getAttribute('aria-label') === `${label} 탭` || buttonText(button) === label)?.click();

  const closeBibleSheet = () => document.querySelector('.sion-bible-nav-backdrop')?.remove();
  const openBibleSheet = () => {
    closeBibleSheet();
    const backdrop = document.createElement('div');
    backdrop.className = 'sion-bible-nav-backdrop';
    backdrop.innerHTML = `
      <section class="sion-bible-nav-sheet" role="dialog" aria-modal="true" aria-label="성경 이동 메뉴">
        <div class="sion-bible-nav-title">성경 메뉴</div>
        <div class="sion-bible-nav-desc">성경 아이콘을 눌러도 바로 이동하지 않고, 원하는 동작을 선택하도록 했습니다.</div>
        <div class="sion-bible-nav-options">
          <button type="button" class="sion-bible-nav-option primary" data-bible-action="open"><span>마지막 읽은 성경 열기<small>저장된 마지막 권/장으로 이동</small></span><strong>›</strong></button>
          <button type="button" class="sion-bible-nav-option" data-bible-action="search"><span>성경 검색 열기<small>구절이나 단어로 찾기</small></span><strong>⌕</strong></button>
          <button type="button" class="sion-bible-nav-option" data-bible-action="plan"><span>통독 메뉴로 가기<small>읽기 계획과 오늘 본문 확인</small></span><strong>›</strong></button>
        </div>
        <button type="button" class="sion-bible-nav-close">닫기</button>
      </section>
    `;
    backdrop.addEventListener('click', event => {
      const target = event.target instanceof Element ? event.target : null;
      if (target === backdrop || target?.closest('.sion-bible-nav-close')) {
        closeBibleSheet();
        return;
      }
      const action = target?.closest<HTMLElement>('[data-bible-action]')?.dataset.bibleAction;
      if (!action) return;
      closeBibleSheet();
      if (action === 'plan') {
        clickNav('통독');
        return;
      }
      allowOneBibleNav = true;
      bibleNavButton()?.click();
      if (action === 'search') {
        window.setTimeout(() => $all<HTMLButtonElement>('button').find(button => button.getAttribute('aria-label') === '성경 검색')?.click(), 180);
      }
    });
    document.body.appendChild(backdrop);
  };

  const applyNavCleanup = () => {
    installStyle();
    const buttons = $all<HTMLButtonElement>('nav button');
    buttons.forEach(button => {
      button.classList.add('sion-nav-verified');
      button.classList.toggle('active', button.classList.contains('active'));
      if (!button.getAttribute('aria-label')) button.setAttribute('aria-label', `${buttonText(button)} 탭`);
    });
  };

  const verifyButtons = () => {
    const missing = ['홈', '성경', '통독', '암송', '저장']
      .filter(label => !$all<HTMLButtonElement>('nav button').some(button => buttonText(button) === label || button.getAttribute('aria-label') === `${label} 탭`));
    if (missing.length > 0) console.warn('[Sion Bible] Missing nav buttons:', missing.join(', '));
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
  const handleBibleButton = (target: Element | null) => {
    const button = target?.closest('button');
    if (!button) return false;
    const isBible = button.getAttribute('aria-label') === '성경 탭' || buttonText(button) === '성경';
    if (!isBible) return false;
    if (allowOneBibleNav) {
      allowOneBibleNav = false;
      return false;
    }
    openBibleSheet();
    return true;
  };

  const stop = (event: Event) => {
    event.preventDefault();
    event.stopPropagation();
    if ('stopImmediatePropagation' in event) event.stopImmediatePropagation();
  };

  document.addEventListener('pointerup', event => {
    const target = event.target instanceof Element ? event.target : null;
    if (handleBibleButton(target) || handleSelectionButton(target)) {
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
    if (handleBibleButton(target) || handleSelectionButton(target)) {
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
