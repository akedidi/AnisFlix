import { useState, useEffect } from 'react';

export interface DeviceInfo {
  isNative: boolean;
  isWeb: boolean;
  platform: 'ios' | 'android' | 'web' | 'unknown';
  userAgent: string;
}

export function useDeviceType(): DeviceInfo {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
    isNative: false,
    isWeb: true,
    platform: 'web',
    userAgent: ''
  });

  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    
    // Détecter si c'est une application native (Expo/React Native)
    const isExpo = userAgent.includes('expo') || userAgent.includes('reactnative');
    const isIOSNative = userAgent.includes('ios') && isExpo;
    const isAndroidNative = userAgent.includes('android') && isExpo;
    
    // Détecter le navigateur web
    const isWebBrowser = !isExpo && (
      userAgent.includes('chrome') ||
      userAgent.includes('firefox') ||
      userAgent.includes('safari') ||
      userAgent.includes('edge') ||
      userAgent.includes('opera')
    );

    const isNative = isIOSNative || isAndroidNative;
    const isWeb = isWebBrowser || (!isNative && !isExpo);

    let platform: 'ios' | 'android' | 'web' | 'unknown' = 'unknown';
    if (isIOSNative) platform = 'ios';
    else if (isAndroidNative) platform = 'android';
    else if (isWeb) platform = 'web';

    setDeviceInfo({
      isNative,
      isWeb,
      platform,
      userAgent
    });
  }, []);

  return deviceInfo;
}
