import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import MediaCarousel from "@/components/MediaCarousel";
import CommonLayout from "@/components/CommonLayout";
import NativeHeader from "@/components/NativeHeader";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useLatestMovies, useMoviesByGenre, useMultiSearch } from "@/hooks/useTMDB";
import { useScrollPosition } from "@/hooks/useScrollPosition";
import { useNativeDetection } from "@/hooks/useNativeDetection";
import { navPaths } from "@/lib/nativeNavigation";
import { useAppNavigation } from "@/lib/useAppNavigation";

export default function Movies() {
  const { t } = useLanguage();
  const { restoreScrollPosition } = useScrollPosition('movies');
  const [, setLocation] = useLocation();
  const { navigate } = useAppNavigation();
  const { isNativeMobile } = useNativeDetection();
  const [searchQuery, setSearchQuery] = useState("");
  const { data: searchResults = [] } = useMultiSearch(searchQuery);

  // Genre IDs from TMDB
  const GENRES = {
    ACTION: 28,
    DRAMA: 18,
    CRIME: 80,
    MYSTERY: 9648,
    DOCUMENTARY: 99,
    SCI_FI: 878,
    ANIMATION: 16,
  };

  // Fetch data from TMDB
  const { data: latestMoviesData } = useLatestMovies();
  const { data: actionMoviesData } = useMoviesByGenre(GENRES.ACTION);
  const { data: dramaMoviesData } = useMoviesByGenre(GENRES.DRAMA);
  const { data: crimeMoviesData } = useMoviesByGenre(GENRES.CRIME);
  const { data: mysteryMoviesData } = useMoviesByGenre(GENRES.MYSTERY);
  const { data: documentaryMoviesData } = useMoviesByGenre(GENRES.DOCUMENTARY);
  const { data: sciFiMoviesData } = useMoviesByGenre(GENRES.SCI_FI);
  const { data: animeMoviesData } = useMoviesByGenre(GENRES.ANIMATION);

  const latestMovies = latestMoviesData?.results || [];
  const actionMovies = actionMoviesData?.results || [];
  const dramaMovies = dramaMoviesData?.results || [];

  // Debug logs pour comprendre les différences
  console.log('🎬 Movies.tsx - dramaMoviesData:', {
    language: localStorage.getItem('app-language'),
    totalResults: dramaMoviesData?.results?.length,
    page: dramaMoviesData?.page,
    totalPages: dramaMoviesData?.total_pages,
    firstMovies: dramaMovies.slice(0, 5).map((m: any) => ({ id: m.id, title: m.title, year: m.year }))
  });
  const crimeMovies = crimeMoviesData?.results || [];
  const mysteryMovies = mysteryMoviesData?.results || [];
  const documentaryMovies = documentaryMoviesData?.results || [];
  const sciFiMovies = sciFiMoviesData?.results || [];
  const animeMovies = animeMoviesData?.results || [];

  // Filter only movies from search results
  const movieSearchResults = searchResults.filter((item: any) => item.mediaType === 'movie');

  // Note: restoreScrollPosition is available but not called automatically
  // to allow for manual scroll restoration when needed

  const handleRefresh = () => {
    // Force refresh of all queries
    window.location.reload();
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query && searchResults.length > 0) {
      const firstResult = searchResults[0];
      const path = firstResult.mediaType === 'movie'
        ? navPaths.movie(firstResult.id)
        : navPaths.seriesDetail(firstResult.id);
      navigate(path);
    }
  };

  return (
    <>
      {isNativeMobile && (
        <NativeHeader
          title={t("nav.movies")}
          showSearch={true}
          onSearch={handleSearch}
          searchPlaceholder={t("search.placeholder")}
        />
      )}

      <CommonLayout showSearch={!isNativeMobile} onRefresh={handleRefresh}>


        <div className="container mx-auto px-4 md:px-8 lg:px-12 pt-2 pb-8 md:py-8 space-y-8 md:space-y-12 mt-2 md:mt-0">
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
            title={t("movies.sciFi")}
            items={sciFiMovies.slice(0, 10)}
            onItemClick={(item) => setLocation(`/movie/${item.id}`)}
            showSeeAllButton={true}
            sectionId="movies-genre/science-fiction"
          />

          <MediaCarousel
            title={t("movies.animation")}
            items={animeMovies.slice(0, 10)}
            onItemClick={(item) => setLocation(`/movie/${item.id}`)}
            showSeeAllButton={true}
            sectionId="movies-genre/animation"
          />

        </div>

      </CommonLayout>
    </>
  );
}
