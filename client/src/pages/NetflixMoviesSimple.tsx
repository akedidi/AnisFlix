import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import MediaCard from "@/components/MediaCard";
import SearchBar from "@/components/SearchBar";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageSelect from "@/components/LanguageSelect";
import Pagination from "@/components/Pagination";

import DesktopSidebar from "@/components/DesktopSidebar";
import ContinueWatching from "@/components/ContinueWatching";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useMoviesByProvider, useMultiSearch } from "@/hooks/useTMDB";
import { useScrollPosition } from "@/hooks/useScrollPosition";

// Type for transformed media data
type TransformedMedia = {
  id: number;
  title: string;
  posterPath: string | null;
  rating: number;
  year?: string;
  mediaType?: "movie" | "tv" | "anime" | "documentary" | "series";
};

export default function NetflixMoviesSimple() {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const { restoreScrollPosition } = useScrollPosition('netflix-movies-simple');

  // Fetch data from TMDB - Only Netflix movies (simplified)
  const { data: moviesData, isLoading: moviesLoading, error } = useMoviesByProvider(8, currentPage);
  const { data: searchResults = [] } = useMultiSearch(searchQuery);

  const movies = moviesData?.results || [];
  const totalPages = moviesData?.total_pages || 1;

  // Listen to language changes
  useEffect(() => {
    const handleLanguageChange = () => {
      window.location.reload();
    };
    window.addEventListener('languageChange', handleLanguageChange);
    return () => window.removeEventListener('languageChange', handleLanguageChange);
  }, []);

  // Restaurer la position de scroll au chargement
  useEffect(() => {
    const timer = setTimeout(() => {
      restoreScrollPosition();
    }, 500);
    
    return () => clearTimeout(timer);
  }, [restoreScrollPosition]);

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Debug info
  console.log('NetflixMoviesSimple - Debug:', { moviesData, isLoading: moviesLoading, error, movies });

  return (
    <div className="h-screen overflow-y-auto bg-background">
      <DesktopSidebar />
      
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-semibold">Films Netflix (Simple)</h1>
            </div>
            
            <div className="flex items-center gap-2">
              <SearchBar
                onSearch={setSearchQuery}
                placeholder="Rechercher des films Netflix..."
              />
              <LanguageSelect />
              <ThemeToggle />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 pt-2 pb-24 md:pb-6 md:py-6 md:pt-20">
        {/* Continue Watching */}
        <ContinueWatching maxItems={20} />

        {/* Error Display */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <strong>Erreur:</strong> {error.message || 'Erreur lors du chargement des données'}
          </div>
        )}

        {/* Search Results */}
        {searchQuery && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold">Résultats de recherche</h2>
            {searchResults.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                {searchResults
                  .filter((item: any) => item.media_type === 'movie')
                  .slice(0, 20)
                  .map((movie: any) => (
                    <div key={movie.id} className="w-full">
                      <MediaCard
                        id={movie.id}
                        title={movie.title}
                        posterPath={movie.poster_path}
                        rating={Math.round(movie.vote_average * 10) / 10}
                        year={movie.release_date ? new Date(movie.release_date).getFullYear().toString() : ""}
                        mediaType="movie"
                        onClick={() => window.location.href = `/movie/${movie.id}`}
                      />
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-muted-foreground">Aucun résultat trouvé pour "{searchQuery}"</p>
            )}
          </div>
        )}

        {/* Main Content - Only show when not searching */}
        {!searchQuery && (
          <>
            {/* Latest Netflix Movies */}
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold">Films Netflix</h2>
              {moviesLoading ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Chargement des films Netflix...</p>
                </div>
              ) : movies.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                  {movies.map((movie: TransformedMedia) => (
                    <div key={movie.id} className="w-full">
                      <MediaCard
                        {...movie}
                        mediaType="movie"
                        onClick={() => window.location.href = `/movie/${movie.id}`}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Aucun film Netflix disponible</p>
                  {error && (
                    <p className="text-red-500 mt-2">Erreur: {error.message}</p>
                  )}
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center mt-8">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              </div>
            )}
          </>
        )}
      </div>
      
    </div>
  );
}
