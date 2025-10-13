import { useState, useEffect } from "react";
import SearchBar from "@/components/SearchBar";
import MediaCarousel from "@/components/MediaCarousel";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageSelect from "@/components/LanguageSelect";
import BottomNav from "@/components/BottomNav";
import DesktopSidebar from "@/components/DesktopSidebar";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useLatestMovies, useMoviesByGenre, useMultiSearch } from "@/hooks/useTMDB";
import { useScrollPosition } from "@/hooks/useScrollPosition";

export default function Movies() {
  const [searchQuery, setSearchQuery] = useState("");
  const { t } = useLanguage();
  const { restoreScrollPosition } = useScrollPosition('movies');
  
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
  const { data: searchResults = [] } = useMultiSearch(searchQuery);
  
  const latestMovies = latestMoviesData?.results || [];
  const actionMovies = actionMoviesData?.results || [];
  const dramaMovies = dramaMoviesData?.results || [];
  const crimeMovies = crimeMoviesData?.results || [];
  const mysteryMovies = mysteryMoviesData?.results || [];
  const documentaryMovies = documentaryMoviesData?.results || [];
  const animeMovies = animeMoviesData?.results || [];

  // Filter only movies from search results
  const movieSearchResults = searchResults.filter((item: any) => item.mediaType === 'movie');

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
        <div className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border relative">
          <div className="container mx-auto px-4 md:px-8 lg:px-12 py-4">
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <SearchBar
                  onSearch={setSearchQuery}
                  suggestions={searchQuery ? movieSearchResults : []}
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
          title={t("movies.latest")}
          items={latestMovies.slice(0, 10)}
          onItemClick={(item) => window.location.href = `/movie/${item.id}`}
          seeAllLink="/latest-movies"
        />

        <MediaCarousel
          title={t("movies.action")}
          items={actionMovies.slice(0, 10)}
          onItemClick={(item) => window.location.href = `/movie/${item.id}`}
          showSeeAllButton={true}
        />

        <MediaCarousel
          title={t("movies.drama")}
          items={dramaMovies.slice(0, 10)}
          onItemClick={(item) => window.location.href = `/movie/${item.id}`}
          showSeeAllButton={true}
        />

        <MediaCarousel
          title={t("movies.crime")}
          items={crimeMovies.slice(0, 10)}
          onItemClick={(item) => window.location.href = `/movie/${item.id}`}
          showSeeAllButton={true}
        />

        <MediaCarousel
          title={t("movies.mystery")}
          items={mysteryMovies.slice(0, 10)}
          onItemClick={(item) => window.location.href = `/movie/${item.id}`}
          showSeeAllButton={true}
        />

        <MediaCarousel
          title={t("movies.documentary")}
          items={documentaryMovies.slice(0, 10)}
          onItemClick={(item) => window.location.href = `/movie/${item.id}`}
          showSeeAllButton={true}
        />

        <MediaCarousel
          title={t("movies.animation")}
          items={animeMovies.slice(0, 10)}
          onItemClick={(item) => window.location.href = `/movie/${item.id}`}
          showSeeAllButton={true}
        />

        <MediaCarousel
          title="Derniers films anime"
          items={animeMovies.slice(0, 10)}
          onItemClick={(item) => window.location.href = `/movie/${item.id}`}
          showSeeAllButton={true}
        />

        <MediaCarousel
          title="Films anime populaires"
          items={animeMovies.slice(10, 20)}
          onItemClick={(item) => window.location.href = `/movie/${item.id}`}
          showSeeAllButton={true}
        />
      </div>
      
      {/* Mobile Bottom Navigation */}
      <BottomNav />
      </div>
    </div>
  );
}
