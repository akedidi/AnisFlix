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

  console.log('🔄 [PULL HOOK] Initialisation - disabled:', disabled, 'threshold:', threshold);

  useEffect(() => {
    if (disabled) {
      console.log('🔄 [PULL] Hook désactivé - pas d\'event listeners');
      // Réinitialiser tous les états quand désactivé
      setIsPulling(false);
      setPullDistance(0);
      setIsRefreshing(false);
      return;
    }

    const handleTouchStart = (e: TouchEvent) => {
      // Vérifier d'abord si le hook est désactivé
      if (disabled) {
        console.log('🔄 [PULL] Touch start ignoré - hook désactivé');
        return;
      }
      
      // Vérifications multiples pour s'assurer qu'on est vraiment en haut
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const bodyScrollTop = document.body.scrollTop || 0;
      const documentElementScrollTop = document.documentElement.scrollTop || 0;
      const windowScrollY = window.scrollY || 0;
      
      // Vérifier aussi la position de l'élément de contenu principal
      const mainContent = document.querySelector('main') || document.querySelector('[data-testid="main-content"]');
      const mainScrollTop = mainContent ? mainContent.scrollTop || 0 : 0;
      
      const isReallyAtTop = scrollTop <= 2 && 
                          bodyScrollTop <= 2 && 
                          documentElementScrollTop <= 2 && 
                          windowScrollY <= 2 &&
                          mainScrollTop <= 2;
      
      isAtTop.current = isReallyAtTop;
      
      console.log('🔄 [PULL] ===== TOUCH START =====');
      console.log('🔄 [PULL] scrollTop:', scrollTop);
      console.log('🔄 [PULL] bodyScrollTop:', bodyScrollTop);
      console.log('🔄 [PULL] documentElementScrollTop:', documentElementScrollTop);
      console.log('🔄 [PULL] windowScrollY:', windowScrollY);
      console.log('🔄 [PULL] mainScrollTop:', mainScrollTop);
      console.log('🔄 [PULL] isReallyAtTop:', isReallyAtTop);
      console.log('🔄 [PULL] touchY:', e.touches[0].clientY);
      
      // Seulement si on est vraiment en haut de l'écran (avec tolérance très stricte)
      if (isReallyAtTop) {
        startY.current = e.touches[0].clientY;
        // NE PAS activer isPulling immédiatement - attendre un mouvement
        setIsPulling(false);
        console.log('🔄 [PULL] ✅ PULL PRÉPARÉ - startY:', startY.current, 'mais isPulling reste false');
      } else {
        // Si on n'est pas en haut, ne pas activer le pull
        setIsPulling(false);
        setPullDistance(0); // Réinitialiser la distance
        console.log('🔄 [PULL] ❌ PULL DÉSACTIVÉ - pas en haut');
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      // Vérifier d'abord si le hook est désactivé
      if (disabled) {
        console.log('🔄 [PULL] Touch move ignoré - hook désactivé');
        return;
      }
      
      // Vérifier à nouveau qu'on est en haut avant de traiter le mouvement
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const bodyScrollTop = document.body.scrollTop || 0;
      const documentElementScrollTop = document.documentElement.scrollTop || 0;
      const windowScrollY = window.scrollY || 0;
      
      // Vérifier aussi la position de l'élément de contenu principal
      const mainContent = document.querySelector('main') || document.querySelector('[data-testid="main-content"]');
      const mainScrollTop = mainContent ? mainContent.scrollTop || 0 : 0;
      
      const isStillAtTop = scrollTop <= 2 && 
                         bodyScrollTop <= 2 && 
                         documentElementScrollTop <= 2 && 
                         windowScrollY <= 2 &&
                         mainScrollTop <= 2;
      
      console.log('🔄 [PULL] ===== TOUCH MOVE =====');
      console.log('🔄 [PULL] isPulling:', isPulling);
      console.log('🔄 [PULL] isStillAtTop:', isStillAtTop);
      console.log('🔄 [PULL] scrollTop:', scrollTop);
      console.log('🔄 [PULL] bodyScrollTop:', bodyScrollTop);
      
      if (!isStillAtTop) {
        console.log('🔄 [PULL] ❌ Touch move ignoré - pas en haut');
        return;
      }

      currentY.current = e.touches[0].clientY;
      const distance = Math.max(0, currentY.current - startY.current);
      
      console.log('🔄 [PULL] distance calculée:', distance);
      console.log('🔄 [PULL] startY:', startY.current, 'currentY:', currentY.current);
      
      // Vérifier que le mouvement est vers le bas (pull down) et pas vers le haut
      const isMovingDown = currentY.current > startY.current;
      console.log('🔄 [PULL] isMovingDown:', isMovingDown);
      
      // Activer isPulling seulement si on tire vraiment vers le bas (distance > 5px)
      if (distance > 5 && !isPulling && isMovingDown) {
        console.log('🔄 [PULL] ✅ ACTIVATION DU PULL - distance > 5px ET mouvement vers le bas');
        setIsPulling(true);
      }
      
      // Seulement traiter le mouvement si on est en pull ET qu'on tire vers le bas
      if ((isPulling || distance > 5) && isMovingDown) {
        console.log('🔄 [PULL] ✅ Touch move traité - distance:', distance, 'isMovingDown:', isMovingDown);
        setPullDistance(distance);
        
        // Empêcher le scroll normal pendant le pull seulement si on tire vers le bas
        if (distance > 10) { // Seuil plus élevé pour éviter les faux positifs
          console.log('🔄 [PULL] 🚫 preventDefault appelé - distance > 10');
          e.preventDefault();
        }
      } else {
        console.log('🔄 [PULL] ❌ Touch move ignoré - pas assez de distance ou mouvement vers le haut');
      }
    };

    const handleTouchEnd = () => {
      // Vérifier d'abord si le hook est désactivé
      if (disabled) {
        console.log('🔄 [PULL] Touch end ignoré - hook désactivé');
        return;
      }
      
      console.log('🔄 [PULL] ===== TOUCH END =====');
      console.log('🔄 [PULL] isPulling:', isPulling);
      
      if (!isPulling) {
        console.log('🔄 [PULL] ❌ Touch end ignoré - pas en pull');
        return;
      }

      // Vérifier une dernière fois qu'on est en haut
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const bodyScrollTop = document.body.scrollTop || 0;
      const documentElementScrollTop = document.documentElement.scrollTop || 0;
      const windowScrollY = window.scrollY || 0;
      
      // Vérifier aussi la position de l'élément de contenu principal
      const mainContent = document.querySelector('main') || document.querySelector('[data-testid="main-content"]');
      const mainScrollTop = mainContent ? mainContent.scrollTop || 0 : 0;
      
      const isStillAtTop = scrollTop <= 2 && 
                         bodyScrollTop <= 2 && 
                         documentElementScrollTop <= 2 && 
                         windowScrollY <= 2 &&
                         mainScrollTop <= 2;
      
      console.log('🔄 [PULL] scrollTop:', scrollTop);
      console.log('🔄 [PULL] bodyScrollTop:', bodyScrollTop);
      console.log('🔄 [PULL] documentElementScrollTop:', documentElementScrollTop);
      console.log('🔄 [PULL] windowScrollY:', windowScrollY);
      console.log('🔄 [PULL] mainScrollTop:', mainScrollTop);
      console.log('🔄 [PULL] isStillAtTop:', isStillAtTop);
      
      if (!isStillAtTop) {
        console.log('🔄 [PULL] ❌ Touch end ignoré - pas en haut');
        setIsPulling(false);
        setPullDistance(0);
        return;
      }

      const distance = Math.max(0, currentY.current - startY.current);
      
      // Vérifier que le mouvement final était vers le bas
      const isMovingDown = currentY.current > startY.current;
      console.log('🔄 [PULL] isMovingDown:', isMovingDown);
      
      console.log('🔄 [PULL] ✅ Touch end traité');
      console.log('🔄 [PULL] distance:', distance);
      console.log('🔄 [PULL] threshold:', threshold);
      console.log('🔄 [PULL] startY:', startY.current, 'currentY:', currentY.current);
      
      if (distance >= threshold && isMovingDown) {
        console.log('🔄 [PULL] 🎉 REFRESH DÉCLENCHÉ !');
        setIsRefreshing(true);
        setPullDistance(0);
        
        // Déclencher le refresh
        setTimeout(() => {
          onRefresh();
          setIsRefreshing(false);
        }, 1000);
      } else {
        console.log('🔄 [PULL] ❌ Pas assez de distance pour déclencher ou mouvement vers le haut');
        setPullDistance(0);
      }
      
      setIsPulling(false);
      console.log('🔄 [PULL] ===== FIN TOUCH END =====');
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