type BackupPayload = {
  format: 'sion-bible-backup';
  version: 1;
  exportedAt: string;
  source: {
    app: 'Sion Bible';
    origin: string;
    timezone: string;
  };
  storage: Record<string, string>;
  checksum: string;
};

const PANEL_ID = 'sion-data-backup-panel';
const FILE_INPUT_ID = 'sion-data-backup-input';
const ROLLBACK_KEY = 'sion_data_backup_rollback_v1';
const MAX_BACKUP_BYTES = 5 * 1024 * 1024;
const BACKUP_FORMAT = 'sion-bible-backup';
const BACKUP_VERSION = 1;

let initialized = false;
let renderScheduled = false;

function isManagedKey(key: string) {
  const allowed = key.startsWith('gb_')
    || key.startsWith('sion_')
    || key === 'savedVerseSortMode';
  const sensitive = /(token|secret|api[_-]?key|authorization|credential|password)/i.test(key);
  return allowed && !sensitive;
}

function collectManagedStorage() {
  const storage: Record<string, string> = {};
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key || !isManagedKey(key)) continue;
    const value = window.localStorage.getItem(key);
    if (value !== null) storage[key] = value;
  }
  return Object.fromEntries(Object.entries(storage).sort(([left], [right]) => left.localeCompare(right)));
}

function canonicalStorage(storage: Record<string, string>) {
  return JSON.stringify(Object.fromEntries(Object.entries(storage).sort(([left], [right]) => left.localeCompare(right))));
}

function checksum(value: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function createBackupPayload(): BackupPayload {
  const storage = collectManagedStorage();
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    source: {
      app: 'Sion Bible',
      origin: window.location.origin,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    storage,
    checksum: checksum(canonicalStorage(storage)),
  };
}

function downloadBackup() {
  const payload = createBackupPayload();
  const date = payload.exportedAt.slice(0, 10).replace(/-/g, '');
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `sion-bible-backup-${date}.json`;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  setPanelStatus(`${Object.keys(payload.storage).length}개 데이터 항목을 백업했습니다.`, 'success');
}

function parseBackup(value: unknown): BackupPayload {
  if (!value || typeof value !== 'object') throw new Error('백업 파일 구조가 올바르지 않습니다.');
  const candidate = value as Partial<BackupPayload>;
  if (candidate.format !== BACKUP_FORMAT) throw new Error('시온바이블 백업 파일이 아닙니다.');
  if (candidate.version !== BACKUP_VERSION) throw new Error(`지원하지 않는 백업 버전입니다. 현재 지원 버전: ${BACKUP_VERSION}`);
  if (!candidate.storage || typeof candidate.storage !== 'object' || Array.isArray(candidate.storage)) {
    throw new Error('백업 데이터 영역이 손상되었습니다.');
  }

  const storage: Record<string, string> = {};
  for (const [key, rawValue] of Object.entries(candidate.storage)) {
    if (!isManagedKey(key)) throw new Error(`허용되지 않은 데이터 키가 포함되어 있습니다: ${key}`);
    if (typeof rawValue !== 'string') throw new Error(`데이터 값 형식이 올바르지 않습니다: ${key}`);
    storage[key] = rawValue;
  }

  const expected = checksum(canonicalStorage(storage));
  if (candidate.checksum !== expected) throw new Error('체크섬이 일치하지 않습니다. 파일이 변경되었거나 손상되었습니다.');

  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: typeof candidate.exportedAt === 'string' ? candidate.exportedAt : new Date(0).toISOString(),
    source: {
      app: 'Sion Bible',
      origin: candidate.source?.origin || '',
      timezone: candidate.source?.timezone || '',
    },
    storage: Object.fromEntries(Object.entries(storage).sort(([left], [right]) => left.localeCompare(right))),
    checksum: expected,
  };
}

function valueSummary(storage: Record<string, string>) {
  const keys = Object.keys(storage);
  const countFor = (predicate: (key: string) => boolean) => keys.filter(predicate).length;
  return {
    total: keys.length,
    saved: countFor((key) => key === 'gb_saved' || key === 'gb_journal'),
    memory: countFor((key) => key.startsWith('sion_memory_')),
    reading: countFor((key) => key.startsWith('sion_reading_')),
    settings: countFor((key) => ['gb_theme', 'gb_size', 'gb_last_book', 'gb_last_chap'].includes(key)),
  };
}

