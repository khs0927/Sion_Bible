const STYLE_ID = 'sion-design-consistency-style';
const DUPLICATE_MARK = 'data-sion-duplicate-title';
let initialized = false;
let scheduled = false;

function normalize(value: string | null | undefined) {
  return (value || '').replace(/\s+/g, ' ').trim();
}

function installStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    :root {
      --sion-title-xl: clamp(1.5rem, 5.2vw, 1.9rem);
      --sion-title-lg: clamp(1.2rem, 4.2vw, 1.45rem);
      --sion-title-md: 1rem;
      --sion-body: 1rem;
      --sion-body-sm: .875rem;
      --sion-label: .75rem;
      --sion-caption: .6875rem;
      --sion-line-body: 1.72;
      --sion-line-title: 1.28;
      --sion-card-radius: 22px;
      --sion-control-radius: 14px;
      --sion-card-gap: 12px;
      --sion-card-padding: 18px;
    }

    main h1, main .sion-page-title {
      font-size: var(--sion-title-xl) !important;
      line-height: var(--sion-line-title) !important;
      font-weight: 900 !important;
      letter-spacing: -.035em !important;
    }

    main h2, main .sion-section-title {
      font-size: var(--sion-title-lg) !important;
      line-height: var(--sion-line-title) !important;
      font-weight: 900 !important;
      letter-spacing: -.025em !important;
    }

    main h3, main .sion-card-title {
      font-size: var(--sion-title-md) !important;
      line-height: 1.42 !important;
      font-weight: 850 !important;
      letter-spacing: -.018em !important;
    }

    main p, main li, main textarea, main input, main .serif-verse {
      overflow-wrap: anywhere;
    }

    /* 묵상 화면: 카드 제목과 본문 크기를 한 단계 체계로 고정 */
    .meditation-question-panel,
    [aria-label="묵상 질문하기"] {
      font-size: var(--sion-body) !important;
    }

    .meditation-question-title h2,
    [aria-label="묵상 질문하기"] h2 {
      margin: 0 !important;
      font-size: var(--sion-title-lg) !important;
      line-height: var(--sion-line-title) !important;
      font-weight: 900 !important;
    }

    .meditation-question-title p,
    [aria-label="묵상 질문하기"] > div:first-child > p {
      font-size: var(--sion-body-sm) !important;
      line-height: 1.55 !important;
      font-weight: 600 !important;
    }

    .meditation-category-title h3,
    .meditation-answer-card span,
    .meditation-followup span,
    .meditation-question-guide {
      font-size: var(--sion-label) !important;
      line-height: 1.4 !important;
      font-weight: 900 !important;
      letter-spacing: -.01em !important;
    }

    .meditation-question-chip,
    .meditation-question-input input,
    .meditation-question-input button {
      font-size: var(--sion-body-sm) !important;
      line-height: 1.4 !important;
      font-weight: 800 !important;
    }

    .meditation-answer-card p,
    .meditation-followup p,
    .meditation-question-loading p {
      font-size: var(--sion-body) !important;
      line-height: var(--sion-line-body) !important;
    }

    /* 말씀 해설·묵상·기도 카드의 제목 크기 통일 */
    main article > div:first-child > p.font-bold.text-\[\#A17C5B\],
    main article > div:first-child > p.serif-verse {
      font-size: var(--sion-title-md) !important;
      line-height: 1.4 !important;
      font-weight: 850 !important;
    }

    main article .serif-verse {
      line-height: var(--sion-line-body) !important;
    }

    main article.rounded-\[22px\],
    main article.rounded-\[24px\] {
      border-radius: var(--sion-card-radius) !important;
    }

    /* 전 화면 공통 카드·버튼 밀도 */
    main button {
      min-height: 40px;
      touch-action: manipulation;
    }

    main button[aria-label]:not(nav button) {
      -webkit-tap-highlight-color: transparent;
    }

    main section + section,
    main article + article {
      margin-top: var(--sion-card-gap);
    }

    [${DUPLICATE_MARK}="true"] {
      display: none !important;
    }

    /* 동일 의미의 작은 안내 제목은 한 줄로 간결하게 */
    .sion-title-companion-hidden {
      display: none !important;
    }

    @media (max-width: 430px) {
      :root {
        --sion-card-padding: 16px;
      }

      main h1, main .sion-page-title { font-size: 1.55rem !important; }
      main h2, main .sion-section-title { font-size: 1.2rem !important; }
      main h3, main .sion-card-title { font-size: 1rem !important; }

      .meditation-question-panel,
      [aria-label="묵상 질문하기"] {
        margin-inline: 0 !important;
      }
    }
  `;
  document.head.appendChild(style);
}

function visibleHeading(element: HTMLElement) {
  const style = window.getComputedStyle(element);
  return style.display !== 'none' && style.visibility !== 'hidden' && element.offsetParent !== null;
}

function titleCandidates() {
  const main = document.querySelector('main');
  if (!main) return [];
  return [...main.querySelectorAll<HTMLElement>('h1, h2, h3, [role="heading"], .title-font')]
    .filter((element) => visibleHeading(element) && normalize(element.textContent).length > 1);
}

function isUtilityHeading(text: string) {
  return ['내용 메뉴', '정렬/분류 메뉴', '질문', '답변', '핵심 메시지'].includes(text);
}

function clearDuplicateMarks() {
  document.querySelectorAll<HTMLElement>(`[${DUPLICATE_MARK}]`).forEach((element) => {
    element.removeAttribute(DUPLICATE_MARK);
  });
}

function consolidateDuplicateTitles() {
  clearDuplicateMarks();
  const headings = titleCandidates();
  const groups = new Map<string, HTMLElement[]>();

  for (const heading of headings) {
    const text = normalize(heading.textContent);
    if (!text || isUtilityHeading(text)) continue;
    const key = text.replace(/[·•|]/g, '').replace(/\s+/g, '').toLowerCase();
    const list = groups.get(key) || [];
    list.push(heading);
    groups.set(key, list);
  }

  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const sorted = [...group].sort((left, right) => {
      const leftTop = left.getBoundingClientRect().top + window.scrollY;
      const rightTop = right.getBoundingClientRect().top + window.scrollY;
      return leftTop - rightTop;
    });

    const primary = sorted.find((heading) => heading.tagName === 'H1') || sorted[0];
    for (const heading of sorted) {
      if (heading === primary) continue;
      const primaryTop = primary.getBoundingClientRect().top + window.scrollY;
      const currentTop = heading.getBoundingClientRect().top + window.scrollY;
      if (Math.abs(currentTop - primaryTop) <= 520) {
        heading.setAttribute(DUPLICATE_MARK, 'true');
      }
    }
  }
}

function simplifyTitleCompanions() {
  const headings = titleCandidates();
  for (const heading of headings) {
    const text = normalize(heading.textContent);
    const parent = heading.parentElement;
    if (!parent || !text) continue;

    const siblings = [...parent.children].filter((child): child is HTMLElement => child instanceof HTMLElement && child !== heading);
    for (const sibling of siblings) {
      sibling.classList.remove('sion-title-companion-hidden');
      const siblingText = normalize(sibling.textContent);
      if (!siblingText || siblingText === text) continue;

      const compactHeading = text.replace(/\s+/g, '');
      const compactSibling = siblingText.replace(/\s+/g, '');
      if (
        compactSibling === compactHeading
        || compactSibling === `${compactHeading}화면`
        || compactSibling === `${compactHeading}페이지`
      ) {
        sibling.classList.add('sion-title-companion-hidden');
      }
    }
  }
}

function labelSemanticTitles() {
  const headings = titleCandidates();
  for (const heading of headings) {
    const level = heading.tagName === 'H1' ? 'page' : heading.tagName === 'H2' ? 'section' : 'card';
    heading.classList.add(`sion-${level}-title`);
  }
}

function applyConsistency() {
  installStyle();
  labelSemanticTitles();
  consolidateDuplicateTitles();
  simplifyTitleCompanions();
}

function scheduleApply() {
  if (scheduled) return;
  scheduled = true;
  window.requestAnimationFrame(() => {
    scheduled = false;
    applyConsistency();
  });
}

export function initializeDesignConsistency() {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;
  installStyle();

  const observer = new MutationObserver(scheduleApply);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
  });

  window.addEventListener('popstate', scheduleApply);
  window.addEventListener('resize', scheduleApply);
  scheduleApply();
}
