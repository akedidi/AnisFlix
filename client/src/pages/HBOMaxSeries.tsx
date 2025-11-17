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
import { usePaginationState } from "@/hooks/usePaginationState";
import { useMultiSearch } from "@/hooks/useTMDB";
import { useAppNavigation } from "@/lib/useAppNavigation";
import { navPaths } from "@/lib/nativeNavigation";

export default function HBOMaxSeries() {
  const { t } = useLanguage();
  const { navigate } = useAppNavigation();
  const [searchQuery, setSearchQuery] = useState("");
  const { page: currentPage, onPageChange } = usePaginationState(undefined, 1);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch data from TMDB - Only HBO Max series
  const { data: searchResults = [] } = useMultiSearch(searchQuery);

  // Fetch HBO Max series data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(
          `https://api.themoviedb.org/3/discover/tv?api_key=f3d757824f08ea2cff45eb8f47ca3a1e&with_watch_providers=384&watch_region=FR&with_watch_monetization_types=flatrate&vote_average_gte=5&page=${currentPage}`
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

  const series = data?.results || [];
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
            <h1 className="text-3xl md:text-4xl font-bold mb-2">Séries HBO Max</h1>
            <p className="text-muted-foreground max-w-2xl">
              Découvrez les séries disponibles sur HBO Max.
            </p>
          </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Chargement...</p>
          </div>
        ) : series.length > 0 ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
              {series.map((serie: any) => {
                // Transformer les données pour correspondre au format attendu
                const transformedSerie = {
                  id: serie.id,
                  title: serie.name,
                  posterPath: serie.poster_path,
                  rating: Math.round(serie.vote_average * 10) / 10,
                  year: serie.first_air_date ? new Date(serie.first_air_date).getFullYear().toString() : "",
                  mediaType: "series" as const,
                };
                
                return (
                  <div key={serie.id} className="w-full">
                    <MediaCard
                      {...transformedSerie}
                      onClick={() => navigate(navPaths.seriesDetail(serie.id))}
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
            <p className="text-muted-foreground">Aucune série HBO Max disponible</p>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}