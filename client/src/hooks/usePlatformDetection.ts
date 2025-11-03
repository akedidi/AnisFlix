import { useMemo, useState, useEffect } from 'react';
import { isNativeApp } from '@/lib/platform';

export type PlatformType = 'web-desktop' | 'web-mobile' | 'native-mobile';

export interface PlatformInfo {
  platform: PlatformType;
  isWebDesktop: boolean;
  isWebMobile: boolean;
  isNativeMobile: boolean;
  isDesktop: boolean;
  isMobile: boolean;
  isWeb: boolean;
  isNative: boolean;
  windowWidth: number;
}

/**
 * Hook principal pour détecter la plateforme actuelle
 * Retourne des informations détaillées sur la plateforme
 */
export function usePlatformDetection(): PlatformInfo {
  const [windowWidth, setWindowWidth] = useState(() => {
    if (typeof window === 'undefined') return 1920;
    return window.innerWidth;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const platformInfo = useMemo((): PlatformInfo => {
    if (typeof window === 'undefined') {
      return {
        platform: 'web-desktop',
        isWebDesktop: true,
        isWebMobile: false,
        isNativeMobile: false,
        isDesktop: true,
        isMobile: false,
        isWeb: true,
        isNative: false,
        windowWidth: 1920,
      };
    }

    const isNative = isNativeApp();
    const isWeb = !isNative;
    const isDesktopSize = windowWidth >= 768;
    const isMobileSize = windowWidth < 768;

    let platform: PlatformType;
    if (isNative) {
      platform = 'native-mobile';
    } else if (isDesktopSize) {
      platform = 'web-desktop';
    } else {
      platform = 'web-mobile';
    }

    return {
      platform,
      isWebDesktop: isWeb && isDesktopSize,
      isWebMobile: isWeb && isMobileSize,
      isNativeMobile: isNative,
      isDesktop: isDesktopSize,
      isMobile: isMobileSize,
      isWeb,
      isNative,
      windowWidth,
    };
  }, [windowWidth]);

  return platformInfo;
}

/**
 * Hook pour obtenir des classes CSS conditionnelles selon la plateforme
 */
export function usePlatformClasses() {
  const platform = usePlatformDetection();

  const getPlatformClass = (desktop: string, mobile: string, native: string) => {
    if (platform.isNativeMobile) return native;
    if (platform.isWebMobile) return mobile;
    return desktop;
  };

  const getResponsiveClass = (base: string, mobile?: string, desktop?: string) => {
    let classes = base;
    if (mobile && platform.isMobile) classes += ` ${mobile}`;
    if (desktop && platform.isDesktop) classes += ` ${desktop}`;
    return classes;
  };

  return {
    platform,
    getPlatformClass,
    getResponsiveClass,
  };
}