function saveRollbackSnapshot() {
  const storage = collectManagedStorage();
  window.sessionStorage.setItem(ROLLBACK_KEY, JSON.stringify({
    savedAt: new Date().toISOString(),
    storage,
    checksum: checksum(canonicalStorage(storage)),
  }));
}

function applyStorage(storage: Record<string, string>) {
  saveRollbackSnapshot();
  for (const [key, value] of Object.entries(storage)) {
    window.localStorage.setItem(key, value);
  }
}

function restoreRollback() {
  try {
    const raw = window.sessionStorage.getItem(ROLLBACK_KEY);
    if (!raw) throw new Error('되돌릴 복원 기록이 없습니다.');
    const snapshot = JSON.parse(raw) as { storage?: Record<string, string>; checksum?: string };
    if (!snapshot.storage || checksum(canonicalStorage(snapshot.storage)) !== snapshot.checksum) {
      throw new Error('되돌리기 데이터가 손상되었습니다.');
    }

    const currentKeys = Object.keys(collectManagedStorage());
    for (const key of currentKeys) window.localStorage.removeItem(key);
    for (const [key, value] of Object.entries(snapshot.storage)) {
      if (isManagedKey(key) && typeof value === 'string') window.localStorage.setItem(key, value);
    }
    window.sessionStorage.removeItem(ROLLBACK_KEY);
    window.alert('복원 이전 상태로 되돌렸습니다. 앱을 다시 불러옵니다.');
    window.location.reload();
  } catch (error) {
    setPanelStatus(error instanceof Error ? error.message : '되돌리기에 실패했습니다.', 'error');
  }
}

async function importBackup(file: File) {
  if (file.size > MAX_BACKUP_BYTES) throw new Error('백업 파일은 5MB 이하여야 합니다.');
  const text = await file.text();
  if (new Blob([text]).size > MAX_BACKUP_BYTES) throw new Error('백업 파일은 5MB 이하여야 합니다.');

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('JSON 형식이 올바르지 않습니다.');
  }

  const payload = parseBackup(parsed);
  const summary = valueSummary(payload.storage);
  const exported = new Date(payload.exportedAt);
  const exportedLabel = Number.isNaN(exported.getTime())
    ? '날짜 정보 없음'
    : exported.toLocaleString('ko-KR');

  const accepted = window.confirm([
    '백업 데이터를 현재 앱에 합쳐 복원합니다.',
    '',
    `백업 시각: ${exportedLabel}`,
    `전체 항목: ${summary.total}개`,
    `저장 말씀·묵상: ${summary.saved}개 영역`,
    `암송: ${summary.memory}개 영역`,
    `통독: ${summary.reading}개 영역`,
    `화면 설정: ${summary.settings}개 영역`,
    '',
    '현재 데이터는 같은 키가 있는 경우 백업 값으로 교체됩니다.',
    '복원 직후에는 이 브라우저 세션에서 한 번 되돌릴 수 있습니다.',
  ].join('\n'));
  if (!accepted) return;

  applyStorage(payload.storage);
  window.alert('백업을 복원했습니다. 변경 내용을 적용하기 위해 앱을 다시 불러옵니다.');
  window.location.reload();
}

function setPanelStatus(message: string, tone: 'neutral' | 'success' | 'error' = 'neutral') {
  const status = document.querySelector<HTMLElement>('[data-sion-backup-status]');
  if (!status) return;
  status.textContent = message;
  status.style.color = tone === 'success' ? '#4E7F59' : tone === 'error' ? '#C65C52' : '#756B61';
}

function isSettingsScreen() {
  const main = document.querySelector('main');
  if (!main) return false;
  const text = (main.textContent || '').replace(/\s+/g, ' ');
  return text.includes('테마') && text.includes('글자 크기') && text.includes('앱 설치');
}

