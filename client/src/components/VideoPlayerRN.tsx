import { useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import { Video, ResizeMode, VideoFullscreenUpdate } from 'expo-av';
import { Button } from "@/components/ui/button";
import { Download, PictureInPicture } from "lucide-react";
import { saveWatchProgress, getMediaProgress } from "@/lib/watchProgressRN";
import { useDeviceType } from "@/hooks/useDeviceTypeRN";
import type { MediaType } from "@shared/schema";

interface VideoPlayerProps {
  src: string;
  type?: "m3u8" | "mp4" | "auto";
  title?: string;
  onClose?: () => void;
  mediaId?: number;
  mediaType?: MediaType;
  posterPath?: string | null;
  backdropPath?: string | null;
  seasonNumber?: number;
  episodeNumber?: number;
}

export default function VideoPlayer({ 
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
}: VideoPlayerProps) {
  const { isNative } = useDeviceType();
  const videoRef = useRef<Video>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [sourceType, setSourceType] = useState<"m3u8" | "mp4">("mp4");
  const [status, setStatus] = useState<any>({});
  const [isPictureInPicture, setIsPictureInPicture] = useState(false);
  const lastSaveTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!src) return;

    // Détection automatique du type de source
    const detectedType = type === "auto" 
      ? (src.includes(".m3u8") || src.includes("m3u8") ? "m3u8" : "mp4")
      : type;
    
    setSourceType(detectedType);
  }, [src, type]);

  const saveProgress = async (currentTime: number, duration: number) => {
    if (!mediaId || !mediaType) return;
    
    const now = Date.now();
    if (now - lastSaveTimeRef.current < 5000) return; // Sauvegarder max toutes les 5 secondes
    
    lastSaveTimeRef.current = now;
    
    try {
      await saveWatchProgress({
        mediaId: mediaId || 0,
        mediaType: mediaType || 'movie',
        title: title || 'Vidéo',
        posterPath: posterPath || '',
        backdropPath: backdropPath || '',
        progress: currentTime / duration,
        currentTime,
        duration,
        seasonNumber,
        episodeNumber
      });
    } catch (error) {
      console.error("Error saving progress:", error);
    }
  };

  const handlePlaybackStatusUpdate = async (status: any) => {
    setStatus(status);
    
    if (status.isLoaded && status.positionMillis && status.durationMillis) {
      await saveProgress(status.positionMillis / 1000, status.durationMillis / 1000);
    }
  };

  const handleFullscreenUpdate = (event: any) => {
    if (event.status === VideoFullscreenUpdate.PLAYER_DID_PRESENT) {
      setIsPictureInPicture(true);
    } else if (event.status === VideoFullscreenUpdate.PLAYER_DID_DISMISS) {
      setIsPictureInPicture(false);
    }
  };

  const togglePictureInPicture = async () => {
    if (!videoRef.current) return;
    
    try {
      if (isPictureInPicture) {
        await videoRef.current.dismissFullscreenPlayer();
      } else {
        await videoRef.current.presentFullscreenPlayer();
      }
    } catch (error) {
      console.error("Error toggling Picture-in-Picture:", error);
      Alert.alert("Erreur", "Impossible d'activer le mode Picture-in-Picture");
    }
  };

  const handleDownload = async () => {
    if (!src) return;
    
    setIsDownloading(true);
    setDownloadProgress(0);
    
    try {
      // Pour React Native, on peut utiliser expo-file-system pour télécharger
      // ou ouvrir le lien dans le navigateur
      Alert.alert(
        "Téléchargement",
        "Le téléchargement sera disponible dans une future version.",
        [{ text: "OK" }]
      );
    } catch (error) {
      console.error("Download error:", error);
      Alert.alert("Erreur", "Impossible de télécharger la vidéo.");
    } finally {
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  };

  const loadProgress = async () => {
    if (!mediaId || !mediaType) return;
    
    try {
      const progress = await getMediaProgress(
        mediaId, 
        mediaType, 
        seasonNumber, 
        episodeNumber
      );
      
      if (progress && videoRef.current) {
        // Charger la progression sauvegardée
        await videoRef.current.setPositionAsync(progress.currentTime * 1000);
      }
    } catch (error) {
      console.error("Error loading progress:", error);
    }
  };

  useEffect(() => {
    loadProgress();
  }, [mediaId, mediaType, seasonNumber, episodeNumber]);

  return (
    <View style={{ flex: 1, backgroundColor: 'black' }}>
      <Video
        ref={videoRef}
        style={{ flex: 1 }}
        source={{ uri: src }}
        resizeMode={ResizeMode.CONTAIN}
        shouldPlay={false}
        isLooping={false}
        onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
        onFullscreenUpdate={handleFullscreenUpdate as any}
        posterSource={posterPath ? { uri: posterPath } : undefined}
        usePoster={!!posterPath}
        allowsPictureInPicture={true}
      />
      
      {/* Contrôles personnalisés */}
      <View style={{ 
        position: 'absolute', 
        bottom: 0, 
        left: 0, 
        right: 0, 
        backgroundColor: 'rgba(0,0,0,0.7)',
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <TouchableOpacity onPress={handleDownload}>
          <Download size={24} color="white" />
        </TouchableOpacity>
        
        <TouchableOpacity onPress={togglePictureInPicture}>
          <PictureInPicture size={24} color="white" />
        </TouchableOpacity>
        
        {onClose && (
          <TouchableOpacity onPress={onClose}>
            <Text style={{ color: 'white', fontSize: 16 }}>Fermer</Text>
          </TouchableOpacity>
        )}
      </View>
      
      {/* Barre de progression */}
      {status.isLoaded && status.durationMillis && (
        <View style={{
          position: 'absolute',
          bottom: 60,
          left: 16,
          right: 16,
          height: 4,
          backgroundColor: 'rgba(255,255,255,0.3)',
          borderRadius: 2
        }}>
          <View style={{
            height: 4,
            backgroundColor: '#3b82f6',
            borderRadius: 2,
            width: `${(status.positionMillis / status.durationMillis) * 100}%`
          }} />
        </View>
      )}
    </View>
  );
}
