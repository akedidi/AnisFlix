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
  'action': { id: 10759, translationKey: 'series.actionAdventure' },
  'aventure': { id: 12, translationKey: 'series.adventure' },
  'animation': { id: 16, translationKey: 'series.animation' },
  'comedie': { id: 35, translationKey: 'series.comedy' },
  'crime': { id: 80, translationKey: 'series.crime' },
  'documentaire': { id: 99, translationKey: 'series.documentary' },
  'drame': { id: 18, translationKey: 'series.drama' },
  'famille': { id: 10751, translationKey: 'series.family' },
  'fantastique': { id: 14, translationKey: 'series.fantasy' },
  'histoire': { id: 36, translationKey: 'series.history' },
  'horreur': { id: 27, translationKey: 'series.horror' },
  'musique': { id: 10402, translationKey: 'series.music' },
  'mystere': { id: 9648, translationKey: 'series.mystery' },
  'romance': { id: 10749, translationKey: 'series.romance' },
  'science-fiction': { id: 878, translationKey: 'series.scifi' },
  'telefilm': { id: 10770, translationKey: 'series.telefilm' },
  'thriller': { id: 53, translationKey: 'series.thriller' },
  'guerre': { id: 10752, translationKey: 'series.war' },
  'western': { id: 37, translationKey: 'series.western' },
  'policier': { id: 80, translationKey: 'series.crime' },
  'reality': { id: 10764, translationKey: 'series.reality' },
  'talk': { id: 10767, translationKey: 'series.talk' },
  'news': { id: 10763, translationKey: 'series.news' }
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
  'tv': 'telefilm',
  'war': 'guerre',
  'western': 'western',
  'crime': 'policier',
  'family': 'famille',
  'animation': 'animation',
  'thriller': 'thriller',
  'documentary': 'documentaire',
  'news': 'news',
  'reality': 'reality',
  'talk': 'talk',
};

// Mapping des providers avec leurs noms
const PROVIDERS = {
  8: 'Netflix',
  9: 'Amazon Prime Video',
  350: 'Apple TV+',
  337: 'Disney+',  // ID correct pour Disney+
  531: 'Paramount+',  // ID correct pour Paramount+
  384: 'HBO Max',  // ID correct pour HBO Max
  2: 'Apple TV',
  3: 'Google Play Movies',
  68: 'Microsoft Store',
  192: 'YouTube',
  7: 'Vudu',
  386: 'Peacock Premium',
  387: 'Peacock'
};

