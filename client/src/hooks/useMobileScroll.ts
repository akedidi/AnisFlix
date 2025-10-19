import { useEffect } from 'react';

/**
 * Hook pour gérer le scroll sur mobile et éviter les problèmes de contenu
 * qui passe derrière la scroll bar
 */
export const useMobileScroll = () => {
  useEffect(() => {
    // Vérifier si on est sur mobile
    const isMobile = window.innerWidth <= 767;
    
    if (!isMobile) return;

    // Fonction pour gérer le scroll
    const handleScroll = () => {
      // Empêcher le scroll horizontal
      if (window.scrollX !== 0) {
        window.scrollTo(0, window.scrollY);
      }
      
      // S'assurer que le contenu ne dépasse pas les limites
      const body = document.body;
      const html = document.documentElement;
      
      // Empêcher le dépassement horizontal
      if (body.scrollWidth > window.innerWidth) {
        body.style.overflowX = 'hidden';
      }
      
      if (html.scrollWidth > window.innerWidth) {
        html.style.overflowX = 'hidden';
      }
    };

    // Fonction pour gérer le resize
    const handleResize = () => {
      const isMobileNow = window.innerWidth <= 767;
      
      if (isMobileNow) {
        // Appliquer les styles mobile
        document.body.style.overflowX = 'hidden';
        document.documentElement.style.overflowX = 'hidden';
        document.body.style.webkitOverflowScrolling = 'touch';
        document.documentElement.style.webkitOverflowScrolling = 'touch';
      } else {
        // Restaurer les styles desktop
        document.body.style.overflowX = '';
        document.documentElement.style.overflowX = '';
        document.body.style.webkitOverflowScrolling = '';
        document.documentElement.style.webkitOverflowScrolling = '';
      }
    };

    // Appliquer les styles initiaux
    handleResize();

    // Ajouter les event listeners
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize, { passive: true });

    // Cleanup
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, []);
};
