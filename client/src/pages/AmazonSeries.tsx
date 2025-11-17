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

export default function AmazonSeries() {
  const { t } = useLanguage();
  const { navigate } = useAppNavigation();
  const [searchQuery, setSearchQuery] = useState("");
  const { page: currentPage, onPageChange } = usePaginationState(undefined, 1);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch data from TMDB - Only Amazon Prime series
  const { data: searchResults = [] } = useMultiSearch(searchQuery);

  // Fetch Amazon Prime series data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        let result: any = null;
        
        // Essayer d'abord avec le network filter pour Amazon Originals
        try {
          const today = new Date();
          const firstAirDateLte = today.toISOString().slice(0, 10);
          const url = `https://api.themoviedb.org/3/discover/tv?api_key=f3d757824f08ea2cff45eb8f47ca3a1e&with_networks=1024&sort_by=first_air_date.desc&first_air_date.lte=${firstAirDateLte}&include_null_first_air_dates=false&include_adult=false&page=${currentPage}`;
          
          const response = await fetch(url);
          if (response.ok) {
            result = await response.json();
          }
        } catch (err) {
          console.error('Amazon network filter failed:', err);
        }
        
        // Si échec, essayer avec with_watch_providers et plusieurs régions
        if (!result || !result.results || result.results.length === 0) {
          const today = new Date();
          const firstAirDateLte = today.toISOString().slice(0, 10);
          const regions = ['US', 'FR', 'GB', 'CA', 'NL', 'DE', 'ES', 'IT'];
          
          // Essayer chaque région
          for (const region of regions) {
            try {
              const url = `https://api.themoviedb.org/3/discover/tv?api_key=f3d757824f08ea2cff45eb8f47ca3a1e&with_watch_providers=9&watch_region=${region}&with_watch_monetization_types=flatrate|ads&sort_by=first_air_date.desc&include_null_first_air_dates=false&include_adult=false&first_air_date.lte=${firstAirDateLte}&page=${currentPage}`;
              
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
              const fallbackUrl = `https://api.themoviedb.org/3/discover/tv?api_key=f3d757824f08ea2cff45eb8f47ca3a1e&with_watch_providers=9&with_watch_monetization_types=flatrate|ads&sort_by=first_air_date.desc&include_null_first_air_dates=false&include_adult=false&first_air_date.lte=${firstAirDateLte}&page=${currentPage}`;
              
              const response = await fetch(fallbackUrl);
              if (response.ok) {
                result = await response.json();
              }
            } catch (err) {
              console.error('Fallback failed:', err);
            }
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
            <h1 className="text-3xl md:text-4xl font-bold mb-2">Séries Amazon Prime</h1>
            <p className="text-muted-foreground max-w-2xl">
              Découvrez les séries disponibles sur Amazon Prime Video.
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
                      onClick={() => {
                        try {
                          const sess = JSON.parse(sessionStorage.getItem('paginationLast') || '{}');
                          sess[window.location.pathname] = currentPage;
                          sessionStorage.setItem('paginationLast', JSON.stringify(sess));
                        } catch {}
                        navigate(navPaths.seriesDetail(serie.id));
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
            <p className="text-muted-foreground">Aucune série Amazon Prime Video disponible</p>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}