export default function ProviderSeriesGenre() {
  const { t } = useLanguage();
  const { navigate } = useAppNavigation();
  const [, params] = useRoute("/provider/:id/series/:genre?");
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

  // Fetch series by provider and genre
  useEffect(() => {
    if (!providerId) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Mode catalogue complet trié par dernières sorties (exclure le futur)
        const today = new Date();
        const fmt = (d: Date) => d.toISOString().slice(0, 10);
        const firstAirDateLte = fmt(today);

        // Construire l'URL de base avec le provider (HBO Max: inclure Max 1899), tri par date de première diffusion
        const providerFilter = providerId === 384 ? '384|1899' : String(providerId);
        let baseUrl = `https://api.themoviedb.org/3/discover/tv?api_key=f3d757824f08ea2cff45eb8f47ca3a1e&with_watch_providers=${providerFilter}&watch_region=US&with_watch_monetization_types=flatrate|ads&include_adult=false&include_null_first_air_dates=false&sort_by=first_air_date.desc&first_air_date.lte=${firstAirDateLte}&page=${currentPage}`;
        
        // Ajouter le genre seulement s'il est défini
        if (genreId) {
          baseUrl += `&with_genres=${genreId}`;
        }
        
        // Essayer plusieurs régions pour avoir plus de contenu (garder la pagination TMDB)
        const regions = ['US', 'FR', 'GB', 'CA', 'NL', 'DE', 'ES', 'IT'];
        let result: any = null;
        for (const region of regions) {
          try {
            const url = baseUrl.replace('watch_region=US', `watch_region=${region}`);
            const response = await fetch(url);
            if (response.ok) {
              const data = await response.json();
              if (data.results && data.results.length > 0) {
                result = data; // Retourner les résultats avec pagination TMDB standard
                break;
              }
            }
          } catch (err) {
            console.log(`Région ${region} échouée, essai suivant...`);
            continue;
          }
        }
        
        // Si aucune région n'a donné de résultats, essayer sans restriction de région mais toujours avec filtre provider
        if (!result || !result.results || result.results.length === 0) {
          let fallbackUrl = `https://api.themoviedb.org/3/discover/tv?api_key=f3d757824f08ea2cff45eb8f47ca3a1e&with_watch_providers=${providerFilter}&with_watch_monetization_types=flatrate|ads&include_adult=false&include_null_first_air_dates=false&sort_by=first_air_date.desc&first_air_date.lte=${firstAirDateLte}&page=${currentPage}`;
          
          // Ajouter le genre seulement s'il est défini
          if (genreId) {
            fallbackUrl += `&with_genres=${genreId}`;
          }
          
          const response = await fetch(fallbackUrl);
          
          if (response.ok) {
            result = await response.json();
          }
        }

        // Fallback par réseau (Originals) pour certains providers si toujours vide
        if (!result || !result.results || result.results.length === 0) {
          const providerNetworkMap: Record<number, string[]> = {
            8: ['213'],           // Netflix
            384: ['49','3186'],   // HBO / HBO Max
            337: ['2739'],        // Disney+
            350: ['2552'],        // Apple TV+
            531: ['4330'],        // Paramount+
          };
          const networks = providerNetworkMap[providerId] || [];
          for (const net of networks) {
            try {
              let netUrl = `https://api.themoviedb.org/3/discover/tv?api_key=f3d757824f08ea2cff45eb8f47ca3a1e&with_networks=${net}&include_null_first_air_dates=false&include_adult=false&sort_by=first_air_date.desc&first_air_date.lte=${firstAirDateLte}&page=${currentPage}`;
              if (genreId) netUrl += `&with_genres=${genreId}`;
              const resp = await fetch(netUrl);
              if (resp.ok) {
                const data = await resp.json();
                if (data.results && data.results.length > 0) { result = data; break; }
              }
            } catch {}
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

  const series = data?.results || [];
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
    onPageChange(1);
  }, [genreSlug, providerId]);

  const handlePageChange = (page: number) => {
    onPageChange(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // If provider not found, show error
  if (!providerId) {
    return (
      <div className="h-screen overflow-y-auto fade-in-up">
        <DesktopSidebar />
        <div className="md:ml-64">
          <div className="container mx-auto px-4 md:px-8 lg:px-12 py-8">
            <div className="text-center py-12">
              <h1 className="text-2xl font-bold mb-4">Genre ou Provider non trouvé</h1>
              <p className="text-muted-foreground mb-4">
                Le genre "{genreSlug}" ou le provider "{providerId}" n'existe pas.
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

      {/* Header */}
      <div className="relative bg-gradient-to-b from-primary/20 to-background pt-20 md:pt-20">
        <div className="container mx-auto px-4 md:px-8 lg:px-12 py-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 break-words">
            {genreSlug 
              ? `${t("series.title")} ${genreName} ${t("provider.on")} ${providerName}`
              : `${t("series.title")} ${t("provider.on")} ${providerName}`
            }
          </h1>
          <p className="text-muted-foreground mb-4 max-w-2xl">
            {genreSlug 
              ? `${t("provider.discoverSeriesPrefix")} ${genreName} ${t("provider.discoverSeriesSuffix")} ${providerName}.`
              : `${t("provider.discoverSeriesPrefix")} ${t("provider.discoverSeriesSuffix")} ${providerName}.`
            }
          </p>
        </div>
      </div>

      {/* Contenu paginé */}
      <div className="container mx-auto px-4 md:px-8 lg:px-12 pt-2 pb-24 md:pb-8 md:py-8">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">{t("common.loading")}</p>
          </div>
        ) : series.length > 0 ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
              {series.map((serie: any) => {
                // Transformer les données pour correspondre au format attendu
                const transformedSerie = {
                  id: serie.id,
                  title: serie.name,
                  posterPath: serie.poster_path,
                  rating: Math.round(serie.vote_average * 10) / 10,
                  year: serie.first_air_date ? new Date(serie.first_air_date).getFullYear().toString() : "",
                  mediaType: "series" as const,
                };
                
                return (
                  <div key={serie.id} className="w-full">
                    <MediaCard
                      {...transformedSerie}
                      onClick={() => {
                        try {
                          const sess = JSON.parse(sessionStorage.getItem('paginationLast') || '{}');
                          sess[window.location.pathname] = currentPage;
                          sessionStorage.setItem('paginationLast', JSON.stringify(sess));
                        } catch {}
                        navigate(navPaths.seriesDetail(serie.id));
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
            <p className="text-muted-foreground">{t("provider.noSeriesAvailablePrefix")} {genreName} {t("provider.noSeriesAvailableSuffix")} {providerName}</p>
          </div>
        )}
      </div>
      </div>
      
    </div>
  );
}
