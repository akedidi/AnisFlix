import { useRef, useEffect } from 'react';

interface TabBarDiagnosticOptions {
  enableLogging?: boolean;
}

// Hook for monitoring tab bar position and detecting movement issues
export function useTabBarDiagnostic(options: TabBarDiagnosticOptions = {}) {
  const { enableLogging = false } = options;
  const navRef = useRef<HTMLElement>(null);
  const lastPosition = useRef<number>(0);
  const lastWindowHeight = useRef<number>(0);

  useEffect(() => {
    if (!enableLogging || !navRef.current) {
      return;
    }

    const checkPosition = () => {
      if (!navRef.current) return;

      const rect = navRef.current.getBoundingClientRect();
      const currentPosition = rect.bottom;
      const currentWindowHeight = window.innerHeight;
      const scrollY = window.scrollY;
      const isAtBottom = scrollY + window.innerHeight >= document.documentElement.scrollHeight - 1;

      // Log position changes
      console.log(`[ANISFLIX-TABBAR] Position Changed - Bottom: ${currentPosition} Window: ${currentWindowHeight}`);
      console.log(`[ANISFLIX-TABBAR] Scroll Y: ${scrollY} Is At Bottom: ${isAtBottom}`);
      console.log(`TABBAR_DEBUG: bottom=${currentPosition}, window=${currentWindowHeight}, scroll=${scrollY}`);

      // Check if position changed significantly
      if (Math.abs(currentPosition - lastPosition.current) > 0.1) {
        console.warn(`[ANISFLIX-TABBAR-ERROR] Tab Bar moved! Expected: ${lastPosition.current} Actual: ${currentPosition}`);
        console.error('TABBAR_ERROR: moved from fixed position');
      }

      lastPosition.current = currentPosition;
      lastWindowHeight.current = currentWindowHeight;
    };

    const handleTouchStart = () => {
      if (!enableLogging) return;
      console.log('[ANISFLIX-TABBAR] Touch Start - Tab Bar Check');
      console.log('TABBAR_TOUCH: start');
    };

    const handleTouchEnd = () => {
      if (!enableLogging) return;
      console.log('[ANISFLIX-TABBAR] Touch End - Tab Bar Check');
      console.log('TABBAR_TOUCH: end');
    };

    // Initial position check
    checkPosition();

    // Set up event listeners
    window.addEventListener('scroll', checkPosition, { passive: true });
    window.addEventListener('resize', checkPosition, { passive: true });
    window.addEventListener('orientationchange', checkPosition, { passive: true });
    
    if (navRef.current) {
      navRef.current.addEventListener('touchstart', handleTouchStart, { passive: true });
      navRef.current.addEventListener('touchend', handleTouchEnd, { passive: true });
    }

    // Cleanup
    return () => {
      window.removeEventListener('scroll', checkPosition);
      window.removeEventListener('resize', checkPosition);
      window.removeEventListener('orientationchange', checkPosition);
      
      if (navRef.current) {
        navRef.current.removeEventListener('touchstart', handleTouchStart);
        navRef.current.removeEventListener('touchend', handleTouchEnd);
      }
    };
  }, [enableLogging]);

  return {
    navRef,
  };
}