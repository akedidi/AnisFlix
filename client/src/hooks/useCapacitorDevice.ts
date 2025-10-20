import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

export interface CapacitorDeviceInfo {
  isNative: boolean;
  isWeb: boolean;
  platform: 'ios' | 'android' | 'web';
  isCapacitor: boolean;
  baseUrl: string;
}

export function useCapacitorDevice(): CapacitorDeviceInfo {
  const [deviceInfo, setDeviceInfo] = useState<CapacitorDeviceInfo>({
    isNative: false,
    isWeb: true,
    platform: 'web',
    isCapacitor: false,
    baseUrl: ''
  });

  useEffect(() => {
    const isCapacitor = Capacitor.isNativePlatform();
    const platform = Capacitor.getPlatform() as 'ios' | 'android' | 'web';
    
    // Déterminer l'URL de base pour les APIs
    let baseUrl = '';
    if (isCapacitor && platform !== 'web') {
      // En mode natif, utiliser l'URL de production Vercel
      baseUrl = 'https://anisflix.vercel.app';
    } else {
      // En mode web, utiliser l'origine actuelle
      baseUrl = window.location.origin;
    }

    setDeviceInfo({
      isNative: isCapacitor && platform !== 'web',
      isWeb: !isCapacitor || platform === 'web',
      platform,
      isCapacitor,
      baseUrl
    });
  }, []);

  return deviceInfo;
}
