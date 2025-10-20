import { useEffect } from 'react';

/**
 * Hook pour corriger les problèmes de scroll iOS spécifiques
 * Empêche le tab bar de remonter lors du scroll
 */
export const useIOSScrollFix = () => {
  useEffect(() => {
    // Vérifier si on est sur iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    
    if (!isIOS) return;

    // Fonction pour empêcher le bounce/overscroll
    const preventOverscroll = (e: Event) => {
      const target = e.target as HTMLElement;
      
      // Si on est à la fin du scroll, empêcher le bounce
      if (target.scrollTop + target.clientHeight >= target.scrollHeight) {
        e.preventDefault();
      }
      
      // Si on est au début du scroll, empêcher le bounce
      if (target.scrollTop <= 0) {
        e.preventDefault();
      }
    };

    // Fonction pour gérer le scroll du body
    const handleBodyScroll = (e: Event) => {
      const body = document.body;
      const html = document.documentElement;
      
      // Calculer si on est à la fin du scroll
      const isAtBottom = window.innerHeight + window.scrollY >= 
                         Math.max(body.scrollHeight, body.offsetHeight, 
                                 html.clientHeight, html.scrollHeight, html.offsetHeight);
      
      // Si on est à la fin, empêcher le bounce
      if (isAtBottom) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    // Ajouter les event listeners
    document.addEventListener('touchmove', handleBodyScroll, { passive: false });
    document.addEventListener('scroll', handleBodyScroll, { passive: false });
    
    // Ajouter les styles CSS pour empêcher le bounce
    const style = document.createElement('style');
    style.textContent = `
      body {
        overscroll-behavior: none !important;
        -webkit-overscroll-behavior: none !important;
        bounces: false !important;
        -webkit-bounces: false !important;
      }
      
      .main-content {
        overscroll-behavior: none !important;
        -webkit-overscroll-behavior: none !important;
      }
    `;
    document.head.appendChild(style);

    // Cleanup
    return () => {
      document.removeEventListener('touchmove', handleBodyScroll);
      document.removeEventListener('scroll', handleBodyScroll);
      document.head.removeChild(style);
    };
  }, []);
};
