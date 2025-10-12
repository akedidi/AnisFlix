import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';

interface UsePageTransitionOptions {
  delay?: number;
  onTransitionStart?: () => void;
  onTransitionEnd?: () => void;
}

export function usePageTransition(options: UsePageTransitionOptions = {}) {
  const { delay = 0, onTransitionStart, onTransitionEnd } = options;
  const [location] = useLocation();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(location);

  const startTransition = useCallback(() => {
    setIsTransitioning(true);
    onTransitionStart?.();
    
    if (delay > 0) {
      setTimeout(() => {
        setIsTransitioning(false);
        onTransitionEnd?.();
      }, delay);
    } else {
      setIsTransitioning(false);
      onTransitionEnd?.();
    }
  }, [delay, onTransitionStart, onTransitionEnd]);

  useEffect(() => {
    if (location !== currentLocation) {
      startTransition();
      setCurrentLocation(location);
    }
  }, [location, currentLocation, startTransition]);

  return {
    isTransitioning,
    startTransition,
    currentLocation
  };
}

// Hook pour les transitions avec préchargement
export function usePreloadTransition() {
  const [preloadedPages, setPreloadedPages] = useState<Set<string>>(new Set());
  
  const preloadPage = useCallback((path: string) => {
    if (!preloadedPages.has(path)) {
      // Ici vous pouvez ajouter la logique de préchargement
      // Par exemple, précharger les données ou les composants
      setPreloadedPages(prev => new Set([...prev, path]));
    }
  }, [preloadedPages]);
  
  const isPreloaded = useCallback((path: string) => {
    return preloadedPages.has(path);
  }, [preloadedPages]);
  
  return {
    preloadPage,
    isPreloaded,
    preloadedPages: Array.from(preloadedPages)
  };
}

// Hook pour les transitions avec animation personnalisée
export function useCustomTransition(animationType: 'fade' | 'slide' | 'scale' = 'fade') {
  const [animationClass, setAnimationClass] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);
  
  const triggerTransition = useCallback((direction: 'in' | 'out' = 'in') => {
    setIsAnimating(true);
    
    const animationMap = {
      fade: direction === 'in' ? 'fade-in-up' : 'fade-out-down',
      slide: direction === 'in' ? 'slide-in-right' : 'slide-out-left',
      scale: direction === 'in' ? 'scale-in' : 'scale-out'
    };
    
    setAnimationClass(animationMap[animationType]);
    
    setTimeout(() => {
      setIsAnimating(false);
      setAnimationClass('');
    }, 300);
  }, [animationType]);
  
  return {
    animationClass,
    isAnimating,
    triggerTransition
  };
}
