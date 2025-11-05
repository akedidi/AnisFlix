import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, Play, Heart } from "lucide-react";
import { useFavorites } from "@/hooks/useFavorites";
import { getOptimizedImageUrl } from "@/lib/imageOptimization";

export interface MediaCardProps {
  id: number;
  title: string;
  posterPath: string | null;
  rating: number;
  year?: string;
  progress?: number;
  mediaType?: "movie" | "tv" | "anime" | "documentary" | "series";
  onClick?: () => void;
  onItemClick?: (item: any) => void;
}

export default function MediaCard({
  id,
  title,
  posterPath,
  rating,
  year,
  progress,
  mediaType,
  onClick,
  onItemClick,
}: MediaCardProps) {
  const { isFavorite, toggleFavorite } = useFavorites();
  
  // Normaliser le type de média
  const normalizedMediaType = mediaType === 'tv' ? 'series' : mediaType || 'movie';
  const isInFavorites = isFavorite(id, normalizedMediaType as 'movie' | 'series');
  const imageUrl = getOptimizedImageUrl(posterPath, 'w342');

  return (
    <Card
      className="group relative overflow-hidden cursor-pointer content-card"
      onClick={onClick}
      data-testid={`card-media-${title.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <div className="relative aspect-[2/3]">
        <img
          src={imageUrl}
          alt={title}
          className="w-full h-full object-cover object-center image-zoom"
          loading="lazy"
        />
        
        {progress !== undefined && progress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted">
            <div
              className="h-full bg-red-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* Bouton favori */}
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/50 hover:bg-black/70 text-white"
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite({
              id,
              title,
              posterPath: posterPath || '',
              rating,
              year: year || '',
              mediaType: normalizedMediaType as 'movie' | 'series'
            });
          }}
        >
          <Heart 
            className={`w-4 h-4 ${isInFavorites ? 'fill-red-500 text-red-500' : ''}`} 
          />
        </Button>

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center gap-1 text-yellow-400">
                <Star className="w-4 h-4 fill-current" />
                <span className="text-sm font-medium text-white">
                  {rating.toFixed(1)}
                </span>
              </div>
              {year && (
                <span className="text-sm text-gray-300">{year}</span>
              )}
            </div>
            <h3 className="text-white font-semibold line-clamp-2 mb-2">
              {title}
            </h3>
            {mediaType && (
              <Badge variant="secondary" className="text-xs">
                {mediaType === "tv" ? "Série" : mediaType === "anime" ? "Anime" : mediaType === "documentary" ? "Documentaire" : "Film"}
              </Badge>
            )}
          </div>
        </div>

        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="w-12 h-12 rounded-full bg-primary/90 backdrop-blur-sm flex items-center justify-center">
            <Play className="w-6 h-6 text-primary-foreground fill-current ml-1" />
          </div>
        </div>
      </div>
    </Card>
  );
}
