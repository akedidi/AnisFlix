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
    };

    // Fonction pour gérer le resize
    const handleResize = () => {
      const isMobileNow = window.innerWidth <= 767;
      
      if (isMobileNow) {
        // Appliquer les styles mobile
        document.body.style.overflowX = 'hidden';
        document.documentElement.style.overflowX = 'hidden';
               (document.body.style as any).webkitOverflowScrolling = 'touch';
               (document.documentElement.style as any).webkitOverflowScrolling = 'touch';
        
        // S'assurer que le tab bar reste fixe
        const tabBar = document.querySelector('.mobile-bottom-nav');
        if (tabBar) {
          (tabBar as HTMLElement).style.position = 'fixed';
          (tabBar as HTMLElement).style.bottom = '0';
          (tabBar as HTMLElement).style.left = '0';
          (tabBar as HTMLElement).style.right = '0';
          (tabBar as HTMLElement).style.zIndex = '99999';
          (tabBar as HTMLElement).style.transform = 'translate3d(0, 0, 0)';
        }
      } else {
        // Restaurer les styles desktop
        document.body.style.overflowX = '';
        document.documentElement.style.overflowX = '';
               (document.body.style as any).webkitOverflowScrolling = '';
               (document.documentElement.style as any).webkitOverflowScrolling = '';
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
