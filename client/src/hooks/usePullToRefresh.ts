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
    if (disabled) {
      // Réinitialiser tous les états quand désactivé
      setIsPulling(false);
      setPullDistance(0);
      setIsRefreshing(false);
      // NE PAS ajouter d'event listeners du tout
      return;
    }

    // Vérifier si on est sur la page TVChannels (désactiver seulement les event listeners de pull-to-refresh)
    const currentPath = window.location.pathname;
    const currentHref = window.location.href;
    const isTVChannelsPage = currentPath.includes('/tv-channels') || 
                            currentPath.includes('/channels') ||
                            currentHref.includes('/tv-channels') ||
                            currentHref.includes('/channels');
    
    
    if (isTVChannelsPage) {
      setIsPulling(false);
      setPullDistance(0);
      setIsRefreshing(false);
      // NE PAS ajouter d'event listeners de pull-to-refresh
      return;
    }

    const handleTouchStart = (e: TouchEvent) => {
      // Vérifier d'abord si le hook est désactivé
      if (disabled) {
        return;
      }
      
      // Vérifications multiples pour s'assurer qu'on est vraiment en haut
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const bodyScrollTop = document.body.scrollTop || 0;
      const documentElementScrollTop = document.documentElement.scrollTop || 0;
      const windowScrollY = window.scrollY || 0;
      
      // Vérifier aussi la position de l'élément de contenu principal
      const mainContent = document.querySelector('main') || document.querySelector('[data-testid="main-content"]') || document.querySelector('.main-content');
      const mainScrollTop = mainContent ? mainContent.scrollTop || 0 : 0;
      
      // Détecter tous les éléments scrollables sur la page
      const allScrollableElements = document.querySelectorAll('*');
      const scrollableElements = Array.from(allScrollableElements).filter(el => {
        const style = window.getComputedStyle(el);
        const overflow = style.overflow;
        const overflowY = style.overflowY;
        return (overflow === 'auto' || overflow === 'scroll' || overflowY === 'auto' || overflowY === 'scroll') && 
               el.scrollHeight > el.clientHeight;
      });
      
      
      // Vérification ULTRA-STRICTE: on doit être vraiment en haut
      // Tolérance de 0 (pas de tolérance) pour éviter les faux positifs
      const isReallyAtTop = scrollTop === 0 && 
                          bodyScrollTop === 0 && 
                          documentElementScrollTop === 0 && 
                          windowScrollY === 0 &&
                          mainScrollTop === 0;
      
      
      // Vérification ULTRA-STRICTE: on doit être vraiment en haut
      if (!isReallyAtTop) {
        setIsPulling(false);
        setPullDistance(0);
        startY.current = 0;
        return;
      }
      
      isAtTop.current = isReallyAtTop;
      
      // Seulement si on est vraiment en haut de l'écran
      startY.current = e.touches[0].clientY;
      // NE PAS activer isPulling immédiatement - attendre un mouvement
      setIsPulling(false);
    };

    const handleTouchMove = (e: TouchEvent) => {
      // Vérifier d'abord si le hook est désactivé
      if (disabled) {
        return;
      }
      
      // Vérifier que startY n'est pas 0 (signifie qu'on n'était pas en haut au début)
      if (startY.current === 0) {
        return;
      }
      
      // Vérification CRITIQUE: on doit être en haut ET avoir un startY valide
      const currentScrollTop = window.pageYOffset || document.documentElement.scrollTop;
      if (currentScrollTop > 0) {
        return;
      }
      
      // Vérifier à nouveau qu'on est en haut avant de traiter le mouvement
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const bodyScrollTop = document.body.scrollTop || 0;
      const documentElementScrollTop = document.documentElement.scrollTop || 0;
      const windowScrollY = window.scrollY || 0;
      
      // Vérifier aussi la position de l'élément de contenu principal
      const mainContent = document.querySelector('main') || document.querySelector('[data-testid="main-content"]') || document.querySelector('.main-content');
      const mainScrollTop = mainContent ? mainContent.scrollTop || 0 : 0;
      
      // Vérifier la position de tous les éléments scrollables
      const allScrollableElements = document.querySelectorAll('*');
      const scrollableElements = Array.from(allScrollableElements).filter(el => {
        const style = window.getComputedStyle(el);
        const overflow = style.overflow;
        const overflowY = style.overflowY;
        return (overflow === 'auto' || overflow === 'scroll' || overflowY === 'auto' || overflowY === 'scroll') && 
               el.scrollHeight > el.clientHeight;
      });
      
      let allElementsAtTop = true;
      scrollableElements.forEach((el, index) => {
        const elScrollTop = el.scrollTop || 0;
        if (elScrollTop > 0) {
          allElementsAtTop = false;
        }
      });
      
      // Vérification ULTRA-STRICTE: on doit être vraiment en haut
      const isStillAtTop = scrollTop === 0 && 
                         bodyScrollTop === 0 && 
                         documentElementScrollTop === 0 && 
                         windowScrollY === 0 &&
                         mainScrollTop === 0 &&
                         allElementsAtTop;
      
      
      if (!isStillAtTop) {
        return;
      }

      // Définir currentY AVANT de calculer distance et isMovingDown
      currentY.current = e.touches[0].clientY;
      const distance = Math.max(0, currentY.current - startY.current);
      
      // Vérifier que le mouvement est vers le bas (pull down) et pas vers le haut
      const isMovingDown = currentY.current > startY.current;
      
      
      // Activer isPulling seulement si on tire vraiment vers le bas (distance > 10px)
      if (distance > 10 && !isPulling && isMovingDown) {
        setIsPulling(true);
      }
      
      // Seulement traiter le mouvement si on est en pull ET qu'on tire vers le bas
      if (isPulling && isMovingDown) {
        setPullDistance(distance);
        
        // Empêcher le scroll normal pendant le pull seulement si on tire vers le bas
        if (distance > 50) { // Seuil pour éviter les faux positifs
          e.preventDefault();
        }
      }
    };

    const handleTouchEnd = () => {
      // Vérifier d'abord si le hook est désactivé
      if (disabled) {
        return;
      }
      
      // Vérifier que startY n'est pas 0 (signifie qu'on n'était pas en haut au début)
      if (startY.current === 0) {
        return;
      }
      
      // Vérification CRITIQUE: on doit être en haut ET avoir un startY valide
      const currentScrollTop = window.pageYOffset || document.documentElement.scrollTop;
      if (currentScrollTop > 0) {
        return;
      }
      
      
      if (!isPulling) {
        return;
      }

      // Vérifier une dernière fois qu'on est en haut
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const bodyScrollTop = document.body.scrollTop || 0;
      const documentElementScrollTop = document.documentElement.scrollTop || 0;
      const windowScrollY = window.scrollY || 0;
      
      // Vérifier aussi la position de l'élément de contenu principal
      const mainContent = document.querySelector('main') || document.querySelector('[data-testid="main-content"]') || document.querySelector('.main-content');
      const mainScrollTop = mainContent ? mainContent.scrollTop || 0 : 0;
      
      // Vérification ULTRA-STRICTE: on doit être vraiment en haut
      const isStillAtTop = scrollTop === 0 && 
                         bodyScrollTop === 0 && 
                         documentElementScrollTop === 0 && 
                         windowScrollY === 0 &&
                         mainScrollTop === 0;
      
      
      if (!isStillAtTop) {
        setIsPulling(false);
        setPullDistance(0);
        return;
      }

      const distance = Math.max(0, currentY.current - startY.current);
      
      // Vérifier que le mouvement final était vers le bas
      const isMovingDown = currentY.current > startY.current;
      
      
      // Utiliser le seuil configuré (par défaut 60px, plus facile à déclencher)
      const refreshThreshold = threshold; // Utiliser le threshold configuré
      
      if (distance >= refreshThreshold && isMovingDown) {
        setIsRefreshing(true);
        setPullDistance(0);
        
        // Déclencher le refresh
        setTimeout(() => {
          onRefresh();
          setIsRefreshing(false);
        }, 1000);
      } else {
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
  }, [onRefresh, threshold, disabled, isPulling]);

  return {
    isRefreshing,
    pullDistance,
    isPulling
  };
}