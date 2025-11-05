import { useEffect, useRef, useState } from "react";
import { Capacitor } from '@capacitor/core';
import { Button } from "@/components/ui/button";
import { Download, Play, Pause, Volume2, VolumeX, PictureInPicture, X } from "lucide-react";
import { saveWatchProgress } from "@/lib/watchProgress";
import ChromecastButton from "@/components/ChromecastButton";
import type { MediaType } from "@shared/schema";

interface CapacitorVideoPlayerProps {
  src: string;
  type?: "m3u8" | "mp4";
  title?: string;
  onClose?: () => void;
  mediaId?: number;
  mediaType?: MediaType;
  posterPath?: string;
  backdropPath?: string;
  seasonNumber?: number;
  episodeNumber?: number;
}

export default function CapacitorVideoPlayer({
  src,
  type = "auto",
  title = "Vidéo",
  onClose,
  mediaId,
  mediaType,
  posterPath,
  backdropPath,
  seasonNumber,
  episodeNumber
}: CapacitorVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPictureInPicture, setIsPictureInPicture] = useState(false);
  const [finalMediaUrl, setFinalMediaUrl] = useState<string>("");
  const lastSaveTimeRef = useRef<number>(0);

  const isNative = Capacitor.isNativePlatform();
  const platform = Capacitor.getPlatform();

  useEffect(() => {
    if (!videoRef.current || !src) return;

    const video = videoRef.current;
    setIsLoading(true);
    setError(null);

    // Détection automatique du type de source
    const detectedType = type === "auto" 
      ? (src.includes(".m3u8") || src.includes("m3u8") ? "m3u8" : "mp4")
      : type;

    // Stocker l'URL finale pour Chromecast
    setFinalMediaUrl(src);

    if (detectedType === "m3u8") {
      // Sur iOS natif, Safari gère nativement HLS
      if (isNative && platform === 'ios') {
        video.src = src;
        video.load();
      } else {
        // Sur web et Android, utiliser HLS.js si disponible
        if (typeof window !== 'undefined' && (window as any).Hls) {
          const Hls = (window as any).Hls;
          if (Hls.isSupported()) {
            const hls = new Hls({
              enableWorker: true,
              lowLatencyMode: false,
            });
            hls.loadSource(src);
            hls.attachMedia(video);
            
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
              setIsLoading(false);
              video.play().catch(err => console.warn("Autoplay failed:", err));
            });
            
            hls.on(Hls.Events.ERROR, (_, data) => {
              console.error("HLS error:", data);
              if (data.fatal) {
                setError("Erreur de lecture HLS");
                setIsLoading(false);
              }
            });
          } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = src;
            video.load();
          }
        } else {
          // Fallback pour les navigateurs sans HLS.js
          video.src = src;
          video.load();
        }
      }
    } else {
      // Lecture MP4 directe
      video.src = src;
      video.load();
    }

    // Event listeners
    const handleLoadedMetadata = () => {
      setIsLoading(false);
      setDuration(video.duration);
      video.play().catch(err => console.warn("Autoplay failed:", err));
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      
      // Sauvegarder le progrès toutes les 10 secondes
      const now = Date.now();
      if (now - lastSaveTimeRef.current > 10000 && mediaId && mediaType) {
        saveWatchProgress({
          mediaId,
          mediaType,
          currentTime: video.currentTime,
          duration: video.duration,
          seasonNumber,
          episodeNumber
        });
        lastSaveTimeRef.current = now;
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleError = () => {
      setError("Erreur de lecture vidéo");
      setIsLoading(false);
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('error', handleError);
    };
  }, [src, type, mediaId, mediaType, seasonNumber, episodeNumber, isNative, platform]);

  const togglePlayPause = () => {
    if (!videoRef.current) return;
    
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const togglePictureInPicture = async () => {
    if (!videoRef.current) return;

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsPictureInPicture(false);
      } else {
        await videoRef.current.requestPictureInPicture();
        setIsPictureInPicture(true);
      }
    } catch (error) {
      console.warn("Picture-in-Picture failed:", error);
    }
  };

  const handleSeek = (time: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = time;
  };

  if (error) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <div className="text-center text-white p-6">
          <h2 className="text-xl font-bold mb-4">Erreur de lecture</h2>
          <p className="mb-4">{error}</p>
          <Button onClick={onClose} variant="outline">
            Fermer
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-50">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center justify-between">
          <h1 className="text-white text-lg font-semibold truncate">{title}</h1>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/20"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Video */}
      <div className="relative w-full h-full flex items-center justify-center">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="text-white text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
              <p>Chargement de la vidéo...</p>
            </div>
          </div>
        )}
        
        <video
          ref={videoRef}
          className="w-full h-full object-contain"
          poster={posterPath}
          playsInline
          webkit-playsinline="true"
          controls
          preload="metadata"
        />
      </div>

      {/* Controls */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
        <div className="flex items-center space-x-4">
          <Button
            onClick={togglePlayPause}
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/20"
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </Button>

          <Button
            onClick={toggleMute}
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/20"
          >
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </Button>

          <div className="flex-1">
            <input
              type="range"
              min="0"
              max={duration}
              value={currentTime}
              onChange={(e) => handleSeek(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
            />
          </div>

          <Button
            onClick={togglePictureInPicture}
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/20"
            disabled={!document.pictureInPictureEnabled}
          >
            <PictureInPicture className="w-5 h-5" />
          </Button>

          {finalMediaUrl && (
            <ChromecastButton
              mediaUrl={finalMediaUrl}
              title={title}
              posterUrl={posterPath ? `https://image.tmdb.org/t/p/w1280${posterPath}` : undefined}
              currentTime={currentTime}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20"
            />
          )}
        </div>

        <div className="flex justify-between text-white text-sm mt-2">
          <span>{Math.floor(currentTime / 60)}:{(currentTime % 60).toFixed(0).padStart(2, '0')}</span>
          <span>{Math.floor(duration / 60)}:{(duration % 60).toFixed(0).padStart(2, '0')}</span>
        </div>
      </div>
    </div>
  );
}
