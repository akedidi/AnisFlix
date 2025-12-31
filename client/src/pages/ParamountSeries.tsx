import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
;
import MediaCard from "@/components/MediaCard";
import SearchBar from "@/components/SearchBar";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageSelect from "@/components/LanguageSelect";
import Pagination from "@/components/Pagination";

import DesktopSidebar from "@/components/DesktopSidebar";
import ContinueWatching from "@/components/ContinueWatching";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { usePaginationState } from "@/hooks/usePaginationState";
import { useSeriesByProvider, useSeriesByProviderAndGenre, useMultiSearch } from "@/hooks/useTMDB";
import { useScrollPosition } from "@/hooks/useScrollPosition";
import { navPaths } from "@/lib/nativeNavigation";
import { useAppNavigation } from "@/lib/useAppNavigation";

// Type for transformed media data
type TransformedMedia = {
  id: number;
  title: string;
  posterPath: string | null;
  rating: number;
  year?: string;
  mediaType?: "movie" | "tv" | "anime" | "documentary" | "series";
};

export default function ParamountSeries() {
  const { t } = useLanguage();
  const { navigate } = useAppNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const { page: currentPage, onPageChange } = usePaginationState(undefined, 1);
  const { restoreScrollPosition } = useScrollPosition('paramount-series');

  // Fetch data from TMDB - Only Paramount+ series
  const { data: seriesData, isLoading: seriesLoading } = useSeriesByProvider(531, currentPage);
  const { data: searchResults = [] } = useMultiSearch(searchQuery);

  // Paramount+ specific series genres
  const { data: actionSeriesData } = useSeriesByProviderAndGenre(531, 10759); // Action & Adventure
  const { data: comedySeriesData } = useSeriesByProviderAndGenre(531, 35); // Comedy
  const { data: dramaSeriesData } = useSeriesByProviderAndGenre(531, 18); // Drama
  const { data: crimeSeriesData } = useSeriesByProviderAndGenre(531, 80); // Crime
  const { data: mysterySeriesData } = useSeriesByProviderAndGenre(531, 9648); // Mystery
  const { data: sciFiSeriesData } = useSeriesByProviderAndGenre(531, 10765); // Sci-Fi & Fantasy
  const { data: thrillerSeriesData } = useSeriesByProviderAndGenre(531, 53); // Thriller
  const { data: animationSeriesData } = useSeriesByProviderAndGenre(531, 16); // Animation
  const { data: documentarySeriesData } = useSeriesByProviderAndGenre(531, 99); // Documentary
  const { data: realitySeriesData } = useSeriesByProviderAndGenre(531, 10764); // Reality

  const series = seriesData?.results || [];
  const actionSeries = actionSeriesData?.results || [];
  const comedySeries = comedySeriesData?.results || [];
  const dramaSeries = dramaSeriesData?.results || [];
  const crimeSeries = crimeSeriesData?.results || [];
  const mysterySeries = mysterySeriesData?.results || [];
  const sciFiSeries = sciFiSeriesData?.results || [];
  const thrillerSeries = thrillerSeriesData?.results || [];
  const animationSeries = animationSeriesData?.results || [];
  const documentarySeries = documentarySeriesData?.results || [];
  const realitySeries = realitySeriesData?.results || [];
  const totalPages = seriesData?.total_pages || 1;

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

  // Reset page when search changes - DISABLED to fix history navigation
  /* useEffect(() => {
    onPageChange(1);
  }, [searchQuery]); */

  const handlePageChange = (page: number) => {
    onPageChange(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="h-screen overflow-y-auto bg-background">
      <DesktopSidebar />

      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">

              <h1 className="text-xl font-semibold">Séries Paramount+</h1>
            </div>

            <div className="flex items-center gap-2">
              <SearchBar
                onSearch={setSearchQuery}
                placeholder="Rechercher des séries Paramount+..."
              />
              <LanguageSelect />
              <ThemeToggle />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 pt-2 pb-24 md:pb-6 md:py-6 md:pt-20">
        {/* Continue Watching */}
        <ContinueWatching maxItems={20} />

        {/* Search Results */}
        {searchQuery && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold">Résultats de recherche</h2>
            {searchResults.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                {searchResults
                  .filter((item: any) => item.media_type === 'tv')
                  .slice(0, 20)
                  .map((serie: any) => (
                    <div key={serie.id} className="w-full">
                      <MediaCard
                        id={serie.id}
                        title={serie.name}
                        posterPath={serie.poster_path}
                        rating={Math.round(serie.vote_average * 10) / 10}
                        year={serie.first_air_date ? new Date(serie.first_air_date).getFullYear().toString() : ""}
                        mediaType="tv"
                        onClick={() => navigate(navPaths.seriesDetail(serie.id))}
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
            {/* Latest Paramount+ Series */}
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold">Dernières séries Paramount+</h2>
              {seriesLoading ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Chargement des séries Paramount+...</p>
                </div>
              ) : series.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                  {series.map((serie: TransformedMedia) => (
                    <div key={serie.id} className="w-full">
                      <MediaCard
                        {...serie}
                        mediaType="tv"
                        onClick={() => navigate(navPaths.seriesDetail(serie.id))}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">Aucune série Paramount+ disponible</p>
              )}
            </div>

            {/* Genre Categories */}
            {actionSeries.length > 0 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold">Séries Action Paramount+</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                  {actionSeries.slice(0, 10).map((serie: TransformedMedia) => (
                    <div key={serie.id} className="w-full">
                      <MediaCard
                        {...serie}
                        mediaType="tv"
                        onClick={() => navigate(navPaths.seriesDetail(serie.id))}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {comedySeries.length > 0 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold">Séries Comédie Paramount+</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                  {comedySeries.slice(0, 10).map((serie: TransformedMedia) => (
                    <div key={serie.id} className="w-full">
                      <MediaCard
                        {...serie}
                        mediaType="tv"
                        onClick={() => navigate(navPaths.seriesDetail(serie.id))}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {dramaSeries.length > 0 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold">Séries Drame Paramount+</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                  {dramaSeries.slice(0, 10).map((serie: TransformedMedia) => (
                    <div key={serie.id} className="w-full">
                      <MediaCard
                        {...serie}
                        mediaType="tv"
                        onClick={() => navigate(navPaths.seriesDetail(serie.id))}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {crimeSeries.length > 0 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold">Séries Crime Paramount+</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                  {crimeSeries.slice(0, 10).map((serie: TransformedMedia) => (
                    <div key={serie.id} className="w-full">
                      <MediaCard
                        {...serie}
                        mediaType="tv"
                        onClick={() => navigate(navPaths.seriesDetail(serie.id))}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {mysterySeries.length > 0 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold">Séries Mystère Paramount+</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                  {mysterySeries.slice(0, 10).map((serie: TransformedMedia) => (
                    <div key={serie.id} className="w-full">
                      <MediaCard
                        {...serie}
                        mediaType="tv"
                        onClick={() => navigate(navPaths.seriesDetail(serie.id))}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {sciFiSeries.length > 0 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold">Séries Science-Fiction Paramount+</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                  {sciFiSeries.slice(0, 10).map((serie: TransformedMedia) => (
                    <div key={serie.id} className="w-full">
                      <MediaCard
                        {...serie}
                        mediaType="tv"
                        onClick={() => navigate(navPaths.seriesDetail(serie.id))}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {thrillerSeries.length > 0 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold">Séries Thriller Paramount+</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                  {thrillerSeries.slice(0, 10).map((serie: TransformedMedia) => (
                    <div key={serie.id} className="w-full">
                      <MediaCard
                        {...serie}
                        mediaType="tv"
                        onClick={() => navigate(navPaths.seriesDetail(serie.id))}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {animationSeries.length > 0 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold">Séries Animation Paramount+</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                  {animationSeries.slice(0, 10).map((serie: TransformedMedia) => (
                    <div key={serie.id} className="w-full">
                      <MediaCard
                        {...serie}
                        mediaType="tv"
                        onClick={() => navigate(navPaths.seriesDetail(serie.id))}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {documentarySeries.length > 0 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold">Documentaires Paramount+</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                  {documentarySeries.slice(0, 10).map((serie: TransformedMedia) => (
                    <div key={serie.id} className="w-full">
                      <MediaCard
                        {...serie}
                        mediaType="tv"
                        onClick={() => navigate(navPaths.seriesDetail(serie.id))}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {realitySeries.length > 0 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold">Séries Téléréalité Paramount+</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                  {realitySeries.slice(0, 10).map((serie: TransformedMedia) => (
                    <div key={serie.id} className="w-full">
                      <MediaCard
                        {...serie}
                        mediaType="tv"
                        onClick={() => navigate(navPaths.seriesDetail(serie.id))}
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
