import { useState, useEffect } from "react";
import SearchBar from "@/components/SearchBar";
import MediaCarousel from "@/components/MediaCarousel";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageSelect from "@/components/LanguageSelect";
import DesktopSidebar from "@/components/DesktopSidebar";
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
    <div className="min-h-screen fade-in-up">
      {/* Desktop Sidebar */}
      <DesktopSidebar />
      
      {/* Main Content */}
      <div className="md:ml-64">
        {/* Content with top padding for fixed search bar */}
        <div className="pt-20 md:pt-0">
        <div className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border relative md:relative fixed top-0 left-0 right-0 z-40 md:z-auto">
          <div className="container mx-auto px-4 md:px-8 lg:px-12 py-4">
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <SearchBar
                  onSearch={setSearchQuery}
                  suggestions={searchQuery ? seriesSearchResults : []}
                  onSelect={(item) => {
                    const path = item.mediaType === 'movie' ? `/movie/${item.id}` : `/series/${item.id}`;
                    window.location.href = path;
                  }}
                />
              </div>
              <LanguageSelect />
              <ThemeToggle />
            </div>
          </div>
        </div>

      <div className="container mx-auto px-4 md:px-8 lg:px-12 py-8 space-y-8 md:space-y-12">
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
          sectionId="series-genre/action"
        />

        <MediaCarousel
          title={t("series.drama")}
          items={dramaSeries.slice(0, 10)}
          onItemClick={(item) => window.location.href = `/series/${item.id}`}
          showSeeAllButton={true}
          sectionId="series-genre/drame"
        />

        <MediaCarousel
          title={t("series.crime")}
          items={crimeSeries.slice(0, 10)}
          onItemClick={(item) => window.location.href = `/series/${item.id}`}
          showSeeAllButton={true}
          sectionId="series-genre/crime"
        />

        <MediaCarousel
          title={t("series.mystery")}
          items={mysterySeries.slice(0, 10)}
          onItemClick={(item) => window.location.href = `/series/${item.id}`}
          showSeeAllButton={true}
          sectionId="series-genre/mystere"
        />

        <MediaCarousel
          title={t("series.documentary")}
          items={documentarySeries.slice(0, 10)}
          onItemClick={(item) => window.location.href = `/series/${item.id}`}
          showSeeAllButton={true}
          sectionId="series-genre/documentaire"
        />

        <MediaCarousel
          title={t("series.animation")}
          items={animeSeries.slice(0, 10)}
          onItemClick={(item) => window.location.href = `/series/${item.id}`}
          showSeeAllButton={true}
          sectionId="series-genre/animation"
        />

      </div>
    </div>
  );
}
