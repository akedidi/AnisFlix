import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import MediaCard from "@/components/MediaCard";
import SearchBar from "@/components/SearchBar";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageSelect from "@/components/LanguageSelect";
import Pagination from "@/components/Pagination";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useLatestSeries, useMultiSearch } from "@/hooks/useTMDB";

export default function LatestSeries() {
  const { t } = useLanguage();
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

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      {/* Header avec recherche et contrôles */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="container mx-auto px-4 md:px-8 lg:px-12 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => window.history.back()}
              className="flex-shrink-0"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t("common.back")}
            </Button>
            <div className="flex-1">
              <SearchBar
                onSearch={setSearchQuery}
                suggestions={searchQuery ? searchResults : []}
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

      {/* Header */}
      <div className="relative bg-gradient-to-b from-primary/20 to-background">
        <div className="container mx-auto px-4 md:px-8 lg:px-12 py-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Dernières séries</h1>
          <p className="text-muted-foreground mb-4 max-w-2xl">
            Découvrez les dernières séries télévisées.
          </p>
        </div>
      </div>

      {/* Contenu paginé */}
      <div className="container mx-auto px-4 md:px-8 lg:px-12 py-8">
        {seriesLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Chargement...</p>
          </div>
        ) : series.length > 0 ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
              {series.map((serie) => (
                <div key={serie.id} className="w-full">
                  <MediaCard
                    {...serie}
                    onClick={() => window.location.href = `/series/${serie.id}`}
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
    </div>
  );
}