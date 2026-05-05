
import { useState, useEffect, useCallback } from 'react';
import { 
  detectDevicePlatform, 
  isStandalone, 
  subscribeBeforeInstallPrompt, 
  subscribeAppInstalled, 
  triggerInstallPrompt,
  getInstallInstructions,
  type DevicePlatform,
  type InstallOutcome
} from '../services/pwaInstall';

export type InstallStatus = 'unsupported' | 'ready' | 'installed' | 'manual' | 'unavailable';

export function usePwaInstall() {
  const [platform, setPlatform] = useState<DevicePlatform>('unknown');
  const [isPwaInstalled, setIsPwaInstalled] = useState(false);
  const [promptAvailable, setPromptAvailable] = useState(false);
  const [status, setStatus] = useState<InstallStatus>('unavailable');

  useEffect(() => {
    const p = detectDevicePlatform();
    setPlatform(p);
    
    const installed = isStandalone();
    setIsPwaInstalled(installed);
    
    if (installed) {
      setStatus('installed');
    } else {
      // If we're not installed, check if we can show a prompt or need manual instructions
      const unsubscribe = subscribeBeforeInstallPrompt((available) => {
        setPromptAvailable(available);
        if (available) setStatus('ready');
      });
      
      const unsubscribeInstalled = subscribeAppInstalled(() => {
        setIsPwaInstalled(true);
        setStatus('installed');
      });
      
      // Default status if no prompt event yet
      if (!installed && !promptAvailable) {
        if (p === 'ios-safari' || p === 'ios-other' || p === 'android-other' || p === 'desktop-other') {
          setStatus('manual');
        } else {
          setStatus('unavailable');
        }
      }
      
      return () => {
        unsubscribe();
        unsubscribeInstalled();
      };
    }
  }, [promptAvailable]);

  const install = useCallback(async (): Promise<{ outcome: InstallOutcome }> => {
    if (isPwaInstalled) return { outcome: 'installed' };
    
    if (promptAvailable) {
      const result = await triggerInstallPrompt();
      return result;
    }
    
    if (platform === 'ios-safari') {
      return { outcome: 'manual-guide-required' };
    }
    
    if (platform === 'ios-other') {
      return { outcome: 'open-safari-guide-required' };
    }
    
    return { outcome: 'manual-guide-required' };
  }, [isPwaInstalled, promptAvailable, platform]);

  const instructions = getInstallInstructions(platform);

  const getButtonLabel = () => {
    if (isPwaInstalled) return '설치됨';
    if (status === 'ready') return 'APP 설치';
    if (platform === 'ios-safari') return '홈 화면에 추가';
    if (platform === 'ios-other') return 'Safari에서 설치';
    return '설치 안내';
  };

  const getGuideTitle = () => {
    switch (platform) {
      case 'ios-safari': return 'iPhone에 추가하기';
      case 'ios-other': return 'Safari에서 열어주세요';
      case 'android-chromium': return 'Android 앱 설치';
      case 'desktop-chromium': return 'PC 앱 설치';
      default: return '앱으로 설치하기';
    }
  };

  return {
    platform,
    isInstalled: isPwaInstalled,
    canInstall: status === 'ready' || status === 'manual',
    status,
    install,
    instructions,
    buttonLabel: getButtonLabel(),
    guideTitle: getGuideTitle(),
    needsManualGuide: status === 'manual' || (status === 'ready' && !promptAvailable)
  };
}
