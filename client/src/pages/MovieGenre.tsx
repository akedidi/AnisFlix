import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import MediaCard from "@/components/MediaCard";
import SearchBar from "@/components/SearchBar";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageSelect from "@/components/LanguageSelect";
import Pagination from "@/components/Pagination";
import DesktopSidebar from "@/components/DesktopSidebar";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useMoviesByGenre, useMultiSearch } from "@/hooks/useTMDB";

// Mapping des genres
const GENRE_NAMES: Record<string, string> = {
  "action": "Action",
  "drama": "Drame", 
  "crime": "Crime",
  "mystery": "Mystère",
  "documentary": "Documentaire",
  "animation": "Animation",
  "comedy": "Comédie",
  "horror": "Horreur",
  "romance": "Romance",
  "thriller": "Thriller",
  "adventure": "Aventure",
  "fantasy": "Fantasy",
  "science-fiction": "Science-Fiction",
  "family": "Famille",
  "war": "Guerre",
  "western": "Western"
};

const GENRE_IDS: Record<string, number> = {
  "action": 28,
  "drama": 18,
  "crime": 80,
  "mystery": 9648,
  "documentary": 99,
  "animation": 16,
  "comedy": 35,
  "horror": 27,
  "romance": 10749,
  "thriller": 53,
  "adventure": 12,
  "fantasy": 14,
  "science-fiction": 878,
  "family": 10751,
  "war": 10752,
  "western": 37
};

export default function MovieGenre() {
  const { genre } = useParams();
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const genreId = GENRE_IDS[genre || ""];
  const genreName = GENRE_NAMES[genre || ""] || genre;

  // Fetch data from TMDB
  const { data: moviesData, isLoading: moviesLoading } = useMoviesByGenre(genreId, currentPage);
  const { data: searchResults = [] } = useMultiSearch(searchQuery);

  const movies = moviesData?.results || [];
  const totalPages = moviesData?.total_pages || 1;

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

  if (!genreId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Genre non trouvé</h1>
          <Button onClick={() => window.history.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
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
        <div className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
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
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Films {genreName}</h1>
          <p className="text-muted-foreground mb-4 max-w-2xl">
            Découvrez tous les films du genre {genreName.toLowerCase()}.
          </p>
        </div>
      </div>

      {/* Contenu paginé */}
      <div className="container mx-auto px-4 md:px-8 lg:px-12 py-8">
        {moviesLoading ? (
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
            <p className="text-muted-foreground">Aucun film {genreName.toLowerCase()} disponible</p>
          </div>
        )}
      </div>
      
    </div>
  );
}