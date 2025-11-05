import { useEffect, useState } from 'react';

/**
 * Hook pour obtenir la hauteur réelle du viewport, compatible iOS
 * Utilise visualViewport.height quand disponible, sinon window.innerHeight
 */
export const useViewportHeight = () => {
  const [height, setHeight] = useState(() => {
    // Valeur initiale - utiliser seulement visualViewport pour éviter les changements de clavier
    if (typeof window !== 'undefined') {
      const initialVisualViewport = (window as any).visualViewport?.height;
      const initialInnerHeight = window.innerHeight;
      const initialHeight = initialVisualViewport || initialInnerHeight;
      
      console.log('📏 [VIEWPORT HEIGHT] Valeur initiale:', {
        visualViewport: initialVisualViewport,
        innerHeight: initialInnerHeight,
        finalHeight: initialHeight
      });
      
      return initialHeight;
    }
    return 0;
  });

  useEffect(() => {
    const updateHeight = () => {
      // Solution : Utiliser seulement visualViewport.height qui est stable sur iOS
      const visualViewportHeight = (window as any).visualViewport?.height;
      const windowInnerHeight = window.innerHeight;
      const newHeight = visualViewportHeight || windowInnerHeight;
      
      // Log détaillé pour comprendre ce qui se passe
      console.log('📏 [VIEWPORT HEIGHT] Détail:', {
        visualViewportHeight,
        windowInnerHeight,
        newHeight,
        timestamp: new Date().toLocaleTimeString()
      });
      
      // Ne mettre à jour que si la hauteur a vraiment changé (pas juste le clavier)
      setHeight(prevHeight => {
        if (prevHeight !== newHeight) {
          console.log('📏 [VIEWPORT HEIGHT] CHANGEMENT DÉTECTÉ:', prevHeight, '→', newHeight);
          return newHeight;
        }
        return prevHeight;
      });
    };

    // Écouter SEULEMENT les changements de visualViewport (iOS stable)
    if ((window as any).visualViewport) {
      (window as any).visualViewport.addEventListener('resize', updateHeight);
      console.log('📏 [VIEWPORT HEIGHT] Écoute visualViewport activée (mode stable)');
    }

    // Écouter les changements d'orientation (important pour les vraies rotations)
    window.addEventListener('orientationchange', updateHeight);

    // Mise à jour initiale
    updateHeight();

    return () => {
      if ((window as any).visualViewport) {
        (window as any).visualViewport.removeEventListener('resize', updateHeight);
      }
      window.removeEventListener('orientationchange', updateHeight);
    };
  }, []);

  return height;
};
