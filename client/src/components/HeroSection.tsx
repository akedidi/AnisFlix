import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, Info } from "lucide-react";
import { Star } from "lucide-react";
import { getOptimizedBackdropUrl } from "@/lib/imageOptimization";

interface HeroItem {
  title: string;
  overview: string;
  backdropPath: string | null | undefined;
  rating: number;
  year?: string;
  mediaType?: "movie" | "tv" | "anime" | "documentary";
  id: number;
}

interface HeroSectionProps {
  items?: HeroItem[];
  onFavorite?: (item: HeroItem) => void;
  onInfo?: (item: HeroItem) => void;
  onClick?: (item: HeroItem) => void;
  isFavorite?: (item: HeroItem) => boolean;
  autoRotate?: boolean;
  rotationInterval?: number;
  // Legacy props for backward compatibility
  title?: string;
  overview?: string;
  backdropPath?: string | null;
  rating?: number;
  year?: string;
  mediaType?: "movie" | "tv" | "anime" | "documentary";
  id?: number;
}

export default function HeroSection({
  items,
  onFavorite,
  onInfo,
  onClick,
  isFavorite,
  autoRotate = true,
  rotationInterval = 8000,
  // Legacy props
  title,
  overview,
  backdropPath,
  rating,
  year,
  mediaType,
  id,
}: HeroSectionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // Convert legacy props to items array if needed
  const heroItems = items || (title ? [{
    title,
    overview: overview || '',
    backdropPath,
    rating: rating || 0,
    year,
    mediaType,
    id: id || 0,
  }] : []);
  
  const currentItem = heroItems[currentIndex];
  const imageUrl = getOptimizedBackdropUrl(currentItem?.backdropPath, 'w1280');

  // Auto-rotation effect
  useEffect(() => {
    if (!autoRotate || heroItems.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % heroItems.length);
    }, rotationInterval);

    return () => clearInterval(interval);
  }, [autoRotate, rotationInterval, heroItems.length]);

  // Transition effect
  useEffect(() => {
    setIsTransitioning(true);
    const timer = setTimeout(() => setIsTransitioning(false), 500);
    return () => clearTimeout(timer);
  }, [currentIndex]);


  if (!currentItem) return null;

  return (
    <div 
      className="relative w-full h-[50vh] sm:h-[45vh] md:h-[50vh] lg:h-[60vh] overflow-hidden group cursor-pointer" 
      data-testid="hero-section"
      onClick={() => onClick?.(currentItem)}
    >
      {/* Background Image with Transition */}
      <div className="absolute inset-0">
        <img
          src={imageUrl}
          alt={currentItem.title}
          className={`w-full h-full object-cover object-center transition-all duration-1000 ease-in-out ${
            isTransitioning ? 'scale-105 opacity-90' : 'scale-100 opacity-100'
          }`}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
      </div>


      {/* Dots Indicator */}
      {heroItems.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
          {heroItems.map((_, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex(index);
              }}
              className={`w-2 h-2 rounded-full transition-all duration-300 hover:scale-125 ${
                index === currentIndex 
                  ? 'bg-white scale-125 shadow-lg' 
                  : 'bg-white/50 hover:bg-white/75'
              }`}
            />
          ))}
        </div>
      )}

      <div className="relative h-full flex items-end">
        <div className="container mx-auto px-4 md:px-8 lg:px-12 pb-8 sm:pb-12 md:pb-16">
          <div className="max-w-2xl space-y-4">
            {currentItem.mediaType && (
              <Badge variant="secondary" className="mb-2">
                {currentItem.mediaType === "tv" ? "Série" : currentItem.mediaType === "anime" ? "Anime" : currentItem.mediaType === "documentary" ? "Documentaire" : "Film"}
              </Badge>
            )}
            
            <h1 className={`text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight transition-all duration-500 ${
              isTransitioning ? 'opacity-70 transform translate-y-2' : 'opacity-100 transform translate-y-0'
            }`}>
              {currentItem.title}
            </h1>

            <div className="flex items-center gap-4 text-white">
              <div className="flex items-center gap-1">
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                <span className="font-semibold">{currentItem.rating.toFixed(1)}</span>
              </div>
              {currentItem.year && <span className="text-lg">{currentItem.year}</span>}
            </div>

            <p className={`text-base md:text-lg text-gray-300 line-clamp-3 transition-all duration-500 ${
              isTransitioning ? 'opacity-70 transform translate-y-2' : 'opacity-100 transform translate-y-0'
            }`}>
              {currentItem.overview}
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
              <Button
                size="lg"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  onFavorite?.(currentItem);
                }}
                className={`gap-2 backdrop-blur-sm border-white/20 text-white hover:bg-white/20 ${
                  isFavorite?.(currentItem)
                    ? 'bg-red-500/20 border-red-400/40 text-red-100 hover:bg-red-500/30' 
                    : 'bg-white/10'
                }`}
                data-testid="button-favorite"
              >
                <Heart className={`w-5 h-5 ${isFavorite?.(currentItem) ? 'fill-red-400 text-red-400' : ''}`} />
                {isFavorite?.(currentItem) ? 'Retiré des favoris' : 'Ajouter aux favoris'}
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  onInfo?.(currentItem);
                }}
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
