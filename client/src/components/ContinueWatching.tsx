import { useState, useEffect } from 'react';
import { useNavigate } from 'wouter';
import { Play, Clock, Tv, Film } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getWatchProgress, removeWatchProgress } from '@/lib/watchProgress';
import { getImageUrl } from '@/lib/tmdb';
import type { WatchProgress } from '@shared/schema';

interface ContinueWatchingProps {
  maxItems?: number;
}

export default function ContinueWatching({ maxItems = 10 }: ContinueWatchingProps) {
  const navigate = useNavigate();
  const [progress, setProgress] = useState<WatchProgress[]>([]);

  useEffect(() => {
    const watchProgress = getWatchProgress();
    setProgress(watchProgress.slice(0, maxItems));
  }, [maxItems]);

  const handleRemove = (mediaId: number, mediaType: string) => {
    removeWatchProgress(mediaId, mediaType);
    setProgress(prev => prev.filter(p => !(p.mediaId === mediaId && p.mediaType === mediaType)));
  };

  const handlePlay = (item: WatchProgress) => {
    if (item.mediaType === 'movie') {
      navigate(`/movie/${item.mediaId}`);
    } else if (item.mediaType === 'tv') {
      navigate(`/series/${item.mediaId}`);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatLastWatched = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'Il y a moins d\'une heure';
    } else if (diffInHours < 24) {
      return `Il y a ${diffInHours}h`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `Il y a ${diffInDays} jour${diffInDays > 1 ? 's' : ''}`;
    }
  };

  if (progress.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Continuer à regarder
        </h2>
        <div className="text-center py-8 text-muted-foreground">
          <p>Aucun contenu en cours de visionnage.</p>
          <p className="text-sm mt-2">Commencez à regarder un film ou une série pour qu'elle apparaisse ici.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold flex items-center gap-2">
        <Clock className="w-5 h-5" />
        Continuer à regarder
      </h2>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {progress.map((item) => (
          <div key={item.id} className="group relative">
            <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-800">
              {item.posterPath && (
                <img
                  src={getImageUrl(item.posterPath, 'w500')}
                  alt={item.title}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                />
              )}
              
              {/* Progress Bar */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-black bg-opacity-30">
                <div 
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${item.progress}%` }}
                />
              </div>
              
              {/* Play Button Overlay */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black bg-opacity-40">
                <Button
                  size="lg"
                  className="rounded-full"
                  onClick={() => handlePlay(item)}
                >
                  <Play className="w-6 h-6" />
                </Button>
              </div>
              
              {/* Media Type Badge */}
              <div className="absolute top-2 left-2">
                <Badge variant="secondary" className="text-xs">
                  {item.mediaType === 'movie' ? (
                    <><Film className="w-3 h-3 mr-1" /> Film</>
                  ) : (
                    <><Tv className="w-3 h-3 mr-1" /> Série</>
                  )}
                </Badge>
              </div>
              
              {/* Remove Button */}
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => handleRemove(item.mediaId, item.mediaType)}
              >
                ×
              </Button>
            </div>
            
            <div className="mt-2 space-y-1">
              <h3 className="font-medium text-sm line-clamp-1">{item.title}</h3>
              
              {/* Episode info for TV shows */}
              {item.mediaType === 'tv' && item.seasonNumber && item.episodeNumber && (
                <p className="text-xs text-muted-foreground">
                  Saison {item.seasonNumber} • Épisode {item.episodeNumber}
                </p>
              )}
              
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{Math.round(item.progress)}% regardé</span>
                <span>{formatTime(item.currentTime)} / {formatTime(item.duration)}</span>
              </div>
              
              <p className="text-xs text-muted-foreground">
                {formatLastWatched(item.lastWatched)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
