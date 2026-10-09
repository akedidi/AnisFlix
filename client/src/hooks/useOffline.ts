import { useState, useEffect, useRef } from 'react';

export function useOffline() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastOnlineCheckRef = useRef<number>(Date.now());

  // Fonction pour vérifier activement la connexion
  const checkConnection = async () => {
    if (isCheckingConnection) return;
    
    // Éviter les vérifications inutiles si on est déjà en ligne et que ça fait moins de 5 minutes
    const timeSinceLastCheck = Date.now() - lastOnlineCheckRef.current;
    if (!isOffline && timeSinceLastCheck < 300000) {
      return;
    }
    
    setIsCheckingConnection(true);
    
    try {
      // Test de connexion avec un endpoint fiable
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch('https://www.google.com/favicon.ico', {
        method: 'HEAD',
        mode: 'no-cors',
        signal: controller.signal,
        cache: 'no-cache'
      });
      
      clearTimeout(timeoutId);
      
      // Si on arrive ici, on a une connexion
      if (isOffline) {
        console.log('🌐 [CONNEXION] Connexion détectée - passage en ligne');
        setIsOffline(false);
        lastOnlineCheckRef.current = Date.now();
      }
    } catch (error) {
      // Pas de connexion - mais ne pas changer l'état si on est déjà offline
      // pour éviter les changements quand localhost n'est pas lancé
      if (!isOffline && navigator.onLine) {
        console.log('🌐 [CONNEXION] Pas de connexion détectée - passage hors ligne');
        setIsOffline(true);
      }
    } finally {
      setIsCheckingConnection(false);
    }
  };

  useEffect(() => {
    const handleOnline = () => {
      console.log('🌐 [CONNEXION] Événement online détecté');
      setIsOffline(false);
      lastOnlineCheckRef.current = Date.now();
    };
    
    const handleOffline = () => {
      console.log('🌐 [CONNEXION] Événement offline détecté');
      setIsOffline(true);
    };

    // Écouter les événements du navigateur
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Vérification périodique de la connexion (toutes les 2 minutes)
    checkIntervalRef.current = setInterval(() => {
      const timeSinceLastCheck = Date.now() - lastOnlineCheckRef.current;
      
      // Vérifier la connexion seulement si on est hors ligne ou si ça fait plus de 2 minutes
      if (isOffline || timeSinceLastCheck > 120000) {
        checkConnection();
      }
    }, 120000);

    // Vérification initiale
    checkConnection();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [isOffline]);

  return { isOffline, isCheckingConnection };
}

export function useServiceWorker() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
        .then((registration) => {
          console.log('Service Worker registered:', registration);
          return registration.update();
        })
        .catch((error) => {
          console.log('Service Worker registration failed:', error);
        });
    }
  }, []);
}
