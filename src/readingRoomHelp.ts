const HELP_MODAL_ID = 'sion-reading-room-help-modal';
let initialized = false;

function closeHelp() {
  document.getElementById(HELP_MODAL_ID)?.remove();
}

function helpContent() {
  const path = window.location.pathname;
  if (path.startsWith('/reading-room/mission')) {
    return {
      title: '오늘의 통독 미션 안내',
      steps: [
        '오늘 읽을 장을 하나씩 선택하고 체크하세요.',
        '읽으러 가기에서 해당 본문을 확인하세요.',
        '묵상하기에 마음에 남은 말씀과 기도를 기록하세요.',
        '모든 장을 읽은 뒤 완료 체크를 누르면 포인트와 연속 읽기가 반영됩니다.',
      ],
    };
  }
  if (path.startsWith('/reading-room/course-detail')) {
    return {
      title: '통독 코스 안내',
      steps: [
        '코스 기간과 하루 분량을 먼저 확인하세요.',
        '코스를 시작하면 오늘의 미션과 진행률이 저장됩니다.',
        '중간에 나가도 나의 코스에서 이어서 읽을 수 있습니다.',
      ],
    };
  }
  return {
    title: '통독방 이용 안내',
    steps: [
      '추천 코스에서 목적에 맞는 통독 계획을 고르세요.',
      '나의 코스에서 오늘 읽을 본문과 진행률을 확인하세요.',
      '기록에서 읽기 습관을 확인하고 보상에서 포인트를 사용할 수 있습니다.',
    ],
  };
}

function openHelp() {
  closeHelp();
  const content = helpContent();
  const overlay = document.createElement('div');
  overlay.id = HELP_MODAL_ID;
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', `${HELP_MODAL_ID}-title`);
  Object.assign(overlay.style, {
    position: 'fixed',
    inset: '0',
    zIndex: '1700',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    padding: '16px',
    background: 'rgba(31,27,23,.42)',
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
    color: '#342D27',
    boxShadow: '0 24px 60px rgba(35,29,23,.25)',
  });

  const header = document.createElement('div');
  Object.assign(header.style, { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' });
  const title = document.createElement('h2');
  title.id = `${HELP_MODAL_ID}-title`;
  title.textContent = content.title;
  Object.assign(title.style, { margin: '0', fontSize: '21px', fontWeight: '900' });
  const close = document.createElement('button');
  close.type = 'button';
  close.setAttribute('aria-label', '통독 도움말 닫기');
  close.textContent = '×';
  Object.assign(close.style, {
    width: '40px', height: '40px', border: '0', borderRadius: '999px', background: '#F3EEE6',
    color: '#4B423A', fontSize: '24px', lineHeight: '1', cursor: 'pointer',
  });
  close.addEventListener('click', closeHelp);
  header.append(title, close);

  const intro = document.createElement('p');
  intro.textContent = '아래 순서대로 진행하면 통독 기록이 안전하게 저장됩니다.';
  Object.assign(intro.style, { margin: '14px 0', color: '#756D64', fontSize: '13px', lineHeight: '1.65' });

  const list = document.createElement('ol');
  Object.assign(list.style, { display: 'grid', gap: '10px', margin: '0', padding: '0', listStyle: 'none' });
  content.steps.forEach((step, index) => {
    const item = document.createElement('li');
    Object.assign(item.style, {
      display: 'grid', gridTemplateColumns: '34px 1fr', alignItems: 'start', gap: '10px',
      padding: '12px', border: '1px solid #E7DDCF', borderRadius: '17px', background: '#FFFFFF',
      fontSize: '13px', lineHeight: '1.55',
    });
    const number = document.createElement('span');
    number.textContent = String(index + 1);
    Object.assign(number.style, {
      display: 'grid', width: '30px', height: '30px', placeItems: 'center', borderRadius: '999px',
      background: '#EAF3E7', color: '#4E7F59', fontWeight: '900',
    });
    const text = document.createElement('span');
    text.textContent = step;
    item.append(number, text);
    list.appendChild(item);
  });

  const confirm = document.createElement('button');
  confirm.type = 'button';
  confirm.textContent = '확인했어요';
  Object.assign(confirm.style, {
    width: '100%', minHeight: '48px', marginTop: '16px', border: '0', borderRadius: '16px',
    background: '#6F8F72', color: '#FFFFFF', fontSize: '14px', fontWeight: '900', cursor: 'pointer',
  });
  confirm.addEventListener('click', closeHelp);

  panel.append(header, intro, list, confirm);
  overlay.appendChild(panel);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) closeHelp();
  });
  overlay.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeHelp();
  });
  document.body.appendChild(overlay);
  window.setTimeout(() => close.focus(), 0);
}

function isHelpButton(button: HTMLButtonElement) {
  return Boolean(
    button.querySelector('svg.lucide-circle-help')
    || button.querySelector('svg[class*="circle-help"]')
    || button.getAttribute('aria-label')?.includes('도움말'),
  );
}

export function initializeReadingRoomHelp() {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;
  document.addEventListener('click', (event) => {
    if (!window.location.pathname.startsWith('/reading-room')) return;
    const button = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('button') : null;
    if (!button || !isHelpButton(button)) return;
    event.preventDefault();
    openHelp();
  }, true);
}
