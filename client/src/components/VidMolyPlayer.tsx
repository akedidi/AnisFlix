import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { Button } from "@/components/ui/button";
import { Download, Play, Pause, Volume2, VolumeX, PictureInPicture, Maximize, Minimize } from "lucide-react";
import { useCapacitorDevice } from "@/hooks/useCapacitorDevice";
import { apiClient } from "@/lib/apiClient";
import { getVidMolyProxyUrl, debugUrlInfo } from "@/utils/urlUtils";
import { saveWatchProgress, getMediaProgress } from "@/lib/watchProgress";
import { ErrorPopup } from "@/components/ErrorPopup";
import { errorMessages } from "@/lib/errorMessages";
import { useKeyboardNavigation } from "@/hooks/useKeyboardNavigation";
import CustomVideoControls from "@/components/CustomVideoControls";
import { formatTime } from "@/lib/utils";
import type { MediaType } from "@shared/schema";
import { getSubtitles, Subtitle } from "@/lib/opensubtitles";
import { fetchAndConvertSubtitle } from "@/lib/subtitleUtils";

// Détection de plateforme native (iOS/Android)
const isNativePlatform = () => {
  return /iPad|iPhone|iPod|Android/i.test(navigator.userAgent) &&
    (window as any).webkit?.messageHandlers ||
    (window as any).Android;
};

// Extension des types pour webkitSetPresentationMode
declare global {
  interface HTMLVideoElement {
    webkitSetPresentationMode?: (mode: string) => void;
    webkitEnterFullscreen?: () => void;
    webkitExitFullscreen?: () => void;
  }
}

interface VidMolyPlayerProps {
  vidmolyUrl: string;
  title?: string;
  onClose?: () => void;
  posterPath?: string | null;
  mediaId?: number;
  mediaType?: MediaType;
  backdropPath?: string | null;
  seasonNumber?: number;
  episodeNumber?: number;
  imdbId?: string;
}

