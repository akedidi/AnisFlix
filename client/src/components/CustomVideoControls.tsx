import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, PictureInPicture, Cast, Subtitles, Check } from "lucide-react";
import ChromecastButton from "@/components/ChromecastButton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Subtitle } from "@/lib/opensubtitles";

interface CustomVideoControlsProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  containerRef?: React.RefObject<HTMLElement>;
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
  subtitles?: Subtitle[];
  selectedSubtitle?: string | null;
  onSubtitleSelect?: (url: string | null) => void;
  subtitleOffset?: number;
  onSubtitleOffsetChange?: (offset: number) => void;
  subtitleFontSize?: number; // 80-150 as percentage
  onSubtitleFontSizeChange?: (size: number) => void;
  mediaId?: number;
  mediaType?: string;
  season?: number;
  episode?: number;
  provider?: string;
}

export default function CustomVideoControls({
  videoRef,
  containerRef,
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
  subtitles = [],
  selectedSubtitle,
  onSubtitleSelect,
  subtitleOffset = 0,
  onSubtitleOffsetChange,
  subtitleFontSize = 100,
  onSubtitleFontSizeChange,
  mediaId,
  mediaType,
  season,
  episode,
  provider,
}: CustomVideoControlsProps) {
  // Debug: Log subtitles prop
  console.log(`🎬 [CustomVideoControls] subtitles prop:`, subtitles.length, subtitles);
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

  const [isDragging, setIsDragging] = useState(false);
  const [localProgress, setLocalProgress] = useState(0);

  useEffect(() => {
    if (!isDragging) {
      setLocalProgress(progress);
    }
  }, [progress, isDragging]);

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    setLocalProgress(newValue);
    setIsDragging(true);
  };

  const handleSeekCommit = () => {
    const newTime = (localProgress / 100) * duration;
    onSeek(newTime);
    // Don't reset isDragging immediately to prevent jump back
    // It will be reset when the video updates progress close to the target?
    // Or better: rely on the fact that we just seeked.

    // Simple fix: keep using localProgress until we get a progress update?
    // Actually, let's just set isDragging to false. The issue is likely that 'progress' prop is still old.
    // We can use a timeout to reset isDragging, or better, ignore progress updates for a short time.
    setTimeout(() => setIsDragging(false), 1000);
  };

  return (
    <div
      className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
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
          value={isDragging ? localProgress : progress}
          onChange={handleSeekChange}
          onMouseUp={handleSeekCommit}
          onTouchEnd={handleSeekCommit}
          className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer hover:h-1.5 transition-all"
          style={{
            background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${isDragging ? localProgress : progress}%, #4b5563 ${isDragging ? localProgress : progress}%, #4b5563 100%)`
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
          {/* Subtitles Dropdown */}
          {subtitles.length > 0 && onSubtitleSelect && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`text-white hover:bg-white/20 h-9 w-9 ${selectedSubtitle ? 'text-blue-400' : ''}`}
                  title="Sous-titres"
                >
                  <Subtitles className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="max-h-[300px] overflow-y-auto z-[99999]"
                container={containerRef?.current || undefined}
              >
                <DropdownMenuLabel>Sous-titres</DropdownMenuLabel>

                <div className="px-2 py-2 border-b">
                  <div className="text-xs text-muted-foreground mb-2">Décalage (synchro)</div>

                  {/* Fine adjustment with extended range */}
                  <div className="flex items-center justify-between gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 w-8 p-0"
                      onClick={(e) => {
                        e.preventDefault();
                        onSubtitleOffsetChange?.(Math.max(-30, subtitleOffset - 0.5));
                      }}
                    >
                      -
                    </Button>
                    <span className="text-xs font-mono w-12 text-center">
                      {subtitleOffset > 0 ? '+' : ''}{subtitleOffset.toFixed(1)}s
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 w-8 p-0"
                      onClick={(e) => {
                        e.preventDefault();
                        onSubtitleOffsetChange?.(Math.min(30, subtitleOffset + 0.5));
                      }}
                    >
                      +
                    </Button>
                  </div>
                </div>

                {/* Font Size Control */}
                <div className="px-2 py-2 border-b">
                  <div className="text-xs text-muted-foreground mb-2">Taille du texte</div>
                  <div className="flex items-center justify-between gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 w-8 p-0"
                      onClick={(e) => {
                        e.preventDefault();
                        onSubtitleFontSizeChange?.(Math.max(50, subtitleFontSize - 10));
                      }}
                    >
                      A-
                    </Button>
                    <span className="text-xs font-mono w-12 text-center">
                      {subtitleFontSize}%
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 w-8 p-0"
                      onClick={(e) => {
                        e.preventDefault();
                        onSubtitleFontSizeChange?.(Math.min(150, subtitleFontSize + 10));
                      }}
                    >
                      A+
                    </Button>
                  </div>
                </div>

                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onSubtitleSelect(null)}
                  className="flex items-center justify-between"
                >
                  <span>Désactivé</span>
                  {!selectedSubtitle && <Check className="w-4 h-4" />}
                </DropdownMenuItem>
                {subtitles.map((sub) => (
                  <DropdownMenuItem
                    key={sub.id}
                    onClick={() => onSubtitleSelect(sub.url)}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center">
                      <span className="mr-2">{sub.flag}</span>
                      {sub.label}
                    </div>
                    {selectedSubtitle === sub.url && <Check className="w-4 h-4" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {mediaUrl && provider !== 'vixsrc' && (
            <div className="h-9 w-9">
              <ChromecastButton
                mediaUrl={mediaUrl}
                title={title || "Vidéo"}
                posterUrl={posterUrl}
                currentTime={currentTime}
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20 h-full w-full"
                subtitles={subtitles}
                activeSubtitleUrl={selectedSubtitle || undefined}
                mediaId={mediaId}
                mediaType={mediaType}
                season={season}
                episode={episode}
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
