import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
// @ts-ignore - mux.js n'a pas de types TypeScript officiels
import muxjs from "mux.js";
import { Button } from "@/components/ui/button";
import { Download, PictureInPicture } from "lucide-react";
import { saveWatchProgress, getMediaProgress } from "@/lib/watchProgress";
import { useDeviceType } from "@/hooks/useDeviceType";
import { ErrorPopup } from "@/components/ErrorPopup";
import { formatDuration, formatTime } from "@/lib/utils";
import { errorMessages } from "@/lib/errorMessages";
import { useKeyboardNavigation } from "@/hooks/useKeyboardNavigation";
import CustomVideoControls from "@/components/CustomVideoControls";
import type { MediaType } from "@shared/schema";
import { getSubtitles, Subtitle } from "@/lib/opensubtitles";
import { fetchAndConvertSubtitle } from "@/lib/subtitleUtils";
import { useChromecast } from "@/hooks/useChromecast";

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
  imdbId?: string; // Add imdbId prop
}

export default function VideoPlayer({
  src,
  type = "auto",
  title = "Vidéo",
  mediaId,
  mediaType,
  posterPath,
  backdropPath,
  seasonNumber,
  episodeNumber,
  imdbId
}: VideoPlayerProps) {
  const { isNative } = useDeviceType();
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [sourceType, setSourceType] = useState<"m3u8" | "mp4">("mp4");
  const [isPictureInPicture, setIsPictureInPicture] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);
  const [finalMediaUrl, setFinalMediaUrl] = useState<string>("");
  const [currentTime, setCurrentTime] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastSaveTimeRef = useRef<number>(0);

  // Subtitles state
  const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
  const [selectedSubtitle, setSelectedSubtitle] = useState<string | null>(null);

  // Navigation au clavier pour contrôler la lecture vidéo
  useKeyboardNavigation({
    videoRef,
    isPlayerActive: !!src
  });

  // Get getMediaTime from hook
  const { isConnected, cast, setActiveSubtitle, play: castPlay, pause: castPause, seek: castSeek, getMediaTime } = useChromecast();
  const [isCasting, setIsCasting] = useState(false);

  // Sync isCasting state with Chromecast connection
  useEffect(() => {
    setIsCasting(isConnected);
  }, [isConnected]);

  // Poll Chromecast time when casting
  useEffect(() => {
    if (!isCasting) return;

    const interval = setInterval(async () => {
      const time = await getMediaTime();
      if (time > 0) {
        setCurrentTime(time);
        if (duration > 0) {
          setProgress((time / duration) * 100);
        }

        // Save progress periodically for Chromecast too
        const now = Date.now();
        if (now - lastSaveTimeRef.current >= 5000) {
          if (duration > 0 && time > 0 && mediaId && mediaType) {
            const prog = Math.round((time / duration) * 100);
            saveWatchProgress({
              mediaId,
              mediaType,
              title: title || "Vidéo",
              posterPath: posterPath || null,
              backdropPath: backdropPath || null,
              currentTime: time,
              duration: duration,
              progress: prog,
              seasonNumber,
              episodeNumber,
            });
            lastSaveTimeRef.current = now;
          }
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isCasting, duration, mediaId, mediaType, title, posterPath, backdropPath, seasonNumber, episodeNumber, getMediaTime]);

  // ...

  // Sauvegarder la progression périodiquement (LOCAL VIDEO)
  useEffect(() => {
    if (!videoRef.current || !mediaId || !mediaType) return;

    const video = videoRef.current;

    const handleTimeUpdate = () => {
      // Si on cast, on ignore les mises à jour de temps de la vidéo locale
      // Sauf si on veut garder la vidéo locale synchro (mais elle est souvent en pause)
      if (isCasting) return;

      const now = Date.now();

      // Mettre à jour le currentTime pour Chromecast
      setCurrentTime(video.currentTime);

      // Mettre à jour duration et progress
      if (video.duration) {
        setDuration(video.duration);
        setProgress((video.currentTime / video.duration) * 100);
      }

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
          seasonNumber,
          episodeNumber,
        });

        lastSaveTimeRef.current = now;
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleLoadedMetadata = () => {
      if (video.duration) {
        setDuration(video.duration);
      }
    };

    const handleEnded = () => {
      // Ne pas sauvegarder si la vidéo est terminée (pour ne pas la voir dans "Continuer à regarder")
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
          seasonNumber,
          episodeNumber,
        });
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('enterpictureinpicture', () => setIsPictureInPicture(true));
    video.addEventListener('leavepictureinpicture', () => setIsPictureInPicture(false));

    const handleFullscreenChange = () => {
      const isFs = !!(document.fullscreenElement || (document as any).webkitFullscreenElement);
      setIsFullscreen(isFs);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange as any);

    // Détecter le mute state initial
    setIsMuted(video.muted);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('enterpictureinpicture', () => setIsPictureInPicture(true));
      video.removeEventListener('leavepictureinpicture', () => setIsPictureInPicture(false));
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange as any);
    };
  }, [mediaId, mediaType, title, posterPath, backdropPath, seasonNumber, episodeNumber]);

  const togglePlayPause = () => {
    if (isCasting) {
      if (isPlaying) {
        castPause();
        setIsPlaying(false);
      } else {
        castPlay();
        setIsPlaying(true);
      }
    } else if (videoRef.current) {
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

  const toggleFullscreen = () => {
    const video = videoRef.current;
    const container = containerRef.current;
    if (!video) return;

    if (!isFullscreen) {
      const isIOSSafari = /iPhone|iPad|iPod/.test(navigator.userAgent) && !!(window as any).webkit;
      if (isIOSSafari && typeof video.webkitEnterFullscreen === 'function') {
        try {
          video.webkitEnterFullscreen();
          return;
        } catch (e) {
          // Fallback
        }
      }

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
    }
  };

  const handleSeek = (newTime: number) => {
    if (isCasting) {
      castSeek(newTime);
      setCurrentTime(newTime);
    } else if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
  };

  const [subtitleOffset, setSubtitleOffset] = useState(0);

  // Apply subtitle offset
  const handleSubtitleOffsetChange = (offset: number) => {
    const diff = offset - subtitleOffset;
    setSubtitleOffset(offset);

    if (videoRef.current) {
      const video = videoRef.current;
      const tracks = Array.from(video.textTracks);
      const activeTrack = tracks.find(t => t.mode === 'showing');

      if (activeTrack && activeTrack.cues) {
        Array.from(activeTrack.cues).forEach((cue: any) => {
          cue.startTime += diff;
          cue.endTime += diff;
        });
        console.log(`✅ [VideoPlayer] Applied subtitle offset: ${diff}s (Total: ${offset}s)`);
      }
    }
  };

  // ... (existing code)

  // Handle subtitle selection
  const handleSubtitleSelect = (subtitleUrl: string | null) => {
    setSelectedSubtitle(subtitleUrl);
    setSubtitleOffset(0); // Reset offset on track change

    // Handle HLS internal subtitles
    if (hlsRef.current && subtitleUrl?.startsWith('hls://')) {
      const trackIndex = parseInt(subtitleUrl.replace('hls://', ''));
      if (!isNaN(trackIndex)) {
        hlsRef.current.subtitleTrack = trackIndex;
        console.log(`✅ [VideoPlayer] Switched to HLS subtitle track: ${trackIndex}`);
        return;
      }
    } else if (hlsRef.current) {
      // Disable HLS subtitles if external or none selected
      hlsRef.current.subtitleTrack = -1;
    }

    // Sync with Chromecast if casting
    if (isCasting) {
      setActiveSubtitle(subtitleUrl, subtitles);
    }
  };

  // Separate effect to apply external subtitle selection
  // This runs whenever selectedSubtitle or subtitles array changes
  useEffect(() => {
    if (!videoRef.current || !selectedSubtitle || selectedSubtitle.startsWith('hls://')) {
      return;
    }

    const video = videoRef.current;
    const tracks = video.textTracks;

    // Find the corresponding track by matching label and language
    // We cannot rely on index because HLS.js or browser might inject other tracks
    const selectedSub = subtitles.find(s => s.url === selectedSubtitle);
    if (!selectedSub) return;

    let foundTrack: TextTrack | null = null;

    // Disable all tracks and find the matching one
    for (let i = 0; i < tracks.length; i++) {
      const t = tracks[i];
      t.mode = 'hidden';

      // Match logic:
      // HLS.js tracks might complicate things, but our <track> elements come from 'subtitles' array
      // We match by label and language
      if (t.label === selectedSub.label && t.language === selectedSub.lang) {
        foundTrack = t;
      }
    }

    if (foundTrack) {
      const trackToEnable = foundTrack; // Closure capture
      const timeoutId = setTimeout(() => {
        console.log(`✅ [VideoPlayer] Enabling track: ${trackToEnable.label} (${trackToEnable.language})`);
        trackToEnable.mode = 'showing';

        // Monitoring
        const monitorInterval = setInterval(() => {
          if (trackToEnable.mode !== 'showing') {
            console.log(`🔄 [VideoPlayer] Re-enabling track`);
            trackToEnable.mode = 'showing';
          }
        }, 500);
        setTimeout(() => clearInterval(monitorInterval), 5000);
      }, 200);
      return () => clearTimeout(timeoutId);
    } else {
      console.warn(`⚠️ [VideoPlayer] Track not found for: ${selectedSub.label}`);
    }
  }, [selectedSubtitle, subtitles]);

  // Removed unused useEffect for conversion
  // useEffect(() => { ... }, [selectedSubtitle, convertedSubtitles, subtitles]);

  // Removed local formatTime in favor of imported one
  // const formatTime = (time: number) => { ... }

  const handleDownloadMP4 = async () => {
    if (!hlsRef.current || sourceType !== "m3u8") {
      alert("Le téléchargement MP4 n'est disponible que pour les flux HLS (m3u8)");
      return;
    }

    try {
      setIsDownloading(true);
      setDownloadProgress(0);

      const hls = hlsRef.current;

      // Attendre que le manifest soit chargé
      if (!hls.levels?.length) {
        await new Promise(resolve => hls.once(Hls.Events.MANIFEST_PARSED, resolve));
      }

      let details = hls.levels[hls.currentLevel]?.details;
      if (!details || !details.fragments?.length) {
        await new Promise(resolve => {
          hls.once(Hls.Events.LEVEL_LOADED, (_, data: any) => {
            if (data.details.fragments.length > 0) resolve(null);
          });
          hls.startLoad();
        });
        details = hls.levels[hls.currentLevel]?.details;
      }

      if (!details) throw new Error('Impossible de charger les détails du niveau HLS.');

      const frags = details.fragments;
      if (!frags?.length) throw new Error('Aucun segment TS trouvé.');

      const transmuxer = new muxjs.mp4.Transmuxer();
      let initSegment: Uint8Array | null = null;
      const mediaSegments: Uint8Array[] = [];

      transmuxer.on('data', (segment: any) => {
        if (segment.initSegment) {
          initSegment = segment.initSegment;
        }
        if (segment.data) {
          mediaSegments.push(segment.data);
        }
      });

      const transmuxerDone = new Promise(resolve => transmuxer.on('done', resolve));

      // Récupérer l'URL de base pour résoudre les URLs relatives
      const baseUrl = details.url ? new URL(details.url) : null;

      for (let i = 0; i < frags.length; i++) {
        let fragUrl: string;

        if (frags[i].url.startsWith('http://') || frags[i].url.startsWith('https://')) {
          // URL absolue
          fragUrl = frags[i].url;
        } else if (baseUrl) {
          // URL relative avec baseUrl disponible
          fragUrl = new URL(frags[i].url, baseUrl).toString();
        } else if (frags[i].baseurl) {
          // Utiliser baseurl du fragment si disponible
          fragUrl = new URL(frags[i].url, frags[i].baseurl).toString();
        } else {
          throw new Error(`Impossible de résoudre l'URL du fragment ${i}`);
        }

        const resp = await fetch(fragUrl);
        if (!resp.ok) {
          throw new Error(`Erreur lors du téléchargement du segment ${i}: ${resp.status}`);
        }

        const tsSegment = new Uint8Array(await resp.arrayBuffer());
        transmuxer.push(tsSegment);
        setDownloadProgress(Math.round(((i + 1) / frags.length) * 100));
      }

      transmuxer.flush();
      await transmuxerDone;

      if (!initSegment) throw new Error("Le segment d'initialisation MP4 n'a pas pu être créé.");

      const mp4Blob = new Blob([initSegment as any, ...mediaSegments as any[]], { type: 'video/mp4' });
      await saveBlob(mp4Blob, `${title.replace(/[^a-z0-9]/gi, '_')}.mp4`);

      alert('Téléchargement MP4 terminé avec succès !');

    } catch (e: any) {
      console.error(e);
      alert('Échec du téléchargement MP4 : ' + e.message);
    } finally {
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  };

  async function saveBlob(blob: Blob, name: string) {
    if ('showSaveFilePicker' in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: name,
          types: [{
            description: 'MPEG-4 Video',
            accept: { 'video/mp4': ['.mp4'] }
          }]
        });
        const w = await handle.createWritable();
        await w.write(blob);
        await w.close();
        return;
      } catch (e) {
        console.warn('File picker annulé ou échoué, fallback sur <a>');
      }
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }

  return (
    <div className="w-full bg-card rounded-lg overflow-hidden shadow-xl">
      <div className="relative w-full aspect-video bg-black" ref={containerRef}>
        <video
          ref={videoRef}
          className="w-full h-full object-contain"
          controls={false}
          playsInline={!isNativePlatform()}
          onClick={(e) => {
            // Toggle play/pause on click
            if (videoRef.current) {
              if (videoRef.current.paused) {
                videoRef.current.play();
              } else {
                videoRef.current.pause();
              }
            }
          }}
          preload="auto"
          crossOrigin="anonymous"
          data-testid="video-player-main"
          {...(isNativePlatform() && {
            'webkit-playsinline': 'false',
            'playsinline': 'false'
          })}
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
            subtitleOffset={subtitleOffset}
            onSubtitleOffsetChange={handleSubtitleOffsetChange}
          />
        )}
      </div>

      <div className="p-4 space-y-4">
        {isNative && sourceType === "m3u8" && (
          <div className="space-y-2">
            <Button
              onClick={handleDownloadMP4}
              disabled={isDownloading}
              className="gap-2"
              data-testid="button-download-mp4"
            >
              <Download className="w-4 h-4" />
              {isDownloading ? `Téléchargement... ${downloadProgress}%` : 'Télécharger en MP4'}
            </Button>

            {isDownloading && (
              <>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Téléchargement & Conversion</span>
                  <span>{downloadProgress}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-200"
                    style={{ width: `${downloadProgress}%` }}
                  />
                </div>
              </>
            )}

            <p className="text-sm text-muted-foreground">
              • <strong>Téléchargement MP4 :</strong> Convertit le flux HLS (.ts) en fichier MP4 standard.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
