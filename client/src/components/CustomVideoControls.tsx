import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, PictureInPicture, Cast } from "lucide-react";
import ChromecastButton from "@/components/ChromecastButton";

interface CustomVideoControlsProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  isPlaying: boolean;
  isMuted: boolean;
  isFullscreen: boolean;
  isPictureInPicture: boolean;
  currentTime: number;
  duration: number;
  progress: number;
  mediaUrl?: string;
  title?: string;
  posterUrl?: string;
  onPlayPause: () => void;
  onMute: () => void;
  onFullscreen: () => void;
  onPictureInPicture: () => void;
  onSeek: (value: number) => void;
  formatTime: (time: number) => string;
}

export default function CustomVideoControls({
  videoRef,
  isPlaying,
  isMuted,
  isFullscreen,
  isPictureInPicture,
  currentTime,
  duration,
  progress,
  mediaUrl,
  title,
  posterUrl,
  onPlayPause,
  onMute,
  onFullscreen,
  onPictureInPicture,
  onSeek,
  formatTime,
}: CustomVideoControlsProps) {
  const [showControls, setShowControls] = useState(true);
  const [isHovering, setIsHovering] = useState(false);
  const hideControlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleMouseMove = () => {
      setShowControls(true);
      setIsHovering(true);
      
      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current);
      }
      
      hideControlsTimeoutRef.current = setTimeout(() => {
        if (isPlaying && !isHovering) {
          setShowControls(false);
        }
      }, 3000);
    };

    const handleMouseLeave = () => {
      setIsHovering(false);
      if (isPlaying) {
        setTimeout(() => {
          if (!isHovering) {
            setShowControls(false);
          }
        }, 2000);
      }
    };

    const handlePlay = () => {
      if (!isHovering) {
        setTimeout(() => setShowControls(false), 2000);
      }
    };

    const handlePause = () => {
      setShowControls(true);
    };

    video.addEventListener('mousemove', handleMouseMove);
    video.addEventListener('mouseleave', handleMouseLeave);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('mousemove', handleMouseMove);
      video.removeEventListener('mouseleave', handleMouseLeave);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current);
      }
    };
  }, [videoRef, isPlaying, isHovering]);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = (parseFloat(e.target.value) / 100) * duration;
    onSeek(newTime);
  };

  return (
    <div
      className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent transition-opacity duration-300 ${
        showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Progress bar */}
      <div className="px-4 pt-2 pb-1">
        <input
          type="range"
          min="0"
          max="100"
          value={progress}
          onChange={handleSeek}
          className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer hover:h-1.5 transition-all"
          style={{
            background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${progress}%, #4b5563 ${progress}%, #4b5563 100%)`
          }}
        />
      </div>

      {/* Controls bar */}
      <div className="px-4 pb-3 flex items-center justify-between gap-2">
        {/* Left controls */}
        <div className="flex items-center gap-2">
          <Button
            onClick={onPlayPause}
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20 h-9 w-9"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5" />
            )}
          </Button>

          <Button
            onClick={onMute}
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20 h-9 w-9"
          >
            {isMuted ? (
              <VolumeX className="w-5 h-5" />
            ) : (
              <Volume2 className="w-5 h-5" />
            )}
          </Button>

          <div className="text-white text-sm font-medium min-w-[100px]">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-1">
          {mediaUrl && (
            <div className="h-9 w-9">
              <ChromecastButton
                mediaUrl={mediaUrl}
                title={title || "Vidéo"}
                posterUrl={posterUrl}
                currentTime={currentTime}
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20 h-full w-full"
              />
            </div>
          )}

          <Button
            onClick={onPictureInPicture}
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20 h-9 w-9"
            disabled={!document.pictureInPictureEnabled}
            title={isPictureInPicture ? "Quitter le mode Picture-in-Picture" : "Mode Picture-in-Picture"}
          >
            <PictureInPicture className={`w-5 h-5 ${isPictureInPicture ? 'fill-current' : ''}`} />
          </Button>

          <Button
            onClick={onFullscreen}
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20 h-9 w-9"
            title={isFullscreen ? "Quitter le plein écran" : "Plein écran"}
          >
            {isFullscreen ? (
              <Minimize className="w-5 h-5" />
            ) : (
              <Maximize className="w-5 h-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
