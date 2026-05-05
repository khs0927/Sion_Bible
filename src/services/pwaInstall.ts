
export type DevicePlatform =
  | 'ios-safari'
  | 'ios-other'
  | 'android-chromium'
  | 'android-other'
  | 'desktop-chromium'
  | 'desktop-other'
  | 'unknown';

export type InstallOutcome = 'accepted' | 'dismissed' | 'unavailable' | 'manual-guide-required' | 'open-safari-guide-required' | 'installed';

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;

/**
 * Detects if the app is running in standalone mode (installed as PWA)
 */
export function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  );
}

/**
 * Basic OS detection
 */
export function detectDevicePlatform(): DevicePlatform {
  const ua = window.navigator.userAgent.toLowerCase();
  
  // iOS detection
  const isIos = /iphone|ipad|ipod/.test(ua) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); // iPadOS desktop mode
    
  if (isIos) {
    const isSafari = /safari/.test(ua) && !/crios|fxios|edgios|optios|messenger|fbav/.test(ua);
    return isSafari ? 'ios-safari' : 'ios-other';
  }
  
  // Android detection
  const isAndroid = /android/.test(ua);
  if (isAndroid) {
    const isChromium = /chrome|chromium|edga|opt/.test(ua) && !/samsungbrowser/.test(ua);
    return isChromium ? 'android-chromium' : 'android-other';
  }
  
  // Desktop detection
  const isDesktop = !/mobile|tablet|android|iphone|ipad|ipod/.test(ua);
  if (isDesktop) {
    const isChromium = /chrome|chromium|edge|edg\//.test(ua);
    return isChromium ? 'desktop-chromium' : 'desktop-other';
  }
  
  return 'unknown';
}

/**
 * Subscribes to the beforeinstallprompt event
 */
export function subscribeBeforeInstallPrompt(callback: (available: boolean) => void) {
  const handler = (e: Event) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    callback(true);
  };
  
  window.addEventListener('beforeinstallprompt', handler);
  
  return () => window.removeEventListener('beforeinstallprompt', handler);
}

/**
 * Subscribes to the appinstalled event
 */
export function subscribeAppInstalled(callback: () => void) {
  window.addEventListener('appinstalled', callback);
  return () => window.removeEventListener('appinstalled', callback);
}

/**
 * Triggers the native install prompt if available
 */
export async function triggerInstallPrompt(): Promise<{ outcome: 'accepted' | 'dismissed' | 'unavailable' }> {
  if (!deferredPrompt) {
    return { outcome: 'unavailable' };
  }
  
  try {
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    return { outcome };
  } catch (err) {
    console.error('PWA install prompt error:', err);
    return { outcome: 'unavailable' };
  }
}

/**
 * Returns manual instructions for installation based on platform
 */
export function getInstallInstructions(platform: DevicePlatform): string[] {
  switch (platform) {
    case 'ios-safari':
      return [
        'Safari 브라우저 하단의 공유 버튼(네모에서 위로 화살표)을 누르세요.',
        '목록을 내려 ‘홈 화면에 추가’를 선택하세요.',
        '오른쪽 상단 ‘추가’를 누르면 설치가 완료됩니다.'
      ];
    case 'ios-other':
      return [
        '현재 브라우저에서는 직접 설치가 불가능합니다.',
        'Safari 브라우저로 이 페이지를 다시 열어주세요.',
        'Safari 공유 버튼에서 ‘홈 화면에 추가’를 선택하여 설치할 수 있습니다.'
      ];
    case 'android-chromium':
      return [
        '브라우저 주소창 오른쪽의 메뉴(점 세 개)를 누르세요.',
        '‘앱 설치’ 또는 ‘홈 화면에 추가’를 선택하세요.',
        '안내에 따라 설치를 완료해 주세요.'
      ];
    case 'android-other':
      return [
        '브라우저 메뉴에서 ‘홈 화면에 추가’ 또는 ‘앱 설치’ 메뉴를 찾아주세요.',
        '브라우저에 따라 메뉴 위치나 이름이 다를 수 있습니다.'
      ];
    case 'desktop-chromium':
      return [
        '주소창 오른쪽의 ‘설치’ 아이콘을 클릭해 주세요.',
        '또는 브라우저 메뉴에서 ‘시온성경 설치’를 선택하세요.'
      ];
    case 'desktop-other':
    default:
      return [
        'Chrome 또는 Edge 브라우저에서 접속하시면 더 간편하게 설치할 수 있습니다.',
        '현재 브라우저의 메뉴에서 ‘홈 화면에 추가’ 기능을 찾아보세요.'
      ];
  }
}
