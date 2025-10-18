import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import MediaCard from "@/components/MediaCard";
import SearchBar from "@/components/SearchBar";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageSelect from "@/components/LanguageSelect";
import Pagination from "@/components/Pagination";
import DesktopSidebar from "@/components/DesktopSidebar";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useMultiSearch } from "@/hooks/useTMDB";

// Mapping des genres avec leurs noms et IDs
const GENRES = {
  'action': { id: 28, name: 'Action' },
  'aventure': { id: 12, name: 'Aventure' },
  'animation': { id: 16, name: 'Animation' },
  'comedie': { id: 35, name: 'Comédie' },
  'crime': { id: 80, name: 'Crime' },
  'documentaire': { id: 99, name: 'Documentaire' },
  'drame': { id: 18, name: 'Drame' },
  'famille': { id: 10751, name: 'Famille' },
  'fantastique': { id: 14, name: 'Fantastique' },
  'histoire': { id: 36, name: 'Histoire' },
  'horreur': { id: 27, name: 'Horreur' },
  'musique': { id: 10402, name: 'Musique' },
  'mystere': { id: 9648, name: 'Mystère' },
  'romance': { id: 10749, name: 'Romance' },
  'science-fiction': { id: 878, name: 'Science-Fiction' },
  'telefilm': { id: 10770, name: 'Téléfilm' },
  'thriller': { id: 53, name: 'Thriller' },
  'guerre': { id: 10752, name: 'Guerre' },
  'western': { id: 37, name: 'Western' }
};

// Mapping des providers avec leurs noms
const PROVIDERS = {
  8: 'Netflix',
  9: 'Amazon Prime Video',
  350: 'Apple TV+',
  531: 'Disney+',
  1899: 'Paramount+',
  384: 'HBO Max',
  2: 'Apple TV',
  3: 'Google Play Movies',
  68: 'Microsoft Store',
  192: 'YouTube',
  7: 'Vudu',
  337: 'Disney Now',
  531: 'Disney+',
  386: 'Peacock Premium',
  387: 'Peacock',
  531: 'Disney+',
  2: 'Apple TV',
  3: 'Google Play Movies',
  68: 'Microsoft Store',
  192: 'YouTube',
  7: 'Vudu',
  337: 'Disney Now',
  531: 'Disney+',
  386: 'Peacock Premium',
  387: 'Peacock'
};

export default function ProviderMoviesGenre() {
  const { t } = useLanguage();
  const [, params] = useRoute("/provider/:providerId/films/category/:genre");
  const providerId = parseInt(params?.providerId || '0');
  const genreSlug = params?.genre || '';
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch data from TMDB
  const { data: searchResults = [] } = useMultiSearch(searchQuery);

  // Get genre and provider info
  const genreInfo = GENRES[genreSlug as keyof typeof GENRES];
  const genreId = genreInfo?.id;
  const genreName = genreInfo?.name || genreSlug;
  const providerName = PROVIDERS[providerId as keyof typeof PROVIDERS] || `Provider ${providerId}`;

  // Fetch movies by provider and genre
  useEffect(() => {
    if (!genreId || !providerId) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(
          `https://api.themoviedb.org/3/discover/movie?api_key=f3d757824f08ea2cff45eb8f47ca3a1e&with_watch_providers=${providerId}&with_genres=${genreId}&watch_region=US&with_watch_monetization_types=flatrate&sort_by=popularity.desc&vote_average_gte=5&page=${currentPage}`
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
  }, [providerId, genreId, currentPage]);

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

  // Reset page when genre or provider changes
  useEffect(() => {
    setCurrentPage(1);
  }, [genreSlug, providerId]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // If genre or provider not found, show error
  if (!genreInfo || !providerId) {
    return (
      <div className="min-h-screen fade-in-up">
        <DesktopSidebar />
        <div className="md:ml-64">
          <div className="container mx-auto px-4 md:px-8 lg:px-12 py-8">
            <div className="text-center py-12">
              <h1 className="text-2xl font-bold mb-4">Genre ou Provider non trouvé</h1>
              <p className="text-muted-foreground mb-4">
                Le genre "{genreSlug}" ou le provider "{providerId}" n'existe pas.
              </p>
              <Button onClick={() => window.history.back()}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen fade-in-up">
      {/* Desktop Sidebar */}
      <DesktopSidebar />
      
      {/* Main Content */}
      <div className="md:ml-64">
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
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Films {genreName} sur {providerName}</h1>
          <p className="text-muted-foreground mb-4 max-w-2xl">
            Découvrez les meilleurs films {genreName.toLowerCase()} disponibles sur {providerName}.
          </p>
        </div>
      </div>

      {/* Contenu paginé */}
      <div className="container mx-auto px-4 md:px-8 lg:px-12 py-8">
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
            <p className="text-muted-foreground">Aucun film {genreName.toLowerCase()} disponible sur {providerName}</p>
          </div>
        )}
      </div>
      
      {/* Mobile Bottom Navigation */}
      </div>
    </div>
  );
}
