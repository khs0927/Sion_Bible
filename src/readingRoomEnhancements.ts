type ReadingReflection = {
  id: string;
  date: string;
  taskLabel: string;
  text: string;
  updatedAt: string;
};

type RewardPurchase = {
  id: string;
  title: string;
  cost: number;
  purchasedAt: string;
};

type RewardState = {
  spentPoints: number;
  purchases: RewardPurchase[];
};

const REFLECTIONS_KEY = 'sion_reading_room_reflections_v1';
const REWARDS_KEY = 'sion_reading_room_rewards_v1';
const MODAL_ID = 'sion-reading-reflection-modal';
const TOAST_ID = 'sion-reading-room-enhancement-toast';

let initialized = false;
let applyScheduled = false;

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

function normalizeText(value: string | null | undefined) {
  return (value || '').replace(/\s+/g, ' ').trim();
}

function todayKey() {
  const date = new Date();
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function currentMissionTaskLabel() {
  const candidates = [...document.querySelectorAll<HTMLElement>('main h1, main h2, main h3, main strong, main b')]
    .map((element) => normalizeText(element.textContent))
    .filter(Boolean);

  return candidates.find((text) => /(?:장|편)(?:\s|$)/.test(text) && /\d/.test(text))
    || candidates.find((text) => text.includes('오늘의'))
    || '오늘의 통독 본문';
}

function reflectionId(taskLabel = currentMissionTaskLabel()) {
  return `${todayKey()}::${taskLabel}`;
}

function getReflections() {
  const items = readJson<ReadingReflection[]>(REFLECTIONS_KEY, []);
  return Array.isArray(items) ? items : [];
}

function saveReflection(taskLabel: string, text: string) {
  const id = reflectionId(taskLabel);
  const now = new Date().toISOString();
  const next: ReadingReflection = {
    id,
    date: todayKey(),
    taskLabel,
    text: text.trim(),
    updatedAt: now,
  };
  const items = [next, ...getReflections().filter((item) => item.id !== id)].slice(0, 500);
  writeJson(REFLECTIONS_KEY, items);
  window.dispatchEvent(new CustomEvent('sion:reading-reflection-saved', { detail: next }));
  return next;
}

function getRewardState(): RewardState {
  const state = readJson<RewardState>(REWARDS_KEY, { spentPoints: 0, purchases: [] });
  return {
    spentPoints: Math.max(0, Number(state.spentPoints) || 0),
    purchases: Array.isArray(state.purchases) ? state.purchases : [],
  };
}

function saveRewardState(state: RewardState) {
  writeJson(REWARDS_KEY, state);
  window.dispatchEvent(new CustomEvent('sion:reading-rewards-updated', { detail: state }));
}

function rewardId(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9가-힣]+/g, '-').replace(/^-|-$/g, '');
}

function parsePoints(value: string) {
  const match = value.match(/([\d,]+)\s*P/i);
  return match ? Number(match[1].replace(/,/g, '')) : 0;
}

function showToast(message: string) {
  document.getElementById(TOAST_ID)?.remove();
  const toast = document.createElement('div');
  toast.id = TOAST_ID;
  toast.setAttribute('role', 'status');
  toast.textContent = message;
  Object.assign(toast.style, {
    position: 'fixed',
    left: '50%',
    bottom: 'calc(88px + env(safe-area-inset-bottom))',
    transform: 'translateX(-50%)',
    zIndex: '1600',
    maxWidth: 'calc(100vw - 32px)',
    padding: '12px 16px',
    borderRadius: '16px',
    background: '#342D27',
    color: '#FFFFFF',
    fontSize: '13px',
    fontWeight: '800',
    textAlign: 'center',
    boxShadow: '0 12px 30px rgba(0,0,0,.22)',
  });
  document.body.appendChild(toast);
  window.setTimeout(() => toast.remove(), 2200);
}

function closeReflectionModal() {
  document.getElementById(MODAL_ID)?.remove();
}

