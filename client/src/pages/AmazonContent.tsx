import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
;
import MediaCard from "@/components/MediaCard";
import CommonLayout from "@/components/CommonLayout";
import PullToRefresh from "@/components/PullToRefresh";
import Pagination from "@/components/Pagination";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useMoviesByProvider, useSeriesByProvider, useMoviesByProviderAndGenre, useSeriesByProviderAndGenre, useMultiSearch } from "@/hooks/useTMDB";
// Type for transformed media data
type TransformedMedia = {
  id: number;
  title: string;
  posterPath: string | null;
  rating: number;
  year?: string;
  mediaType?: "movie" | "tv" | "anime" | "documentary" | "series";
};
import { useScrollPosition } from "@/hooks/useScrollPosition";

export default function AmazonContent() {
  const { t } = useLanguage();
    const [currentPage, setCurrentPage] = useState(1);
  const { restoreScrollPosition } = useScrollPosition('amazon-content');
  
  // Lire le paramètre tab de l'URL pour déterminer l'onglet actif
  const urlParams = new URLSearchParams(window.location.search);
  const tabParam = urlParams.get('tab');
  const [activeTab, setActiveTab] = useState<'movies' | 'series'>(
    tabParam === 'series' ? 'series' : 'movies'
  );

  // Fetch data from TMDB - Only Amazon Prime content
  const { data: moviesData, isLoading: moviesLoading } = useMoviesByProvider(9, currentPage);
  const { data: seriesData, isLoading: seriesLoading } = useSeriesByProvider(9, currentPage);
  
  // Amazon Prime specific genres
  const { data: actionMoviesData } = useMoviesByProviderAndGenre(9, 28); // Action
  const { data: comedyMoviesData } = useMoviesByProviderAndGenre(9, 35); // Comedy
  const { data: dramaMoviesData } = useMoviesByProviderAndGenre(9, 18); // Drama
  const { data: actionSeriesData } = useSeriesByProviderAndGenre(9, 10759); // Action & Adventure
  const { data: comedySeriesData } = useSeriesByProviderAndGenre(9, 35); // Comedy
  const { data: dramaSeriesData } = useSeriesByProviderAndGenre(9, 18); // Drama

  const movies = moviesData?.results || [];
  const series = seriesData?.results || [];
  const actionMovies = actionMoviesData?.results || [];
  const comedyMovies = comedyMoviesData?.results || [];
  const dramaMovies = dramaMoviesData?.results || [];
  const actionSeries = actionSeriesData?.results || [];
  const comedySeries = comedySeriesData?.results || [];
  const dramaSeries = dramaSeriesData?.results || [];
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


      <PullToRefresh onRefresh={handleRefresh}>

      {/* Header */}
      <div className="relative bg-gradient-to-b from-primary/20 to-background">
        <div className="container mx-auto px-4 md:px-8 lg:px-12 py-8">
          <div className="flex items-center gap-4 mb-4">
            <img
              src="https://image.tmdb.org/t/p/original/pvske1MyAoymrs5bguRfVqYiM9a.jpg"
              alt="Amazon Prime Video"
              className="w-12 h-12 rounded-lg"
            />
            <div>
              <h1 className="text-3xl md:text-4xl font-bold">Amazon Prime Video</h1>
              <p className="text-muted-foreground">
                Découvrez tous les films et séries disponibles sur Amazon Prime Video.
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

      {/* Catégories Amazon Prime */}
      <div className="container mx-auto px-4 md:px-8 lg:px-12 py-8 space-y-8">
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold">Films d'Action Amazon Prime</h2>
          {actionMovies.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
              {actionMovies.slice(0, 10).map((movie: TransformedMedia) => (
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
          <h2 className="text-2xl font-semibold">Films Comédie Amazon Prime</h2>
          {comedyMovies.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
              {comedyMovies.slice(0, 10).map((movie: TransformedMedia) => (
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
          <h2 className="text-2xl font-semibold">Séries Action & Aventure Amazon Prime</h2>
          {actionSeries.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
              {actionSeries.slice(0, 10).map((serie: TransformedMedia) => (
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
          <h2 className="text-2xl font-semibold">Séries Comédie Amazon Prime</h2>
          {comedySeries.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
              {comedySeries.slice(0, 10).map((serie: TransformedMedia) => (
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
                {movies.map((movie: TransformedMedia) => (
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
              <p className="text-muted-foreground">Aucun film Amazon Prime disponible</p>
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
                {series.map((serie: TransformedMedia) => (
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
              <p className="text-muted-foreground">Aucune série Amazon Prime disponible</p>
            </div>
          )
        )}
        </div>
        
        </PullToRefresh>

        
      </CommonLayout>

        
    );

        
    }