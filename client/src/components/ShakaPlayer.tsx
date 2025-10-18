import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Volume2, VolumeX, Maximize, Minimize } from "lucide-react";

interface ShakaPlayerProps {
  url: string;
  onClose?: () => void;
  title?: string;
}

declare global {
  interface Window {
    shaka: any;
  }
}

export default function ShakaPlayer({ url, onClose, title }: ShakaPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

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
            setError("Impossible de charger Shaka Player");
            setIsLoading(false);
          };
          document.head.appendChild(script);
        } else {
          setupPlayer();
        }
      } catch (err) {
        console.error("Erreur d'initialisation:", err);
        setError("Erreur d'initialisation du lecteur");
        setIsLoading(false);
      }
    };

    const setupPlayer = async () => {
      if (!videoRef.current || !window.shaka) return;

      try {
        // Installer les polyfills pour la compatibilité
        window.shaka.polyfill.installAll();

        if (!window.shaka.Player.isBrowserSupported()) {
          setError("Navigateur non supporté par Shaka Player");
          setIsLoading(false);
          return;
        }

        // Créer le player Shaka
        const player = new window.shaka.Player(videoRef.current);
        playerRef.current = player;

        // Gérer les erreurs
        player.addEventListener('error', (event: any) => {
          console.error('Erreur Shaka Player:', event.detail);
          setError(`Erreur Shaka: ${event.detail.message || 'Erreur inconnue'}`);
          setIsLoading(false);
        });

        // Charger le flux
        await player.load(url);
        console.log("Flux chargé avec succès par Shaka Player");
        setIsLoading(false);

        // Démarrer la lecture
        if (videoRef.current) {
          videoRef.current.play().catch((err) => {
            console.error("Erreur de lecture:", err);
            setError("Impossible de démarrer la lecture");
            setIsLoading(false);
          });
        }
      } catch (err) {
        console.error("Erreur de chargement du flux:", err);
        setError("Impossible de charger le flux");
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

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center">
      <div className="relative w-full h-full max-w-7xl max-h-[90vh] bg-black rounded-lg overflow-hidden">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-4">
          <div className="flex items-center justify-between">
            <div className="text-white">
              {title && <h3 className="text-lg font-semibold">{title}</h3>}
              <p className="text-sm text-gray-300">Shaka Player (HLS & DASH)</p>
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
                <p className="text-sm text-gray-300 mt-2">Shaka Player</p>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center z-20">
              <div className="text-center text-white">
                <div className="text-red-500 text-6xl mb-4">⚠️</div>
                <h3 className="text-xl font-semibold mb-2">Erreur de lecture</h3>
                <p className="text-gray-300 mb-4">{error}</p>
                <Button onClick={onClose} variant="outline" className="text-white border-white hover:bg-white/20">
                  Fermer
                </Button>
              </div>
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