function openReflectionModal() {
  closeReflectionModal();
  const taskLabel = currentMissionTaskLabel();
  const existing = getReflections().find((item) => item.id === reflectionId(taskLabel));

  const overlay = document.createElement('div');
  overlay.id = MODAL_ID;
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', `${MODAL_ID}-title`);
  Object.assign(overlay.style, {
    position: 'fixed',
    inset: '0',
    zIndex: '1500',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    padding: '16px',
    background: 'rgba(31, 27, 23, .42)',
    backdropFilter: 'blur(5px)',
  });

  const panel = document.createElement('section');
  Object.assign(panel.style, {
    width: '100%',
    maxWidth: '460px',
    padding: '20px',
    paddingBottom: 'calc(20px + env(safe-area-inset-bottom))',
    border: '1px solid #E7DDCF',
    borderRadius: '28px',
    background: '#FFFDF8',
    boxShadow: '0 24px 60px rgba(35, 29, 23, .25)',
  });

  const header = document.createElement('div');
  Object.assign(header.style, { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' });
  const headingWrap = document.createElement('div');
  const eyebrow = document.createElement('p');
  eyebrow.textContent = taskLabel;
  Object.assign(eyebrow.style, { margin: '0 0 5px', color: '#6F8F72', fontSize: '11px', fontWeight: '800' });
  const title = document.createElement('h2');
  title.id = `${MODAL_ID}-title`;
  title.textContent = '오늘의 말씀 묵상';
  Object.assign(title.style, { margin: '0', color: '#342D27', fontSize: '22px', fontWeight: '900' });
  headingWrap.append(eyebrow, title);

  const close = document.createElement('button');
  close.type = 'button';
  close.setAttribute('aria-label', '묵상 기록 닫기');
  close.textContent = '×';
  Object.assign(close.style, {
    width: '40px', height: '40px', border: '0', borderRadius: '999px', background: '#F3EEE6',
    color: '#4B423A', fontSize: '24px', lineHeight: '1', cursor: 'pointer',
  });
  close.addEventListener('click', closeReflectionModal);
  header.append(headingWrap, close);

  const prompt = document.createElement('p');
  prompt.textContent = '오늘 본문에서 마음에 남은 말씀과 하나님께 드리고 싶은 고백을 기록해보세요.';
  Object.assign(prompt.style, { margin: '16px 0 10px', color: '#756D64', fontSize: '13px', lineHeight: '1.65' });

  const textarea = document.createElement('textarea');
  textarea.value = existing?.text || '';
  textarea.placeholder = '마음에 남은 말씀, 깨달음, 기도 제목을 적어보세요.';
  textarea.setAttribute('aria-label', '오늘의 통독 묵상 내용');
  Object.assign(textarea.style, {
    boxSizing: 'border-box', width: '100%', minHeight: '180px', resize: 'vertical', padding: '15px',
    border: '1px solid #E4D8CA', borderRadius: '18px', outline: 'none', background: '#FFFFFF',
    color: '#342D27', fontFamily: 'inherit', fontSize: '15px', lineHeight: '1.7',
  });

  const footer = document.createElement('div');
  Object.assign(footer.style, { display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '10px', marginTop: '14px' });
  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.textContent = '취소';
  Object.assign(cancel.style, {
    minHeight: '48px', border: '1px solid #E4D8CA', borderRadius: '16px', background: '#FFFFFF',
    color: '#756D64', fontSize: '14px', fontWeight: '900', cursor: 'pointer',
  });
  cancel.addEventListener('click', closeReflectionModal);

  const save = document.createElement('button');
  save.type = 'button';
  save.textContent = existing ? '묵상 수정하기' : '묵상 저장하기';
  Object.assign(save.style, {
    minHeight: '48px', border: '0', borderRadius: '16px', background: '#6F8F72',
    color: '#FFFFFF', fontSize: '14px', fontWeight: '900', cursor: 'pointer',
    boxShadow: '0 8px 20px rgba(86, 118, 89, .24)',
  });
  save.addEventListener('click', () => {
    if (!textarea.value.trim()) {
      showToast('묵상 내용을 먼저 적어주세요.');
      textarea.focus();
      return;
    }
    saveReflection(taskLabel, textarea.value);
    closeReflectionModal();
    showToast('오늘의 묵상을 저장했습니다.');
    scheduleApply();
  });

  footer.append(cancel, save);
  panel.append(header, prompt, textarea, footer);
  overlay.appendChild(panel);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) closeReflectionModal();
  });
  overlay.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeReflectionModal();
  });
  document.body.appendChild(overlay);
  window.setTimeout(() => textarea.focus(), 0);
}

function findBalanceHeading() {
  return [...document.querySelectorAll<HTMLElement>('h1, h2, h3, strong, b')]
    .find((element) => {
      const text = normalizeText(element.textContent);
      const parentText = normalizeText(element.parentElement?.textContent);
      return /^[\d,]+P$/i.test(text) && parentText.includes('내 포인트');
    }) || null;
}

function earnedAndAvailablePoints() {
  const heading = findBalanceHeading();
  const rewards = getRewardState();
  if (!heading) return { earned: 0, available: 0, heading: null as HTMLElement | null, rewards };

  const visible = parsePoints(normalizeText(heading.textContent));
  const previousAvailable = Number(heading.dataset.sionAvailablePoints);
  const earned = Number.isFinite(previousAvailable) && visible === previousAvailable
    ? visible + rewards.spentPoints
    : visible;
  const available = Math.max(0, earned - rewards.spentPoints);
  return { earned, available, heading, rewards };
}

