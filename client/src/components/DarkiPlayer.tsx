import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { X, ExternalLink } from "lucide-react";
import { saveWatchProgress, getMediaProgress } from "@/lib/watchProgress";
import { ErrorPopup } from "@/components/ErrorPopup";
import { errorMessages } from "@/lib/errorMessages";
import { useKeyboardNavigation } from "@/hooks/useKeyboardNavigation";
import Hls from "hls.js";
import type { MediaType } from "@shared/schema";

interface DarkiPlayerProps {
  darkiUrl: string;
  title: string;
  mediaId: number;
  mediaType: MediaType;
  posterPath?: string | null;
  backdropPath?: string | null;
  onClose?: () => void;
}

export default function DarkiPlayer({
  darkiUrl,
  title,
  mediaId,
  mediaType,
  posterPath,
  backdropPath,
  onClose
}: DarkiPlayerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [m3u8Url, setM3u8Url] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const lastSaveTimeRef = useRef<number>(0);

  // Navigation au clavier pour contrôler la lecture vidéo
  useKeyboardNavigation({
    videoRef,
    isPlayerActive: true
  });

  useEffect(() => {
    console.log('🌑 [DARKI PLAYER] Initialisation avec URL:', darkiUrl);
    
    const extractM3u8FromDarki = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Utiliser l'ancienne API Darkibox en attendant le déploiement du proxy unifié
        const proxyUrl = `/api/darkibox?url=${encodeURIComponent(darkiUrl)}`;
        console.log('🌑 [DARKI PLAYER] Utilisation de l\'API Darkibox legacy:', proxyUrl);
        
        // Vérifier d'abord si l'API retourne une erreur
        const response = await fetch(proxyUrl);
        if (!response.ok) {
          const errorData = await response.json();
          console.error('🌑 [DARKI PLAYER] Erreur API:', errorData);
          setError(errorData.error || 'Erreur lors de l\'extraction du stream');
          setIsLoading(false);
          return;
        }
        
        setM3u8Url(proxyUrl);
        setIsLoading(false);
      } catch (error) {
        console.error('🌑 [DARKI PLAYER] Erreur lors de l\'extraction:', error);
        setError(errorMessages.players.darkibox.message);
        setIsLoading(false);
      }
    };

    extractM3u8FromDarki();
  }, [darkiUrl]);

  // Charger la vidéo HLS
  useEffect(() => {
    if (!videoRef.current || !m3u8Url) return;

    const video = videoRef.current;
    console.log('🌑 [DARKI PLAYER] Chargement de la vidéo HLS:', m3u8Url);

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
      });
      hlsRef.current = hls;
      hls.loadSource(m3u8Url);
      hls.attachMedia(video);
      
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log('🌑 [DARKI PLAYER] Manifest HLS chargé');
        video.play().catch(err => console.warn("Autoplay failed:", err));
      });
      
      hls.on(Hls.Events.ERROR, (_, data) => {
        console.error('🌑 [DARKI PLAYER] Erreur HLS:', data);
        if (data.fatal) {
          setError(errorMessages.players.darkibox.message);
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = m3u8Url;
      video.addEventListener('loadedmetadata', () => {
        video.play().catch(err => console.warn("Autoplay failed:", err));
      });
    } else {
      setError(errorMessages.players.generic.hlsNotSupported);
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [m3u8Url]);

  // Restaurer la position de lecture
  useEffect(() => {
    if (!videoRef.current || !mediaId || !mediaType) return;

    const video = videoRef.current;
    const savedProgress = getMediaProgress(mediaId, mediaType);

    if (savedProgress && savedProgress.currentTime > 0) {
      const handleLoadedMetadata = () => {
        if (video.duration > 0 && savedProgress.currentTime < video.duration - 5) {
          video.currentTime = savedProgress.currentTime;
        }
      };

      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      return () => video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    }
  }, [mediaId, mediaType]);

  // Sauvegarder la progression périodiquement
  useEffect(() => {
    if (!videoRef.current || !mediaId || !mediaType) return;

    const video = videoRef.current;

    const handleTimeUpdate = () => {
      const now = Date.now();
      
      // Sauvegarder toutes les 5 secondes
      if (now - lastSaveTimeRef.current < 5000) return;
      
      if (video.duration > 0 && video.currentTime > 0) {
        const progress = Math.round((video.currentTime / video.duration) * 100);
        
        saveWatchProgress({
          mediaId,
          mediaType,
          title: title || "Vidéo",
          posterPath: posterPath || null,
          backdropPath: backdropPath || null,
          currentTime: video.currentTime,
          duration: video.duration,
          progress,
        });
        
        lastSaveTimeRef.current = now;
      }
    };

    const handleEnded = () => {
      if (mediaId && mediaType) {
        saveWatchProgress({
          mediaId,
          mediaType,
          title: title || "Vidéo",
          posterPath: posterPath || null,
          backdropPath: backdropPath || null,
          currentTime: 0,
          duration: video.duration,
          progress: 100,
        });
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('ended', handleEnded);
    };
  }, [mediaId, mediaType, title, posterPath, backdropPath]);

  const handleOpenExternal = () => {
    window.open(darkiUrl, '_blank');
  };

  if (error) {
    return (
      <ErrorPopup
        title={errorMessages.players.darkibox.title}
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
      <div className="relative aspect-video bg-black">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <div className="text-center text-white">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              <p>Chargement de la source Darki...</p>
            </div>
          </div>
        )}

        {!isLoading && m3u8Url && (
          <video
            ref={videoRef}
            className="w-full h-full"
            controls
            playsInline
            preload="auto"
            title={`${title} - Source Darki`}
          />
        )}
      </div>
      
      <div className="p-4 space-y-4">
        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={handleOpenExternal}
            variant="outline"
            className="gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            Ouvrir dans un nouvel onglet
          </Button>
          
          {onClose && (
            <Button
              onClick={onClose}
              variant="outline"
              className="gap-2"
            >
              <X className="w-4 h-4" />
              Fermer
            </Button>
          )}
        </div>

        <div className="text-sm text-muted-foreground">
          <p><strong>Source:</strong> Darki</p>
          <p><strong>Type:</strong> Flux HLS (M3U8)</p>
          <p><strong>Status:</strong> {isLoading ? "Chargement..." : m3u8Url ? "Prêt" : "En attente"}</p>
        </div>
      </div>
    </div>
  );
}
