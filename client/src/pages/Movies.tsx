import { useState } from "react";
import SearchBar from "@/components/SearchBar";
import MediaCarousel from "@/components/MediaCarousel";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageSelect from "@/components/LanguageSelect";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useLatestMovies, useMoviesByGenre, useMultiSearch } from "@/hooks/useTMDB";

export default function Movies() {
  const [searchQuery, setSearchQuery] = useState("");
  const { t } = useLanguage();
  
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
  const { data: actionMovies = [] } = useMoviesByGenre(GENRES.ACTION);
  const { data: dramaMovies = [] } = useMoviesByGenre(GENRES.DRAMA);
  const { data: crimeMovies = [] } = useMoviesByGenre(GENRES.CRIME);
  const { data: mysteryMovies = [] } = useMoviesByGenre(GENRES.MYSTERY);
  const { data: documentaryMovies = [] } = useMoviesByGenre(GENRES.DOCUMENTARY);
  const { data: animeMovies = [] } = useMoviesByGenre(GENRES.ANIMATION);
  const { data: searchResults = [] } = useMultiSearch(searchQuery);
  
  const latestMovies = latestMoviesData?.results || [];

  // Filter only movies from search results
  const movieSearchResults = searchResults.filter(item => item.mediaType === 'movie');

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="container mx-auto px-4 md:px-8 lg:px-12 py-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <SearchBar
                onSearch={setSearchQuery}
                suggestions={searchQuery ? movieSearchResults : []}
                onSelect={(item) => window.location.href = `/movie/${item.id}`}
              />
            </div>
            <LanguageSelect />
            <ThemeToggle />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-8 lg:px-12 py-8 space-y-8 md:space-y-12">
        <h1 className="text-3xl md:text-4xl font-bold">{t("movies.title")}</h1>

        <MediaCarousel
          title={t("movies.latest")}
          items={latestMovies.slice(0, 10)}
          onItemClick={(item) => window.location.href = `/movie/${item.id}`}
          seeAllLink="/latest-movies"
        />

        <MediaCarousel
          title={t("movies.action")}
          items={actionMovies.slice(0, 10)}
          onItemClick={(item) => window.location.href = `/movie/${item.id}`}
        />

        <MediaCarousel
          title={t("movies.drama")}
          items={dramaMovies.slice(0, 10)}
          onItemClick={(item) => window.location.href = `/movie/${item.id}`}
        />

        <MediaCarousel
          title={t("movies.crime")}
          items={crimeMovies.slice(0, 10)}
          onItemClick={(item) => window.location.href = `/movie/${item.id}`}
        />

        <MediaCarousel
          title={t("movies.mystery")}
          items={mysteryMovies.slice(0, 10)}
          onItemClick={(item) => window.location.href = `/movie/${item.id}`}
        />

        <MediaCarousel
          title={t("movies.documentary")}
          items={documentaryMovies.slice(0, 10)}
          onItemClick={(item) => window.location.href = `/movie/${item.id}`}
        />

        <MediaCarousel
          title={t("movies.animation")}
          items={animeMovies.slice(0, 10)}
          onItemClick={(item) => window.location.href = `/movie/${item.id}`}
        />
      </div>
    </div>
  );
}