function applyRewardBalance() {
  if (!window.location.pathname.startsWith('/reading-room/rewards')) return;
  const { available, heading, rewards } = earnedAndAvailablePoints();
  if (!heading) return;

  const nextText = `${available.toLocaleString('ko-KR')}P`;
  if (normalizeText(heading.textContent) !== nextText) heading.textContent = nextText;
  heading.dataset.sionAvailablePoints = String(available);
  heading.title = `통독으로 얻은 포인트에서 사용한 ${rewards.spentPoints.toLocaleString('ko-KR')}P를 제외한 잔액`;

  const balanceMessages = [...document.querySelectorAll<HTMLElement>('p')]
    .filter((element) => normalizeText(element.textContent).startsWith('보유 포인트'));
  for (const element of balanceMessages) {
    const text = `보유 포인트 ${available.toLocaleString('ko-KR')}P`;
    if (normalizeText(element.textContent) !== text) element.textContent = text;
  }
}

function storeButtons() {
  return [...document.querySelectorAll<HTMLButtonElement>('button')].filter((button) => {
    const text = normalizeText(button.textContent);
    const modalText = normalizeText(button.closest('[role="dialog"]')?.textContent || button.parentElement?.parentElement?.textContent);
    return /[\d,]+\s*P/i.test(text)
      && !text.includes('내 포인트')
      && (modalText.includes('포인트 사용') || Boolean(button.closest('.fixed')));
  });
}

function storeItemDetails(button: HTMLButtonElement) {
  const text = normalizeText(button.textContent);
  const cost = parsePoints(text);
  const title = text.replace(/[\d,]+\s*P/gi, '').replace(/^[^가-힣a-z0-9]+/i, '').trim() || '통독 보상';
  return { id: rewardId(title), title, cost };
}

function applyStoreState() {
  if (!window.location.pathname.startsWith('/reading-room/rewards')) return;
  applyRewardBalance();
  const { available, rewards } = earnedAndAvailablePoints();
  const purchasedIds = new Set(rewards.purchases.map((purchase) => purchase.id));

  for (const button of storeButtons()) {
    const item = storeItemDetails(button);
    if (!item.cost) continue;
    const purchased = purchasedIds.has(item.id);
    button.dataset.sionRewardItem = item.id;
    button.dataset.sionRewardCost = String(item.cost);
    button.dataset.sionRewardTitle = item.title;
    button.setAttribute('aria-label', purchased
      ? `${item.title}, 구매 완료`
      : `${item.title}, ${item.cost.toLocaleString('ko-KR')}포인트`);

    const costLabel = [...button.querySelectorAll<HTMLElement>('span, b, strong')]
      .find((element) => /[\d,]+\s*P/i.test(normalizeText(element.textContent)) || normalizeText(element.textContent) === '구매 완료');
    if (costLabel) {
      const label = purchased ? '구매 완료' : `${item.cost.toLocaleString('ko-KR')}P`;
      if (normalizeText(costLabel.textContent) !== label) costLabel.textContent = label;
    }

    button.disabled = purchased;
    button.style.opacity = purchased ? '0.62' : '1';
    button.style.cursor = purchased ? 'default' : available >= item.cost ? 'pointer' : 'not-allowed';
    if (!purchased && available < item.cost) button.title = `${(item.cost - available).toLocaleString('ko-KR')}P가 더 필요합니다.`;
    else button.removeAttribute('title');
  }
}

function purchaseHistorySignature(purchases: RewardPurchase[]) {
  return purchases
    .map((purchase) => `${purchase.id}:${purchase.cost}:${purchase.purchasedAt}`)
    .sort()
    .join('|');
}

