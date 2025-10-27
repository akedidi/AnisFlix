import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';

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
    const handleBack = () => {
      setLocation('/');
    };

    const platform = getNativePlatform();
    let cleanup: (() => void) | null = null;

    if (platform === 'ios') {
      // Pour iOS : gérer le swipe back
      
      let startX = 0;
      let startY = 0;
      let isSwipeBack = false;
      
      const handleTouchStart = (e: TouchEvent) => {
        // Ignorer les touches sur les éléments de navigation
        const target = e.target as HTMLElement;
        if (target.closest('nav') || target.closest('button') || target.closest('a')) {
          return;
        }
        
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        isSwipeBack = false;
        
        // PRIORITÉ SWIPE BACK : Si on commence près du bord gauche, bloquer le pull-to-refresh
        if (startX < 100) {
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
        
        
        // DÉTECTION SWIPE BACK : Mouvement horizontal dominant
        const isHorizontalMovement = Math.abs(diffX) > Math.abs(diffY);
        const isMovingRight = diffX > 0;
        const isInLeftZone = startX < 150;
        
        
        if (isHorizontalMovement && isMovingRight && isInLeftZone && diffX > 20) {
          isSwipeBack = true;
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
          e.preventDefault();
          e.stopPropagation();
        }
      };
      
      const handleTouchEnd = (e: TouchEvent) => {
        if (isSwipeBack) {
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
        if (e.key === 'Escape' || e.key === 'Backspace') {
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
      
      const handleBackButton = (e: Event) => {
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

    return cleanup || (() => {});
  }, [setLocation]);

  // Retourner les valeurs d'animation pour l'utilisation dans les composants
  return {
    swipeProgress,
    isSwipeActive
  };
};
