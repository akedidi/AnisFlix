import { useState } from "react";
import SearchBar from "@/components/SearchBar";
import MediaCarousel from "@/components/MediaCarousel";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageToggle from "@/components/LanguageToggle";
import { useLatestSeries, useSeriesByGenre, useMultiSearch } from "@/hooks/useTMDB";

export default function Series() {
  const [searchQuery, setSearchQuery] = useState("");
  
  // Genre IDs from TMDB
  const GENRES = {
    ACTION: 10759, // Action & Adventure
    DRAMA: 18,
    CRIME: 80,
    MYSTERY: 9648,
    DOCUMENTARY: 99,
    ANIMATION: 16,
  };
  
  // Fetch data from TMDB
  const { data: latestSeriesData } = useLatestSeries();
  const { data: actionSeries = [] } = useSeriesByGenre(GENRES.ACTION);
  const { data: dramaSeries = [] } = useSeriesByGenre(GENRES.DRAMA);
  const { data: crimeSeries = [] } = useSeriesByGenre(GENRES.CRIME);
  const { data: mysterySeries = [] } = useSeriesByGenre(GENRES.MYSTERY);
  const { data: documentarySeries = [] } = useSeriesByGenre(GENRES.DOCUMENTARY);
  const { data: animeSeries = [] } = useSeriesByGenre(GENRES.ANIMATION);
  const { data: searchResults = [] } = useMultiSearch(searchQuery);
  
  const latestSeries = latestSeriesData?.results || [];

  // Filter only series from search results
  const seriesSearchResults = searchResults.filter(item => item.mediaType === 'tv');

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="container mx-auto px-4 md:px-8 lg:px-12 py-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <SearchBar
                onSearch={setSearchQuery}
                suggestions={searchQuery ? seriesSearchResults : []}
                onSelect={(item) => window.location.href = `/series/${item.id}`}
              />
            </div>
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-8 lg:px-12 py-8 space-y-8 md:space-y-12">
        <h1 className="text-3xl md:text-4xl font-bold">Séries</h1>

        <MediaCarousel
          title="Dernières séries"
          items={latestSeries.slice(0, 10)}
          onItemClick={(item) => window.location.href = `/series/${item.id}`}
          seeAllLink="/latest-series"
        />

        <MediaCarousel
          title="Action & Aventure"
          items={actionSeries.slice(0, 10)}
          onItemClick={(item) => window.location.href = `/series/${item.id}`}
        />

        <MediaCarousel
          title="Drame"
          items={dramaSeries.slice(0, 10)}
          onItemClick={(item) => window.location.href = `/series/${item.id}`}
        />

        <MediaCarousel
          title="Crime"
          items={crimeSeries.slice(0, 10)}
          onItemClick={(item) => window.location.href = `/series/${item.id}`}
        />

        <MediaCarousel
          title="Mystère"
          items={mysterySeries.slice(0, 10)}
          onItemClick={(item) => window.location.href = `/series/${item.id}`}
        />

        <MediaCarousel
          title="Documentaires"
          items={documentarySeries.slice(0, 10)}
          onItemClick={(item) => window.location.href = `/series/${item.id}`}
        />

        <MediaCarousel
          title="Animation"
          items={animeSeries.slice(0, 10)}
          onItemClick={(item) => window.location.href = `/series/${item.id}`}
        />
      </div>
    </div>
  );
}
