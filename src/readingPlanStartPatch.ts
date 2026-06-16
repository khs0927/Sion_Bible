// Makes reading-room course start feel immediate on iOS/PWA.
// The React state update starts the plan; this small bridge waits for the new
// mission card to render and taps the visible read button when the user starts
// a course from the reading room.

(() => {
  let pendingAutoRead = false;

  const compact = (value: string | null | undefined) => value?.replace(/\s+/g, '').trim() || '';

  const isReadingRoom = () => typeof window !== 'undefined' && window.location.pathname.startsWith('/reading-room');

  const findReadButton = () => {
    const buttons = [...document.querySelectorAll<HTMLButtonElement>('button')];
    return buttons.find((button) => {
      const text = compact(button.textContent);
      return text.includes('읽으러가기') && !button.disabled;
    });
  };

  const clickReadButtonWhenReady = (attempt = 0) => {
    if (!pendingAutoRead || !isReadingRoom()) return;

    const readButton = findReadButton();
    if (readButton) {
      pendingAutoRead = false;
      readButton.click();
      return;
    }

    if (attempt < 18) {
      window.setTimeout(() => clickReadButtonWhenReady(attempt + 1), 90);
    }
  };

  window.addEventListener('sion-reading-plan-started', () => {
    if (!isReadingRoom()) return;
    pendingAutoRead = true;
    window.setTimeout(() => clickReadButtonWhenReady(), 120);
  });
})();