function injectPurchaseHistory() {
  if (!window.location.pathname.startsWith('/reading-room/rewards')) return;
  const rewards = getRewardState();
  const heading = [...document.querySelectorAll<HTMLElement>('h1, h2, h3')]
    .find((element) => normalizeText(element.textContent) === '포인트 내역');
  const section = heading?.closest('section');
  if (!section) return;

  const current = section.querySelector<HTMLElement>('[data-sion-purchase-history]');
  if (!rewards.purchases.length) {
    current?.remove();
    return;
  }

  const signature = purchaseHistorySignature(rewards.purchases);
  if (current?.dataset.sionPurchaseSignature === signature) return;
  current?.remove();

  const group = document.createElement('div');
  group.dataset.sionPurchaseHistory = 'true';
  group.dataset.sionPurchaseSignature = signature;
  Object.assign(group.style, { marginTop: '12px', borderTop: '1px solid #EFE7DC' });

  for (const purchase of [...rewards.purchases].reverse()) {
    const row = document.createElement('div');
    Object.assign(row.style, { display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 0' });
    const icon = document.createElement('span');
    icon.textContent = '🎁';
    Object.assign(icon.style, { display: 'grid', width: '42px', height: '42px', placeItems: 'center', borderRadius: '14px', background: '#FFF5D7' });
    const info = document.createElement('div');
    Object.assign(info.style, { flex: '1', minWidth: '0' });
    const title = document.createElement('p');
    title.textContent = purchase.title;
    Object.assign(title.style, { margin: '0', fontSize: '13px', fontWeight: '900' });
    const date = document.createElement('p');
    date.textContent = new Date(purchase.purchasedAt).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    Object.assign(date.style, { margin: '4px 0 0', color: '#8A8177', fontSize: '10px', fontWeight: '700' });
    info.append(title, date);
    const value = document.createElement('b');
    value.textContent = `-${purchase.cost.toLocaleString('ko-KR')}P`;
    Object.assign(value.style, { color: '#B36D32', fontSize: '13px' });
    row.append(icon, info, value);
    group.appendChild(row);
  }
  section.appendChild(group);
}

function applyReflectionState() {
  if (!window.location.pathname.startsWith('/reading-room/mission')) return;
  const taskLabel = currentMissionTaskLabel();
  const saved = getReflections().find((item) => item.id === reflectionId(taskLabel));
  const button = [...document.querySelectorAll<HTMLButtonElement>('button')]
    .find((item) => normalizeText(item.textContent).includes('묵상하기'));
  if (!button) return;

  button.dataset.sionReadingReflection = 'true';
  button.setAttribute('aria-label', saved ? '오늘의 통독 묵상 수정하기' : '오늘의 통독 묵상 기록하기');
  button.title = saved ? '오늘 저장한 묵상을 다시 열어 수정합니다.' : '오늘 본문에 대한 묵상을 기록합니다.';

  let status = button.querySelector<HTMLElement>('[data-sion-reflection-status]');
  if (saved && !status) {
    status = document.createElement('span');
    status.dataset.sionReflectionStatus = 'true';
    status.textContent = '저장됨';
    Object.assign(status.style, {
      marginLeft: '6px', padding: '2px 7px', borderRadius: '999px', background: '#E8F2E6',
      color: '#4E7F59', fontSize: '9px', fontWeight: '900',
    });
    button.appendChild(status);
  }
  if (!saved) status?.remove();
}

function applyEnhancements() {
  applyReflectionState();
  applyStoreState();
  injectPurchaseHistory();
}

function scheduleApply() {
  if (applyScheduled) return;
  applyScheduled = true;
  window.requestAnimationFrame(() => {
    applyScheduled = false;
    applyEnhancements();
  });
}

function handleClick(event: MouseEvent) {
  const target = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('button') : null;
  if (!target) return;

  if (
    window.location.pathname.startsWith('/reading-room/mission')
    && normalizeText(target.textContent).includes('묵상하기')
  ) {
    event.preventDefault();
    openReflectionModal();
    return;
  }

  if (!target.dataset.sionRewardItem) return;
  event.preventDefault();
  const item = {
    id: target.dataset.sionRewardItem,
    title: target.dataset.sionRewardTitle || '통독 보상',
    cost: Number(target.dataset.sionRewardCost) || 0,
  };
  const { available, rewards } = earnedAndAvailablePoints();
  if (rewards.purchases.some((purchase) => purchase.id === item.id)) {
    showToast('이미 구매한 보상입니다.');
    return;
  }
  if (available < item.cost) {
    showToast(`${(item.cost - available).toLocaleString('ko-KR')}P가 더 필요합니다.`);
    return;
  }

  const next: RewardState = {
    spentPoints: rewards.spentPoints + item.cost,
    purchases: [...rewards.purchases, { ...item, purchasedAt: new Date().toISOString() }],
  };
  saveRewardState(next);
  showToast(`${item.title}을(를) 구매했습니다.`);
  scheduleApply();
}

export function initializeReadingRoomEnhancements() {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  document.addEventListener('click', handleClick, true);
  window.addEventListener('popstate', scheduleApply);
  window.addEventListener('storage', (event) => {
    if (event.key === REFLECTIONS_KEY || event.key === REWARDS_KEY) scheduleApply();
  });
  window.addEventListener('sion:reading-reflection-saved', scheduleApply as EventListener);
  window.addEventListener('sion:reading-rewards-updated', scheduleApply as EventListener);

  const observer = new MutationObserver(scheduleApply);
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  scheduleApply();
}
