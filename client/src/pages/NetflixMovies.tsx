import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import MediaCard from "@/components/MediaCard";
import CommonLayout from "@/components/CommonLayout";
import Pagination from "@/components/Pagination";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useAppNavigation } from "@/lib/useAppNavigation";
import { navPaths } from "@/lib/nativeNavigation";

export default function NetflixMovies() {
  const { t } = useLanguage();
  const { navigate } = useAppNavigation();
  const [currentPage, setCurrentPage] = useState(1);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch Netflix movies data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(
          `https://api.themoviedb.org/3/discover/movie?api_key=f3d757824f08ea2cff45eb8f47ca3a1e&with_watch_providers=8&watch_region=FR&with_watch_monetization_types=flatrate&vote_average_gte=5&page=${currentPage}`
        );
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        setData(result);
      } catch (err) {
        console.error('❌ Erreur:', err);
        setError(err instanceof Error ? err.message : 'Erreur inconnue');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentPage]);

  const movies = data?.results || [];
  const totalPages = data?.total_pages || 1;

  // Listen to language changes
  useEffect(() => {
    const handleLanguageChange = () => {
      window.location.reload();
    };
    window.addEventListener('languageChange', handleLanguageChange);
    return () => window.removeEventListener('languageChange', handleLanguageChange);
  }, []);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <CommonLayout 
      title="Films Netflix"
      showSearch={true}
      onRefresh={handleRefresh}
    >
      <div className="space-y-8 md:space-y-12">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Chargement...</p>
          </div>
        ) : movies.length > 0 ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
              {movies.map((movie: any) => {
                // Transformer les données pour correspondre au format attendu
                const transformedMovie = {
                  id: movie.id,
                  title: movie.title,
                  posterPath: movie.poster_path,
                  rating: Math.round(movie.vote_average * 10) / 10,
                  year: movie.release_date ? new Date(movie.release_date).getFullYear().toString() : "",
                  mediaType: "movie" as const,
                };
                
                return (
                  <div key={movie.id} className="w-full">
                    <MediaCard
                      {...transformedMovie}
                      onClick={() => navigate(navPaths.movie(movie.id))}
                    />
                  </div>
                );
              })}
            </div>
            
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Aucun film Netflix disponible</p>
          </div>
        )}
      </div>
    </CommonLayout>
  );
}
