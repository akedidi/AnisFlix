import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { Button } from "@/components/ui/button";
import { Download, Play, Pause, Volume2, VolumeX, PictureInPicture } from "lucide-react";
import { useDeviceType } from "@/hooks/useDeviceType";
import { saveWatchProgress } from "@/lib/watchProgress";
import type { MediaType } from "@shared/schema";

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
  episodeNumber
}: VidMolyPlayerProps) {
  const { isNative } = useDeviceType();
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPictureInPicture, setIsPictureInPicture] = useState(false);
  const lastSaveTimeRef = useRef<number>(0);

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
        console.log('🎬 Appel API vidmoly-test...');
        
        const response = await fetch('/api/vidmoly-test', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url: vidmolyUrl }),
        });

        console.log('🎬 Réponse API vidmoly-test:', response.status, response.ok);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('❌ Erreur API vidmoly-test:', errorData);
          throw new Error(errorData.error || 'Erreur lors de l\'extraction du lien VidMoly');
        }

        const data = await response.json();
        console.log('🎬 Données reçues de vidmoly-test:', data);
        
        if (!data.success || !data.m3u8Url) {
          throw new Error(data.error || 'Impossible d\'extraire le lien de streaming VidMoly');
        }

        console.log('✅ Lien m3u8 VidMoly extrait:', data.m3u8Url);

        // Utiliser le proxy pour les vrais liens VidMoly (qui sont protégés)
        // ou directement pour les liens de démonstration
        let finalUrl;
        
        // Déterminer si c'est un vrai lien VidMoly qui nécessite un proxy
        const isRealVidMolyLink = data.method === 'extracted_real' || 
                                 data.method === 'direct_master_m3u8' || 
                                 data.method?.startsWith('direct_pattern_') ||
                                 (data.m3u8Url && data.m3u8Url.includes('vmwesa.online'));
        
        console.log('🔍 Méthode d\'extraction:', data.method);
        console.log('🔍 Lien m3u8:', data.m3u8Url);
        console.log('🔍 Est un vrai lien VidMoly:', isRealVidMolyLink);
        
        if (isRealVidMolyLink) {
          // Pour les vrais liens VidMoly, utiliser le proxy car ils sont protégés
          finalUrl = `${window.location.origin}/api/vidmoly-proxy?url=${encodeURIComponent(data.m3u8Url)}&referer=${encodeURIComponent(vidmolyUrl)}`;
          console.log('📺 Utilisation du proxy pour le vrai lien VidMoly:', finalUrl);
        } else {
          // Pour les liens de fallback/démo, utiliser directement
          finalUrl = data.m3u8Url;
          console.log('📺 Utilisation directe du lien de démo:', finalUrl);
        }

        // Configuration HLS simple comme VideoPlayer
        if (Hls.isSupported()) {
          console.log('🎬 HLS supporté, création de l\'instance HLS');
          const hls = new Hls({
            enableWorker: true,
            lowLatencyMode: false,
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
          
          hls.on(Hls.Events.ERROR, (_, data) => {
            console.error("Erreur HLS VidMoly:", data);
            if (data.fatal) {
              setError(`Erreur de lecture VidMoly: ${data.details}`);
              setIsLoading(false);
            }
          });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = finalUrl;
          video.addEventListener('loadedmetadata', () => {
            setIsLoading(false);
            video.play().catch(err => {
              console.warn("Autoplay failed:", err);
              setIsLoading(false);
            });
          });
        } else {
          setError("Votre navigateur ne supporte pas HLS");
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

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('enterpictureinpicture', () => setIsPictureInPicture(true));
      video.removeEventListener('leavepictureinpicture', () => setIsPictureInPicture(false));
      
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [vidmolyUrl]);

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
      if (isPictureInPicture) {
        await document.exitPictureInPicture();
      } else {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (error) {
      console.error("Error toggling Picture-in-Picture:", error);
      alert("Impossible d'activer le mode Picture-in-Picture");
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (videoRef.current) {
      const newTime = (parseFloat(e.target.value) / 100) * duration;
      videoRef.current.currentTime = newTime;
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-md mx-4">
          <h3 className="text-lg font-semibold mb-4 text-red-600">Erreur VidMoly</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-4">{error}</p>
          <div className="flex gap-2">
            <Button onClick={() => window.location.reload()} variant="outline">
              Réessayer
            </Button>
            {onClose && (
              <Button onClick={onClose} variant="default">
                Fermer
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-card rounded-lg overflow-hidden shadow-xl">
      {/* Video Container */}
      <div className="relative">
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
          controls={!isNative}
          playsInline
        />

        {/* Contrôles personnalisés pour mobile */}
        {isNative && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4">
            {/* Progress Bar */}
            <div className="mb-4">
              <input
                type="range"
                min="0"
                max="100"
                value={progress}
                onChange={handleSeek}
                className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${progress}%, #4b5563 ${progress}%, #4b5563 100%)`
                }}
              />
              <div className="flex justify-between text-white text-sm mt-1">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Contrôles */}
            <div className="flex items-center justify-center gap-4">
              <Button
                onClick={togglePlayPause}
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white hover:bg-opacity-20"
              >
                {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
              </Button>
              
              <Button
                onClick={toggleMute}
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white hover:bg-opacity-20"
              >
                {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
              </Button>
              
              <Button
                onClick={togglePictureInPicture}
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white hover:bg-opacity-20"
                title={isPictureInPicture ? "Quitter le mode Picture-in-Picture" : "Mode Picture-in-Picture"}
              >
                <PictureInPicture className="w-6 h-6" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
