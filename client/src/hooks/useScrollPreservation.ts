import { useEffect, useRef } from 'react';
import { useLocation } from 'wouter';

const SCROLL_POSITIONS_KEY = 'scrollPositions';

interface ScrollPositions {
  [path: string]: number;
}

// Routes principales (onglets de la tabbar) - le scroll doit revenir en haut lors du changement
const MAIN_TAB_ROUTES = ['/', '/movies', '/series', '/tv-channels', '/favorites', '/settings'];

// Vérifier si une route est une route principale (onglet)
function isMainTabRoute(path: string): boolean {
  return MAIN_TAB_ROUTES.includes(path);
}

// Vérifier si on change entre deux routes principales (changement d'onglet)
function isTabSwitch(from: string, to: string): boolean {
  return isMainTabRoute(from) && isMainTabRoute(to) && from !== to;
}

/**
 * Hook global pour préserver la position de scroll lors de la navigation
 * Sauvegarde automatiquement la position avant de quitter une page
 * et la restaure automatiquement au retour
 */
export function useScrollPreservation() {
  const [location] = useLocation();
  const previousLocationRef = useRef<string>('');
  const isRestoringRef = useRef<boolean>(false);

  // Sauvegarder la position de scroll en continu pendant qu'on est sur une page
  useEffect(() => {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }
    
    const saveScrollPosition = () => {
      if (location && typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        const scrollY = window.scrollY;
        try {
          const positions: ScrollPositions = JSON.parse(
            localStorage.getItem(SCROLL_POSITIONS_KEY) || '{}'
          );
          positions[location] = scrollY;
          localStorage.setItem(SCROLL_POSITIONS_KEY, JSON.stringify(positions));
        } catch (error) {
          console.error('[ScrollPreservation] Erreur lors de la sauvegarde:', error);
        }
      }
    };

    // Sauvegarder immédiatement
    saveScrollPosition();

    // Sauvegarder lors du scroll (debounced)
    let scrollTimeout: NodeJS.Timeout;
    const handleScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(saveScrollPosition, 150);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('scroll', handleScroll, { passive: true });
      
      // Sauvegarder avant de quitter la page
      const handleBeforeUnload = () => {
        saveScrollPosition();
      };
      window.addEventListener('beforeunload', handleBeforeUnload);

      return () => {
        window.removeEventListener('scroll', handleScroll);
        window.removeEventListener('beforeunload', handleBeforeUnload);
        clearTimeout(scrollTimeout);
        // Sauvegarder une dernière fois lors du cleanup
        saveScrollPosition();
      };
    }
  }, [location]);

  // Sauvegarder la position de la page actuelle AVANT le changement de route
  useEffect(() => {
    // Sauvegarder la position de la page précédente AVANT de mettre à jour la référence
    const previousLocation = previousLocationRef.current;
    
    // Détecter si c'est un changement d'onglet (entre deux routes principales)
    const isTabChange = isTabSwitch(previousLocation, location);
    
    // Sauvegarder immédiatement lors du changement de route (AVANT de mettre à jour previousLocationRef)
    if (previousLocation && previousLocation !== location && typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      const scrollY = window.scrollY;
      try {
        const positions: ScrollPositions = JSON.parse(
          localStorage.getItem(SCROLL_POSITIONS_KEY) || '{}'
        );
        positions[previousLocation] = scrollY;
        localStorage.setItem(SCROLL_POSITIONS_KEY, JSON.stringify(positions));
        console.log(`[ScrollPreservation] Position sauvegardée pour ${previousLocation}: ${scrollY}`);
      } catch (error) {
        console.error('[ScrollPreservation] Erreur lors de la sauvegarde:', error);
      }
    }

    // Si c'est un changement d'onglet, réinitialiser le scroll en haut
    if (isTabChange && typeof window !== 'undefined') {
      console.log(`[ScrollPreservation] Changement d'onglet détecté (${previousLocation} -> ${location}), scroll réinitialisé en haut`);
      window.scrollTo({
        top: 0,
        behavior: 'instant'
      });
      
      // Supprimer la position sauvegardée pour cette route car on vient de la réinitialiser
      if (typeof localStorage !== 'undefined') {
        try {
          const positions: ScrollPositions = JSON.parse(
            localStorage.getItem(SCROLL_POSITIONS_KEY) || '{}'
          );
          delete positions[location];
          localStorage.setItem(SCROLL_POSITIONS_KEY, JSON.stringify(positions));
        } catch (error) {
          console.error('[ScrollPreservation] Erreur lors de la suppression:', error);
        }
      }
      
      // Mettre à jour la référence pour la prochaine navigation
      previousLocationRef.current = location;
      return;
    }

    // Restaurer la position de scroll pour la nouvelle page (si ce n'est pas un changement d'onglet)
    const restorePosition = () => {
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        return;
      }
      
      try {
        const positions: ScrollPositions = JSON.parse(
          localStorage.getItem(SCROLL_POSITIONS_KEY) || '{}'
        );
        const savedPosition = positions[location];

        if (savedPosition !== undefined && savedPosition > 0) {
          isRestoringRef.current = true;
          
          // Fonction pour restaurer la position si nécessaire
          const attemptRestore = () => {
            if (typeof window === 'undefined') return;
            
            const currentPosition = window.scrollY;
            
            if (currentPosition === 0 || currentPosition < savedPosition - 10) {
              // On est en haut ou très haut, restaurer la position sauvegardée
              window.scrollTo({
                top: savedPosition,
                behavior: 'instant'
              });
              console.log(`[ScrollPreservation] Position restaurée pour ${location}: ${savedPosition} (position actuelle: ${currentPosition})`);
            } else {
              // La position semble correcte
              console.log(`[ScrollPreservation] Position déjà correcte pour ${location}: ${currentPosition}`);
            }
          };
          
          // Essayer de restaurer plusieurs fois avec des délais progressifs
          // pour contrer les scrollTo des pages qui se chargent
          attemptRestore(); // Immédiat
          setTimeout(attemptRestore, 100); // Après 100ms
          setTimeout(attemptRestore, 300); // Après 300ms
          setTimeout(attemptRestore, 500); // Après 500ms
          setTimeout(attemptRestore, 1000); // Après 1s
          setTimeout(attemptRestore, 1500); // Après 1.5s
          
          // Marquer la restauration comme terminée après un délai
          setTimeout(() => {
            isRestoringRef.current = false;
          }, 2000);
        } else {
          // Pas de position sauvegardée, laisser la page en haut (ou son comportement par défaut)
          console.log(`[ScrollPreservation] Aucune position sauvegardée pour ${location}`);
        }
      } catch (error) {
        console.error('[ScrollPreservation] Erreur lors de la restauration:', error);
        isRestoringRef.current = false;
      }
    };

    // Restaurer la position après un délai pour laisser le temps au DOM de se charger
    const timer = setTimeout(restorePosition, 50);

    // Mettre à jour la référence pour la prochaine navigation (APRÈS la sauvegarde)
    previousLocationRef.current = location;

    return () => {
      clearTimeout(timer);
    };
  }, [location]);

  // Intercepter les scrollTo automatiques pendant la restauration
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const originalScrollTo = window.scrollTo;
    
    window.scrollTo = function(...args: any[]) {
      // Vérifier si on a une position sauvegardée pour cette page
      if (typeof localStorage === 'undefined') {
        return originalScrollTo.apply(window, args as any);
      }
      
      // Si c'est une route principale (onglet), ne pas intercepter les scrollTo vers le haut
      if (isMainTabRoute(location)) {
        return originalScrollTo.apply(window, args as any);
      }
      
      try {
        const positions: ScrollPositions = JSON.parse(
          localStorage.getItem(SCROLL_POSITIONS_KEY) || '{}'
        );
        const savedPosition = positions[location];
        
        // Si on est en train de restaurer ou qu'on a une position sauvegardée
        if ((isRestoringRef.current || (savedPosition !== undefined && savedPosition > 0)) && args.length > 0) {
          const top = typeof args[0] === 'object' ? args[0].top : args[0];
          if (top === 0 || top === undefined) {
            console.log('[ScrollPreservation] ScrollTo vers le haut ignoré (position sauvegardée:', savedPosition, ')');
            
            // Si on a une position sauvegardée, restaurer immédiatement
            if (savedPosition !== undefined && savedPosition > 0 && !isRestoringRef.current) {
              setTimeout(() => {
                if (typeof window !== 'undefined') {
                  window.scrollTo({
                    top: savedPosition,
                    behavior: 'instant'
                  });
                  console.log('[ScrollPreservation] Position restaurée après scrollTo ignoré');
                }
              }, 50);
            }
            
            return;
          }
        }
      } catch (error) {
        // En cas d'erreur, continuer avec le scrollTo normal
      }
      
      // Sinon, appeler le scrollTo original
      return originalScrollTo.apply(window, args as any);
    };

    return () => {
      if (typeof window !== 'undefined') {
        window.scrollTo = originalScrollTo;
      }
    };
  }, [location]);

  // Observer les changements de scroll pour restaurer si nécessaire
  useEffect(() => {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
    
    let scrollCheckInterval: NodeJS.Timeout | null = null;
    
    const checkAndRestore = () => {
      if (!isRestoringRef.current || typeof window === 'undefined') return;
      
      try {
        const positions: ScrollPositions = JSON.parse(
          localStorage.getItem(SCROLL_POSITIONS_KEY) || '{}'
        );
        const savedPosition = positions[location];
        
        if (savedPosition !== undefined && savedPosition > 0) {
          const currentPosition = window.scrollY;
          
          // Si on est revenu en haut alors qu'on devrait être plus bas, restaurer
          if (currentPosition === 0 || currentPosition < savedPosition - 20) {
            window.scrollTo({
              top: savedPosition,
              behavior: 'instant'
            });
            console.log(`[ScrollPreservation] Position restaurée après scrollTo: ${savedPosition}`);
          }
        }
      } catch (error) {
        // Ignorer les erreurs silencieusement
      }
    };
    
    // Vérifier périodiquement pendant la période de restauration
    scrollCheckInterval = setInterval(checkAndRestore, 100);
    
    // Arrêter après 2 secondes
    setTimeout(() => {
      if (scrollCheckInterval) {
        clearInterval(scrollCheckInterval);
      }
    }, 2000);
    
    return () => {
      if (scrollCheckInterval) {
        clearInterval(scrollCheckInterval);
      }
    };
  }, [location]);
}
