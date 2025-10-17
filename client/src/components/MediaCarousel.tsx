  import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronLeft, ArrowLeft, ArrowRight } from "lucide-react";
import { useRef, useState } from "react";
import MediaCard from "./MediaCard";

interface Media {
  id: number;
  title: string;
  posterPath: string | null;
  rating: number;
  year?: string;
  progress?: number;
  mediaType?: "movie" | "tv" | "anime" | "documentary";
}

interface MediaCarouselProps {
  title: string;
  items: Media[];
  onItemClick?: (item: Media) => void;
  seeAllLink?: string;
  showSeeAllButton?: boolean;
  sectionId?: string; // Identifiant unique pour la section (ex: "anime-movies-latest")
}

export default function MediaCarousel({ title, items, onItemClick, seeAllLink, showSeeAllButton, sectionId }: MediaCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const container = scrollRef.current;
      const { scrollLeft, scrollWidth, clientWidth } = container;
  // Find the width of a single poster (assume all are same)
  const poster = container.querySelector('div'); // first child div is a poster
  const posterWidth = poster ? poster.clientWidth + 16 : 192; // 16px gap, fallback 192px

      let newScrollLeft;
      if (direction === 'left') {
        newScrollLeft = scrollLeft - posterWidth;
        if (newScrollLeft < 0) newScrollLeft = 0;
      } else {
        // If last scroll, align last poster to right edge
        if (scrollLeft + clientWidth + posterWidth >= scrollWidth) {
          newScrollLeft = scrollWidth - clientWidth;
        } else {
          newScrollLeft = scrollLeft + posterWidth;
        }
        if (newScrollLeft > scrollWidth - clientWidth) newScrollLeft = scrollWidth - clientWidth;
      }

      container.scrollTo({
        left: newScrollLeft,
        behavior: 'smooth'
      });
    }
  };

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  return (
    <div className="space-y-4 group fade-in-up" data-testid={`carousel-${title.toLowerCase().replace(/\s+/g, "-")}`}> 
      <div className="flex items-center justify-between">
        <h2 className="text-2xl md:text-3xl font-semibold">{title}</h2>
        {(seeAllLink || showSeeAllButton) && (
          <Button
            variant="ghost"
            className="btn-animate gap-1"
            onClick={() => {
              if (seeAllLink) {
                window.location.href = seeAllLink;
              } else if (sectionId) {
                // Utiliser l'identifiant de section pour une redirection précise
                window.location.href = `/${sectionId}`;
              } else {
                // Fallback basé sur le titre (pour la rétrocompatibilité)
                if (title.includes('Netflix')) {
                  const isSeries = title.toLowerCase().includes('série') || title.toLowerCase().includes('series');
                  window.location.href = isSeries ? '/netflix-series' : '/netflix-movies';
                } else if (title.includes('Amazon Prime')) {
                  const isSeries = title.toLowerCase().includes('série') || title.toLowerCase().includes('series');
                  window.location.href = isSeries ? '/amazon-series' : '/amazon-movies';
                } else if (title.includes('Apple TV+')) {
                  const isSeries = title.toLowerCase().includes('série') || title.toLowerCase().includes('series');
                  window.location.href = isSeries ? '/apple-tv-series' : '/apple-tv-movies';
                } else if (title.includes('Disney+')) {
                  const isSeries = title.toLowerCase().includes('série') || title.toLowerCase().includes('series');
                  window.location.href = isSeries ? '/disney-series' : '/disney-movies';
                } else if (title.includes('HBO Max')) {
                  const isSeries = title.toLowerCase().includes('série') || title.toLowerCase().includes('series');
                  window.location.href = isSeries ? '/hbo-max-series' : '/hbo-max-movies';
                } else if (title.includes('Paramount+')) {
                  const isSeries = title.toLowerCase().includes('série') || title.toLowerCase().includes('series');
                  window.location.href = isSeries ? '/paramount-series' : '/paramount-movies';
                } else {
                  // Par défaut, rediriger vers la page d'accueil
                  window.location.href = '/';
                }
              }
            }}
            data-testid={`button-see-all-${title.toLowerCase().replace(/\s+/g, "-")}`}
          >
            Voir tout
            <ChevronRight className="w-4 h-4" />
          </Button>
        )}
      </div>
      <div className="relative w-full">
        {/* Overlay arrow layer */}
        {showLeftArrow && (
          <div className="absolute left-0 top-0 bottom-0 flex items-center justify-center z-30">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => scroll('left')}
              className="pointer-events-auto h-16 w-16 rounded-full hover:bg-black/20 bg-black/10 opacity-80 transition-opacity ml-2 btn-animate"
            >
              <ArrowLeft className="w-24 h-24 text-white" strokeWidth={4} />
            </Button>
          </div>
        )}
        {showRightArrow && (
          <div className="absolute right-0 top-0 bottom-0 flex items-center justify-center z-30">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => scroll('right')}
              className="pointer-events-auto h-16 w-16 rounded-full hover:bg-black/20 bg-black/10 opacity-80 transition-opacity mr-2 btn-animate"
            >
              <ArrowRight className="w-24 h-24 text-white" strokeWidth={4} />
            </Button>
          </div>
        )}
        {/* Carousel content */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex gap-4 pb-4 overflow-x-scroll scrollbar-hide w-full"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {items.map((item) => (
            <div key={item.id} className="w-40 md:w-48 flex-shrink-0">
              <MediaCard
                {...item}
                onClick={() => onItemClick?.(item)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