export default function VidMolyPlayer({
  vidmolyUrl,
  title = "Vidéo VidMoly",
  onClose,
  posterPath,
  mediaId,
  mediaType,
  backdropPath,
  seasonNumber,
  episodeNumber,
  imdbId
}: VidMolyPlayerProps) {
  const { isNative, platform } = useCapacitorDevice();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPictureInPicture, setIsPictureInPicture] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [finalMediaUrl, setFinalMediaUrl] = useState<string>("");
  const lastSaveTimeRef = useRef<number>(0);

  // Subtitles state
  const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
  const [selectedSubtitle, setSelectedSubtitle] = useState<string | null>(null);

  // Subtitle font size (80-150%)
  const [subtitleFontSize, setSubtitleFontSize] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('subtitleFontSize');
      return saved ? parseInt(saved, 10) : 100;
    }
    return 100;
  });

  // Save font size to localStorage
  const handleSubtitleFontSizeChange = (size: number) => {
    setSubtitleFontSize(size);
    localStorage.setItem('subtitleFontSize', String(size));
  };

  // Navigation au clavier pour contrôler la lecture vidéo
  useKeyboardNavigation({
    videoRef,
    isPlayerActive: true
  });

  // Fetch subtitles
  useEffect(() => {
    const fetchSubtitles = async () => {
      if (imdbId && mediaType) {
        console.log('🔍 [VIDMOLY PLAYER] Fetching subtitles for IMDB ID:', imdbId);
        const subs = await getSubtitles(
          imdbId,
          mediaType === 'tv' ? 'series' : 'movie',
          seasonNumber,
          episodeNumber
        );
        setSubtitles(subs);
      } else {
        setSubtitles([]);
      }
    };

    fetchSubtitles();
  }, [imdbId, mediaType, seasonNumber, episodeNumber]);

  // Handle subtitle selection
  const handleSubtitleSelect = (subtitleUrl: string | null) => {
    setSelectedSubtitle(subtitleUrl);

    if (videoRef.current) {
      const video = videoRef.current;
      const tracks = video.textTracks;

      // Disable all tracks first
      for (let i = 0; i < tracks.length; i++) {
        tracks[i].mode = 'hidden';
      }

      if (subtitleUrl) {
        const selectedSub = subtitles.find(s => s.url === subtitleUrl);
        if (selectedSub) {
          // Give a small delay for the DOM to update
          setTimeout(() => {
            for (let i = 0; i < tracks.length; i++) {
              const track = tracks[i];
              if (track.label === selectedSub.label && track.language === selectedSub.lang) {
                track.mode = 'showing';
                console.log(`✅ [VIDMOLY PLAYER] Enabled subtitle track: ${track.label} (${track.language})`);
                break;
              }
            }
          }, 100);
        }
      } else {
        console.log('🚫 [VIDMOLY PLAYER] Subtitles disabled');
      }
    }
  };

  // Fonction pour sauvegarder la progression
  const saveProgress = () => {
    if (!videoRef.current || !mediaId || !mediaType) return;

    const video = videoRef.current;
    const now = Date.now();

    // Sauvegarder au maximum toutes les 5 secondes
    if (now - lastSaveTimeRef.current < 5000) return;

    if (video.duration > 0 && video.currentTime > 0) {
      const progress = Math.round((video.currentTime / video.duration) * 100);

      saveWatchProgress({
        mediaId,
        mediaType,
        title: title || "Vidéo VidMoly",
        posterPath: posterPath || null,
        backdropPath: backdropPath || null,
        progress,
        currentTime: video.currentTime,
        duration: video.duration,
        seasonNumber,
        episodeNumber
      });

      lastSaveTimeRef.current = now;
    }
  };

  useEffect(() => {
    if (!videoRef.current || !vidmolyUrl) return;

    const video = videoRef.current;
    setIsLoading(true);
    setError(null);

    // Fonction pour extraire le lien m3u8 via l'API VidMoly (comme Vidzy)
    const extractAndPlay = async () => {
      try {
        console.log('🎬 Extraction du lien VidMoly:', vidmolyUrl);

        // Vérifier si l'URL est déjà un m3u8 (cas des liens VidMoly anime pré-extraits)
        if (vidmolyUrl.includes('.m3u8') || vidmolyUrl.includes('unified-streaming.com') || vidmolyUrl.includes('vmeas.cloud')) {
          console.log('🎬 URL déjà extraite (m3u8), utilisation avec proxy VidMoly:', vidmolyUrl);

          // Utiliser le proxy VidMoly pour éviter les problèmes CORS
          const { getVidMolyProxyUrl } = await import('../utils/urlUtils');
          const proxyUrl = getVidMolyProxyUrl(vidmolyUrl, 'https://vidmoly.net/');
          console.log('🔗 URL proxy VidMoly:', proxyUrl);

          // Stocker l'URL finale pour Chromecast
          setFinalMediaUrl(proxyUrl);

          if (Hls.isSupported()) {
            console.log('📺 Utilisation de HLS.js avec proxy VidMoly');
            const hls = new Hls();
            hls.loadSource(proxyUrl);
            hls.attachMedia(video);

            hls.on(Hls.Events.MANIFEST_PARSED, () => {
              console.log('✅ Manifeste HLS parsé avec succès via proxy');
              setIsLoading(false);
              video.play().catch(console.error);
            });

            hls.on(Hls.Events.ERROR, (event, data) => {
              console.error('❌ Erreur HLS via proxy:', data);
              if (data.fatal) {
                setError('Erreur de lecture HLS: ' + data.details);
                setIsLoading(false);
              }
            });
          } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            console.log('📺 Utilisation de la lecture native HLS avec proxy');
            video.src = proxyUrl;
            video.addEventListener('loadedmetadata', () => {
              console.log('✅ Métadonnées HLS chargées via proxy');
              setIsLoading(false);
              video.play().catch(console.error);
            });
          } else {
            throw new Error('HLS non supporté sur ce navigateur');
          }
          return;
        }

        console.log('🎬 Appel API vidmoly...');

        const data = await apiClient.extractVidMoly(vidmolyUrl);

        console.log('🎬 Données JSON reçues de vidmoly:', data);

        if (!data.success || !data.m3u8Url) {
          throw new Error(errorMessages.players.vidmoly.message);
        }

        console.log('✅ Lien m3u8 VidMoly extrait:', data.m3u8Url);

        // VidMoly URLs use comma-separated quality format like "_,l,n,.urlset"
        // Do NOT remove commas - they are required for proper streaming
        let cleanedUrl = data.m3u8Url;


        // Utiliser le proxy pour les vrais liens VidMoly (qui sont protégés)
        // ou directement pour les liens de démonstration
        let finalUrl;

        // Déterminer si c'est un vrai lien VidMoly qui nécessite un proxy
        const isRealVidMolyLink = data.method === 'extracted_real' ||
          data.method === 'direct_master_m3u8' ||
          data.method?.startsWith('direct_pattern_') ||
          (cleanedUrl && (cleanedUrl.includes('vmwesa.online') || cleanedUrl.includes('vmeas.cloud')));

        console.log('🔍 Méthode d\'extraction:', data.method);
        console.log('🔍 Lien m3u8 nettoyé:', cleanedUrl);
        console.log('🔍 Est un vrai lien VidMoly:', isRealVidMolyLink);

        if (isRealVidMolyLink) {
          // Pour les vrais liens VidMoly, utiliser le proxy car ils sont protégés
          finalUrl = getVidMolyProxyUrl(cleanedUrl, vidmolyUrl);
          console.log('📺 Utilisation du proxy pour le vrai lien VidMoly:', finalUrl);

          // Debug des URLs pour diagnostic
          debugUrlInfo();
        } else {
          // Pour les liens de fallback/démo, utiliser directement
          finalUrl = cleanedUrl;
          console.log('📺 Utilisation directe du lien de démo:', finalUrl);
        }

        // Stocker l'URL finale pour Chromecast
        setFinalMediaUrl(finalUrl);

        // Configuration HLS avec gestion iOS native
        if (isNative) {
          // Sur iOS natif, utiliser le support HLS natif
          console.log('📱 Mode iOS natif - Support HLS natif');
          if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = finalUrl;
            video.addEventListener('loadedmetadata', () => {
              setIsLoading(false);
              video.play().catch(err => {
                console.warn("Autoplay failed iOS:", err);
                setIsLoading(false);
              });
            });
          } else {
            console.error('❌ HLS natif non supporté sur iOS');
            setError('Format HLS non supporté sur iOS');
            setIsLoading(false);
          }
        } else if (Hls.isSupported()) {
          // Sur web, utiliser HLS.js
          console.log('🌐 Mode web - HLS.js supporté');
          const hls = new Hls({
            enableWorker: true,
            lowLatencyMode: false,
            // Configuration optimisée pour VidMoly
            maxBufferLength: 60, // Buffer max de 60 secondes
            maxMaxBufferLength: 120, // Buffer max absolu de 2 minutes
            maxBufferSize: 60 * 1000 * 1000, // 60MB max
            maxBufferHole: 0.1, // Tolérance aux trous de buffer
            highBufferWatchdogPeriod: 2, // Surveillance du buffer haute qualité
            nudgeOffset: 0.1, // Ajustement automatique des décalages
            nudgeMaxRetry: 3, // Max 3 tentatives d'ajustement
            maxFragLookUpTolerance: 0.25, // Tolérance de recherche de fragments
            liveSyncDurationCount: 3, // Sync live
            liveMaxLatencyDurationCount: 10, // Latence max pour live
            // Configuration des niveaux de qualité
            startLevel: -1, // Auto-détection du niveau optimal
            capLevelToPlayerSize: true, // Adapter la qualité à la taille du player
            // Gestion des erreurs de réseau
            fragLoadingTimeOut: 20000, // Timeout de 20s pour les fragments
            manifestLoadingTimeOut: 10000, // Timeout de 10s pour le manifeste
            levelLoadingTimeOut: 10000, // Timeout de 10s pour les niveaux
            // Retry automatique
            fragLoadingMaxRetry: 3,
            manifestLoadingMaxRetry: 3,
            levelLoadingMaxRetry: 3,
            // Configuration du buffer
            backBufferLength: 30, // Garder 30s en arrière
            // Désactiver certaines optimisations problématiques
            enableSoftwareAES: true, // Décryptage logiciel si nécessaire
          });
          hlsRef.current = hls;

          console.log('🎬 Chargement de la source:', finalUrl);
          hls.loadSource(finalUrl);
          hls.attachMedia(video);

          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            console.log('📺 Manifest VidMoly chargé avec succès');
            setIsLoading(false);
            video.play().catch(err => {
              console.warn("Autoplay failed:", err);
              setIsLoading(false);
            });
          });

          // Surveillance du buffer pour détecter les problèmes
          hls.on(Hls.Events.ERROR, (event, data) => {
            if (data.details === 'bufferStalledError') {
              console.warn('⚠️ Buffer stalled - tentative de récupération...');
              if (hls.media && hls.media.readyState >= 2) {
                // Forcer un petit saut pour débloquer
                const currentTime = hls.media.currentTime;
                hls.media.currentTime = currentTime + 0.1;
              }
            }
          });

          hls.on(Hls.Events.BUFFER_APPENDED, () => {
            console.log('📊 Buffer appended - santé du streaming OK');
          });

          hls.on(Hls.Events.FRAG_LOADED, () => {
            console.log('📦 Fragment chargé avec succès');
          });

          hls.on(Hls.Events.ERROR, (_, data) => {
            console.error("Erreur HLS VidMoly:", data);

            // Gestion spécifique des erreurs de buffer
            if (data.details === 'bufferStalledError' || data.details === 'bufferSeekOverHole') {
              console.warn('⚠️ Problème de buffer détecté, tentative de récupération...');

              // Essayer de récupérer en vidant le buffer et en rechargeant
              if (hls.media) {
                hls.media.currentTime = hls.media.currentTime + 0.1; // Petit saut pour éviter le trou
              }

              // Ne pas traiter comme fatal, laisser HLS.js gérer
              return;
            }

            if (data.fatal) {
              console.error('❌ Erreur fatale HLS:', data);

              // Tentative de récupération pour certaines erreurs
              if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
                console.log('🔄 Tentative de récupération réseau...');
                hls.startLoad();
                return;
              }

              if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
                console.log('🔄 Tentative de récupération média...');
                hls.recoverMediaError();
                return;
              }

              setError(`Erreur de lecture VidMoly: ${data.details}`);
              setIsLoading(false);
            }
          });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          // Support natif HLS (Safari web)
          console.log('🍎 Support HLS natif détecté (Safari web)');
          video.src = finalUrl;
          video.addEventListener('loadedmetadata', () => {
            setIsLoading(false);
            video.play().catch(err => {
              console.warn("Autoplay failed:", err);
              setIsLoading(false);
            });
          });
        } else {
          setError(errorMessages.players.vidmoly.hlsNotSupported);
          setIsLoading(false);
        }

      } catch (error) {
        console.error('❌ Erreur VidMoly:', error);
        setError(error instanceof Error ? error.message : 'Erreur inconnue');
        setIsLoading(false);
      }
    };

    extractAndPlay();

    // Event listeners pour les contrôles
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleTimeUpdate = () => {
      if (video.duration) {
        setCurrentTime(video.currentTime);
        setDuration(video.duration);
        setProgress((video.currentTime / video.duration) * 100);

        // Sauvegarder la progression
        saveProgress();
      }
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('enterpictureinpicture', () => setIsPictureInPicture(true));
    video.addEventListener('leavepictureinpicture', () => setIsPictureInPicture(false));

    const handleFullscreenChange = () => {
      const isFs = !!(document.fullscreenElement || (document as any).webkitFullscreenElement);
      setIsFullscreen(isFs);
    };
    const handleWebkitBeginFullscreen = () => setIsFullscreen(true);
    const handleWebkitEndFullscreen = () => setIsFullscreen(false);

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange as any);
    video.addEventListener('webkitbeginfullscreen', handleWebkitBeginFullscreen as any);
    video.addEventListener('webkitendfullscreen', handleWebkitEndFullscreen as any);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('enterpictureinpicture', () => setIsPictureInPicture(true));
      video.removeEventListener('leavepictureinpicture', () => setIsPictureInPicture(false));
      video.removeEventListener('webkitbeginfullscreen', handleWebkitBeginFullscreen as any);
      video.removeEventListener('webkitendfullscreen', handleWebkitEndFullscreen as any);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange as any);

      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [vidmolyUrl]);

  // Restore saved watch progress
  useEffect(() => {
    if (!videoRef.current || !mediaId || !mediaType) return;

    const video = videoRef.current;
    const savedProgress = getMediaProgress(mediaId, mediaType, seasonNumber, episodeNumber);

    if (savedProgress && savedProgress.currentTime > 0) {
      console.log(`🔄 [VIDMOLY PLAYER] Found saved progress: ${savedProgress.currentTime}s`);

      const handleLoadedMetadata = () => {
        if (video.duration > 0 && savedProgress.currentTime < video.duration - 5) {
          console.log(`✅ [VIDMOLY PLAYER] Restoring position to ${savedProgress.currentTime}s`);
          video.currentTime = savedProgress.currentTime;
        }
      };

      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      return () => video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    }
  }, [mediaId, mediaType, seasonNumber, episodeNumber]);


  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const togglePictureInPicture = async () => {
    if (!videoRef.current) return;

    try {
      const video = videoRef.current;

      if (isPictureInPicture) {
        // Sortir du mode PiP
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture?.();
        }
      } else {
        // Entrer en mode PiP
        if (isNativePlatform()) {
          // Sur iOS natif, utiliser webkitSetPresentationMode (méthode native)
          if (video.webkitSetPresentationMode) {
            video.webkitSetPresentationMode('picture-in-picture');
          } else if (video.requestPictureInPicture) {
            await video.requestPictureInPicture();
          }
        } else {
          // Sur le web, utiliser l'API standard
          if (!document.pictureInPictureEnabled || !video.requestPictureInPicture) {
            console.warn("Picture-in-Picture n'est pas supporté par ce navigateur");
            return;
          }
          await video.requestPictureInPicture();
        }
      }
    } catch (error) {
      console.error("Error toggling Picture-in-Picture:", error);
      // Ne pas afficher d'alerte pour éviter de spammer l'utilisateur
      // L'erreur est déjà loggée dans la console
    }
  };

  const handleSeek = (newTime: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
  };

  const toggleFullscreen = () => {
    const video = videoRef.current;
    const container = containerRef.current;
    if (!video) return;

    if (!isFullscreen) {
      // iOS Safari special case: use webkitEnterFullscreen on the video element
      const isIOSSafari = /iPhone|iPad|iPod/.test(navigator.userAgent) && !!(window as any).webkit;
      if (isIOSSafari && typeof video.webkitEnterFullscreen === 'function') {
        try {
          video.webkitEnterFullscreen();
          return;
        } catch (e) {
          // Fallback to standard API below
        }
      }

      // Prefer container fullscreen to include overlays
      const target: any = container || video;
      const request = (target.requestFullscreen
        || target.webkitRequestFullscreen
        || target.mozRequestFullScreen
        || target.msRequestFullscreen);
      request?.call(target);
    } else {
      const exit = (document.exitFullscreen
        || (document as any).webkitExitFullscreen
        || (document as any).mozCancelFullScreen
        || (document as any).msExitFullscreen);
      exit?.call(document);
    }
  };

  // Removed local formatTime in favor of imported one

  if (error) {
    return (
      <ErrorPopup
        title={errorMessages.players.vidmoly.title}
        message={error}
        onClose={() => {
          setError(null);
          setIsLoading(false);
          onClose?.();
        }}
      />
    );
  }

  return (
    <div className="w-full bg-card rounded-lg overflow-hidden shadow-xl">
      {/* Video Container */}
      <div className={`relative subtitle-size-${subtitleFontSize}`} ref={containerRef}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
            <div className="text-white text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              <p>Chargement VidMoly...</p>
            </div>
          </div>
        )}

        <video
          ref={videoRef}
          className="w-full aspect-video bg-black object-contain"
          poster={posterPath ? `https://image.tmdb.org/t/p/w1280${posterPath}` : undefined}
          controls={false}
          playsInline
        >
          {subtitles.map((sub) => (
            <track
              key={sub.id}
              kind="subtitles"
              label={sub.label}
              srcLang={sub.lang}
              src={`/api/media-proxy?type=subtitle&url=${encodeURIComponent(sub.url)}`}
              default={false}
            />
          ))}
        </video>

        {/* Contrôles personnalisés pour web */}
        {!isNative && (
          <CustomVideoControls
            videoRef={videoRef}
            isPlaying={isPlaying}
            isMuted={isMuted}
            isFullscreen={isFullscreen}
            isPictureInPicture={isPictureInPicture}
            currentTime={currentTime}
            duration={duration}
            progress={progress}
            mediaUrl={finalMediaUrl}
            title={title}
            posterUrl={posterPath ? `https://image.tmdb.org/t/p/w1280${posterPath}` : undefined}
            onPlayPause={togglePlayPause}
            onMute={toggleMute}
            onFullscreen={toggleFullscreen}
            onPictureInPicture={togglePictureInPicture}
            onSeek={handleSeek}
            formatTime={formatTime}
            subtitles={subtitles}
            selectedSubtitle={selectedSubtitle}
            onSubtitleSelect={handleSubtitleSelect}
            subtitleFontSize={subtitleFontSize}
            onSubtitleFontSizeChange={handleSubtitleFontSizeChange}
          />
        )}

        {/* Contrôles personnalisés pour mobile */}
        {isNative && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4">
            {/* Contrôles personnalisés pour mobile */}
            <CustomVideoControls
              videoRef={videoRef}
              isPlaying={isPlaying}
              isMuted={isMuted}
              isFullscreen={isFullscreen}
              isPictureInPicture={isPictureInPicture}
              currentTime={currentTime}
              duration={duration}
              progress={progress}
              mediaUrl={finalMediaUrl}
              title={title}
              posterUrl={posterPath ? `https://image.tmdb.org/t/p/w1280${posterPath}` : undefined}
              onPlayPause={togglePlayPause}
              onMute={toggleMute}
              onFullscreen={toggleFullscreen}
              onPictureInPicture={togglePictureInPicture}
              onSeek={handleSeek}
              formatTime={formatTime}
              subtitles={subtitles}
              selectedSubtitle={selectedSubtitle}
              onSubtitleSelect={handleSubtitleSelect}
              subtitleFontSize={subtitleFontSize}
              onSubtitleFontSizeChange={handleSubtitleFontSizeChange}
            />
          </div>
        )}
      </div>
    </div>
  );
}
