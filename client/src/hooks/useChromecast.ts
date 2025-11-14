import { useEffect, useState, useRef, useCallback } from 'react';

declare global {
  interface Window {
    cast?: {
      framework: {
        CastContext: {
          getInstance: () => CastContext;
        };
        CastContextEventType: {
          CAST_STATE_CHANGED: string;
          SESSION_STATE_CHANGED: string;
        };
        CastState: {
          NO_DEVICES_AVAILABLE: string;
          NOT_CONNECTED: string;
          CONNECTING: string;
          CONNECTED: string;
        };
        SessionState: {
          SESSION_STARTED: string;
          SESSION_ENDED: string;
        };
      };
    };
    chrome?: {
      cast: {
        AutoJoinPolicy: {
          ORIGIN_SCOPED: string;
        };
        media: {
          MediaInfo: new (contentId: string, contentType: string) => any;
          GenericMediaMetadata: new () => any;
          LoadRequest: new (mediaInfo: any) => any;
          Image: new (url: string) => any;
        };
      };
    };
    __onGCastApiAvailable?: (isAvailable: boolean, error: any) => void;
  }

  interface CastContext {
    setOptions: (options: any) => void;
    getCurrentSession: () => CastSession | null;
    addEventListener: (type: string, listener: (event: any) => void) => void;
    requestSession: () => Promise<CastSession>;
  }

  interface CastSession {
    getCastDevice: () => CastDevice;
    loadMedia: (request: any) => Promise<any>;
    endSession: (stopCasting: boolean) => void;
  }

  interface CastDevice {
    deviceName: string;
    friendlyName: string;
  }
}

interface UseChromecastReturn {
  isAvailable: boolean;
  isConnected: boolean;
  isConnecting: boolean;
  currentDevice: CastDevice | null;
  devices: CastDevice[];
  cast: (mediaUrl: string, title: string, posterUrl?: string, currentTime?: number) => Promise<void>;
  disconnect: () => void;
  showPicker: () => void;
}

const CAST_APP_ID = 'CC1AD845'; // Default Media Receiver App ID

