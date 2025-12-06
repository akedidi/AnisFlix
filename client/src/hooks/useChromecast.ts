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

import { Subtitle } from "@/lib/opensubtitles";

interface UseChromecastReturn {
  isAvailable: boolean;
  isConnected: boolean;
  isConnecting: boolean;
  currentDevice: CastDevice | null;
  devices: CastDevice[];
  cast: (
    mediaUrl: string,
    title: string,
    posterUrl?: string,
    currentTime?: number,
    subtitles?: Subtitle[],
    activeSubtitleUrl?: string
  ) => Promise<void>;
  disconnect: () => void;
  showPicker: () => void;
}

// Utiliser le Default Media Receiver (compatible avec tous les appareils)
// Note: Le Default Media Receiver supporte HLS et MP4, mais pas DASH nativement
// Pour DASH, le stream sera converti ou le receiver tentera de le lire
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
    currentTime: number = 0,
    subtitles: Subtitle[] = [],
    activeSubtitleUrl?: string
  ) => {
    if (!castContextRef.current || !sessionRef.current || !window.chrome?.cast) {
      console.error('[Chromecast] Pas de session active ou SDK non chargé');
      return;
    }

    try {
      const session = sessionRef.current;
      const chromeCast = window.chrome.cast as any;

      // Détecter le type de média avec plus de précision
      const isHLS = mediaUrl.includes('.m3u8') || mediaUrl.includes('m3u8');
      const isDASH = mediaUrl.includes('.mpd') || mediaUrl.includes('mpd') || mediaUrl.includes('dash');
      const isMP4 = mediaUrl.includes('.mp4');

      let contentType: string;
      let streamType: any;

      if (isDASH) {
        contentType = 'application/dash+xml';
        streamType = chromeCast.media.StreamType.BUFFERED; // Changed from LIVE to BUFFERED to allow seeking
        console.log('[Chromecast] Stream DASH/MPD détecté');
      } else if (isHLS) {
        contentType = 'application/x-mpegURL';
        streamType = chromeCast.media.StreamType.BUFFERED; // Changed from LIVE to BUFFERED to allow seeking
        console.log('[Chromecast] Stream HLS détecté');
      } else if (isMP4) {
        contentType = 'video/mp4';
        streamType = chromeCast.media.StreamType.BUFFERED;
        console.log('[Chromecast] Vidéo MP4 détectée');
      } else {
        // Par défaut, essayer HLS pour les streams TV
        contentType = 'application/x-mpegURL';
        streamType = chromeCast.media.StreamType.BUFFERED; // Changed from LIVE to BUFFERED
        console.log('[Chromecast] Format inconnu, utilisation de HLS par défaut');
      }

      console.log('[Chromecast] Cast média:', {
        mediaUrl,
        title,
        contentType,
        streamType,
        isDASH,
        isHLS,
        isMP4,
        subtitlesCount: subtitles.length,
        activeSubtitleUrl
      });

      // Vérifier l'accessibilité de l'URL et corriger si localhost
      let finalMediaUrl = mediaUrl;
      const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

      if (isLocalhost && (mediaUrl.includes('localhost') || mediaUrl.includes('127.0.0.1'))) {
        console.warn('[Chromecast] ⚠️ URL localhost détectée, tentative de remplacement par l\'URL de production...');
        const productionUrl = "https://anisflix.vercel.app";
        finalMediaUrl = mediaUrl.replace(/http:\/\/localhost:\d+/, productionUrl).replace(/http:\/\/127.0.0.1:\d+/, productionUrl);
        console.log('[Chromecast] Nouvelle URL:', finalMediaUrl);
      }

      // Force HLS content type for Vixsrc proxy if not already detected
      if (finalMediaUrl.includes('vixsrc-proxy')) {
        // Use standard Apple HLS MIME type which is often better supported
        contentType = 'application/vnd.apple.mpegurl';
        streamType = chromeCast.media.StreamType.BUFFERED;
        console.log('[Chromecast] Vixsrc proxy détecté, forçage contentType: application/vnd.apple.mpegurl');
      }

      const mediaInfo = new chromeCast.media.MediaInfo(finalMediaUrl, contentType);
      mediaInfo.metadata = new chromeCast.media.GenericMediaMetadata();
      mediaInfo.metadata.title = title;
      mediaInfo.streamType = streamType;

      // CRITICAL: Set HLS segment format for Chromecast to correctly decode TS segments
      // Without this, Chromecast may fail to play HLS streams with TS segments
      if (contentType === 'application/x-mpegURL' || contentType === 'application/vnd.apple.mpegurl') {
        mediaInfo.hlsSegmentFormat = 'TS';
        mediaInfo.hlsVideoSegmentFormat = 'TS';
        console.log('[Chromecast] Setting hlsSegmentFormat: TS for HLS stream');
      }

      if (posterUrl) {
        mediaInfo.metadata.images = [new chromeCast.Image(posterUrl)];
      }

      // Add subtitles if provided
      if (subtitles && subtitles.length > 0) {
        // Determine base URL for proxy
        // Chromecast cannot access localhost.
        // If on localhost, we try to use the production URL, BUT the production server might not have the proxy route yet.
        // Ideally, the user should deploy.
        const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
        const baseUrl = isLocalhost ? "https://anisflix.vercel.app" : window.location.origin;

        if (isLocalhost) {
          console.warn("[Chromecast] Running on localhost. Using production URL for subtitle proxy:", baseUrl);
          console.warn("[Chromecast] Ensure the production server has the /api/media-proxy route deployed!");
        }

        const tracks = subtitles.map((sub, index) => {
          const track = new chromeCast.media.Track(index + 1, chromeCast.media.TrackType.TEXT);
          track.trackContentId = `${baseUrl}/api/media-proxy?type=subtitle&url=${encodeURIComponent(sub.url)}`;
          track.trackContentType = 'text/vtt';
          track.subtype = chromeCast.media.TextTrackType.SUBTITLES;
          track.name = sub.label;

          // Map ISO 639-2 (3 chars) to ISO 639-1 (2 chars) for Chromecast
          // Chromecast prefers 2-letter codes (RFC 5646)
          let lang = sub.lang;
          if (lang === 'fre' || lang === 'fra') lang = 'fr';
          if (lang === 'eng') lang = 'en';
          if (lang === 'spa') lang = 'es';
          if (lang === 'ger' || lang === 'deu') lang = 'de';
          if (lang === 'ita') lang = 'it';
          if (lang === 'por') lang = 'pt';
          if (lang === 'rus') lang = 'ru';
          if (lang === 'ara') lang = 'ar';
          if (lang === 'chi' || lang === 'zho') lang = 'zh';
          if (lang === 'jpn') lang = 'ja';
          if (lang === 'kor') lang = 'ko';
          if (lang === 'tur') lang = 'tr';

          track.language = lang;
          track.customData = null;
          return track;
        });

        mediaInfo.tracks = tracks;
      }

      const request = new chromeCast.media.LoadRequest(mediaInfo);

      // Définir currentTime uniquement pour les vidéos BUFFERED
      if (streamType === chromeCast.media.StreamType.BUFFERED && currentTime > 0) {
        request.currentTime = currentTime;
      }

      // Activer le sous-titre sélectionné
      if (activeSubtitleUrl && subtitles.length > 0) {
        const activeIndex = subtitles.findIndex(s => s.url === activeSubtitleUrl);
        if (activeIndex !== -1) {
          request.activeTrackIds = [activeIndex + 1];
        }
      }

      console.log('[Chromecast] Envoi de la requête de cast...', {
        url: mediaUrl,
        contentType,
        streamType,
        currentTime: request.currentTime,
        tracks: mediaInfo.tracks,
        activeTrackIds: request.activeTrackIds
      });

      const mediaSession = await session.loadMedia(request);
      mediaSessionRef.current = mediaSession;

      console.log('[Chromecast] Média chargé avec succès:', title, 'Type:', contentType);

      // Écouter les erreurs de média si la session existe
      if (mediaSession && typeof mediaSession.addUpdateListener === 'function') {
        mediaSession.addUpdateListener((isAlive: boolean) => {
          if (!isAlive) {
            console.error('[Chromecast] La session média n\'est plus active');
          }
        });
      } else {
        console.warn('[Chromecast] addUpdateListener non disponible sur mediaSession');
      }

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
