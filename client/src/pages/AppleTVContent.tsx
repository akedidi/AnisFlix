import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import MediaCard from "@/components/MediaCard";
import CommonLayout from "@/components/CommonLayout";
import PullToRefresh from "@/components/PullToRefresh";
import Pagination from "@/components/Pagination";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useMoviesByProvider, useSeriesByProvider, useMoviesByProviderAndGenre, useSeriesByProviderAndGenre, useMultiSearch } from "@/hooks/useTMDB";
import { useScrollPosition } from "@/hooks/useScrollPosition";

export default function AppleTVContent() {
  const { t } = useLanguage();
  const [currentPage, setCurrentPage] = useState(1);
  const { restoreScrollPosition } = useScrollPosition('apple-tv-content');
  
  // Lire le paramètre tab de l'URL pour déterminer l'onglet actif
  const urlParams = new URLSearchParams(window.location.search);
  const tabParam = urlParams.get('tab');
  const [activeTab, setActiveTab] = useState<'movies' | 'series'>(
    tabParam === 'series' ? 'series' : 'movies'
  );

  // Fetch data from TMDB - Only Apple TV+ content
  const { data: moviesData, isLoading: moviesLoading } = useMoviesByProvider(350, currentPage);
  const { data: seriesData, isLoading: seriesLoading } = useSeriesByProvider(350, currentPage);

  // Apple TV+ specific genres
  const { data: dramaMoviesData } = useMoviesByProviderAndGenre(350, 18); // Drama
  const { data: thrillerMoviesData } = useMoviesByProviderAndGenre(350, 53); // Thriller
  const { data: dramaSeriesData } = useSeriesByProviderAndGenre(350, 18); // Drama
  const { data: thrillerSeriesData } = useSeriesByProviderAndGenre(350, 80); // Crime

  const movies = moviesData?.results || [];
  const series = seriesData?.results || [];
  const dramaMovies = dramaMoviesData?.results || [];
  const thrillerMovies = thrillerMoviesData?.results || [];
  const dramaSeries = dramaSeriesData?.results || [];
  const thrillerSeries = thrillerSeriesData?.results || [];
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const handleRefresh = () => {
    window.location.reload();
  };



  return (


    <CommonLayout showSearch={true} onRefresh={handleRefresh}>


      <PullToRefresh onRefresh={handleRefresh}>}
      showSearch={true}
    >

        {/* Header */}
        <div className="relative bg-gradient-to-b from-primary/20 to-background">
          <div className="container mx-auto px-4 md:px-8 lg:px-12 py-8">
            <div className="flex items-center gap-4 mb-4">
              <img
                src="https://image.tmdb.org/t/p/original/6uhKBfmtzFqOcLousHwZuzcrScK.jpg"
                alt="Apple TV+"
                className="w-12 h-12 rounded-lg"
              />
              <div>
                <h1 className="text-3xl md:text-4xl font-bold">Apple TV+</h1>
                <p className="text-muted-foreground">
                  Découvrez tous les films et séries disponibles sur Apple TV+.
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

        {/* Catégories Apple TV+ */}
        <div className="container mx-auto px-4 md:px-8 lg:px-12 py-8 space-y-8">
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold">Films Drame Apple TV+</h2>
            {dramaMovies.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                {dramaMovies.slice(0, 10).map((movie) => (
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
            <h2 className="text-2xl font-semibold">Séries Drame Apple TV+</h2>
            {dramaSeries.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                {dramaSeries.slice(0, 10).map((serie) => (
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
                <p className="text-muted-foreground">Aucun film Apple TV+ disponible</p>
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
                <p className="text-muted-foreground">Aucune série Apple TV+ disponible</p>
              </div>
            )
          )}
        </div>
        </PullToRefresh>

      </CommonLayout>

    );

    }
