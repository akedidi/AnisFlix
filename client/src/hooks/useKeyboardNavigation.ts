import { useEffect, useCallback } from 'react';

interface UseKeyboardNavigationProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  isPlayerActive?: boolean; // Pour savoir si on est dans le lecteur
}

export function useKeyboardNavigation({
  videoRef,
  isPlayerActive = false
}: UseKeyboardNavigationProps) {

  const seekVideo = useCallback((direction: 'backward' | 'forward') => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const seekAmount = 10; // 10 secondes par défaut

    if (direction === 'backward') {
      video.currentTime = Math.max(0, video.currentTime - seekAmount);
      console.log('⏪ [KEYBOARD] Recul de 10 secondes');
    } else {
      video.currentTime = Math.min(video.duration, video.currentTime + seekAmount);
      console.log('⏩ [KEYBOARD] Avance de 10 secondes');
    }
  }, [videoRef]);

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
        console.log('⏪ [KEYBOARD] Recul dans la vidéo');
        seekVideo('backward');
      } else if (event.key === 'ArrowRight') {
        console.log('⏩ [KEYBOARD] Avance dans la vidéo');
        seekVideo('forward');
      }
    };

    // Ajouter l'écouteur d'événements
    document.addEventListener('keydown', handleKeyDown, { capture: true });

    // Nettoyage
    return () => {
      document.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [seekVideo, isPlayerActive]);

  return {
    seekVideo
  };
}
