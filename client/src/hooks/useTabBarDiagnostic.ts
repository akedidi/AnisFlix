import { useEffect, useRef } from 'react';

export interface TabBarPosition {
  top: number;
  bottom: number;
  left: number;
  right: number;
  width: number;
  height: number;
  position: string;
  bottomValue: string;
  zIndex: string;
  transform: string;
  overscrollBehavior: string;
}

export function useTabBarDiagnostic(enableLogging: boolean = true) {
  const navRef = useRef<HTMLElement>(null);
  const lastPositionRef = useRef<TabBarPosition | null>(null);

  useEffect(() => {
    if (!enableLogging || !navRef.current) return;

    const logPosition = () => {
      if (!navRef.current) return;

      const rect = navRef.current.getBoundingClientRect();
      const computedStyle = window.getComputedStyle(navRef.current);
      
      const currentPosition: TabBarPosition = {
        top: rect.top,
        bottom: rect.bottom,
        left: rect.left,
        right: rect.right,
        width: rect.width,
        height: rect.height,
        position: computedStyle.position,
        bottomValue: computedStyle.bottom,
        zIndex: computedStyle.zIndex,
        transform: computedStyle.transform,
        overscrollBehavior: computedStyle.overscrollBehavior
      };

      // Vérifier si la position a changé
      const hasChanged = !lastPositionRef.current || 
        lastPositionRef.current.bottom !== currentPosition.bottom ||
        lastPositionRef.current.top !== currentPosition.top;

      if (hasChanged) {
        // Log détaillé pour Xcode
        console.log('[ANISFLIX-TABBAR] Position Changed:', {
          current: currentPosition,
          previous: lastPositionRef.current,
          windowHeight: window.innerHeight,
          scrollY: window.scrollY,
          scrollX: window.scrollX,
          isAtBottom: currentPosition.bottom === window.innerHeight,
          isOffScreen: currentPosition.bottom < window.innerHeight,
          timestamp: new Date().toISOString()
        });

        // Alerte si la tab bar bouge de sa position fixe
        if (currentPosition.bottom !== window.innerHeight && 
            currentPosition.position === 'fixed') {
          console.warn('[ANISFLIX-TABBAR-ERROR] Tab Bar moved from fixed position!', {
            expectedBottom: window.innerHeight,
            actualBottom: currentPosition.bottom,
            difference: window.innerHeight - currentPosition.bottom
          });
        }
      }

      lastPositionRef.current = currentPosition;
    };

    // Log initial position
    logPosition();

    // Log on scroll
    const handleScroll = () => {
      logPosition();
    };

    // Log on resize
    const handleResize = () => {
      logPosition();
    };

    // Log on touch events
    const handleTouchStart = () => {
      console.log('[ANISFLIX-TABBAR] Touch Start - Tab Bar Check');
      logPosition();
    };

    const handleTouchMove = () => {
      logPosition();
    };

    const handleTouchEnd = () => {
      console.log('[ANISFLIX-TABBAR] Touch End - Tab Bar Check');
      logPosition();
    };

    // Log on orientation change
    const handleOrientationChange = () => {
      console.log('[ANISFLIX-TABBAR] Orientation Change - Tab Bar Check');
      setTimeout(logPosition, 100); // Délai pour laisser le temps à l'orientation de se stabiliser
    };

    // Event listeners
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('orientationchange', handleOrientationChange);

    // Log périodique pour détecter les changements
    const interval = setInterval(logPosition, 1000);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('orientationchange', handleOrientationChange);
      clearInterval(interval);
    };
  }, [enableLogging]);

  return { navRef };
}
