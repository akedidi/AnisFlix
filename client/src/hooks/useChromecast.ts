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
        RemotePlayer: new () => any;
        RemotePlayerController: new (player: any) => any;
        RemotePlayerEventType: {
          IS_CONNECTED_CHANGED: string;
          IS_MEDIA_LOADED_CHANGED: string;
          DURATION_CHANGED: string;
          CURRENT_TIME_CHANGED: string;
          IS_PAUSED_CHANGED: string;
          VOLUME_LEVEL_CHANGED: string;
          IS_MUTED_CHANGED: string;
          PLAYER_STATE_CHANGED: string;
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
          SeekRequest: new () => any;
          EditTracksInfoRequest: new (activeTrackIds?: number[], textTrackStyle?: any) => any;
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
    getMediaSession: () => any;
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
  // Player state from RemotePlayerController
  playerState: {
    currentTime: number;
    duration: number;
    isPaused: boolean;
    isMediaLoaded: boolean;
    volumeLevel: number;
    isMuted: boolean;
  };
  cast: (
    mediaUrl: string,
    title: string,
    posterUrl?: string,
    currentTime?: number,
    subtitles?: Subtitle[],
    activeSubtitleUrl?: string,
    mediaId?: number,
    mediaType?: string,
    season?: number,
    episode?: number
  ) => Promise<void>;
  disconnect: () => void;
  showPicker: () => void;
  setActiveSubtitle: (activeSubtitleUrl: string | null, subtitles: Subtitle[]) => Promise<void>;
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  getMediaTime: () => Promise<number>;
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

  // Player state from RemotePlayerController
  const [playerState, setPlayerState] = useState({
    currentTime: 0,
    duration: 0,
    isPaused: true,
    isMediaLoaded: false,
    volumeLevel: 1,
    isMuted: false,
  });

  const castContextRef = useRef<any>(null);
  const sessionRef = useRef<any>(null);
  const mediaSessionRef = useRef<any>(null);
  const remotePlayerRef = useRef<any>(null);
  const remotePlayerControllerRef = useRef<any>(null);

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

              // Tenter de récupérer la session média existante
              const mediaSession = session.getMediaSession();
              if (mediaSession) {
                console.log('[Chromecast] Session média existante récupérée');
                mediaSessionRef.current = mediaSession;
              }
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
            const session = context.getCurrentSession();
            sessionRef.current = session;

            // Tenter de récupérer la session média existante
            if (session) {
              const mediaSession = session.getMediaSession();
              if (mediaSession) {
                console.log('[Chromecast] Session média récupérée au démarrage de la session');
                mediaSessionRef.current = mediaSession;
              }
            }
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

      // Initialize RemotePlayer and RemotePlayerController for bidirectional control
      try {
        const player = new castFramework.RemotePlayer();
        const playerController = new castFramework.RemotePlayerController(player);
        remotePlayerRef.current = player;
        remotePlayerControllerRef.current = playerController;

        console.log('[Chromecast] RemotePlayerController initialisé');

        // Listen for player state changes
        const eventTypes = castFramework.RemotePlayerEventType;

        // Current Time changed - update progress
        playerController.addEventListener(
          eventTypes.CURRENT_TIME_CHANGED,
          () => {
            setPlayerState(prev => ({
              ...prev,
              currentTime: player.currentTime || 0,
            }));
          }
        );

        // Duration changed
        playerController.addEventListener(
          eventTypes.DURATION_CHANGED,
          () => {
            setPlayerState(prev => ({
              ...prev,
              duration: player.duration || 0,
            }));
          }
        );

        // Pause state changed
        playerController.addEventListener(
          eventTypes.IS_PAUSED_CHANGED,
          () => {
            setPlayerState(prev => ({
              ...prev,
              isPaused: player.isPaused,
            }));
            console.log('[Chromecast] Pause state changed:', player.isPaused);
          }
        );

        // Media loaded changed
        playerController.addEventListener(
          eventTypes.IS_MEDIA_LOADED_CHANGED,
          () => {
            setPlayerState(prev => ({
              ...prev,
              isMediaLoaded: player.isMediaLoaded,
              duration: player.duration || 0,
            }));
            console.log('[Chromecast] Media loaded:', player.isMediaLoaded);
          }
        );

        // Volume changed
        playerController.addEventListener(
          eventTypes.VOLUME_LEVEL_CHANGED,
          () => {
            setPlayerState(prev => ({
              ...prev,
              volumeLevel: player.volumeLevel || 1,
            }));
          }
        );

        // Muted changed
        playerController.addEventListener(
          eventTypes.IS_MUTED_CHANGED,
          () => {
            setPlayerState(prev => ({
              ...prev,
              isMuted: player.isMuted,
            }));
          }
        );

      } catch (playerError) {
        console.warn('[Chromecast] Impossible d\'initialiser RemotePlayerController:', playerError);
      }
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
    activeSubtitleUrl?: string,
    mediaId?: number,
    mediaType?: string,
    season?: number,
    episode?: number
  ) => {
    if (!castContextRef.current || !sessionRef.current || !window.chrome?.cast) {
      console.error('[Chromecast] Pas de session active ou SDK non chargé');
      return;
    }

    try {
      const session = sessionRef.current;
      const chromeCast = window.chrome.cast as any;

      // Détecter le type de média avec plus de précision
      let innerUrl = mediaUrl;
      try {
        if (mediaUrl.includes('movix-proxy') || mediaUrl.includes('proxy')) {
          const urlObj = new URL(mediaUrl);
          const link = urlObj.searchParams.get('link') || urlObj.searchParams.get('url');
          if (link) innerUrl = decodeURIComponent(link);
        }
      } catch (e) {
        console.warn('Erreur parsing proxy URL:', e);
      }

      const isHLS = innerUrl.includes('.m3u8') || innerUrl.includes('m3u8');
      const isDASH = innerUrl.includes('.mpd') || innerUrl.includes('mpd') || innerUrl.includes('dash');
      const isMP4 = innerUrl.includes('.mp4') ||
        innerUrl.includes('streamtape') ||
        innerUrl.includes('streamta') ||
        innerUrl.includes('get_video') ||
        innerUrl.includes('mp4'); // Generic check

      let contentType: string;
      let streamType: any;

      if (isDASH) {
        contentType = 'application/dash+xml';
        streamType = chromeCast.media.StreamType.BUFFERED;
        console.log('[Chromecast] Stream DASH/MPD détecté');
      } else if (isHLS) {
        contentType = 'application/x-mpegURL';
        streamType = chromeCast.media.StreamType.BUFFERED;
        console.log('[Chromecast] Stream HLS détecté');
      } else if (isMP4) {
        contentType = 'video/mp4';
        streamType = chromeCast.media.StreamType.BUFFERED;
        console.log('[Chromecast] Vidéo MP4 détectée (Direct ou Proxy)');
      } else {
        // Par défaut, essayer HLS pour les streams TV, sauf si c'est clairement un proxy MP4
        contentType = 'application/x-mpegURL';
        streamType = chromeCast.media.StreamType.BUFFERED;
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
      // Force HLS content type for Vixsrc proxy if not already detected
      if (finalMediaUrl.includes('vixsrc-proxy')) {
        // Use standard Apple HLS MIME type which is often better supported
        contentType = 'application/vnd.apple.mpegurl';
        streamType = chromeCast.media.StreamType.BUFFERED;

        console.log('[Chromecast] Vixsrc proxy détecté, forçage contentType:', finalMediaUrl);
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

      // Add custom data for progress tracking
      if (mediaId && mediaType) {
        mediaInfo.customData = {
          mediaId,
          mediaType,
          season,
          episode,
          title, // Save title for history
          posterPath: posterUrl // Save poster for history
        };
        console.log('[Chromecast] customData set:', mediaInfo.customData);
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
        url: finalMediaUrl,  // Use finalMediaUrl to show the actual URL being sent
        originalUrl: mediaUrl,
        contentType,
        streamType,
        currentTime: request.currentTime,
        tracks: mediaInfo.tracks,
        activeTrackIds: request.activeTrackIds
      });

      try {
        const mediaSession = await session.loadMedia(request);

        // Sometimes loadMedia returns null but the media actually loads
        // Try to get the session from the session object directly
        if (!mediaSession) {
          console.warn('[Chromecast] loadMedia returned null, trying to get session directly...');

          // Wait a bit for the media to load
          await new Promise(resolve => setTimeout(resolve, 1000));

          const retrievedSession = session.getMediaSession();
          if (retrievedSession) {
            console.log('[Chromecast] ✅ Successfully retrieved media session from session object');
            mediaSessionRef.current = retrievedSession;
          } else {
            console.error('[Chromecast] ❌ Could not retrieve media session, but media might still be playing');
            // Don't throw error if we can't get the session - the media might still play
            // We just won't have controls
            console.warn('[Chromecast] Continuing without media session controls');
            return;
          }
        } else {
          mediaSessionRef.current = mediaSession;
        }

        console.log('[Chromecast] Média chargé avec succès:', title, 'Type:', contentType, 'Session:', mediaSessionRef.current);

        // Écouter les erreurs de média si la session existe
        if (mediaSessionRef.current && typeof mediaSessionRef.current.addUpdateListener === 'function') {
          mediaSessionRef.current.addUpdateListener((isAlive: boolean) => {
            if (!isAlive) {
              console.error('[Chromecast] La session média n\'est plus active');
            }
          });
        } else {
          console.warn('[Chromecast] addUpdateListener non disponible sur mediaSession');
        }
      } catch (loadError: any) {
        console.error('[Chromecast] Erreur loadMedia:', loadError);
        console.error('[Chromecast] URL qui a échoué:', finalMediaUrl);

        // Try one more time to get the media session before giving up
        const retrievedSession = session.getMediaSession();
        if (retrievedSession) {
          console.log('[Chromecast] ✅ Retrieved media session after error');
          mediaSessionRef.current = retrievedSession;
          return; // Don't throw error if we managed to get the session
        }

        throw new Error(`Erreur de chargement Chromecast: ${loadError.message || 'Format non supporté ou URL inaccessible'}`);
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
    playerState,
    cast,
    disconnect,
    showPicker,
    setActiveSubtitle: useCallback(async (activeSubtitleUrl: string | null, subtitles: Subtitle[]) => {
      // Aggressively try to find the session from the SDK directly
      let mediaSession = mediaSessionRef.current;

      if (!mediaSession) {
        console.log('[Chromecast] mediaSessionRef vide, tentative de récupération via SDK...');
        try {
          const context = window.cast?.framework?.CastContext?.getInstance();
          const session = context?.getCurrentSession();

          if (session) {
            console.log('[Chromecast] Session SDK trouvée');
            // Update ref for future use
            sessionRef.current = session;

            mediaSession = session.getMediaSession();
            if (mediaSession) {
              console.log('[Chromecast] Session média récupérée depuis la session SDK:', mediaSession.mediaSessionId);
              mediaSessionRef.current = mediaSession;
            } else {
              console.warn('[Chromecast] La session SDK existe mais getMediaSession() renvoie null');
            }
          } else {
            console.warn('[Chromecast] Pas de session SDK active (getCurrentSession est null)');
          }
        } catch (e) {
          console.error('[Chromecast] Erreur lors de l\'accès au contexte SDK:', e);
        }
      }

      if (!mediaSession || !window.chrome?.cast) {
        console.warn('[Chromecast] Pas de session média active pour changer les sous-titres');

        // Final fallback: Check remote player controller?
        // Sometimes mediaSession is managed by RemotePlayerController
        return;
      }

      try {
        const chromeCast = window.chrome.cast as any;
        const tracksInfoRequest = new chromeCast.media.EditTracksInfoRequest(
          activeSubtitleUrl
            ? [subtitles.findIndex(s => s.url === activeSubtitleUrl) + 1]
            : []
        );

        await new Promise((resolve, reject) => {
          mediaSession.editTracksInfo(
            tracksInfoRequest,
            resolve,
            reject
          );
        });

        console.log('[Chromecast] Sous-titres mis à jour:', activeSubtitleUrl ? 'Activé' : 'Désactivé');
      } catch (error) {
        console.error('[Chromecast] Erreur lors du changement de sous-titres:', error);
      }
    }, []),
    play: useCallback(() => {
      // Use RemotePlayerController if available (recommended)
      if (remotePlayerControllerRef.current && remotePlayerRef.current?.isPaused) {
        console.log('[Chromecast] Playing via RemotePlayerController');
        remotePlayerControllerRef.current.playOrPause();
      } else if (mediaSessionRef.current) {
        // Fallback to direct mediaSession
        console.log('[Chromecast] Playing via mediaSession fallback');
        mediaSessionRef.current.play();
      }
    }, []),
    pause: useCallback(() => {
      // Use RemotePlayerController if available (recommended)
      if (remotePlayerControllerRef.current && !remotePlayerRef.current?.isPaused) {
        console.log('[Chromecast] Pausing via RemotePlayerController');
        remotePlayerControllerRef.current.playOrPause();
      } else if (mediaSessionRef.current) {
        // Fallback to direct mediaSession
        console.log('[Chromecast] Pausing via mediaSession fallback');
        mediaSessionRef.current.pause(null);
      }
    }, []),
    seek: useCallback((time: number) => {
      // Use RemotePlayerController if available
      if (remotePlayerControllerRef.current && remotePlayerRef.current) {
        console.log('[Chromecast] Seeking via RemotePlayerController to:', time);
        remotePlayerRef.current.currentTime = time;
        remotePlayerControllerRef.current.seek();
      } else if (mediaSessionRef.current && window.chrome?.cast) {
        // Fallback to direct mediaSession
        console.log('[Chromecast] Seeking via mediaSession fallback to:', time);
        const request = new window.chrome.cast.media.SeekRequest();
        request.currentTime = time;
        mediaSessionRef.current.seek(request);
      }
    }, []),
    getMediaTime: useCallback(async () => {
      // Prefer RemotePlayer's currentTime (synced)
      if (remotePlayerRef.current?.isMediaLoaded) {
        return remotePlayerRef.current.currentTime || 0;
      }
      if (mediaSessionRef.current) {
        return mediaSessionRef.current.getEstimatedTime();
      }
      return 0;
    }, [])
  };
}
