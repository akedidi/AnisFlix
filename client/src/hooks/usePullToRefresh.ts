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

  console.log('🔄 [PULL HOOK] Initialisation - disabled:', disabled, 'threshold:', threshold, 'stack:', new Error().stack?.split('\n')[2]);

  useEffect(() => {
    if (disabled) {
      console.log('🔄 [PULL] Hook désactivé - pas d\'event listeners');
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
    
    console.log('🔄 [PULL] Détection de page - pathname:', currentPath, 'href:', currentHref, 'isTVChannelsPage:', isTVChannelsPage);
    
    if (isTVChannelsPage) {
      console.log('🔄 [PULL] Page TVChannels détectée - désactivation des event listeners de pull-to-refresh');
      console.log('🔄 [PULL] Note: Le scroll vers le haut lors de la sélection de chaîne reste actif');
      setIsPulling(false);
      setPullDistance(0);
      setIsRefreshing(false);
      // NE PAS ajouter d'event listeners de pull-to-refresh
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
      
      console.log('🔄 [PULL] Éléments scrollables détectés:', scrollableElements.length);
      scrollableElements.forEach((el, index) => {
        console.log(`🔄 [PULL] Scrollable ${index}:`, {
          tagName: el.tagName,
          className: el.className,
          scrollTop: el.scrollTop,
          scrollHeight: el.scrollHeight,
          clientHeight: el.clientHeight
        });
      });
      
      // Vérification ULTRA-STRICTE: on doit être vraiment en haut
      // Tolérance de 0 (pas de tolérance) pour éviter les faux positifs
      const isReallyAtTop = scrollTop === 0 && 
                          bodyScrollTop === 0 && 
                          documentElementScrollTop === 0 && 
                          windowScrollY === 0 &&
                          mainScrollTop === 0;
      
      console.log('🔄 [PULL] ===== TOUCH START =====');
      console.log('🔄 [PULL] scrollTop:', scrollTop);
      console.log('🔄 [PULL] bodyScrollTop:', bodyScrollTop);
      console.log('🔄 [PULL] documentElementScrollTop:', documentElementScrollTop);
      console.log('🔄 [PULL] windowScrollY:', windowScrollY);
      console.log('🔄 [PULL] mainScrollTop:', mainScrollTop);
      console.log('🔄 [PULL] isReallyAtTop:', isReallyAtTop);
      console.log('🔄 [PULL] touchY:', e.touches[0].clientY);
      console.log('🔄 [PULL] window.innerHeight:', window.innerHeight);
      console.log('🔄 [PULL] document.documentElement.clientHeight:', document.documentElement.clientHeight);
      console.log('🔄 [PULL] document.body.clientHeight:', document.body.clientHeight);
      console.log('🔄 [PULL] mainContent element:', mainContent);
      console.log('🔄 [PULL] mainContent scrollHeight:', mainContent ? mainContent.scrollHeight : 'N/A');
      console.log('🔄 [PULL] mainContent clientHeight:', mainContent ? mainContent.clientHeight : 'N/A');
      
      // Vérification ULTRA-STRICTE: on doit être vraiment en haut
      if (!isReallyAtTop) {
        console.log('🔄 [PULL] ❌ Touch start ignoré - PAS EN HAUT');
        console.log('🔄 [PULL] scrollTop:', scrollTop, 'bodyScrollTop:', bodyScrollTop, 'mainScrollTop:', mainScrollTop);
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
      console.log('🔄 [PULL] ✅ PULL PRÉPARÉ - startY:', startY.current, 'mais isPulling reste false');
    };

    const handleTouchMove = (e: TouchEvent) => {
      // Vérifier d'abord si le hook est désactivé
      if (disabled) {
        console.log('🔄 [PULL] Touch move ignoré - hook désactivé');
        return;
      }
      
      // Vérifier que startY n'est pas 0 (signifie qu'on n'était pas en haut au début)
      if (startY.current === 0) {
        console.log('🔄 [PULL] ❌ Touch move ignoré - startY est 0 (pas en haut au début)');
        return;
      }
      
      // Vérification CRITIQUE: on doit être en haut ET avoir un startY valide
      const currentScrollTop = window.pageYOffset || document.documentElement.scrollTop;
      if (currentScrollTop > 0) {
        console.log('🔄 [PULL] ❌ Touch move ignoré - pas en haut (scrollTop > 0)');
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
      
      console.log('🔄 [PULL] Vérification éléments scrollables dans touchMove:');
      let allElementsAtTop = true;
      scrollableElements.forEach((el, index) => {
        const elScrollTop = el.scrollTop || 0;
        console.log(`🔄 [PULL] Scrollable ${index} scrollTop:`, elScrollTop);
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
      
      console.log('🔄 [PULL] ===== TOUCH MOVE =====');
      console.log('🔄 [PULL] isPulling:', isPulling);
      console.log('🔄 [PULL] isStillAtTop:', isStillAtTop);
      console.log('🔄 [PULL] scrollTop:', scrollTop);
      console.log('🔄 [PULL] bodyScrollTop:', bodyScrollTop);
      console.log('🔄 [PULL] mainScrollTop:', mainScrollTop);
      console.log('🔄 [PULL] startY:', startY.current);
      
      if (!isStillAtTop) {
        console.log('🔄 [PULL] ❌ Touch move ignoré - PAS EN HAUT');
        console.log('🔄 [PULL] scrollTop:', scrollTop, 'bodyScrollTop:', bodyScrollTop, 'mainScrollTop:', mainScrollTop);
        return;
      }

      // Définir currentY AVANT de calculer distance et isMovingDown
      currentY.current = e.touches[0].clientY;
      const distance = Math.max(0, currentY.current - startY.current);
      
      // Vérifier que le mouvement est vers le bas (pull down) et pas vers le haut
      const isMovingDown = currentY.current > startY.current;
      
      console.log('🔄 [PULL] currentY:', currentY.current);
      console.log('🔄 [PULL] distance calculée:', distance);
      console.log('🔄 [PULL] isMovingDown:', isMovingDown);
      console.log('🔄 [PULL] startY:', startY.current, 'currentY:', currentY.current);
      console.log('🔄 [PULL] mainContent element:', mainContent);
      console.log('🔄 [PULL] mainContent scrollTop:', mainScrollTop);
      console.log('🔄 [PULL] mainContent scrollHeight:', mainContent ? mainContent.scrollHeight : 'N/A');
      console.log('🔄 [PULL] mainContent clientHeight:', mainContent ? mainContent.clientHeight : 'N/A');
      
      // Activer isPulling seulement si on tire vraiment vers le bas (distance > 10px)
      if (distance > 10 && !isPulling && isMovingDown) {
        console.log('🔄 [PULL] ✅ ACTIVATION DU PULL - distance > 10px ET mouvement vers le bas');
        setIsPulling(true);
      }
      
      // Seulement traiter le mouvement si on est en pull ET qu'on tire vers le bas
      if (isPulling && isMovingDown) {
        console.log('🔄 [PULL] ✅ Touch move traité - distance:', distance, 'isMovingDown:', isMovingDown);
        setPullDistance(distance);
        
        // Empêcher le scroll normal pendant le pull seulement si on tire vers le bas
        if (distance > 50) { // Seuil pour éviter les faux positifs
          console.log('🔄 [PULL] 🚫 preventDefault appelé - distance > 50');
          e.preventDefault();
        }
      } else {
        console.log('🔄 [PULL] ❌ Touch move ignoré - pas en pull ou mouvement vers le haut');
      }
    };

    const handleTouchEnd = () => {
      // Vérifier d'abord si le hook est désactivé
      if (disabled) {
        console.log('🔄 [PULL] Touch end ignoré - hook désactivé');
        return;
      }
      
      // Vérifier que startY n'est pas 0 (signifie qu'on n'était pas en haut au début)
      if (startY.current === 0) {
        console.log('🔄 [PULL] ❌ Touch end ignoré - startY est 0 (pas en haut au début)');
        return;
      }
      
      // Vérification CRITIQUE: on doit être en haut ET avoir un startY valide
      const currentScrollTop = window.pageYOffset || document.documentElement.scrollTop;
      if (currentScrollTop > 0) {
        console.log('🔄 [PULL] ❌ Touch end ignoré - pas en haut (scrollTop > 0)');
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
      const mainContent = document.querySelector('main') || document.querySelector('[data-testid="main-content"]') || document.querySelector('.main-content');
      const mainScrollTop = mainContent ? mainContent.scrollTop || 0 : 0;
      
      // Vérification ULTRA-STRICTE: on doit être vraiment en haut
      const isStillAtTop = scrollTop === 0 && 
                         bodyScrollTop === 0 && 
                         documentElementScrollTop === 0 && 
                         windowScrollY === 0 &&
                         mainScrollTop === 0;
      
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
      
      // Utiliser le seuil configuré (par défaut 60px, plus facile à déclencher)
      const refreshThreshold = threshold; // Utiliser le threshold configuré
      
      if (distance >= refreshThreshold && isMovingDown) {
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
        console.log('🔄 [PULL] Distance:', distance, 'Threshold requis:', refreshThreshold);
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