import { useState, useEffect } from "react";
import SearchBar from "@/components/SearchBar";
import MediaCarousel from "@/components/MediaCarousel";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageSelect from "@/components/LanguageSelect";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useLatestSeries, useSeriesByGenre, useMultiSearch } from "@/hooks/useTMDB";
import { useScrollPosition } from "@/hooks/useScrollPosition";

export default function Series() {
  const [searchQuery, setSearchQuery] = useState("");
  const { t } = useLanguage();
  const { restoreScrollPosition } = useScrollPosition('series');
  
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
  const { data: actionSeriesData } = useSeriesByGenre(GENRES.ACTION);
  const { data: dramaSeriesData } = useSeriesByGenre(GENRES.DRAMA);
  const { data: crimeSeriesData } = useSeriesByGenre(GENRES.CRIME);
  const { data: mysterySeriesData } = useSeriesByGenre(GENRES.MYSTERY);
  const { data: documentarySeriesData } = useSeriesByGenre(GENRES.DOCUMENTARY);
  const { data: animeSeriesData } = useSeriesByGenre(GENRES.ANIMATION);
  const { data: searchResults = [] } = useMultiSearch(searchQuery);
  
  const latestSeries = latestSeriesData?.results || [];
  const actionSeries = actionSeriesData?.results || [];
  const dramaSeries = dramaSeriesData?.results || [];
  const crimeSeries = crimeSeriesData?.results || [];
  const mysterySeries = mysterySeriesData?.results || [];
  const documentarySeries = documentarySeriesData?.results || [];
  const animeSeries = animeSeriesData?.results || [];

  // Filter only series from search results
  const seriesSearchResults = searchResults.filter((item: any) => item.mediaType === 'tv');

  // Restaurer la position de scroll au chargement
  useEffect(() => {
    // Attendre que les données soient chargées
    const timer = setTimeout(() => {
      restoreScrollPosition();
    }, 500);
    
    return () => clearTimeout(timer);
  }, [restoreScrollPosition]);

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
            <LanguageSelect />
            <ThemeToggle />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-8 lg:px-12 py-8 space-y-8 md:space-y-12">
        <h1 className="text-3xl md:text-4xl font-bold">{t("series.title")}</h1>

        <MediaCarousel
          title={t("series.latest")}
          items={latestSeries.slice(0, 10)}
          onItemClick={(item) => window.location.href = `/series/${item.id}`}
          seeAllLink="/latest-series"
        />

        <MediaCarousel
          title={t("series.actionAdventure")}
          items={actionSeries.slice(0, 10)}
          onItemClick={(item) => window.location.href = `/series/${item.id}`}
          showSeeAllButton={true}
        />

        <MediaCarousel
          title={t("series.drama")}
          items={dramaSeries.slice(0, 10)}
          onItemClick={(item) => window.location.href = `/series/${item.id}`}
          showSeeAllButton={true}
        />

        <MediaCarousel
          title={t("series.crime")}
          items={crimeSeries.slice(0, 10)}
          onItemClick={(item) => window.location.href = `/series/${item.id}`}
          showSeeAllButton={true}
        />

        <MediaCarousel
          title={t("series.mystery")}
          items={mysterySeries.slice(0, 10)}
          onItemClick={(item) => window.location.href = `/series/${item.id}`}
          showSeeAllButton={true}
        />

        <MediaCarousel
          title={t("series.documentary")}
          items={documentarySeries.slice(0, 10)}
          onItemClick={(item) => window.location.href = `/series/${item.id}`}
          showSeeAllButton={true}
        />

        <MediaCarousel
          title={t("series.animation")}
          items={animeSeries.slice(0, 10)}
          onItemClick={(item) => window.location.href = `/series/${item.id}`}
          showSeeAllButton={true}
        />

        <MediaCarousel
          title="Dernières séries anime"
          items={animeSeries.slice(0, 10)}
          onItemClick={(item) => window.location.href = `/series/${item.id}`}
          showSeeAllButton={true}
        />

        <MediaCarousel
          title="Séries anime populaires"
          items={animeSeries.slice(10, 20)}
          onItemClick={(item) => window.location.href = `/series/${item.id}`}
          showSeeAllButton={true}
        />
      </div>
    </div>
  );
}
