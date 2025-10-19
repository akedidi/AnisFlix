import { useState, useEffect } from 'react';
import { Platform } from 'react-native';

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
    if (typeof window !== 'undefined') {
      // Web environment
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
    } else {
      // React Native environment
      const isNative = true;
      const isWeb = false;
      const platform = Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'unknown';
      
      setDeviceInfo({
        isNative,
        isWeb,
        platform,
        userAgent: `React Native ${Platform.OS}`
      });
    }
  }, []);

  return deviceInfo;
}
