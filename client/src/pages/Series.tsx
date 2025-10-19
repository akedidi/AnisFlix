import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import MediaCarousel from "@/components/MediaCarousel";
import CommonLayout from "@/components/CommonLayout";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useLatestSeries, useSeriesByGenre, useMultiSearch } from "@/hooks/useTMDB";
import { useScrollPosition } from "@/hooks/useScrollPosition";

export default function Series() {
  const { t } = useLanguage();
  const { restoreScrollPosition } = useScrollPosition('series');
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const { data: searchResults = [] } = useMultiSearch(searchQuery);
  
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
    
  const latestSeries = latestSeriesData?.results || [];
  const actionSeries = actionSeriesData?.results || [];
  const dramaSeries = dramaSeriesData?.results || [];
  const crimeSeries = crimeSeriesData?.results || [];
  const mysterySeries = mysterySeriesData?.results || [];
  const documentarySeries = documentarySeriesData?.results || [];
  const animeSeries = animeSeriesData?.results || [];

  // Filter only series from search results
  const seriesSearchResults = searchResults.filter((item: any) => item.mediaType === 'tv');

  // Note: restoreScrollPosition is available but not called automatically
  // to allow for manual scroll restoration when needed

  return (
    <CommonLayout showSearch={true}>

          <div className="container mx-auto px-4 md:px-8 lg:px-12 py-8 space-y-8 md:space-y-12">
        <MediaCarousel
          title={t("series.latest")}
          items={latestSeries.slice(0, 10)}
          onItemClick={(item) => setLocation(`/series/${item.id}`)}
          seeAllLink="/latest-series"
        />

        <MediaCarousel
          title={t("series.actionAdventure")}
          items={actionSeries.slice(0, 10)}
          onItemClick={(item) => setLocation(`/series/${item.id}`)}
          showSeeAllButton={true}
          sectionId="series-genre/action"
        />

        <MediaCarousel
          title={t("series.drama")}
          items={dramaSeries.slice(0, 10)}
          onItemClick={(item) => setLocation(`/series/${item.id}`)}
          showSeeAllButton={true}
          sectionId="series-genre/drame"
        />

        <MediaCarousel
          title={t("series.crime")}
          items={crimeSeries.slice(0, 10)}
          onItemClick={(item) => setLocation(`/series/${item.id}`)}
          showSeeAllButton={true}
          sectionId="series-genre/crime"
        />

        <MediaCarousel
          title={t("series.mystery")}
          items={mysterySeries.slice(0, 10)}
          onItemClick={(item) => setLocation(`/series/${item.id}`)}
          showSeeAllButton={true}
          sectionId="series-genre/mystere"
        />

        <MediaCarousel
          title={t("series.documentary")}
          items={documentarySeries.slice(0, 10)}
          onItemClick={(item) => setLocation(`/series/${item.id}`)}
          showSeeAllButton={true}
          sectionId="series-genre/documentaire"
        />

        <MediaCarousel
          title={t("series.animation")}
          items={animeSeries.slice(0, 10)}
          onItemClick={(item) => setLocation(`/series/${item.id}`)}
          showSeeAllButton={true}
          sectionId="series-genre/animation"
        />

          </div>
        
    </CommonLayout>
  );
}
