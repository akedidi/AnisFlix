import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Play } from "lucide-react";

interface MediaCardProps {
  id: number;
  title: string;
  posterPath: string | null;
  rating: number;
  year?: string;
  progress?: number;
  mediaType?: "movie" | "tv" | "anime" | "documentary";
  onClick?: () => void;
}

export default function MediaCard({
  title,
  posterPath,
  rating,
  year,
  progress,
  mediaType,
  onClick,
}: MediaCardProps) {
  const imageUrl = posterPath
    ? `https://image.tmdb.org/t/p/w500${posterPath}`
    : "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='500' height='750' viewBox='0 0 500 750'%3E%3Crect width='500' height='750' fill='%23334155'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='24' fill='%23cbd5e1'%3ENo Image%3C/text%3E%3C/svg%3E";

  return (
    <Card
      className="group relative overflow-hidden cursor-pointer hover-elevate active-elevate-2 transition-transform duration-200"
      onClick={onClick}
      data-testid={`card-media-${title.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <div className="relative aspect-[2/3]">
        <img
          src={imageUrl}
          alt={title}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        
        {progress !== undefined && progress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted">
            <div
              className="h-full bg-chart-2"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

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
