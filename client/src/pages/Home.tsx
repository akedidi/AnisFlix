import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import HeroSection from "@/components/HeroSection";
import MediaCarousel from "@/components/MediaCarousel";
import CommonLayout from "@/components/CommonLayout";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import ProviderCard from "@/components/ProviderCard";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useFavorites } from "@/hooks/useFavorites";
import { 
  usePopularMovies, 
  useLatestMovies, 
  usePopularSeries, 
  useLatestSeries,
  useMoviesByProvider,
  useSeriesByProvider,
  useMoviesByGenre,
  useSeriesByGenre,
  useMultiSearch 
} from "@/hooks/useTMDB";
import { getWatchProgress } from "@/lib/watchProgress";

export default function Home() {
  const { t } = useLanguage();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [, setLocation] = useLocation();
  
  // Fetch data from TMDB
  const { data: popularMoviesData } = usePopularMovies();
  const { data: latestMoviesData } = useLatestMovies();
  const { data: popularSeriesData } = usePopularSeries();
  const { data: latestSeriesData } = useLatestSeries();
  
  // Fetch anime data
  const { data: animeMoviesData } = useMoviesByGenre(16); // Animation genre
  const { data: animeSeriesData } = useSeriesByGenre(16); // Animation genre
  const { data: popularAnimeMoviesData } = useMoviesByGenre(16, 1); // Page 1 pour les films anime populaires
  const { data: popularAnimeSeriesData } = useSeriesByGenre(16, 2); // Page 2 pour les séries anime populaires
  
  const popularMovies = popularMoviesData?.results || [];
  const latestMovies = latestMoviesData?.results || [];
  const popularSeries = popularSeriesData?.results || [];
  const latestSeries = latestSeriesData?.results || [];
  const animeMovies = animeMoviesData?.results || [];
  const animeSeries = animeSeriesData?.results || [];
  const popularAnimeMovies = popularAnimeMoviesData?.results || [];
  const popularAnimeSeries = popularAnimeSeriesData?.results || [];
  const { data: netflixMoviesData } = useMoviesByProvider(8);
  const { data: netflixSeriesData } = useSeriesByProvider(8);
  const { data: amazonSeriesData } = useSeriesByProvider(9);
  const { data: amazonMoviesData } = useMoviesByProvider(9);
  const { data: hboMaxSeriesData } = useSeriesByProvider(384);
  const { data: hboMaxMoviesData } = useMoviesByProvider(384);
  const { data: disneyMoviesData } = useMoviesByProvider(337);
  const { data: disneySeriesData } = useSeriesByProvider(337);
  const { data: appleTvMoviesData } = useMoviesByProvider(350);
  const { data: appleTvSeriesData } = useSeriesByProvider(350);
  
  const netflixMovies = netflixMoviesData?.results || [];
  const netflixSeries = netflixSeriesData?.results || [];
  const amazonSeries = amazonSeriesData?.results || [];
  const amazonMovies = amazonMoviesData?.results || [];
  const hboMaxSeries = hboMaxSeriesData?.results || [];
  const hboMaxMovies = hboMaxMoviesData?.results || [];
  const disneyMovies = disneyMoviesData?.results || [];
  const disneySeries = disneySeriesData?.results || [];
  const appleTvMovies = appleTvMoviesData?.results || [];
  const appleTvSeries = appleTvSeriesData?.results || [];
  
  // Listen to language changes
  useEffect(() => {
    const handleLanguageChange = () => {
      window.location.reload();
    };
    window.addEventListener('languageChange', handleLanguageChange);
    return () => window.removeEventListener('languageChange', handleLanguageChange);
  }, []);

  // S'assurer que la page commence en haut
  useEffect(() => {
    // Désactivé pour éviter les conflits avec le scroll automatique des autres pages
    // window.scrollTo(0, 0);
    console.log('📱 [HOME] Scroll automatique désactivé pour éviter les conflits');
  }, []);


  // Providers
  const providers = [
    { id: 8, name: "Netflix", logoPath: "/pbpMk2JmcoNnQwx5JGpXngfoWtp.jpg" },
    { id: 9, name: "Amazon Prime", logoPath: "/pvske1MyAoymrs5bguRfVqYiM9a.jpg" },
    { id: 350, name: "Apple TV+", logoPath: "/6uhKBfmtzFqOcLousHwZuzcrScK.jpg" },
    { id: 531, name: "Paramount+", logoPath: "/h5DcR0J2EESLitnhR8xLG1QymTE.jpg" },
    { id: 337, name: "Disney+", logoPath: "/7rwgEs15tFwyR9NPQ5vpzxTj19Q.jpg" },
    { id: 384, name: "HBO Max", logoPath: "/jbe4gVSfRlbPTdESXhEKpornsfu.jpg" },
  ];

  // Charger la progression réelle depuis localStorage
  const [continueWatching, setContinueWatching] = useState(() => {
    const progress = getWatchProgress();
    // Ne montrer que les vidéos avec progression < 95%
    return progress
      .filter(p => p.progress < 95 && p.progress > 0)
      .map(p => ({
        id: p.mediaId, // ID réel (seriesId pour les séries, movieId pour les films)
        title: p.title, // Contient déjà "S{season}E{episode}" pour les séries
        posterPath: p.posterPath,
        rating: 0,
        year: "",
        progress: p.progress,
        mediaType: p.mediaType,
      }));
  });

  // Mettre à jour la liste toutes les 10 secondes
  useEffect(() => {
    const interval = setInterval(() => {
      const progress = getWatchProgress();
      setContinueWatching(
        progress
          .filter(p => p.progress < 95 && p.progress > 0)
          .map(p => ({
            id: p.mediaId,
            title: p.title,
            posterPath: p.posterPath,
            rating: 0,
            year: "",
            progress: p.progress,
            mediaType: p.mediaType,
          }))
      );
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <CommonLayout showSearch={true} onRefresh={handleRefresh}>
      <div className="space-y-8 md:space-y-12 -mt-16 md:mt-0" style={{ paddingLeft: 0, paddingRight: 0 }}>
        {popularMovies.length > 0 && (
          <HeroSection
            items={popularMovies.slice(0, 5).map((movie: any) => ({
              id: movie.id,
              title: movie.title,
              overview: movie.overview,
              backdropPath: movie.backdropPath,
              rating: movie.rating,
              year: movie.year,
              mediaType: 'movie' as const,
            }))}
            isFavorite={(item) => isFavorite(item.id, 'movie')}
            onFavorite={(item) => {
              toggleFavorite({
                id: item.id,
                title: item.title,
                posterPath: item.backdropPath || '',
                rating: item.rating,
                year: item.year || '',
                mediaType: 'movie'
              });
            }}
            onInfo={(item) => {
              setLocation(`/movie/${item.id}`);
            }}
            onClick={(item) => {
              setLocation(`/movie/${item.id}`);
            }}
            autoRotate={true}
            rotationInterval={6000}
          />
        )}

        <div className="space-y-8 md:space-y-12 px-4 md:px-8 lg:px-12">
          {continueWatching.length > 0 && (
            <MediaCarousel
              title={t("home.continueWatching")}
              items={continueWatching}
              onItemClick={(item) => {
                const path = item.mediaType === 'movie' ? `/movie/${item.id}` : `/series/${item.id}`;
                setLocation(path);
              }}
            />
          )}

          <div className="space-y-4">
            <h2 className="text-2xl md:text-3xl font-semibold">{t("home.byPlatform")}</h2>
            <ScrollArea className="w-full">
              <div className="flex gap-4 pb-4">
                {providers.map((provider) => (
                  <div key={provider.id} className="w-40 flex-shrink-0">
                    <ProviderCard
                      {...provider}
                      onClick={() => setLocation(`/provider/${provider.id}`)}
                    />
                  </div>
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>

          {/* Derniers films et dernières séries en premier */}
          <MediaCarousel
            title={t("home.latestMovies")}
            items={latestMovies.slice(0, 10)}
            onItemClick={(item) => setLocation(`/movie/${item.id}`)}
            seeAllLink="/latest-movies"
          />

          <MediaCarousel
            title={t("home.latestSeries")}
            items={latestSeries.slice(0, 10)}
            onItemClick={(item) => setLocation(`/series/${item.id}`)}
            seeAllLink="/latest-series"
          />

          {/* Films et séries populaires */}
          <MediaCarousel
            title={t("home.popularMovies")}
            items={popularMovies.slice(0, 10)}
            onItemClick={(item) => setLocation(`/movie/${item.id}`)}
            seeAllLink="/popular-movies"
          />

          <MediaCarousel
            title={t("home.popularSeries")}
            items={popularSeries.slice(0, 10)}
            onItemClick={(item) => setLocation(`/series/${item.id}`)}
            seeAllLink="/popular-series"
          />

          {/* Catégories Anime */}
          <MediaCarousel
            title={t("anime.latestMovies")}
            items={animeMovies.slice(0, 10)}
            onItemClick={(item) => setLocation(`/movie/${item.id}`)}
            showSeeAllButton={true}
            sectionId="anime-movies-latest"
          />

          <MediaCarousel
            title={t("anime.latestSeries")}
            items={animeSeries.slice(0, 10)}
            onItemClick={(item) => setLocation(`/series/${item.id}`)}
            showSeeAllButton={true}
            sectionId="anime-series-latest"
          />

          <MediaCarousel
            title={t("anime.popularMovies")}
            items={popularAnimeMovies}
            onItemClick={(item) => setLocation(`/movie/${item.id}`)}
            showSeeAllButton={true}
            sectionId="anime-movies-popular"
          />

          <MediaCarousel
            title={t("anime.popularSeries")}
            items={popularAnimeSeries}
            onItemClick={(item) => setLocation(`/series/${item.id}`)}
            showSeeAllButton={true}
            sectionId="anime-series-popular"
          />

          {/* Netflix */}
          {netflixMovies.length > 0 && (
            <MediaCarousel
              title={`${t("platform.netflix")} - ${t("home.latestMovies")}`}
              items={netflixMovies.slice(0, 10)}
              onItemClick={(item) => setLocation(`/movie/${item.id}`)}
              showSeeAllButton={true}
            />
          )}

          {netflixSeries.length > 0 && (
            <MediaCarousel
              title={`${t("platform.netflix")} - ${t("home.latestSeries")}`}
              items={netflixSeries.slice(0, 10)}
              onItemClick={(item) => setLocation(`/series/${item.id}`)}
              showSeeAllButton={true}
            />
          )}

          {/* Amazon Prime */}
          {amazonMovies.length > 0 && (
            <MediaCarousel
              title={`${t("platform.amazonPrime")} - ${t("home.latestMovies")}`}
              items={amazonMovies.slice(0, 10)}
              onItemClick={(item) => setLocation(`/movie/${item.id}`)}
              showSeeAllButton={true}
            />
          )}

          {amazonSeries.length > 0 && (
            <MediaCarousel
              title={`${t("platform.amazonPrime")} - ${t("home.latestSeries")}`}
              items={amazonSeries.slice(0, 10)}
              onItemClick={(item) => setLocation(`/series/${item.id}`)}
              showSeeAllButton={true}
            />
          )}

          {/* Apple TV+ */}
          {appleTvMovies.length > 0 && (
            <MediaCarousel
              title={`${t("platform.appleTV")} - ${t("home.latestMovies")}`}
              items={appleTvMovies.slice(0, 10)}
              onItemClick={(item) => setLocation(`/movie/${item.id}`)}
              showSeeAllButton={true}
            />
          )}

          {appleTvSeries.length > 0 && (
            <MediaCarousel
              title={`${t("platform.appleTV")} - ${t("home.latestSeries")}`}
              items={appleTvSeries.slice(0, 10)}
              onItemClick={(item) => setLocation(`/series/${item.id}`)}
              showSeeAllButton={true}
            />
          )}

          {/* Disney+ */}
          {disneyMovies.length > 0 && (
            <MediaCarousel
              title={`${t("platform.disney")} - ${t("home.latestMovies")}`}
              items={disneyMovies.slice(0, 10)}
              onItemClick={(item) => setLocation(`/movie/${item.id}`)}
              showSeeAllButton={true}
            />
          )}

          {disneySeries.length > 0 && (
            <MediaCarousel
              title={`${t("platform.disney")} - ${t("home.latestSeries")}`}
              items={disneySeries.slice(0, 10)}
              onItemClick={(item) => setLocation(`/series/${item.id}`)}
              showSeeAllButton={true}
            />
          )}

          {/* HBO Max */}
          {hboMaxMovies.length > 0 && (
            <MediaCarousel
              title={`${t("platform.hboMax")} - ${t("home.latestMovies")}`}
              items={hboMaxMovies.slice(0, 10)}
              onItemClick={(item) => setLocation(`/movie/${item.id}`)}
              showSeeAllButton={true}
            />
          )}

          {hboMaxSeries.length > 0 && (
            <MediaCarousel
              title={`${t("platform.hboMax")} - ${t("home.latestSeries")}`}
              items={hboMaxSeries.slice(0, 10)}
              onItemClick={(item) => setLocation(`/series/${item.id}`)}
              showSeeAllButton={true}
            />
          )}
        </div>
        </div>
    </CommonLayout>
  );
}
