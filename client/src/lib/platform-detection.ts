/**
 * Utilitaires de détection de plateforme (sans hooks, pour utilisation côté serveur/composants)
 */

import { isNativeApp } from './platform';

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
}

/**
 * Détecte la plateforme actuelle (sans hook)
 */
export function getPlatformInfo(windowWidth?: number): PlatformInfo {
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
    };
  }

  const isNative = isNativeApp();
  const isWeb = !isNative;
  const width = windowWidth ?? window.innerWidth;
  const isDesktopSize = width >= 768;
  const isMobileSize = width < 768;

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
  };
}

/**
 * Obtient une classe CSS selon la plateforme
 */
export function getPlatformCSSClass(
  desktop: string,
  mobile: string,
  native: string,
  windowWidth?: number
): string {
  const platform = getPlatformInfo(windowWidth);
  
  if (platform.isNativeMobile) return native;
  if (platform.isWebMobile) return mobile;
  return desktop;
}

