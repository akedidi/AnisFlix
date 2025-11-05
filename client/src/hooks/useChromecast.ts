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
      
      const castFramework = window.cast.framework;
      castFramework.CastContext.getInstance().setOptions({
        receiverApplicationId: CAST_APP_ID,
        autoJoinPolicy: (window.chrome?.cast?.AutoJoinPolicy as any)?.ORIGIN_SCOPED || 'origin_scoped',
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

    // Check if SDK is already loaded
    if (window.cast && window.cast.framework) {
      console.log('[Chromecast] SDK déjà chargé, initialisation...');
      initializeCast();
      return;
    }

    // Check if script is already in the DOM
    const existingScript = document.querySelector('script[src*="cast_sender.js"]');
    if (existingScript) {
      // Script déjà chargé, attendre un peu puis vérifier
      const checkInterval = setInterval(() => {
        if (window.cast && window.cast.framework) {
          clearInterval(checkInterval);
          initializeCast();
        }
      }, 100);
      
      setTimeout(() => clearInterval(checkInterval), 5000); // Timeout après 5s
      return () => clearInterval(checkInterval);
    }

    // Load SDK script
    const script = document.createElement('script');
    script.src = 'https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1';
    script.async = true;
    
    window.__onGCastApiAvailable = (isAvailable: boolean, error: any) => {
      if (isAvailable && !error) {
        console.log('[Chromecast] SDK chargé via callback, initialisation...');
        initializeCast();
      } else {
        console.warn('[Chromecast] SDK non disponible:', error);
        setIsAvailable(false);
      }
    };

    script.onload = () => {
      // Attendre un peu pour que le SDK s'initialise
      setTimeout(() => {
        if (window.cast && window.cast.framework) {
          console.log('[Chromecast] SDK chargé via onload, initialisation...');
          initializeCast();
        }
      }, 500);
    };

    script.onerror = () => {
      console.error('[Chromecast] Erreur lors du chargement du script SDK');
      setIsAvailable(false);
    };

    document.head.appendChild(script);

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
      const contentType = mediaUrl.includes('.m3u8') || mediaUrl.includes('m3u8') 
        ? 'application/vnd.apple.mpegurl' 
        : 'video/mp4';
      
      const mediaInfo = new chromeCast.media.MediaInfo(mediaUrl, contentType);
      mediaInfo.metadata = new chromeCast.media.GenericMediaMetadata();
      mediaInfo.metadata.title = title;
      mediaInfo.streamType = chromeCast.media.StreamType.BUFFERED;
      
      if (posterUrl) {
        mediaInfo.metadata.images = [new chromeCast.Image(posterUrl)];
      }

      const request = new chromeCast.media.LoadRequest(mediaInfo);
      request.currentTime = currentTime;

      const mediaSession = await session.loadMedia(request);
      mediaSessionRef.current = mediaSession;

      console.log('[Chromecast] Média chargé:', title, 'Type:', contentType);
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
