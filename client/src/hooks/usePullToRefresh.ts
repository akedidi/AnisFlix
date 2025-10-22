import { useState, useEffect, useRef } from 'react';

interface UsePullToRefreshOptions {
  onRefresh: () => void;
  threshold?: number;
  disabled?: boolean;
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  disabled = false
}: UsePullToRefreshOptions) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  
  const startY = useRef(0);
  const currentY = useRef(0);
  const isAtTop = useRef(false);

  useEffect(() => {
    if (disabled) return;

    const handleTouchStart = (e: TouchEvent) => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      isAtTop.current = scrollTop === 0;
      
      console.log('🔄 [PULL] Touch start - scrollTop:', scrollTop, 'isAtTop:', isAtTop.current);
      
      if (isAtTop.current) {
        startY.current = e.touches[0].clientY;
        setIsPulling(true);
        console.log('🔄 [PULL] Début du pull - startY:', startY.current);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling || !isAtTop.current) return;

      currentY.current = e.touches[0].clientY;
      const distance = Math.max(0, currentY.current - startY.current);
      
      console.log('🔄 [PULL] Touch move - distance:', distance);
      
      setPullDistance(distance);
      
      // Empêcher le scroll normal pendant le pull
      if (distance > 0) {
        e.preventDefault();
      }
    };

    const handleTouchEnd = () => {
      if (!isPulling) return;

      const distance = Math.max(0, currentY.current - startY.current);
      
      console.log('🔄 [PULL] Touch end - distance:', distance, 'threshold:', threshold);
      
      if (distance >= threshold) {
        console.log('🔄 [PULL] Refresh déclenché !');
        setIsRefreshing(true);
        setPullDistance(0);
        
        // Déclencher le refresh
        setTimeout(() => {
          onRefresh();
          setIsRefreshing(false);
        }, 1000);
      } else {
        console.log('🔄 [PULL] Pas assez de distance');
        setPullDistance(0);
      }
      
      setIsPulling(false);
    };

    // Ajouter les event listeners
    console.log('🔄 [PULL] Ajout des event listeners');
    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onRefresh, threshold, disabled, isPulling]);

  return {
    isRefreshing,
    pullDistance,
    isPulling
  };
}