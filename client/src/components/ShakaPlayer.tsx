import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Volume2, VolumeX, Maximize, Minimize, PictureInPicture } from "lucide-react";
import { ErrorPopup } from "@/components/ErrorPopup";
import { errorMessages } from "@/lib/errorMessages";
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
  }
}

interface ShakaPlayerProps {
  url: string;
  onClose?: () => void;
  title?: string;
  embedded?: boolean; // Nouveau prop pour l'affichage dans la carte
}

declare global {
  interface Window {
    shaka: any;
  }
}

export default function ShakaPlayer({ url, onClose, title, embedded = false }: ShakaPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPictureInPicture, setIsPictureInPicture] = useState(false);

  useEffect(() => {
    const initPlayer = async () => {
      if (!videoRef.current) return;

      try {
        setIsLoading(true);
        setError(null);

        // Charger Shaka Player si pas déjà chargé
        if (!window.shaka) {
          const script = document.createElement('script');
          script.src = 'https://ajax.googleapis.com/ajax/libs/shaka-player/4.3.4/shaka-player.compiled.js';
          script.onload = () => {
            setupPlayer();
          };
          script.onerror = () => {
            setError(errorMessages.players.generic.message);
            setIsLoading(false);
          };
          document.head.appendChild(script);
        } else {
          setupPlayer();
        }
      } catch (err) {
        console.error("Erreur d'initialisation:", err);
        setError(errorMessages.players.generic.message);
        setIsLoading(false);
      }
    };

    const setupPlayer = async () => {
      if (!videoRef.current || !window.shaka) return;

      try {
        // Installer les polyfills pour la compatibilité
        window.shaka.polyfill.installAll();

        if (!window.shaka.Player.isBrowserSupported()) {
          setError(errorMessages.players.generic.hlsNotSupported);
          setIsLoading(false);
          return;
        }

        // Créer le player Shaka (approche simplifiée)
        const player = new window.shaka.Player(videoRef.current);
        playerRef.current = player;

        // Intercepter les requêtes pour les segments vidéo/audio
        player.getNetworkingEngine().registerRequestFilter((type: any, request: any) => {
          console.log(`🔍 [SHAKA SEGMENT] Type: ${type}, URL: ${request.uris[0]}`);
          
          // Proxifier les segments vidéo/audio
          if (request.uris[0] && (
            request.uris[0].includes('.mp4') ||
            request.uris[0].includes('.ts') ||
            request.uris[0].includes('tf1hd-') ||
            request.uris[0].includes('hd1-') ||
            request.uris[0].includes('nt1-') ||
            request.uris[0].includes('france3hd-') ||
            request.uris[0].includes('m6hd-') ||
            request.uris[0].includes('w9-') ||
            request.uris[0].includes('gulli-')
          )) {
            const originalUrl = request.uris[0];
            console.log(`🔍 [SHAKA SEGMENT] Segment détecté: ${originalUrl}`);
            
            // Reconstruire l'URL complète vers le serveur d'origine
            let fullUrl = originalUrl;
            if (originalUrl.includes('tf1hd-')) {
              fullUrl = `https://viamotionhsi.netplus.ch/live/eds/tf1hd/browser-HLS8/${originalUrl}`;
            } else if (originalUrl.includes('hd1-')) {
              fullUrl = `https://viamotionhsi.netplus.ch/live/eds/hd1/browser-HLS8/${originalUrl}`;
            } else if (originalUrl.includes('nt1-')) {
              fullUrl = `https://viamotionhsi.netplus.ch/live/eds/nt1/browser-HLS8/${originalUrl}`;
            } else if (originalUrl.includes('france3hd-')) {
              fullUrl = `https://viamotionhsi.netplus.ch/live/eds/france3hd/browser-HLS8/${originalUrl}`;
            } else if (originalUrl.includes('m6hd-')) {
              fullUrl = `https://viamotionhsi.netplus.ch/live/eds/m6hd/browser-HLS8/${originalUrl}`;
            } else if (originalUrl.includes('w9-')) {
              fullUrl = `https://viamotionhsi.netplus.ch/live/eds/w9/browser-HLS8/${originalUrl}`;
            } else if (originalUrl.includes('gulli-')) {
              fullUrl = `https://viamotionhsi.netplus.ch/live/eds/gulli/browser-HLS8/${originalUrl}`;
            }
            
            // Proxifier l'URL complète
            const proxifiedUrl = `/api/tv?url=${encodeURIComponent(fullUrl)}`;
            console.log(`🔍 [SHAKA SEGMENT] URL proxifiée: ${proxifiedUrl}`);
            request.uris[0] = proxifiedUrl;
          }
        });

        // Gérer les erreurs
        player.addEventListener('error', (event: any) => {
          console.error('Erreur Shaka Player:', event.detail);
          console.error('Erreur de chargement du flux:', event.detail);
          
          // Logs détaillés pour debugger l'erreur 3016
          if (event.detail?.code === 3016) {
            console.error('🔍 [DEBUG 3016] Erreur de réseau détectée:');
            console.error('🔍 [DEBUG 3016] URL demandée:', url);
            console.error('🔍 [DEBUG 3016] Détails complets:', event.detail);
            console.error('🔍 [DEBUG 3016] Data:', event.detail.data);
            console.error('🔍 [DEBUG 3016] Severity:', event.detail.severity);
            console.error('🔍 [DEBUG 3016] Category:', event.detail.category);
          }
          
          setError(`${errorMessages.players.generic.title}: ${event.detail.message || 'Erreur inconnue'}`);
          setIsLoading(false);
        });

        // Gérer Picture-in-Picture
        videoRef.current.addEventListener('enterpictureinpicture', () => setIsPictureInPicture(true));
        videoRef.current.addEventListener('leavepictureinpicture', () => setIsPictureInPicture(false));

        // Charger le flux avec proxification si nécessaire
        console.log('🔍 [DEBUG] URL Shaka originale:', url);
        
        // Déterminer si l'URL doit être proxifiée
        let finalUrl = url;
        if (url.includes('viamotionhsi.netplus.ch') || 
            url.includes('cachehsi') || 
            url.includes('tok_') ||
            url.includes('simulcast-p.ftven.fr') ||
            url.includes('artesimulcast.akamaized.net')) {
          finalUrl = `/api/tv?url=${encodeURIComponent(url)}`;
          console.log('🔍 [DEBUG] URL proxifiée pour Shaka:', finalUrl);
        }
        
        // Shaka détermine le format (HLS ou DASH) tout seul !
        await player.load(finalUrl);
        console.log("Flux chargé avec succès par Shaka Player");
        setIsLoading(false);

        // Démarrer la lecture
        if (videoRef.current) {
          videoRef.current.play().catch((err) => {
            console.error("Erreur de lecture:", err);
            setError(errorMessages.players.generic.message);
            setIsLoading(false);
          });
        }
      } catch (err) {
        console.error("Erreur de chargement du flux:", err);
        setError(errorMessages.players.generic.message);
        setIsLoading(false);
      }
    };

    initPlayer();

    // Cleanup
    return () => {
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (err) {
          console.error("Erreur lors de la destruction du player:", err);
        }
        playerRef.current = null;
      }
    };
  }, [url]);

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      videoRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
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

  // Version pour l'affichage dans la carte (embedded)
  if (embedded) {
    return (
      <div className="relative w-full h-full bg-black">
        {/* Video Container */}
        <div className="relative w-full h-full">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center z-20">
              <div className="text-white text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                <p className="text-sm">Chargement...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center z-20">
        <ErrorPopup
          title={errorMessages.players.generic.title}
          message={error}
          onClose={() => {
            setError(null);
            onClose?.();
          }}
        />
            </div>
          )}

          <video
            ref={videoRef}
            className="w-full h-full object-contain"
            controls
            autoPlay
            muted={isMuted}
            data-testid="shaka-video-player-embedded"
          />
        </div>
      </div>
    );
  }

  // Version pour l'affichage plein écran
  return (
    <div 
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => {
        // Fermer si on clique sur l'overlay (pas sur le player)
        if (e.target === e.currentTarget && onClose) {
          onClose();
        }
      }}
    >
      <div 
        className="relative w-full max-w-6xl max-h-[80vh] bg-black rounded-lg overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-4">
          <div className="flex items-center justify-between">
            <div className="text-white">
              {title && <h3 className="text-lg font-semibold">{title}</h3>}
              <p className="text-xs text-gray-300 mt-1">Cliquez en dehors pour fermer</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleMute}
                className="text-white hover:bg-white/20"
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleFullscreen}
                className="text-white hover:bg-white/20"
              >
                {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={togglePictureInPicture}
                className="text-white hover:bg-white/20"
                title={isPictureInPicture ? "Quitter le mode Picture-in-Picture" : "Mode Picture-in-Picture"}
              >
                <PictureInPicture className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-white hover:bg-white/20"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Video Container */}
        <div className="relative w-full h-full">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center z-20">
              <div className="text-white text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                <p className="text-lg">Chargement du flux...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center z-20">
        <ErrorPopup
          title={errorMessages.players.generic.title}
          message={error}
          onClose={() => {
            setError(null);
            onClose?.();
          }}
        />
            </div>
          )}

          <video
            ref={videoRef}
            className="w-full h-full object-contain"
            controls
            autoPlay
            muted={isMuted}
            data-testid="shaka-video-player"
          />
        </div>
      </div>
    </div>
  );
}
