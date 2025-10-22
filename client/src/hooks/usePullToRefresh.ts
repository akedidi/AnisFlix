import { useEffect, useRef, useState } from 'react';

interface PullToRefreshOptions {
  onRefresh: () => void;
  threshold?: number;
  resistance?: number;
  disabled?: boolean;
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  resistance = 0.5,
  disabled = false
}: PullToRefreshOptions) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  
  const startY = useRef(0);
  const currentY = useRef(0);
  const isAtTop = useRef(false);
  const pullStartTime = useRef(0);

  useEffect(() => {
    if (disabled) return;

    const handleTouchStart = (e: TouchEvent) => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      isAtTop.current = scrollTop === 0;
      
      console.log('🔄 [PULL] Touch start - scrollTop:', scrollTop, 'isAtTop:', isAtTop.current);
      
      if (isAtTop.current) {
        startY.current = e.touches[0].clientY;
        pullStartTime.current = Date.now();
        setIsPulling(true);
        console.log('🔄 [PULL] Début du pull - startY:', startY.current);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling || !isAtTop.current) return;

      currentY.current = e.touches[0].clientY;
      const distance = Math.max(0, currentY.current - startY.current);
      const resistanceDistance = distance * resistance;
      
      console.log('🔄 [PULL] Touch move - distance:', distance, 'resistanceDistance:', resistanceDistance);
      
      setPullDistance(resistanceDistance);
      
      // Empêcher le scroll normal pendant le pull
      if (distance > 0) {
        e.preventDefault();
      }
    };

    const handleTouchEnd = () => {
      if (!isPulling) return;

      const distance = Math.max(0, currentY.current - startY.current);
      const pullDuration = Date.now() - pullStartTime.current;
      
      console.log('🔄 [PULL] Touch end - distance:', distance, 'threshold:', threshold, 'duration:', pullDuration);
      
      // Déclencher le refresh si on dépasse le seuil et que le pull est assez rapide
      if (distance >= threshold && pullDuration < 1000) {
        console.log('🔄 [PULL] Refresh déclenché !');
        setIsRefreshing(true);
        onRefresh();
        
        // Reset après le refresh
        setTimeout(() => {
          setIsRefreshing(false);
          setPullDistance(0);
        }, 1000);
      } else {
        console.log('🔄 [PULL] Pas assez de distance ou trop lent');
        // Animation de retour
        setPullDistance(0);
      }
      
      setIsPulling(false);
    };

    // Ajouter les event listeners
    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onRefresh, threshold, resistance, disabled]);

  return {
    isRefreshing,
    pullDistance,
    isPulling
  };
}