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
import ContinueWatching from "@/components/ContinueWatching";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useMoviesByProvider, useMoviesByProviderAndGenre, useMultiSearch } from "@/hooks/useTMDB";
import { useScrollPosition } from "@/hooks/useScrollPosition";

// Type for transformed media data
type TransformedMedia = {
  id: number;
  title: string;
  posterPath: string | null;
  rating: number;
  year?: string;
  mediaType?: "movie" | "tv" | "anime" | "documentary" | "series";
};

export default function DisneyMovies() {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const { restoreScrollPosition } = useScrollPosition('disney-movies');

  // Fetch data from TMDB - Only Disney+ movies
  const { data: moviesData, isLoading: moviesLoading } = useMoviesByProvider(337, currentPage);
  const { data: searchResults = [] } = useMultiSearch(searchQuery);

  // Disney+ specific movie genres
  const { data: actionMoviesData } = useMoviesByProviderAndGenre(337, 28); // Action
  const { data: comedyMoviesData } = useMoviesByProviderAndGenre(337, 35); // Comedy
  const { data: dramaMoviesData } = useMoviesByProviderAndGenre(337, 18); // Drama
  const { data: romanceMoviesData } = useMoviesByProviderAndGenre(337, 10749); // Romance
  const { data: thrillerMoviesData } = useMoviesByProviderAndGenre(337, 53); // Thriller
  const { data: horrorMoviesData } = useMoviesByProviderAndGenre(337, 27); // Horror
  const { data: sciFiMoviesData } = useMoviesByProviderAndGenre(337, 878); // Science Fiction
  const { data: fantasyMoviesData } = useMoviesByProviderAndGenre(337, 14); // Fantasy
  const { data: animationMoviesData } = useMoviesByProviderAndGenre(337, 16); // Animation
  const { data: documentaryMoviesData } = useMoviesByProviderAndGenre(337, 99); // Documentary
  const { data: familyMoviesData } = useMoviesByProviderAndGenre(337, 10751); // Family

  const movies = moviesData?.results || [];
  const actionMovies = actionMoviesData?.results || [];
  const comedyMovies = comedyMoviesData?.results || [];
  const dramaMovies = dramaMoviesData?.results || [];
  const romanceMovies = romanceMoviesData?.results || [];
  const thrillerMovies = thrillerMoviesData?.results || [];
  const horrorMovies = horrorMoviesData?.results || [];
  const sciFiMovies = sciFiMoviesData?.results || [];
  const fantasyMovies = fantasyMoviesData?.results || [];
  const animationMovies = animationMoviesData?.results || [];
  const documentaryMovies = documentaryMoviesData?.results || [];
  const familyMovies = familyMoviesData?.results || [];
  const totalPages = moviesData?.total_pages || 1;

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

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

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
              <h1 className="text-xl font-semibold">Films Disney+</h1>
            </div>
            
            <div className="flex items-center gap-2">
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Rechercher des films Disney+..."
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

        {/* Search Results */}
        {searchQuery && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold">Résultats de recherche</h2>
            {searchResults.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                {searchResults
                  .filter((item: any) => item.media_type === 'movie')
                  .slice(0, 20)
                  .map((movie: any) => (
                    <div key={movie.id} className="w-full">
                      <MediaCard
                        id={movie.id}
                        title={movie.title}
                        posterPath={movie.poster_path}
                        rating={Math.round(movie.vote_average * 10) / 10}
                        year={movie.release_date ? new Date(movie.release_date).getFullYear().toString() : ""}
                        mediaType="movie"
                        onClick={() => window.location.href = `/movie/${movie.id}`}
                      />
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-muted-foreground">Aucun résultat trouvé pour "{searchQuery}"</p>
            )}
          </div>
        )}

        {/* Main Content - Only show when not searching */}
        {!searchQuery && (
          <>
            {/* Latest Disney+ Movies */}
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold">Derniers films Disney+</h2>
              {moviesLoading ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Chargement des films Disney+...</p>
                </div>
              ) : movies.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                  {movies.map((movie: TransformedMedia) => (
                    <div key={movie.id} className="w-full">
                      <MediaCard
                        {...movie}
                        mediaType="movie"
                        onClick={() => window.location.href = `/movie/${movie.id}`}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">Aucun film Disney+ disponible</p>
              )}
            </div>

            {/* Genre Categories */}
            {familyMovies.length > 0 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold">Films Famille Disney+</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                  {familyMovies.slice(0, 10).map((movie: TransformedMedia) => (
                    <div key={movie.id} className="w-full">
                      <MediaCard
                        {...movie}
                        mediaType="movie"
                        onClick={() => window.location.href = `/movie/${movie.id}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {animationMovies.length > 0 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold">Films Animation Disney+</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                  {animationMovies.slice(0, 10).map((movie: TransformedMedia) => (
                    <div key={movie.id} className="w-full">
                      <MediaCard
                        {...movie}
                        mediaType="movie"
                        onClick={() => window.location.href = `/movie/${movie.id}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {actionMovies.length > 0 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold">Films Action Disney+</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                  {actionMovies.slice(0, 10).map((movie: TransformedMedia) => (
                    <div key={movie.id} className="w-full">
                      <MediaCard
                        {...movie}
                        mediaType="movie"
                        onClick={() => window.location.href = `/movie/${movie.id}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {comedyMovies.length > 0 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold">Films Comédie Disney+</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                  {comedyMovies.slice(0, 10).map((movie: TransformedMedia) => (
                    <div key={movie.id} className="w-full">
                      <MediaCard
                        {...movie}
                        mediaType="movie"
                        onClick={() => window.location.href = `/movie/${movie.id}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {dramaMovies.length > 0 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold">Films Drame Disney+</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                  {dramaMovies.slice(0, 10).map((movie: TransformedMedia) => (
                    <div key={movie.id} className="w-full">
                      <MediaCard
                        {...movie}
                        mediaType="movie"
                        onClick={() => window.location.href = `/movie/${movie.id}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {romanceMovies.length > 0 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold">Films Romance Disney+</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                  {romanceMovies.slice(0, 10).map((movie: TransformedMedia) => (
                    <div key={movie.id} className="w-full">
                      <MediaCard
                        {...movie}
                        mediaType="movie"
                        onClick={() => window.location.href = `/movie/${movie.id}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {thrillerMovies.length > 0 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold">Films Thriller Disney+</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                  {thrillerMovies.slice(0, 10).map((movie: TransformedMedia) => (
                    <div key={movie.id} className="w-full">
                      <MediaCard
                        {...movie}
                        mediaType="movie"
                        onClick={() => window.location.href = `/movie/${movie.id}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {horrorMovies.length > 0 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold">Films Horreur Disney+</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                  {horrorMovies.slice(0, 10).map((movie: TransformedMedia) => (
                    <div key={movie.id} className="w-full">
                      <MediaCard
                        {...movie}
                        mediaType="movie"
                        onClick={() => window.location.href = `/movie/${movie.id}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {sciFiMovies.length > 0 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold">Films Science-Fiction Disney+</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                  {sciFiMovies.slice(0, 10).map((movie: TransformedMedia) => (
                    <div key={movie.id} className="w-full">
                      <MediaCard
                        {...movie}
                        mediaType="movie"
                        onClick={() => window.location.href = `/movie/${movie.id}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {fantasyMovies.length > 0 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold">Films Fantastique Disney+</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                  {fantasyMovies.slice(0, 10).map((movie: TransformedMedia) => (
                    <div key={movie.id} className="w-full">
                      <MediaCard
                        {...movie}
                        mediaType="movie"
                        onClick={() => window.location.href = `/movie/${movie.id}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {documentaryMovies.length > 0 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold">Documentaires Disney+</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                  {documentaryMovies.slice(0, 10).map((movie: TransformedMedia) => (
                    <div key={movie.id} className="w-full">
                      <MediaCard
                        {...movie}
                        mediaType="movie"
                        onClick={() => window.location.href = `/movie/${movie.id}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center mt-8">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
