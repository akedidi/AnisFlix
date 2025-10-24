import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';

// Fonction pour détecter si on est sur mobile natif (Capacitor)
const isCapacitor = () => {
  if (typeof window === 'undefined') return false;
  
  console.log(`[CAPACITOR DETECTION] ===== DÉTECTION CAPACITOR =====`);
  console.log(`[CAPACITOR DETECTION] UserAgent: ${navigator.userAgent}`);
  
  // Vérifier si on est dans une app Capacitor native
  const hasCapacitor = (window as any).Capacitor !== undefined;
  const hasCapacitorPlugins = (window as any).Capacitor?.Plugins !== undefined;
  const isNativeApp = hasCapacitor && hasCapacitorPlugins;
  
  // Vérifier si on est sur un navigateur web (même avec Capacitor)
  const isWebBrowser = navigator.userAgent.includes('Chrome') || 
                       navigator.userAgent.includes('Safari') || 
                       navigator.userAgent.includes('Firefox') ||
                       navigator.userAgent.includes('Edge');
  
  // Si c'est un navigateur web, ce n'est pas une vraie app native
  const isRealNativeApp = isNativeApp && !isWebBrowser;
  
  console.log(`[CAPACITOR DETECTION] hasCapacitor: ${hasCapacitor}`);
  console.log(`[CAPACITOR DETECTION] hasPlugins: ${hasCapacitorPlugins}`);
  console.log(`[CAPACITOR DETECTION] isNativeApp: ${isNativeApp}`);
  console.log(`[CAPACITOR DETECTION] isWebBrowser: ${isWebBrowser}`);
  console.log(`[CAPACITOR DETECTION] isRealNativeApp: ${isRealNativeApp}`);
  
  return isRealNativeApp;
};

// Fonction pour détecter la plateforme native
const getNativePlatform = () => {
  if (typeof window === 'undefined') return null;
  
  const userAgent = navigator.userAgent.toLowerCase();
  if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
    return 'ios';
  } else if (userAgent.includes('android')) {
    return 'android';
  }
  return null;
};

