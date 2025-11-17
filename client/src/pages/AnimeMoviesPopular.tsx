import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Star, Heart } from "lucide-react";
import CommonLayout from "@/components/CommonLayout";
import Pagination from "@/components/Pagination";
import { useMoviesByGenre } from "@/hooks/useTMDB";
import { usePaginationState } from "@/hooks/usePaginationState";
import { useFavorites } from "@/hooks/useFavorites";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { navPaths } from "@/lib/nativeNavigation";
import { useAppNavigation } from "@/lib/useAppNavigation";

export default function AnimeMoviesPopular() {
  const { page: currentPage, onPageChange } = usePaginationState(undefined, 1);
  const { navigate } = useAppNavigation();
  const { t } = useLanguage();
  const { isFavorite, toggleFavorite } = useFavorites();
  
  // Fetch anime movies (genre 16 = Animation)
  const { data: animeMoviesData, isLoading: animeMoviesLoading } = useMoviesByGenre(16, currentPage);
  
  const animeMovies = animeMoviesData?.results || [];
  const totalPages = animeMoviesData?.total_pages || 1;

  // Listen to language changes
  useEffect(() => {
    const handleLanguageChange = () => {
      window.location.reload();
    };
    window.addEventListener('languageChange', handleLanguageChange);
    return () => window.removeEventListener('languageChange', handleLanguageChange);
  }, []);

  const handlePageChange = (page: number) => {
    onPageChange(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <CommonLayout 
      title={t("anime.popularMovies")}
      showSearch={true}
      onRefresh={handleRefresh}
    >
      <div className="space-y-8 md:space-y-12">
          {animeMovies.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
              {animeMovies.map((movie: any) => (
                <div key={movie.id} className="w-full">
                  <div
                    className="group relative overflow-hidden cursor-pointer content-card bg-card rounded-lg shadow-sm hover:shadow-lg transition-all duration-200"
                    onClick={() => navigate(navPaths.movie(movie.id))}
                  >
                    <div className="relative aspect-[2/3]">
                      <img
                        src={movie.posterPath ? `https://image.tmdb.org/t/p/w342${movie.posterPath}` : '/placeholder-movie.jpg'}
                        alt={movie.title}
                        className="w-full h-full object-cover object-center image-zoom"
                        loading="lazy"
                      />
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/50 hover:bg-black/70 text-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite({
                            id: movie.id,
                            title: movie.title,
                            posterPath: movie.posterPath,
                            rating: movie.rating,
                            year: movie.year,
                            mediaType: 'movie'
                          });
                        }}
                      >
                        <Heart 
                          className={`w-4 h-4 ${isFavorite(movie.id, 'movie') ? 'fill-red-500 text-red-500' : ''}`} 
                        />
                      </Button>
                    </div>
                    
                    <div className="p-3">
                      <h3 className="font-semibold text-sm line-clamp-2 mb-1">
                        {movie.title}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                          <span>{movie.rating.toFixed(1)}</span>
                        </div>
                        {movie.year && (
                          <span>{movie.year}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Aucun film anime trouvé</p>
          </div>
        )}
        
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
      </div>
    </CommonLayout>
  );
}