export function useChromecast(): UseChromecastReturn {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [currentDevice, setCurrentDevice] = useState<CastDevice | null>(null);
  const [devices, setDevices] = useState<CastDevice[]>([]);
  const castContextRef = useRef<any>(null);
  const sessionRef = useRef<any>(null);
  const mediaSessionRef = useRef<any>(null);

  const initializeCast = useCallback(() => {
    try {
      if (!window.cast) {
        console.warn('[Chromecast] Cast framework non disponible');
        return;
      }

      console.log('[Chromecast] Initialisation du framework Cast...');
      console.log('[Chromecast] Current origin:', window.location.origin);
      
      const castFramework = window.cast.framework;
      castFramework.CastContext.getInstance().setOptions({
        receiverApplicationId: CAST_APP_ID,
        autoJoinPolicy: (window.chrome?.cast?.AutoJoinPolicy as any)?.ORIGIN_SCOPED || 'origin_scoped',
        // Ajouter resumeSavedSession pour maintenir la session
        resumeSavedSession: true,
      });

      const context = castFramework.CastContext.getInstance();
      castContextRef.current = context;

      // Listen for cast state changes
      context.addEventListener(
        castFramework.CastContextEventType.CAST_STATE_CHANGED,
        (event: any) => {
          const castState = event.castState;
          console.log('[Chromecast] État changé:', castState);
          
          if (castState === castFramework.CastState.CONNECTED) {
            setIsConnected(true);
            setIsConnecting(false);
            const session = context.getCurrentSession();
            if (session) {
              sessionRef.current = session;
              const device = session.getCastDevice();
              setCurrentDevice({
                deviceName: device.deviceName,
                friendlyName: device.friendlyName,
              });
            }
          } else if (castState === castFramework.CastState.CONNECTING) {
            setIsConnecting(true);
          } else {
            setIsConnected(false);
            setIsConnecting(false);
            setCurrentDevice(null);
            sessionRef.current = null;
            mediaSessionRef.current = null;
          }
        }
      );

      // Listen for session state changes
      context.addEventListener(
        castFramework.CastContextEventType.SESSION_STATE_CHANGED,
        (event: any) => {
          const sessionState = event.sessionState;
          console.log('[Chromecast] État de session:', sessionState);
          
          if (sessionState === castFramework.SessionState.SESSION_STARTED) {
            sessionRef.current = context.getCurrentSession();
          } else if (sessionState === castFramework.SessionState.SESSION_ENDED) {
            sessionRef.current = null;
            mediaSessionRef.current = null;
            setIsConnected(false);
            setCurrentDevice(null);
          }
        }
      );

      setIsAvailable(true);
      console.log('[Chromecast] Framework initialisé avec succès');
    } catch (error) {
      console.error('[Chromecast] Erreur lors de l\'initialisation:', error);
      setIsAvailable(false);
    }
  }, []);

  // Load Google Cast SDK
  useEffect(() => {
    if (typeof window === 'undefined') return;

    console.log('[Chromecast] ===== DÉBUT CHARGEMENT SDK =====');
    console.log('[Chromecast] Origin:', window.location.origin);
    console.log('[Chromecast] Hostname:', window.location.hostname);

    // Check if SDK is already loaded
    if (window.cast && window.cast.framework) {
      console.log('[Chromecast] SDK déjà chargé, initialisation...');
      initializeCast();
      return;
    }

    // Check if script is already in the DOM
    const existingScript = document.querySelector('script[src*="cast_sender.js"]');
    if (existingScript) {
      console.log('[Chromecast] Script déjà dans le DOM, attente de l\'initialisation...');
      // Script déjà chargé, attendre un peu puis vérifier
      const checkInterval = setInterval(() => {
        if (window.cast && window.cast.framework) {
          console.log('[Chromecast] SDK disponible après attente');
          clearInterval(checkInterval);
          initializeCast();
        }
      }, 100);
      
      setTimeout(() => {
        clearInterval(checkInterval);
        console.log('[Chromecast] Timeout - SDK non disponible après 5s');
      }, 5000);
      return () => clearInterval(checkInterval);
    }

    console.log('[Chromecast] Chargement du script SDK...');
    // Load SDK script
    const script = document.createElement('script');
    script.src = 'https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1';
    script.async = true;
    
    window.__onGCastApiAvailable = (isAvailable: boolean, error: any) => {
      console.log('[Chromecast] __onGCastApiAvailable callback:', { isAvailable, error });
      if (isAvailable && !error) {
        console.log('[Chromecast] SDK chargé via callback, initialisation...');
        initializeCast();
      } else {
        console.warn('[Chromecast] SDK non disponible via callback:', error);
        // Ne pas mettre setIsAvailable(false) immédiatement, attendre onload
      }
    };

    script.onload = () => {
      console.log('[Chromecast] Script onload event');
      // Attendre un peu pour que le SDK s'initialise
      setTimeout(() => {
        if (window.cast && window.cast.framework) {
          console.log('[Chromecast] SDK chargé via onload, initialisation...');
          initializeCast();
        } else {
          console.warn('[Chromecast] SDK non disponible après onload');
          console.warn('[Chromecast] Cela peut être dû à une origine non whitelistée');
          console.warn('[Chromecast] Pour le développement, accédez à l\'app via localhost ou configurez HTTPS');
        }
      }, 500);
    };

    script.onerror = () => {
      console.error('[Chromecast] Erreur lors du chargement du script SDK');
      setIsAvailable(false);
    };

    document.head.appendChild(script);
    console.log('[Chromecast] Script ajouté au DOM');

    return () => {
      // Ne pas supprimer le script car il peut être utilisé par d'autres composants
    };
  }, [initializeCast]);

  const cast = useCallback(async (
    mediaUrl: string,
    title: string,
    posterUrl?: string,
    currentTime: number = 0
  ) => {
    if (!castContextRef.current || !sessionRef.current || !window.chrome?.cast) {
      console.error('[Chromecast] Pas de session active ou SDK non chargé');
      return;
    }

    try {
      const session = sessionRef.current;
      const chromeCast = window.chrome.cast as any;
      
      // Détecter le type de média (HLS ou MP4)
      const isHLS = mediaUrl.includes('.m3u8') || mediaUrl.includes('m3u8');
      const contentType = isHLS 
        ? 'application/x-mpegURL'  // Utiliser le type MIME standard pour HLS
        : 'video/mp4';
      
      console.log('[Chromecast] Cast média:', { mediaUrl, title, contentType, isHLS });
      
      // Vérifier que l'URL est accessible depuis le Chromecast
      // Les URLs locales (localhost) ne fonctionneront pas
      if (mediaUrl.includes('localhost') || mediaUrl.includes('127.0.0.1')) {
        console.warn('[Chromecast] ⚠️ URL localhost détectée!');
        console.warn('[Chromecast] Le Chromecast ne pourra pas accéder à cette URL.');
        console.warn('[Chromecast] Assurez-vous que l\'URL utilise votre IP locale (ex: 192.168.x.x) au lieu de localhost');
        // On continue quand même, peut-être que l'URL a été convertie
      }
      
      const mediaInfo = new chromeCast.media.MediaInfo(mediaUrl, contentType);
      mediaInfo.metadata = new chromeCast.media.GenericMediaMetadata();
      mediaInfo.metadata.title = title;
      
      // Pour les streams HLS (live), utiliser LIVE ou NONE au lieu de BUFFERED
      // BUFFERED est pour les vidéos pré-chargées, pas pour les streams live
      if (isHLS) {
        // Pour les streams live TV, utiliser LIVE
        mediaInfo.streamType = chromeCast.media.StreamType.LIVE;
        // Ne pas définir currentTime pour les streams live
        console.log('[Chromecast] Stream HLS détecté, utilisation de StreamType.LIVE');
      } else {
        // Pour les vidéos MP4, utiliser BUFFERED
        mediaInfo.streamType = chromeCast.media.StreamType.BUFFERED;
        console.log('[Chromecast] Vidéo MP4 détectée, utilisation de StreamType.BUFFERED');
      }
      
      if (posterUrl) {
        mediaInfo.metadata.images = [new chromeCast.Image(posterUrl)];
      }

      const request = new chromeCast.media.LoadRequest(mediaInfo);
      
      // Ne définir currentTime que pour les vidéos non-live
      if (!isHLS && currentTime > 0) {
        request.currentTime = currentTime;
      }

      console.log('[Chromecast] Envoi de la requête de cast...', {
        url: mediaUrl,
        contentType,
        streamType: mediaInfo.streamType,
        currentTime: request.currentTime
      });

      const mediaSession = await session.loadMedia(request);
      mediaSessionRef.current = mediaSession;

      console.log('[Chromecast] Média chargé avec succès:', title, 'Type:', contentType);
      
      // Écouter les erreurs de média
      mediaSession.addUpdateListener((isAlive: boolean) => {
        if (!isAlive) {
          console.error('[Chromecast] La session média n\'est plus active');
        }
      });
      
    } catch (error) {
      console.error('[Chromecast] Erreur lors du cast:', error);
      throw error;
    }
  }, []);

  const disconnect = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.endSession(true);
      sessionRef.current = null;
      mediaSessionRef.current = null;
    }
  }, []);

  const showPicker = useCallback(() => {
    if (!castContextRef.current) {
      console.warn('[Chromecast] Cast context non disponible');
      return;
    }

    try {
      castContextRef.current.requestSession();
    } catch (error) {
      console.error('[Chromecast] Erreur lors de l\'ouverture du picker:', error);
    }
  }, []);

  return {
    isAvailable,
    isConnected,
    isConnecting,
    currentDevice,
    devices,
    cast,
    disconnect,
    showPicker,
  };
}
