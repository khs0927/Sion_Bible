const UI_FONT = 'Paperlogy';
const SCRIPTURE_FONT = 'GowunBatang';

function hasFontLoadingApi() {
  return typeof document !== 'undefined' && 'fonts' in document;
}

export async function activateSionFonts() {
  if (typeof document === 'undefined') return;

  document.documentElement.lang = 'ko';
  if (!hasFontLoadingApi()) {
    document.documentElement.dataset.sionFonts = 'unsupported';
    return;
  }

  const fontSet = document.fonts;
  await Promise.allSettled([
    fontSet.load(`400 16px "${UI_FONT}"`, '시온성경'),
    fontSet.load(`700 16px "${UI_FONT}"`, '통독 암송'),
    fontSet.load(`400 18px "${SCRIPTURE_FONT}"`, '태초에 하나님이 천지를 창조하시니라'),
    fontSet.load(`700 18px "${SCRIPTURE_FONT}"`, '주의 말씀은 내 발에 등이요'),
  ]);

  const uiReady = fontSet.check(`400 16px "${UI_FONT}"`);
  const scriptureReady = fontSet.check(`400 18px "${SCRIPTURE_FONT}"`);
  document.documentElement.dataset.sionFonts = uiReady && scriptureReady
    ? 'ready'
    : uiReady
      ? 'ui-only'
      : scriptureReady
        ? 'scripture-only'
        : 'fallback';
}
