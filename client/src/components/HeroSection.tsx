import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, Info } from "lucide-react";
import { Star } from "lucide-react";
import { getOptimizedBackdropUrl } from "@/lib/imageOptimization";

interface HeroSectionProps {
  title: string;
  overview: string;
  backdropPath: string | null;
  rating: number;
  year?: string;
  mediaType?: "movie" | "tv" | "anime" | "documentary";
  onFavorite?: () => void;
  onInfo?: () => void;
  isFavorite?: boolean;
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
  isFavorite = false,
}: HeroSectionProps) {
  const imageUrl = getOptimizedBackdropUrl(backdropPath, 'w1280');

  return (
    <div className="relative w-full h-[50vh] sm:h-[45vh] md:h-[50vh] lg:h-[60vh] overflow-hidden" data-testid="hero-section">
      <div className="absolute inset-0">
        <img
          src={imageUrl}
          alt={title}
          className="w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
      </div>

      <div className="relative h-full flex items-end">
        <div className="container mx-auto px-4 md:px-8 lg:px-12 pb-8 sm:pb-12 md:pb-16">
          <div className="max-w-2xl space-y-4">
            {mediaType && (
              <Badge variant="secondary" className="mb-2">
                {mediaType === "tv" ? "Série" : mediaType === "anime" ? "Anime" : mediaType === "documentary" ? "Documentaire" : "Film"}
              </Badge>
            )}
            
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
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
                className={`gap-2 backdrop-blur-sm border-white/20 text-white hover:bg-white/20 ${
                  isFavorite 
                    ? 'bg-red-500/20 border-red-400/40 text-red-100 hover:bg-red-500/30' 
                    : 'bg-white/10'
                }`}
                data-testid="button-favorite"
              >
                <Heart className={`w-5 h-5 ${isFavorite ? 'fill-red-400 text-red-400' : ''}`} />
                {isFavorite ? 'Retiré des favoris' : 'Ajouter aux favoris'}
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
