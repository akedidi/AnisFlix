import { useEffect, useCallback } from 'react';

interface ScrollPosition {
  [key: string]: number;
}

const SCROLL_POSITIONS_KEY = 'scrollPositions';

export const useScrollPosition = (pageKey: string) => {
  // Sauvegarder la position de scroll
  const saveScrollPosition = useCallback((scrollY: number) => {
    try {
      const positions: ScrollPosition = JSON.parse(
        localStorage.getItem(SCROLL_POSITIONS_KEY) || '{}'
      );
      positions[pageKey] = scrollY;
      localStorage.setItem(SCROLL_POSITIONS_KEY, JSON.stringify(positions));
      console.log(`Position sauvegardée pour ${pageKey}:`, scrollY);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la position:', error);
    }
  }, [pageKey]);

  // Restaurer la position de scroll (manuellement)
  const restoreScrollPosition = useCallback(() => {
    try {
      const positions: ScrollPosition = JSON.parse(
        localStorage.getItem(SCROLL_POSITIONS_KEY) || '{}'
      );
      const savedPosition = positions[pageKey];
      console.log(`Position trouvée pour ${pageKey}:`, savedPosition);
      
      if (savedPosition !== undefined && savedPosition > 0) {
        // Attendre que le DOM soit prêt
        setTimeout(() => {
          window.scrollTo({
            top: savedPosition,
            behavior: 'instant'
          });
          console.log(`Position restaurée pour ${pageKey}:`, savedPosition);
          
          // Supprimer la position sauvegardée après l'avoir restaurée
          delete positions[pageKey];
          localStorage.setItem(SCROLL_POSITIONS_KEY, JSON.stringify(positions));
        }, 100);
      }
    } catch (error) {
      console.error('Erreur lors de la restauration de la position:', error);
    }
  }, [pageKey]);

  // Clear scroll position for this page (useful when navigating away)
  const clearScrollPosition = useCallback(() => {
    try {
      const positions: ScrollPosition = JSON.parse(
        localStorage.getItem(SCROLL_POSITIONS_KEY) || '{}'
      );
      delete positions[pageKey];
      localStorage.setItem(SCROLL_POSITIONS_KEY, JSON.stringify(positions));
      console.log(`Position effacée pour ${pageKey}`);
    } catch (error) {
      console.error('Erreur lors de l\'effacement de la position:', error);
    }
  }, [pageKey]);

  // Sauvegarder la position avant de quitter la page
  useEffect(() => {
    let scrollTimeout: NodeJS.Timeout;

    const handleBeforeUnload = () => {
      saveScrollPosition(window.scrollY);
    };

    const handleScroll = () => {
      // Debounce pour éviter trop de sauvegardes
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        saveScrollPosition(window.scrollY);
      }, 150);
    };

    // Écouter les changements de scroll
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      clearTimeout(scrollTimeout);
    };
  }, [saveScrollPosition]);

  return { restoreScrollPosition, clearScrollPosition };
};