// Hook pour la navigation native
export const useNativeNavigation = () => {
  const [, setLocation] = useLocation();
  const [swipeProgress, setSwipeProgress] = useState(0);
  const [isSwipeActive, setIsSwipeActive] = useState(false);

  useEffect(() => {
    console.log('[NATIVE NAV] ===== CONFIGURATION NAVIGATION NATIVE =====');
    console.log('[NATIVE NAV] isCapacitor():', isCapacitor());
    console.log('[NATIVE NAV] getNativePlatform():', getNativePlatform());
    console.log('[NATIVE NAV] UserAgent:', navigator.userAgent);
    console.log('[NATIVE NAV] window.Capacitor:', (window as any).Capacitor);
    console.log('[NATIVE NAV] window.Capacitor.Plugins:', (window as any).Capacitor?.Plugins);
    
    const handleBack = () => {
      console.log('[NATIVE NAV] Navigation vers la page précédente');
      setLocation('/');
    };

    const platform = getNativePlatform();
    let cleanup: (() => void) | null = null;

    if (platform === 'ios') {
      // Pour iOS : gérer le swipe back
      console.log(`[NATIVE NAV] Configuration du swipe back pour iOS`);
      
      let startX = 0;
      let startY = 0;
      let isSwipeBack = false;
      
      const handleTouchStart = (e: TouchEvent) => {
        // Ignorer les touches sur les éléments de navigation
        const target = e.target as HTMLElement;
        if (target.closest('nav') || target.closest('button') || target.closest('a')) {
          console.log(`[NATIVE NAV] Touch ignoré - élément de navigation`);
          return;
        }
        
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        isSwipeBack = false;
        console.log(`[NATIVE NAV] Touch start - X: ${startX}, Y: ${startY}`);
        
        // PRIORITÉ SWIPE BACK : Si on commence près du bord gauche, bloquer le pull-to-refresh
        if (startX < 100) {
          console.log(`[NATIVE NAV] PRIORITÉ SWIPE BACK - Blocage du pull-to-refresh`);
          e.preventDefault();
          e.stopPropagation();
        }
      };
      
      const handleTouchMove = (e: TouchEvent) => {
        if (!startX || !startY) return;
        
        const currentX = e.touches[0].clientX;
        const currentY = e.touches[0].clientY;
        const diffX = currentX - startX;
        const diffY = currentY - startY;
        
        console.log(`[NATIVE NAV] Touch move - diffX: ${diffX}, diffY: ${diffY}, startX: ${startX}`);
        
        // DÉTECTION SWIPE BACK : Mouvement horizontal dominant
        const isHorizontalMovement = Math.abs(diffX) > Math.abs(diffY);
        const isMovingRight = diffX > 0;
        const isInLeftZone = startX < 150;
        
        console.log(`[NATIVE NAV] Analyse mouvement - horizontal: ${isHorizontalMovement}, droite: ${isMovingRight}, zone gauche: ${isInLeftZone}`);
        
        if (isHorizontalMovement && isMovingRight && isInLeftZone && diffX > 20) {
          isSwipeBack = true;
          console.log(`[NATIVE NAV] ✅ SWIPE BACK DÉTECTÉ - Mouvement horizontal vers la droite`);
          e.preventDefault();
          e.stopPropagation();
        }
        
        // Calculer le progrès de l'animation (0 à 1)
        if (isHorizontalMovement && isMovingRight && isInLeftZone) {
          const progress = Math.min(diffX / 100, 1); // 100px = 100% de progression
          setSwipeProgress(progress);
          setIsSwipeActive(progress > 0.1); // Activer l'animation dès 10% de progression
        }
        
        // Détection précoce pour bloquer le pull-to-refresh - SEULEMENT si c'est vraiment un swipe
        if (isHorizontalMovement && isMovingRight && isInLeftZone && diffX > 10 && !isSwipeBack) {
          console.log(`[NATIVE NAV] Préparation swipe back - Blocage pull-to-refresh`);
          e.preventDefault();
          e.stopPropagation();
        }
      };
      
      const handleTouchEnd = (e: TouchEvent) => {
        console.log(`[NATIVE NAV] Touch end - isSwipeBack: ${isSwipeBack}`);
        if (isSwipeBack) {
          console.log(`[NATIVE NAV] Exécution du swipe back`);
          e.preventDefault();
          e.stopPropagation();
          // Déclencher l'animation finale
          setSwipeProgress(1);
          setTimeout(() => {
            handleBack();
            setIsSwipeActive(false);
            setSwipeProgress(0);
          }, 200);
        } else {
          // Annuler l'animation si pas de swipe back
          setIsSwipeActive(false);
          setSwipeProgress(0);
        }
        startX = 0;
        startY = 0;
        isSwipeBack = false;
      };
      
      document.addEventListener('touchstart', handleTouchStart, { passive: false, capture: true });
      document.addEventListener('touchmove', handleTouchMove, { passive: false, capture: true });
      document.addEventListener('touchend', handleTouchEnd, { passive: false, capture: true });
      
      // Méthode alternative pour simulateur iOS avec clavier
      const handleKeyDown = (e: KeyboardEvent) => {
        console.log(`[NATIVE NAV] Key pressed: ${e.key}`);
        if (e.key === 'Escape' || e.key === 'Backspace') {
          console.log(`[NATIVE NAV] Touche de retour détectée`);
          handleBack();
        }
      };
      
      document.addEventListener('keydown', handleKeyDown);
      
      cleanup = () => {
        document.removeEventListener('touchstart', handleTouchStart);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
        document.removeEventListener('keydown', handleKeyDown);
      };
      
    } else if (platform === 'android') {
      // Pour Android : gérer le bouton back physique
      console.log(`[NATIVE NAV] Configuration du bouton back pour Android`);
      
      const handleBackButton = (e: Event) => {
        console.log(`[NATIVE NAV] Bouton back Android pressé`);
        e.preventDefault();
        handleBack();
      };
      
      // Écouter l'événement backbutton de Capacitor
      if ((window as any).Capacitor?.Plugins?.App) {
        (window as any).Capacitor.Plugins.App.addListener('backButton', handleBackButton);
      }
      
      cleanup = () => {
        if ((window as any).Capacitor?.Plugins?.App) {
          (window as any).Capacitor.Plugins.App.removeAllListeners('backButton');
        }
      };
    }

    // TOUJOURS ajouter le fallback pour le simulateur iOS
    console.log('[NATIVE NAV] Configuration du fallback pour simulateur iOS');
    console.log('[NATIVE NAV] Fallback activé - écoute des événements touch');
    
    let fallbackStartX = 0;
    let fallbackStartY = 0;
    let fallbackIsSwipeBack = false;
    
    const fallbackHandleTouchStart = (e: TouchEvent) => {
      // Ignorer les touches sur les éléments de navigation
      const target = e.target as HTMLElement;
      if (target.closest('nav') || target.closest('button') || target.closest('a')) {
        console.log(`[NATIVE NAV FALLBACK] Touch ignoré - élément de navigation`);
        return;
      }
      
      fallbackStartX = e.touches[0].clientX;
      fallbackStartY = e.touches[0].clientY;
      fallbackIsSwipeBack = false;
      console.log(`[NATIVE NAV FALLBACK] Touch start - X: ${fallbackStartX}, Y: ${fallbackStartY}`);
      console.log(`[NATIVE NAV FALLBACK] Position X: ${fallbackStartX}, Zone gauche (< 100): ${fallbackStartX < 100}`);
      
      // PRIORITÉ SWIPE BACK : Si on commence près du bord gauche, bloquer le pull-to-refresh
      if (fallbackStartX < 100) {
        console.log(`[NATIVE NAV FALLBACK] PRIORITÉ SWIPE BACK - Blocage du pull-to-refresh`);
        e.preventDefault();
        e.stopPropagation();
      }
    };
    
    const fallbackHandleTouchMove = (e: TouchEvent) => {
      if (!fallbackStartX || !fallbackStartY) return;
      
      const currentX = e.touches[0].clientX;
      const currentY = e.touches[0].clientY;
      const diffX = currentX - fallbackStartX;
      const diffY = currentY - fallbackStartY;
      
      console.log(`[NATIVE NAV FALLBACK] Touch move - diffX: ${diffX}, diffY: ${diffY}, startX: ${fallbackStartX}`);
      
      // DÉTECTION SWIPE BACK : Mouvement horizontal dominant
      const isHorizontalMovement = Math.abs(diffX) > Math.abs(diffY);
      const isMovingRight = diffX > 0;
      const isInLeftZone = fallbackStartX < 150;
      
      console.log(`[NATIVE NAV FALLBACK] Analyse mouvement - horizontal: ${isHorizontalMovement}, droite: ${isMovingRight}, zone gauche: ${isInLeftZone}`);
      
      if (isHorizontalMovement && isMovingRight && isInLeftZone && diffX > 20) {
        fallbackIsSwipeBack = true;
        console.log(`[NATIVE NAV FALLBACK] ✅ SWIPE BACK DÉTECTÉ - Mouvement horizontal vers la droite`);
        e.preventDefault();
        e.stopPropagation();
      }
      
      // Calculer le progrès de l'animation (0 à 1)
      if (isHorizontalMovement && isMovingRight && isInLeftZone) {
        const progress = Math.min(diffX / 100, 1); // 100px = 100% de progression
        setSwipeProgress(progress);
        setIsSwipeActive(progress > 0.1); // Activer l'animation dès 10% de progression
      }
      
      // Détection précoce pour bloquer le pull-to-refresh - SEULEMENT si c'est vraiment un swipe
      if (isHorizontalMovement && isMovingRight && isInLeftZone && diffX > 10 && !fallbackIsSwipeBack) {
        console.log(`[NATIVE NAV FALLBACK] Préparation swipe back - Blocage pull-to-refresh`);
        e.preventDefault();
        e.stopPropagation();
      }
    };
    
    const fallbackHandleTouchEnd = (e: TouchEvent) => {
      console.log(`[NATIVE NAV FALLBACK] Touch end - isSwipeBack: ${fallbackIsSwipeBack}`);
      if (fallbackIsSwipeBack) {
        console.log(`[NATIVE NAV FALLBACK] Exécution du swipe back`);
        e.preventDefault();
        e.stopPropagation();
        // Déclencher l'animation finale
        setSwipeProgress(1);
        setTimeout(() => {
          handleBack();
          setIsSwipeActive(false);
          setSwipeProgress(0);
        }, 200);
      } else {
        // Annuler l'animation si pas de swipe back
        setIsSwipeActive(false);
        setSwipeProgress(0);
      }
      fallbackStartX = 0;
      fallbackStartY = 0;
      fallbackIsSwipeBack = false;
    };
    
    document.addEventListener('touchstart', fallbackHandleTouchStart, { passive: false, capture: true });
    document.addEventListener('touchmove', fallbackHandleTouchMove, { passive: false, capture: true });
    document.addEventListener('touchend', fallbackHandleTouchEnd, { passive: false, capture: true });
    
    const fallbackCleanup = () => {
      document.removeEventListener('touchstart', fallbackHandleTouchStart);
      document.removeEventListener('touchmove', fallbackHandleTouchMove);
      document.removeEventListener('touchend', fallbackHandleTouchEnd);
    };
    
    if (cleanup) {
      const originalCleanup = cleanup;
      cleanup = () => {
        originalCleanup();
        fallbackCleanup();
      };
    } else {
      cleanup = fallbackCleanup;
    }

    if (cleanup) {
      console.log('[NATIVE NAV] Navigation native configurée avec succès');
    } else {
      console.log('[NATIVE NAV] Aucune navigation native configurée (pas sur plateforme native)');
    }

    return cleanup;
  }, [setLocation]);

  // Retourner les valeurs d'animation pour l'utilisation dans les composants
  return {
    swipeProgress,
    isSwipeActive
  };
};