function createButton(label: string, primary = false) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  Object.assign(button.style, {
    minHeight: '46px',
    padding: '10px 14px',
    border: primary ? '0' : '1px solid #E4D8CA',
    borderRadius: '15px',
    background: primary ? '#6F8F72' : '#FFFFFF',
    color: primary ? '#FFFFFF' : '#5F554D',
    fontFamily: 'inherit',
    fontSize: '13px',
    fontWeight: '900',
    cursor: 'pointer',
  });
  return button;
}

function renderBackupPanel() {
  const existing = document.getElementById(PANEL_ID);
  if (!isSettingsScreen()) {
    existing?.remove();
    return;
  }
  if (existing) {
    const rollback = existing.querySelector<HTMLButtonElement>('[data-sion-backup-rollback]');
    if (rollback) rollback.hidden = !window.sessionStorage.getItem(ROLLBACK_KEY);
    return;
  }

  const main = document.querySelector('main');
  if (!main) return;

  const panel = document.createElement('section');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', `${PANEL_ID}-title`);
  Object.assign(panel.style, {
    gridColumn: '1 / -1',
    padding: '18px',
    border: '1px solid #E4D8CA',
    borderRadius: '22px',
    background: '#FFFCF7',
    color: '#342D27',
    boxShadow: '0 8px 24px rgba(52,45,39,.07)',
  });

  const title = document.createElement('h2');
  title.id = `${PANEL_ID}-title`;
  title.textContent = '데이터 백업 및 복원';
  Object.assign(title.style, { margin: '0', fontSize: '17px', fontWeight: '900' });

  const description = document.createElement('p');
  description.textContent = '저장 말씀, 묵상, 암송, 통독 진행, 포인트와 화면 설정을 하나의 JSON 파일로 보관합니다. API 키나 인증 정보는 포함하지 않습니다.';
  Object.assign(description.style, { margin: '7px 0 14px', color: '#756B61', fontSize: '12px', lineHeight: '1.65' });

  const actions = document.createElement('div');
  Object.assign(actions.style, { display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: '9px' });

  const exportButton = createButton('백업 파일 내보내기', true);
  exportButton.addEventListener('click', downloadBackup);

  const importButton = createButton('백업 파일 복원');
  importButton.addEventListener('click', () => document.getElementById(FILE_INPUT_ID)?.click());

  const rollbackButton = createButton('마지막 복원 되돌리기');
  rollbackButton.dataset.sionBackupRollback = 'true';
  rollbackButton.hidden = !window.sessionStorage.getItem(ROLLBACK_KEY);
  rollbackButton.style.gridColumn = '1 / -1';
  rollbackButton.addEventListener('click', () => {
    if (window.confirm('이번 세션에서 수행한 마지막 복원을 취소하고 이전 데이터로 되돌릴까요?')) restoreRollback();
  });

  const fileInput = document.createElement('input');
  fileInput.id = FILE_INPUT_ID;
  fileInput.type = 'file';
  fileInput.accept = '.json,application/json';
  fileInput.hidden = true;
  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    fileInput.value = '';
    if (!file) return;
    setPanelStatus('백업 파일을 검사하는 중...', 'neutral');
    void importBackup(file).catch((error) => {
      setPanelStatus(error instanceof Error ? error.message : '백업 복원에 실패했습니다.', 'error');
    });
  });

  const status = document.createElement('p');
  status.dataset.sionBackupStatus = 'true';
  status.setAttribute('role', 'status');
  status.textContent = '백업은 현재 기기에 저장된 앱 데이터만 포함합니다.';
  Object.assign(status.style, { margin: '12px 0 0', color: '#756B61', fontSize: '11px', lineHeight: '1.5' });

  actions.append(exportButton, importButton, rollbackButton);
  panel.append(title, description, actions, fileInput, status);
  main.appendChild(panel);
}

function scheduleRender() {
  if (renderScheduled) return;
  renderScheduled = true;
  window.requestAnimationFrame(() => {
    renderScheduled = false;
    renderBackupPanel();
  });
}

export function initializeDataBackup() {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;
  const observer = new MutationObserver(scheduleRender);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('popstate', scheduleRender);
  scheduleRender();
}
