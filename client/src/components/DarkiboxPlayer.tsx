import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { Button } from "@/components/ui/button";
import { Download, Play, Pause, Volume2, VolumeX } from "lucide-react";
import { useDeviceType } from "@/hooks/useDeviceType";

interface DarkiboxPlayerProps {
  m3u8Url: string;
  title?: string;
  onClose?: () => void;
  posterPath?: string | null;
  quality?: string;
  language?: string;
}

export default function DarkiboxPlayer({ 
  m3u8Url, 
  title = "Vidéo Darkibox",
  onClose,
  posterPath,
  quality,
  language
}: DarkiboxPlayerProps) {
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

  useEffect(() => {
    if (!videoRef.current || !m3u8Url) return;

    const video = videoRef.current;
    setIsLoading(true);
    setError(null);

    // Fonction pour extraire le lien de stream via l'API Darkibox
    const extractAndPlay = async () => {
      try {
        console.log('🎬 Extraction du lien Darkibox:', m3u8Url);
        
        const response = await fetch('/api/darkibox/scraper', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ m3u8Url }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Erreur lors de l\'extraction du lien Darkibox');
        }

        const data = await response.json();
        
        if (!data.success || !data.streamUrl) {
          throw new Error(data.error || 'Impossible d\'extraire le lien de streaming Darkibox');
        }

        console.log('✅ Lien stream Darkibox extrait:', data.streamUrl);

        // Construire l'URL du proxy Darkibox
        const streamUrlParsed = new URL(data.streamUrl);
        const proxyUrl = streamUrlParsed.pathname;
        
        console.log('📺 URL proxy Darkibox:', proxyUrl);

        // Configuration HLS pour Darkibox
        if (Hls.isSupported()) {
          const hls = new Hls({
            enableWorker: true,
            lowLatencyMode: false,
            maxBufferLength: 30,
            maxMaxBufferLength: 60,
            startLevel: -1,
            capLevelToPlayerSize: true,
          });
          
          hlsRef.current = hls;
          hls.loadSource(proxyUrl);
          hls.attachMedia(video);
          
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            console.log('📺 Manifest Darkibox chargé');
            setIsLoading(false);
            video.play().catch(err => {
              console.warn("Autoplay failed:", err);
              setIsLoading(false);
            });
          });
          
          hls.on(Hls.Events.ERROR, (_, data) => {
            console.error("Erreur HLS Darkibox:", data);
            if (data.fatal) {
              setError("Erreur de lecture Darkibox");
              setIsLoading(false);
            }
          });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = proxyUrl;
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
        console.error('❌ Erreur Darkibox:', error);
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
      }
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [m3u8Url]);

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
          <h3 className="text-lg font-semibold mb-4 text-red-600">Erreur Darkibox</h3>
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
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black bg-opacity-50 text-white">
        <div>
          <h2 className="text-lg font-semibold truncate">{title}</h2>
          {quality && (
            <p className="text-sm text-gray-300">
              {quality} • {language}
            </p>
          )}
        </div>
        {onClose && (
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white hover:bg-opacity-20"
          >
            ✕
          </Button>
        )}
      </div>

      {/* Video Container */}
      <div className="flex-1 relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <div className="text-white text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              <p>Chargement Darkibox...</p>
            </div>
          </div>
        )}
        
        <video
          ref={videoRef}
          className="w-full h-full object-contain"
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

