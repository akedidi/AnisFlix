import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
;
import MediaCard from "@/components/MediaCard";
import SearchBar from "@/components/SearchBar";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageSelect from "@/components/LanguageSelect";
import Pagination from "@/components/Pagination";
import DesktopSidebar from "@/components/DesktopSidebar";

import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useMultiSearch } from "@/hooks/useTMDB";
import { usePaginationState } from "@/hooks/usePaginationState";
import { useAppNavigation } from "@/lib/useAppNavigation";
import { navPaths } from "@/lib/nativeNavigation";

export default function AmazonMovies() {
  const { t } = useLanguage();
  const { navigate } = useAppNavigation();
  const [searchQuery, setSearchQuery] = useState("");
  const { page: currentPage, onPageChange } = usePaginationState(undefined, 1);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch data from TMDB - Only Amazon Prime movies
  const { data: searchResults = [] } = useMultiSearch(searchQuery);

  // Fetch Amazon Prime movies data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        let result: any = null;
        
        // Essayer d'abord avec plusieurs régions
        const today = new Date();
        const releaseDateLte = today.toISOString().slice(0, 10);
        const regions = ['US', 'FR', 'GB', 'CA', 'NL', 'DE', 'ES', 'IT'];
        
        // Essayer chaque région
        for (const region of regions) {
          try {
            const url = `https://api.themoviedb.org/3/discover/movie?api_key=f3d757824f08ea2cff45eb8f47ca3a1e&with_watch_providers=9&watch_region=${region}&with_watch_monetization_types=flatrate|ads&sort_by=popularity.desc&release_date.lte=${releaseDateLte}&include_adult=false&page=${currentPage}`;
            
            const response = await fetch(url);
            if (response.ok) {
              const data = await response.json();
              if (data.results && data.results.length > 0) {
                result = data;
                break;
              }
            }
          } catch (err) {
            console.log(`Région ${region} échouée, essai suivant...`);
            continue;
          }
        }
        
        // Fallback sans région
        if (!result || !result.results || result.results.length === 0) {
          try {
            const fallbackUrl = `https://api.themoviedb.org/3/discover/movie?api_key=f3d757824f08ea2cff45eb8f47ca3a1e&with_watch_providers=9&with_watch_monetization_types=flatrate|ads&sort_by=popularity.desc&release_date.lte=${releaseDateLte}&include_adult=false&page=${currentPage}`;
            
            const response = await fetch(fallbackUrl);
            if (response.ok) {
              result = await response.json();
            }
          } catch (err) {
            console.error('Fallback failed:', err);
          }
        }
        
        // Si toujours vide, retourner résultat vide
        if (!result) {
          result = { results: [], total_pages: 0, page: 1 };
        }
        
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
    onPageChange(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="h-screen overflow-y-auto">
      {/* Desktop Sidebar */}
      <DesktopSidebar />
      
      {/* Main Content */}
      <div className="md:ml-64">
        {/* Header avec recherche et contrôles */}
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
          <div className="container mx-auto px-4 md:px-8 lg:px-12 py-4">
            <div className="flex items-center gap-4">
              
              <div className="flex-1">
                <SearchBar
                  onSearch={setSearchQuery}
                  suggestions={searchQuery ? searchResults : []}
                  onSelect={(item) => {
                    const path = item.mediaType === 'movie' ? navPaths.movie(item.id) : navPaths.seriesDetail(item.id);
                    navigate(path);
                  }}
                />
              </div>
              <LanguageSelect />
              <ThemeToggle />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="container mx-auto px-4 md:px-8 lg:px-12 pt-2 pb-8 md:py-8 mt-2 md:mt-0">
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">Films Amazon Prime</h1>
            <p className="text-muted-foreground max-w-2xl">
              Découvrez les films disponibles sur Amazon Prime Video.
            </p>
          </div>

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
                      onClick={() => {
                        try {
                          const sess = JSON.parse(sessionStorage.getItem('paginationLast') || '{}');
                          sess[window.location.pathname] = currentPage;
                          sessionStorage.setItem('paginationLast', JSON.stringify(sess));
                        } catch {}
                        navigate(navPaths.movie(movie.id));
                      }}
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
            <p className="text-muted-foreground">Aucun film Amazon Prime Video disponible</p>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}