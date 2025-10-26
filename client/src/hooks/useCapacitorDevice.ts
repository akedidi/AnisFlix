import { useState, useEffect } from 'react';

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
    baseUrl: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5000'
  });

  useEffect(() => {
    // Détection simple basée sur l'environnement
    const detectEnvironment = () => {
      // Vérifier si nous sommes dans un environnement Capacitor
      const isCapacitor = typeof window !== 'undefined' && 
        (window as any).Capacitor !== undefined;
      
      // Détecter la plateforme
      let platform: 'ios' | 'android' | 'web' = 'web';
      if (isCapacitor) {
        const userAgent = navigator.userAgent.toLowerCase();
        if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
          platform = 'ios';
        } else if (userAgent.includes('android')) {
          platform = 'android';
        }
      }
      
      // Déterminer l'URL de base pour les APIs
      let baseUrl = '';
      if (isCapacitor && platform !== 'web') {
        // Vérifier si nous sommes en développement Capacitor
        const isCapacitorDev = window.location.href.includes('capacitor://localhost');
        if (isCapacitorDev) {
          baseUrl = 'http://localhost:3000';
        } else {
          baseUrl = 'https://anisflix.vercel.app';
        }
      } else {
        // En mode web, utiliser l'origine actuelle
        baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
      }

      setDeviceInfo({
        isNative: isCapacitor && platform !== 'web',
        isWeb: !isCapacitor || platform === 'web',
        platform,
        isCapacitor,
        baseUrl
      });
    };

    detectEnvironment();
  }, []);

  return deviceInfo;
}
