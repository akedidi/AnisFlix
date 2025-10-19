import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import MediaCarousel from "@/components/MediaCarousel";
import CommonLayout from "@/components/CommonLayout";
import PullToRefresh from "@/components/PullToRefresh";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useLatestMovies, useMoviesByGenre, useMultiSearch } from "@/hooks/useTMDB";
import { useScrollPosition } from "@/hooks/useScrollPosition";

export default function Movies() {
  const { t } = useLanguage();
  const { restoreScrollPosition } = useScrollPosition('movies');
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const { data: searchResults = [] } = useMultiSearch(searchQuery);
  
  // Genre IDs from TMDB
  const GENRES = {
    ACTION: 28,
    DRAMA: 18,
    CRIME: 80,
    MYSTERY: 9648,
    DOCUMENTARY: 99,
    ANIMATION: 16,
  };
  
  // Fetch data from TMDB
  const { data: latestMoviesData } = useLatestMovies();
  const { data: actionMoviesData } = useMoviesByGenre(GENRES.ACTION);
  const { data: dramaMoviesData } = useMoviesByGenre(GENRES.DRAMA);
  const { data: crimeMoviesData } = useMoviesByGenre(GENRES.CRIME);
  const { data: mysteryMoviesData } = useMoviesByGenre(GENRES.MYSTERY);
  const { data: documentaryMoviesData } = useMoviesByGenre(GENRES.DOCUMENTARY);
  const { data: animeMoviesData } = useMoviesByGenre(GENRES.ANIMATION);
    
  const latestMovies = latestMoviesData?.results || [];
  const actionMovies = actionMoviesData?.results || [];
  const dramaMovies = dramaMoviesData?.results || [];
  
  // Debug logs pour comprendre les différences
  console.log('🎬 Movies.tsx - dramaMoviesData:', {
    language: localStorage.getItem('app-language'),
    totalResults: dramaMoviesData?.total_results,
    page: dramaMoviesData?.page,
    totalPages: dramaMoviesData?.total_pages,
    firstMovies: dramaMovies.slice(0, 5).map(m => ({ id: m.id, title: m.title, year: m.year }))
  });
  const crimeMovies = crimeMoviesData?.results || [];
  const mysteryMovies = mysteryMoviesData?.results || [];
  const documentaryMovies = documentaryMoviesData?.results || [];
  const animeMovies = animeMoviesData?.results || [];

  // Filter only movies from search results
  const movieSearchResults = searchResults.filter((item: any) => item.mediaType === 'movie');

  // Note: restoreScrollPosition is available but not called automatically
  // to allow for manual scroll restoration when needed

  const handleRefresh = () => {
    // Force refresh of all queries
    window.location.reload();
  };

  return (
    <CommonLayout showSearch={true} onRefresh={handleRefresh}>
      <PullToRefresh onRefresh={handleRefresh}>

          <div className="container mx-auto px-4 md:px-8 lg:px-12 py-8 space-y-8 md:space-y-12">
        <MediaCarousel
          title={t("movies.latest")}
          items={latestMovies.slice(0, 10)}
          onItemClick={(item) => setLocation(`/movie/${item.id}`)}
          seeAllLink="/latest-movies"
        />

        <MediaCarousel
          title={t("movies.action")}
          items={actionMovies.slice(0, 10)}
          onItemClick={(item) => setLocation(`/movie/${item.id}`)}
          showSeeAllButton={true}
          sectionId="movies-genre/action"
        />

        <MediaCarousel
          title={t("movies.drama")}
          items={dramaMovies.slice(0, 10)}
          onItemClick={(item) => setLocation(`/movie/${item.id}`)}
          showSeeAllButton={true}
          sectionId="movies-genre/drame"
        />

        <MediaCarousel
          title={t("movies.crime")}
          items={crimeMovies.slice(0, 10)}
          onItemClick={(item) => setLocation(`/movie/${item.id}`)}
          showSeeAllButton={true}
          sectionId="movies-genre/crime"
        />

        <MediaCarousel
          title={t("movies.mystery")}
          items={mysteryMovies.slice(0, 10)}
          onItemClick={(item) => setLocation(`/movie/${item.id}`)}
          showSeeAllButton={true}
          sectionId="movies-genre/mystere"
        />

        <MediaCarousel
          title={t("movies.documentary")}
          items={documentaryMovies.slice(0, 10)}
          onItemClick={(item) => setLocation(`/movie/${item.id}`)}
          showSeeAllButton={true}
          sectionId="movies-genre/documentaire"
        />

        <MediaCarousel
          title={t("movies.animation")}
          items={animeMovies.slice(0, 10)}
          onItemClick={(item) => setLocation(`/movie/${item.id}`)}
          showSeeAllButton={true}
          sectionId="movies-genre/animation"
        />

          </div>
      </PullToRefresh>
    </CommonLayout>
  );
}
