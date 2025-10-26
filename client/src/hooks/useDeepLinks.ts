import { useEffect } from 'react';
import { useLocation } from 'wouter';

export function useDeepLinks() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Fonction pour gérer les liens profonds
    const handleDeepLink = (url: string) => {
      try {
        const urlObj = new URL(url);
        const path = urlObj.pathname;
        
        console.log('[DEEP LINK] URL reçue:', url);
        console.log('[DEEP LINK] Chemin extrait:', path);
        
        // Navigation vers le chemin extrait
        if (path && path !== '/') {
          setLocation(path);
        }
      } catch (error) {
        console.error('[DEEP LINK] Erreur lors du traitement de l\'URL:', error);
      }
    };

    // Écouter les événements de liens profonds Capacitor
    if (typeof window !== 'undefined' && (window as any).Capacitor) {
      const { App } = (window as any).Capacitor.Plugins;
      
      if (App) {
        // Écouter les événements d'URL
        App.addListener('appUrlOpen', (event: any) => {
          console.log('[DEEP LINK] App URL Open:', event);
          handleDeepLink(event.url);
        });

        // Écouter les événements d'état de l'app
        App.addListener('appStateChange', (state: any) => {
          console.log('[DEEP LINK] App State Change:', state);
        });
      }
    }

    // Gérer les liens au chargement de la page
    const currentUrl = window.location.href;
    if (currentUrl !== window.location.origin + '/') {
      handleDeepLink(currentUrl);
    }

    // Nettoyage
    return () => {
      if (typeof window !== 'undefined' && (window as any).Capacitor) {
        const { App } = (window as any).Capacitor.Plugins;
        if (App) {
          App.removeAllListeners();
        }
      }
    };
  }, [setLocation]);
}
