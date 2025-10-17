import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Star } from "lucide-react";
import MediaCard from "@/components/MediaCard";
import SearchBar from "@/components/SearchBar";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageSelect from "@/components/LanguageSelect";
import Pagination from "@/components/Pagination";
import BottomNav from "@/components/BottomNav";
import DesktopSidebar from "@/components/DesktopSidebar";
import ContinueWatching from "@/components/ContinueWatching";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useScrollPosition } from "@/hooks/useScrollPosition";

export default function NetflixMoviesMinimal() {
  const { t } = useLanguage();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const { restoreScrollPosition } = useScrollPosition('netflix-movies-minimal');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Appel direct à l'API TMDB
        const response = await fetch(
          `https://api.themoviedb.org/3/discover/movie?api_key=f3d757824f08ea2cff45eb8f47ca3a1e&with_watch_providers=8&watch_region=FR&with_watch_monetization_types=flatrate&vote_average_gte=5&page=${currentPage}`
        );
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        setData(result);
        console.log('✅ Données reçues:', result);
      } catch (err) {
        console.error('❌ Erreur:', err);
        setError(err instanceof Error ? err.message : 'Erreur inconnue');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentPage]);

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

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-background">
      <DesktopSidebar />
      <BottomNav />
      
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.history.back()}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Retour
              </Button>
              <h1 className="text-xl font-semibold">Films Netflix</h1>
            </div>
            
            <div className="flex items-center gap-2">
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Rechercher des films Netflix..."
              />
              <LanguageSelect />
              <ThemeToggle />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Continue Watching */}
        <ContinueWatching maxItems={20} />

        {/* Error Display */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <strong>Erreur:</strong> {error}
          </div>
        )}

        {/* Main Content */}
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold">Films Netflix</h2>
          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Chargement des films Netflix...</p>
            </div>
          ) : data && data.results && data.results.length > 0 ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                {data.results.map((movie: any) => {
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
                        onClick={() => window.location.href = `/movie/${movie.id}`}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {data.total_pages > 1 && (
                <div className="flex justify-center mt-8">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={data.total_pages}
                    onPageChange={handlePageChange}
                  />
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Aucun film Netflix disponible</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
