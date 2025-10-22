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
      
      // Seulement si on est vraiment en haut de l'écran
      if (isAtTop.current) {
        startY.current = e.touches[0].clientY;
        setIsPulling(true);
        console.log('🔄 [PULL] Début du pull - startY:', startY.current);
      } else {
        // Si on n'est pas en haut, ne pas activer le pull
        setIsPulling(false);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      // Vérifier à nouveau qu'on est en haut avant de traiter le mouvement
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      
      if (!isPulling || scrollTop > 0) {
        console.log('🔄 [PULL] Touch move ignoré - pas en haut ou pas en pull');
        return;
      }

      currentY.current = e.touches[0].clientY;
      const distance = Math.max(0, currentY.current - startY.current);
      
      console.log('🔄 [PULL] Touch move - distance:', distance, 'scrollTop:', scrollTop);
      
      setPullDistance(distance);
      
      // Empêcher le scroll normal pendant le pull
      if (distance > 0) {
        e.preventDefault();
      }
    };

    const handleTouchEnd = () => {
      if (!isPulling) return;

      // Vérifier une dernière fois qu'on est en haut
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      if (scrollTop > 0) {
        console.log('🔄 [PULL] Touch end ignoré - pas en haut');
        setIsPulling(false);
        setPullDistance(0);
        return;
      }

      const distance = Math.max(0, currentY.current - startY.current);
      
      console.log('🔄 [PULL] Touch end - distance:', distance, 'threshold:', threshold, 'scrollTop:', scrollTop);
      
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