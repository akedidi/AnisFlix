import { useMemo } from 'react';

/**
 * Hook pour détecter si on est sur mobile natif (Capacitor)
 * et retourner les classes CSS appropriées
 */
export function useNativeDetection() {
  const isNativeMobile = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const isWeb = window.location.protocol === 'http:' || window.location.protocol === 'https:';
    const hasCapacitor = (window as any).Capacitor !== undefined;
    return !isWeb && hasCapacitor;
  }, []);

  const getFadeClass = (baseClass: string = 'fade-in-up') => {
    return isNativeMobile ? `${baseClass} no-fade-animation` : baseClass;
  };

  const getContainerClass = (baseClass: string = '') => {
    return isNativeMobile ? `${baseClass} no-fade-animation`.trim() : baseClass;
  };

  return {
    isNativeMobile,
    getFadeClass,
    getContainerClass
  };
}
