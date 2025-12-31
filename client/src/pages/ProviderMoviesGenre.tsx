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
import { usePaginationState } from "@/hooks/usePaginationState";
import { navPaths } from "@/lib/nativeNavigation";
import { useAppNavigation } from "@/lib/useAppNavigation";

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

// Alias anglais -> clé FR existante
const GENRE_ALIASES: Record<string, keyof typeof GENRES> = {
  'drama': 'drame',
  'comedy': 'comedie',
  'action': 'action',
  'adventure': 'aventure',
  'fantasy': 'fantastique',
  'history': 'histoire',
  'horror': 'horreur',
  'music': 'musique',
  'mystery': 'mystere',
  'romance': 'romance',
  'scifi': 'science-fiction',
  'sciencefiction': 'science-fiction',
  'sci-fi': 'science-fiction',
  'tvmovie': 'telefilm',
  'tv-movie': 'telefilm',
  'war': 'guerre',
  'western': 'western',
  'crime': 'crime',
  'family': 'famille',
  'animation': 'animation',
  'thriller': 'thriller',
  'documentary': 'documentaire',
};

// Mapping des providers avec leurs noms
const PROVIDERS = {
  8: 'Netflix',
  9: 'Amazon Prime Video',
  350: 'Apple TV+',
  337: 'Disney+',  // ID correct pour Disney+
  531: 'Paramount+',  // ID correct pour Paramount+
  384: 'HBO Max',  // ID correct pour HBO Max
  283: 'Crunchyroll',
  381: 'Canal+',
  415: 'ADN',
  234: 'Arte',
  11: 'MUBI',
  1754: 'TF1+',
  147: 'M6+',
  2: 'Apple TV',
  3: 'Google Play Movies',
  68: 'Microsoft Store',
  192: 'YouTube',
  7: 'Vudu',
  386: 'Peacock Premium',
  387: 'Peacock'
};

export default function ProviderMoviesGenre() {
  const { t } = useLanguage();
  const { navigate } = useAppNavigation();
  const [, params] = useRoute("/provider/:id/movies/:genre?");
  const providerId = parseInt(params?.id || '0');
  const genreSlug = params?.genre || '';
  const [searchQuery, setSearchQuery] = useState("");
  const { page: currentPage, onPageChange } = usePaginationState(undefined, 1);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch data from TMDB
  const { data: searchResults = [] } = useMultiSearch(searchQuery);

  // Get genre and provider info
  const mappedSlug = (GENRE_ALIASES[genreSlug] as keyof typeof GENRES) || (genreSlug as keyof typeof GENRES);
  const genreInfo = GENRES[mappedSlug as keyof typeof GENRES];
  const genreId = genreInfo?.id;
  const genreName = genreInfo ? t(genreInfo.translationKey) : genreSlug;
  const providerName = PROVIDERS[providerId as keyof typeof PROVIDERS] || `Provider ${providerId}`;

  // Fetch movies by provider and genre
  useEffect(() => {
    if (!providerId) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Pour Amazon (9) utiliser popularity, pour les autres utiliser date de sortie
        const today = new Date();
        const releaseDateLte = today.toISOString().slice(0, 10);

        // Construire l'URL selon le provider
        // HBO Max: inclure Max 1899 également
        const providerFilter = providerId === 384 ? '384|1899' : String(providerId);
        const sortBy = providerId === 9 ? 'popularity.desc' : 'release_date.desc';
        const monetization = providerId === 9 ? 'flatrate' : 'flatrate|ads';

        // Pour Amazon (9), ne pas filtrer par date. Pour les autres, exclure le futur
        let baseUrl = `https://api.themoviedb.org/3/discover/movie?api_key=f3d757824f08ea2cff45eb8f47ca3a1e&with_watch_providers=${providerFilter}&watch_region=US&with_watch_monetization_types=${monetization}&include_adult=false&sort_by=${sortBy}`;

        if (providerId !== 9) {
          baseUrl += `&release_date.lte=${releaseDateLte}`;
        }

        baseUrl += `&page=${currentPage}`;

        // Ajouter le genre si spécifié
        if (genreId) {
          baseUrl += `&with_genres=${genreId}`;
        }

        // Essayer plusieurs régions pour avoir plus de contenu
        const regions = providerId === 9 ? ['US'] : ['US', 'FR', 'GB', 'CA', 'NL', 'DE', 'ES', 'IT'];
        let result = null;

        for (const region of regions) {
          try {
            const url = baseUrl.replace('watch_region=US', `watch_region=${region}`);
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

        // Fallback sans région mais toujours avec filtre provider
        if (!result || !result.results || result.results.length === 0) {
          let fallbackUrl = `https://api.themoviedb.org/3/discover/movie?api_key=f3d757824f08ea2cff45eb8f47ca3a1e&with_watch_providers=${providerFilter}&with_watch_monetization_types=${monetization}&include_adult=false&sort_by=${sortBy}`;

          if (providerId !== 9) {
            fallbackUrl += `&release_date.lte=${releaseDateLte}`;
          }

          fallbackUrl += `&page=${currentPage}`;

          if (genreId) {
            fallbackUrl += `&with_genres=${genreId}`;
          }

          const response = await fetch(fallbackUrl);

          if (response.ok) {
            result = await response.json();
          }
        }

        if (!result) {
          throw new Error('Aucun contenu trouvé');
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
  // Reset page when genre or provider changes
  /* useEffect(() => {
    onPageChange(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [genreSlug, providerId]); */

  const handlePageChange = (page: number) => {
    onPageChange(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // If provider not found, show error
  if (!providerId) {
    return (
      <div className="min-h-screen fade-in-up">
        <DesktopSidebar />
        <div className="md:ml-64">
          <div className="container mx-auto px-4 md:px-8 lg:px-12 py-8">
            <div className="text-center py-12">
              <h1 className="text-2xl font-bold mb-4">Provider non trouvé</h1>
              <p className="text-muted-foreground mb-4">
                Le provider "{providerId}" n'existe pas.
              </p>

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
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              {genreId ? `${providerName} - ${genreName}` : `${providerName} - ${t("movies.title")}`}
            </h1>
            <p className="text-muted-foreground max-w-2xl">
              {genreId
                ? t("genre.discoverMovies").replace('{genre}', genreName)
                : t("provider.discoverMovies").replace('{provider}', providerName)}
            </p>
          </div>
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
                        onClick={() => {
                          try {
                            const sess = JSON.parse(sessionStorage.getItem('paginationLast') || '{}');
                            sess[window.location.pathname] = currentPage;
                            sessionStorage.setItem('paginationLast', JSON.stringify(sess));
                          } catch { }
                          navigate(navPaths.movie(movie.id));
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
              <p className="text-muted-foreground">{t("provider.noMoviesAvailablePrefix")} {genreName} {t("provider.noMoviesAvailableSuffix")} {providerName}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
