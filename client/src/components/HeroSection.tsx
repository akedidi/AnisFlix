import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, Info } from "lucide-react";
import { Star } from "lucide-react";

interface HeroSectionProps {
  title: string;
  overview: string;
  backdropPath: string | null;
  rating: number;
  year?: string;
  mediaType?: "movie" | "tv" | "anime" | "documentary";
  onFavorite?: () => void;
  onInfo?: () => void;
}

export default function HeroSection({
  title,
  overview,
  backdropPath,
  rating,
  year,
  mediaType,
  onFavorite,
  onInfo,
}: HeroSectionProps) {
  const imageUrl = backdropPath
    ? `https://image.tmdb.org/t/p/original${backdropPath}`
    : "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1920' height='1080'%3E%3Crect fill='%23334155' width='1920' height='1080'/%3E%3C/svg%3E";

  return (
    <div className="relative w-full h-[35vh] md:h-[50vh] overflow-hidden" data-testid="hero-section">
      <div className="absolute inset-0">
        <img
          src={imageUrl}
          alt={title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
      </div>

      <div className="relative h-full flex items-end">
        <div className="container mx-auto px-4 md:px-8 lg:px-12 pb-12 md:pb-16">
          <div className="max-w-2xl space-y-4">
            {mediaType && (
              <Badge variant="secondary" className="mb-2">
                {mediaType === "tv" ? "Série" : mediaType === "anime" ? "Anime" : mediaType === "documentary" ? "Documentaire" : "Film"}
              </Badge>
            )}
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white">
              {title}
            </h1>

            <div className="flex items-center gap-4 text-white">
              <div className="flex items-center gap-1">
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                <span className="font-semibold">{rating.toFixed(1)}</span>
              </div>
              {year && <span className="text-lg">{year}</span>}
            </div>

            <p className="text-base md:text-lg text-gray-300 line-clamp-3">
              {overview}
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
              <Button
                size="lg"
                variant="outline"
                onClick={onFavorite}
                className="gap-2 bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20"
                data-testid="button-favorite"
              >
                <Heart className="w-5 h-5" />
                Favoris
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={onInfo}
                className="gap-2 bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20"
                data-testid="button-info"
              >
                <Info className="w-5 h-5" />
                Plus d'infos
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
