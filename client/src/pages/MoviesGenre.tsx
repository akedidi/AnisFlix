import { useState, useEffect } from "react";
import { useRoute } from "wouter";
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

// Mapping des genres avec leurs IDs et clés de traduction
const GENRES = {
  'action': { id: 28, translationKey: 'movies.action' },
  'aventure': { id: 12, translationKey: 'movies.adventure' },
  'animation': { id: 16, translationKey: 'movies.animation' },
  'comedie': { id: 35, translationKey: 'movies.comedy' },
  'crime': { id: 80, translationKey: 'movies.crime' },
  'documentaire': { id: 99, translationKey: 'movies.documentary' },
  'drame': { id: 18, translationKey: 'movies.drama' },
  'famille': { id: 10751, translationKey: 'movies.family' },
  'fantastique': { id: 14, translationKey: 'movies.fantasy' },
  'histoire': { id: 36, translationKey: 'movies.history' },
  'horreur': { id: 27, translationKey: 'movies.horror' },
  'musique': { id: 10402, translationKey: 'movies.music' },
  'mystere': { id: 9648, translationKey: 'movies.mystery' },
  'romance': { id: 10749, translationKey: 'movies.romance' },
  'science-fiction': { id: 878, translationKey: 'movies.scifi' },
  'telefilm': { id: 10770, translationKey: 'movies.telefilm' },
  'thriller': { id: 53, translationKey: 'movies.thriller' },
  'guerre': { id: 10752, translationKey: 'movies.war' },
  'western': { id: 37, translationKey: 'movies.western' }
};

export default function MoviesGenre() {
  const { t } = useLanguage();
  const [, params] = useRoute("/movies-genre/:genre");
  const genreSlug = params?.genre || '';
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch data from TMDB
  const { data: searchResults = [] } = useMultiSearch(searchQuery);

  // Get genre info
  const genreInfo = GENRES[genreSlug as keyof typeof GENRES];
  const genreId = genreInfo?.id;
  const genreName = genreInfo ? t(genreInfo.translationKey) : genreSlug;

  // Fetch movies by genre
  useEffect(() => {
    if (!genreId) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(
          `https://api.themoviedb.org/3/discover/movie?api_key=f3d757824f08ea2cff45eb8f47ca3a1e&with_genres=${genreId}&sort_by=popularity.desc&vote_average_gte=5&page=${currentPage}`
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
  }, [genreId, currentPage]);

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

  // Reset page when genre changes
  useEffect(() => {
    setCurrentPage(1);
  }, [genreSlug]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // If genre not found, show error
  if (!genreInfo) {
    return (
      <div className="h-screen overflow-y-auto fade-in-up">
        <DesktopSidebar />
        <div className="md:ml-64">
          <div className="container mx-auto px-4 md:px-8 lg:px-12 py-8">
            <div className="text-center py-12">
              <h1 className="text-2xl font-bold mb-4">Genre non trouvé</h1>
              <p className="text-muted-foreground mb-4">Le genre "{genreSlug}" n'existe pas.</p>
              
            </div>
          </div>
        </div>
      </div>
    );
  }

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
      <div className="relative bg-gradient-to-b from-primary/20 to-background pt-20 md:pt-20">
        <div className="container mx-auto px-4 md:px-8 lg:px-12 py-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 break-words">{t("movies.title")} {genreName}</h1>
          <p className="text-muted-foreground mb-4 max-w-2xl">
            {t("genre.discoverMovies").replace('{genre}', genreName || 'inconnu')}
          </p>
        </div>
      </div>

      {/* Contenu paginé */}
      <div className="container mx-auto px-4 md:px-8 lg:px-12 pt-2 pb-24 md:pb-8 md:py-8">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">{t("common.loading")}</p>
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
                      onClick={() => window.location.href = `/movie/${movie.id}`}
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
            <p className="text-muted-foreground">{t("genre.noMoviesAvailable").replace('{genre}', genreName || 'inconnu')}</p>
          </div>
        )}
      </div>
      </div>
      
    </div>
  );
}
