import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import MediaCard from "@/components/MediaCard";
import SearchBar from "@/components/SearchBar";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageSelect from "@/components/LanguageSelect";
import Pagination from "@/components/Pagination";
import BottomNav from "@/components/BottomNav";
import DesktopSidebar from "@/components/DesktopSidebar";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useMoviesByProvider, useSeriesByProvider, useMoviesByProviderAndGenre, useSeriesByProviderAndGenre, useMultiSearch } from "@/hooks/useTMDB";
import { useScrollPosition } from "@/hooks/useScrollPosition";

export default function DisneyContent() {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const { restoreScrollPosition } = useScrollPosition('disney-content');
  
  // Lire le paramètre tab de l'URL pour déterminer l'onglet actif
  const urlParams = new URLSearchParams(window.location.search);
  const tabParam = urlParams.get('tab');
  const [activeTab, setActiveTab] = useState<'movies' | 'series'>(
    tabParam === 'series' ? 'series' : 'movies'
  );

  // Fetch data from TMDB - Only Disney+ content
  const { data: moviesData, isLoading: moviesLoading } = useMoviesByProvider(337, currentPage);
  const { data: seriesData, isLoading: seriesLoading } = useSeriesByProvider(337, currentPage);
  const { data: searchResults = [] } = useMultiSearch(searchQuery);

  // Disney+ specific genres
  const { data: familyMoviesData } = useMoviesByProviderAndGenre(337, 10751); // Family
  const { data: animationMoviesData } = useMoviesByProviderAndGenre(337, 16); // Animation
  const { data: adventureMoviesData } = useMoviesByProviderAndGenre(337, 12); // Adventure
  const { data: familySeriesData } = useSeriesByProviderAndGenre(337, 10751); // Family
  const { data: animationSeriesData } = useSeriesByProviderAndGenre(337, 16); // Animation
  const { data: adventureSeriesData } = useSeriesByProviderAndGenre(337, 10759); // Action & Adventure

  const movies = moviesData?.results || [];
  const series = seriesData?.results || [];
  const familyMovies = familyMoviesData?.results || [];
  const animationMovies = animationMoviesData?.results || [];
  const adventureMovies = adventureMoviesData?.results || [];
  const familySeries = familySeriesData?.results || [];
  const animationSeries = animationSeriesData?.results || [];
  const adventureSeries = adventureSeriesData?.results || [];
  const totalPages = activeTab === 'movies' ? (moviesData?.total_pages || 1) : (seriesData?.total_pages || 1);

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

  const handleTabChange = (tab: 'movies' | 'series') => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen fade-in-up">
      {/* Desktop Sidebar */}
      <DesktopSidebar />
      
      {/* Main Content */}
      <div className="md:ml-64">
        {/* Header avec recherche et contrôles */}
        <div className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border relative">
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
            <div className="flex-1 relative">
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
          <div className="flex items-center gap-4 mb-4">
            <img
              src="https://image.tmdb.org/t/p/original/7rwgEs15tFwyR9NPQ5vpzxTj19Q.jpg"
              alt="Disney+"
              className="w-12 h-12 rounded-lg"
            />
            <div>
              <h1 className="text-3xl md:text-4xl font-bold">Disney+</h1>
              <p className="text-muted-foreground">
                Découvrez tous les films et séries disponibles sur Disney+.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Onglets */}
      <div className="container mx-auto px-4 md:px-8 lg:px-12">
        <div className="flex gap-2 mb-6">
          <Button
            variant={activeTab === 'movies' ? 'default' : 'outline'}
            onClick={() => handleTabChange('movies')}
          >
            Films
          </Button>
          <Button
            variant={activeTab === 'series' ? 'default' : 'outline'}
            onClick={() => handleTabChange('series')}
          >
            Séries
          </Button>
        </div>
      </div>

      {/* Catégories Disney+ */}
      <div className="container mx-auto px-4 md:px-8 lg:px-12 py-8 space-y-8">
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold">Films Famille Disney+</h2>
          {familyMovies.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
              {familyMovies.slice(0, 10).map((movie) => (
                <div key={movie.id} className="w-full">
                  <MediaCard
                    {...movie}
                    mediaType="movie"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <h2 className="text-2xl font-semibold">Films Animation Disney+</h2>
          {animationMovies.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
              {animationMovies.slice(0, 10).map((movie) => (
                <div key={movie.id} className="w-full">
                  <MediaCard
                    {...movie}
                    mediaType="movie"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <h2 className="text-2xl font-semibold">Séries Famille Disney+</h2>
          {familySeries.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
              {familySeries.slice(0, 10).map((serie) => (
                <div key={serie.id} className="w-full">
                  <MediaCard
                    {...serie}
                    mediaType="tv"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <h2 className="text-2xl font-semibold">Séries Animation Disney+</h2>
          {animationSeries.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
              {animationSeries.slice(0, 10).map((serie) => (
                <div key={serie.id} className="w-full">
                  <MediaCard
                    {...serie}
                    mediaType="tv"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Contenu paginé */}
      <div className="container mx-auto px-4 md:px-8 lg:px-12 py-8">
        {activeTab === 'movies' ? (
          moviesLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Chargement...</p>
            </div>
          ) : movies.length > 0 ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                {movies.map((movie) => (
                  <div key={movie.id} className="w-full">
                    <MediaCard
                      {...movie}
                      onClick={() => window.location.href = `/movie/${movie.id}`}
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
              <p className="text-muted-foreground">Aucun film Disney+ disponible</p>
            </div>
          )
        ) : (
          seriesLoading ? (
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
              <p className="text-muted-foreground">Aucune série Disney+ disponible</p>
            </div>
          )
        )}
      </div>
      
      {/* Mobile Bottom Navigation */}
      <BottomNav />
      </div>
    </div>
  );
}