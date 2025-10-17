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
}

export default function MediaCarousel({ title, items, onItemClick, seeAllLink, showSeeAllButton }: MediaCarouselProps) {
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
                } else {
                  // Générer un lien basé sur le titre du carrousel
                  if (title.includes('Netflix')) {
                    // Distinguer entre films et séries Netflix
                    const tab = title.toLowerCase().includes('série') || title.toLowerCase().includes('series') ? 'series' : 'movies';
                    window.location.href = `/netflix-content?tab=${tab}`;
                  } else if (title.includes('Amazon Prime')) {
                    // Distinguer entre films et séries Amazon Prime
                    const tab = title.toLowerCase().includes('série') || title.toLowerCase().includes('series') ? 'series' : 'movies';
                    window.location.href = `/amazon-content?tab=${tab}`;
                  } else if (title.includes('Apple TV+')) {
                    // Distinguer entre films et séries Apple TV+
                    const tab = title.toLowerCase().includes('série') || title.toLowerCase().includes('series') ? 'series' : 'movies';
                    window.location.href = `/apple-tv-content?tab=${tab}`;
                  } else if (title.includes('Disney+')) {
                    // Distinguer entre films et séries Disney+
                    const tab = title.toLowerCase().includes('série') || title.toLowerCase().includes('series') ? 'series' : 'movies';
                    window.location.href = `/disney-content?tab=${tab}`;
                  } else if (title.includes('HBO Max')) {
                    // Distinguer entre films et séries HBO Max
                    const tab = title.toLowerCase().includes('série') || title.toLowerCase().includes('series') ? 'series' : 'movies';
                    window.location.href = `/hbo-max-content?tab=${tab}`;
                  } else if (title.includes('Paramount+')) {
                    // Distinguer entre films et séries Paramount+
                    const tab = title.toLowerCase().includes('série') || title.toLowerCase().includes('series') ? 'series' : 'movies';
                    window.location.href = `/paramount-content?tab=${tab}`;
                  } else {
                    // Liens généraux
                    if (title.includes('anime')) {
                    // Gestion spéciale pour les anime (priorité sur les autres conditions)
                    if (title.includes('film') && title.includes('dernier')) {
                      window.location.href = '/anime-movies-latest';
                    } else if ((title.includes('série') || title.includes('séries')) && (title.includes('dernier') || title.includes('dernières'))) {
                      window.location.href = '/anime-series-latest';
                    } else if (title.includes('film') && (title.includes('populaire') || title.includes('populaires'))) {
                      window.location.href = '/anime-movies-popular';
                    } else if ((title.includes('série') || title.includes('séries')) && (title.includes('populaire') || title.includes('populaires'))) {
                      window.location.href = '/anime-series-popular';
                    } else {
                      window.location.href = '/';
                    }
                  } else if (title.includes('populaire') || title.includes('popular')) {
                    const link = title.toLowerCase().includes('film') ? '/popular-movies' : 
                               title.toLowerCase().includes('série') ? '/popular-series' : '/popular-movies';
                    window.location.href = link;
                  } else if (title.includes('Action') || title.includes('action')) {
                    const link = title.toLowerCase().includes('film') ? '/movie-genre/action' : 
                               title.toLowerCase().includes('série') ? '/series-genre/action-adventure' : '/movie-genre/action';
                    window.location.href = link;
                  } else if (title.includes('Drame') || title.includes('drama')) {
                    const link = title.toLowerCase().includes('film') ? '/movie-genre/drama' : 
                               title.toLowerCase().includes('série') ? '/series-genre/drama' : '/movie-genre/drama';
                    window.location.href = link;
                  } else if (title.includes('Crime') || title.includes('crime')) {
                    const link = title.toLowerCase().includes('film') ? '/movie-genre/crime' : 
                               title.toLowerCase().includes('série') ? '/series-genre/crime' : '/movie-genre/crime';
                    window.location.href = link;
                  } else if (title.includes('Mystère') || title.includes('mystery')) {
                    const link = title.toLowerCase().includes('film') ? '/movie-genre/mystery' : 
                               title.toLowerCase().includes('série') ? '/series-genre/mystery' : '/movie-genre/mystery';
                    window.location.href = link;
                  } else if (title.includes('Documentaire') || title.includes('documentary')) {
                    const link = title.toLowerCase().includes('film') ? '/movie-genre/documentary' : 
                               title.toLowerCase().includes('série') ? '/series-genre/documentary' : '/movie-genre/documentary';
                    window.location.href = link;
                  } else if (title.includes('Animation') || title.includes('animation')) {
                    const link = title.toLowerCase().includes('film') ? '/movie-genre/animation' : 
                               title.toLowerCase().includes('série') ? '/series-genre/animation' : '/movie-genre/animation';
                    window.location.href = link;
                  } else if (title.includes('dernier') || title.includes('latest')) {
                    const link = title.toLowerCase().includes('film') ? '/latest-movies' : 
                               title.toLowerCase().includes('série') ? '/latest-series' : '/latest-movies';
                    window.location.href = link;
                  } else {
                    // Par défaut, rediriger vers la page d'accueil
                    window.location.href = '/';
                  }
                  }
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
