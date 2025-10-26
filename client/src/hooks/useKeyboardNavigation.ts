import { useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';

interface NavigationItem {
  id: number;
  mediaType: 'movie' | 'tv';
}

interface UseKeyboardNavigationProps {
  currentId: number;
  currentMediaType: 'movie' | 'tv';
  similarItems: NavigationItem[];
  isPlayerActive?: boolean; // Pour savoir si on est dans le lecteur
}

export function useKeyboardNavigation({
  currentId,
  currentMediaType,
  similarItems,
  isPlayerActive = false
}: UseKeyboardNavigationProps) {
  const [, setLocation] = useLocation();

  const navigateToItem = useCallback((direction: 'prev' | 'next') => {
    if (similarItems.length === 0) return;

    // Trouver l'index de l'élément actuel
    const currentIndex = similarItems.findIndex(item => 
      item.id === currentId && item.mediaType === currentMediaType
    );

    if (currentIndex === -1) {
      // Si l'élément actuel n'est pas dans la liste, prendre le premier/dernier
      const targetItem = direction === 'next' ? similarItems[0] : similarItems[similarItems.length - 1];
      if (targetItem) {
        const path = targetItem.mediaType === 'movie' ? `/movie/${targetItem.id}` : `/series/${targetItem.id}`;
        setLocation(path);
      }
      return;
    }

    // Calculer l'index cible
    let targetIndex: number;
    if (direction === 'next') {
      targetIndex = (currentIndex + 1) % similarItems.length;
    } else {
      targetIndex = currentIndex === 0 ? similarItems.length - 1 : currentIndex - 1;
    }

    const targetItem = similarItems[targetIndex];
    if (targetItem) {
      const path = targetItem.mediaType === 'movie' ? `/movie/${targetItem.id}` : `/series/${targetItem.id}`;
      setLocation(path);
    }
  }, [currentId, currentMediaType, similarItems, setLocation]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignorer si on n'est pas dans le lecteur ou si on tape dans un input
      if (!isPlayerActive || 
          event.target instanceof HTMLInputElement || 
          event.target instanceof HTMLTextAreaElement ||
          event.target instanceof HTMLSelectElement) {
        return;
      }

      // Empêcher le comportement par défaut pour les touches de navigation
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        event.stopPropagation();
      }

      if (event.key === 'ArrowLeft') {
        console.log('🎬 [KEYBOARD NAV] Navigation vers le précédent');
        navigateToItem('prev');
      } else if (event.key === 'ArrowRight') {
        console.log('🎬 [KEYBOARD NAV] Navigation vers le suivant');
        navigateToItem('next');
      }
    };

    // Ajouter l'écouteur d'événements
    document.addEventListener('keydown', handleKeyDown, { capture: true });

    // Nettoyage
    return () => {
      document.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [navigateToItem, isPlayerActive]);

  return {
    navigateToItem
  };
}
