import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import MediaCard from "@/components/MediaCard";
import Pagination from "@/components/Pagination";
import CommonLayout from "@/components/CommonLayout";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useLatestSeries, useMultiSearch } from "@/hooks/useTMDB";

export default function LatestSeries() {
  const { t } = useLanguage();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch data from TMDB
  const { data: seriesData, isLoading: seriesLoading } = useLatestSeries(currentPage);
  const { data: searchResults = [] } = useMultiSearch(searchQuery);

  const series = seriesData?.results || [];
  const totalPages = seriesData?.total_pages || 1;

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
      showSearch={true} 
      onRefresh={handleRefresh}
      customSearchQuery={searchQuery}
      customSearchResults={searchResults}
      onCustomSearch={setSearchQuery}
      onCustomSearchSelect={(item) => {
        const path = item.mediaType === 'movie' ? `/movie/${item.id}` : `/series/${item.id}`;
        setLocation(path);
      }}
    >
      
        <div className="container mx-auto px-4 md:px-8 lg:px-12 py-8">
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">Dernières séries</h1>
            <p className="text-muted-foreground max-w-2xl">
              Découvrez les dernières séries télévisées.
            </p>
          </div>

          {seriesLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Chargement...</p>
            </div>
          ) : series.length > 0 ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                {series.map((serie: any) => (
                  <div key={serie.id} className="w-full">
                    <MediaCard
                      {...serie}
                      onClick={() => setLocation(`/series/${serie.id}`)}
                    />
                  </div>
                ))}
              </div>
              
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Aucune série récente disponible</p>
            </div>
          )}
        </div>
      
    </CommonLayout>
  );
}