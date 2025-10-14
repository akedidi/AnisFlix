import { useState, useEffect } from "react";
import HeroSection from "@/components/HeroSection";
import MediaCarousel from "@/components/MediaCarousel";
import SearchBar from "@/components/SearchBar";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageSelect from "@/components/LanguageSelect";
import BottomNav from "@/components/BottomNav";
import DesktopSidebar from "@/components/DesktopSidebar";
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
  const [searchQuery, setSearchQuery] = useState("");
  const { t } = useLanguage();
  const { isFavorite, toggleFavorite } = useFavorites();
  
  // Fetch data from TMDB
  const { data: popularMoviesData } = usePopularMovies();
  const { data: latestMoviesData } = useLatestMovies();
  const { data: popularSeriesData } = usePopularSeries();
  const { data: latestSeriesData } = useLatestSeries();
  
  // Fetch anime data
  const { data: animeMoviesData } = useMoviesByGenre(16); // Animation genre
  const { data: animeSeriesData } = useSeriesByGenre(16); // Animation genre
  
  const popularMovies = popularMoviesData?.results || [];
  const latestMovies = latestMoviesData?.results || [];
  const popularSeries = popularSeriesData?.results || [];
  const latestSeries = latestSeriesData?.results || [];
  const animeMovies = animeMoviesData?.results || [];
  const animeSeries = animeSeriesData?.results || [];
  const { data: netflixMoviesData } = useMoviesByProvider(8);
  const { data: netflixSeriesData } = useSeriesByProvider(8);
  const { data: amazonSeriesData } = useSeriesByProvider(9);
  const { data: amazonMoviesData } = useMoviesByProvider(9);
  const { data: hboMaxSeriesData } = useSeriesByProvider(1899);
  const { data: hboMaxMoviesData } = useMoviesByProvider(1899);
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
  const { data: searchResults = [] } = useMultiSearch(searchQuery);
  
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
    window.scrollTo(0, 0);
  }, []);

  // Use first popular movie as featured
  const featured = popularMovies[0] ? {
    title: popularMovies[0].title,
    overview: "",
    backdropPath: popularMovies[0].posterPath,
    rating: popularMovies[0].rating,
    year: popularMovies[0].year,
    mediaType: popularMovies[0].mediaType,
  } : null;

  // Providers
  const providers = [
    { id: 8, name: "Netflix", logoPath: "/pbpMk2JmcoNnQwx5JGpXngfoWtp.jpg" },
    { id: 9, name: "Amazon Prime", logoPath: "/pvske1MyAoymrs5bguRfVqYiM9a.jpg" },
    { id: 350, name: "Apple TV+", logoPath: "/6uhKBfmtzFqOcLousHwZuzcrScK.jpg" },
    { id: 531, name: "Paramount+", logoPath: "/h5DcR0J2EESLitnhR8xLG1QymTE.jpg" },
    { id: 337, name: "Disney+", logoPath: "/7rwgEs15tFwyR9NPQ5vpzxTj19Q.jpg" },
    { id: 1899, name: "HBO Max", logoPath: "/jbe4gVSfRlbPTdESXhEKpornsfu.jpg" },
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

  return (
    <div className="min-h-screen fade-in-up">
      {/* Desktop Sidebar */}
      <DesktopSidebar />
      
      {/* Main Content */}
      <div className="md:ml-64">
        {/* Search Bar */}
        <div className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border relative">
          <div className="container mx-auto px-4 md:px-8 lg:px-12 py-3">
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
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
        
        {/* Content */}
        <div className="pt-4 sm:pt-6 md:pt-8">
          <div className="space-y-8 md:space-y-12">
        {featured && (
          <HeroSection
            {...featured}
            isFavorite={popularMovies[0] ? isFavorite(popularMovies[0].id, 'movie') : false}
            onFavorite={() => {
              if (popularMovies[0]) {
                toggleFavorite({
                  id: popularMovies[0].id,
                  title: popularMovies[0].title,
                  posterPath: popularMovies[0].posterPath,
                  rating: popularMovies[0].rating,
                  year: popularMovies[0].year || '',
                  mediaType: 'movie'
                });
              }
            }}
            onInfo={() => {
              if (popularMovies[0]) {
                window.location.href = `/movie/${popularMovies[0].id}`;
              }
            }}
          />
        )}

        <div className="container mx-auto px-4 md:px-8 lg:px-12 space-y-8 md:space-y-12">
          {continueWatching.length > 0 && (
            <MediaCarousel
              title={t("home.continueWatching")}
              items={continueWatching}
              onItemClick={(item) => {
                const path = item.mediaType === 'movie' ? `/movie/${item.id}` : `/series/${item.id}`;
                window.location.href = path;
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
                      onClick={() => window.location.href = `/provider/${provider.id}`}
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
            onItemClick={(item) => window.location.href = `/movie/${item.id}`}
            seeAllLink="/latest-movies"
          />

          <MediaCarousel
            title={t("home.latestSeries")}
            items={latestSeries.slice(0, 10)}
            onItemClick={(item) => window.location.href = `/series/${item.id}`}
            seeAllLink="/latest-series"
          />

          {/* Films et séries populaires */}
          <MediaCarousel
            title={t("home.popularMovies")}
            items={popularMovies.slice(0, 10)}
            onItemClick={(item) => window.location.href = `/movie/${item.id}`}
            seeAllLink="/popular-movies"
          />

          <MediaCarousel
            title={t("home.popularSeries")}
            items={popularSeries.slice(0, 10)}
            onItemClick={(item) => window.location.href = `/series/${item.id}`}
            seeAllLink="/popular-series"
          />

          {/* Catégories Anime */}
          <MediaCarousel
            title="Derniers films anime"
            items={animeMovies.slice(0, 10)}
            onItemClick={(item) => window.location.href = `/movie/${item.id}`}
            showSeeAllButton={true}
          />

          <MediaCarousel
            title="Dernières séries anime"
            items={animeSeries.slice(0, 10)}
            onItemClick={(item) => window.location.href = `/series/${item.id}`}
            showSeeAllButton={true}
          />

          <MediaCarousel
            title="Films anime populaires"
            items={animeMovies.slice(10, 20)}
            onItemClick={(item) => window.location.href = `/movie/${item.id}`}
            showSeeAllButton={true}
          />

          <MediaCarousel
            title="Séries anime populaires"
            items={animeSeries.slice(10, 20)}
            onItemClick={(item) => window.location.href = `/series/${item.id}`}
            showSeeAllButton={true}
          />

          {/* Netflix */}
          {netflixMovies.length > 0 && (
            <MediaCarousel
              title={`Netflix - ${t("home.latestMovies")}`}
              items={netflixMovies.slice(0, 10)}
              onItemClick={(item) => window.location.href = `/movie/${item.id}`}
              showSeeAllButton={true}
            />
          )}

          {netflixSeries.length > 0 && (
            <MediaCarousel
              title={`Netflix - ${t("home.latestSeries")}`}
              items={netflixSeries.slice(0, 10)}
              onItemClick={(item) => window.location.href = `/series/${item.id}`}
              showSeeAllButton={true}
            />
          )}

          {/* Amazon Prime */}
          {amazonMovies.length > 0 && (
            <MediaCarousel
              title={`Amazon Prime - ${t("home.latestMovies")}`}
              items={amazonMovies.slice(0, 10)}
              onItemClick={(item) => window.location.href = `/movie/${item.id}`}
              showSeeAllButton={true}
            />
          )}

          {amazonSeries.length > 0 && (
            <MediaCarousel
              title={`Amazon Prime - ${t("home.latestSeries")}`}
              items={amazonSeries.slice(0, 10)}
              onItemClick={(item) => window.location.href = `/series/${item.id}`}
              showSeeAllButton={true}
            />
          )}

          {/* Apple TV+ */}
          {appleTvMovies.length > 0 && (
            <MediaCarousel
              title={`Apple TV+ - ${t("home.latestMovies")}`}
              items={appleTvMovies.slice(0, 10)}
              onItemClick={(item) => window.location.href = `/movie/${item.id}`}
              showSeeAllButton={true}
            />
          )}

          {appleTvSeries.length > 0 && (
            <MediaCarousel
              title={`Apple TV+ - ${t("home.latestSeries")}`}
              items={appleTvSeries.slice(0, 10)}
              onItemClick={(item) => window.location.href = `/series/${item.id}`}
              showSeeAllButton={true}
            />
          )}

          {/* Disney+ */}
          {disneyMovies.length > 0 && (
            <MediaCarousel
              title={`Disney+ - ${t("home.latestMovies")}`}
              items={disneyMovies.slice(0, 10)}
              onItemClick={(item) => window.location.href = `/movie/${item.id}`}
              showSeeAllButton={true}
            />
          )}

          {disneySeries.length > 0 && (
            <MediaCarousel
              title={`Disney+ - ${t("home.latestSeries")}`}
              items={disneySeries.slice(0, 10)}
              onItemClick={(item) => window.location.href = `/series/${item.id}`}
              showSeeAllButton={true}
            />
          )}

          {/* HBO Max */}
          {hboMaxMovies.length > 0 && (
            <MediaCarousel
              title={`HBO Max - ${t("home.latestMovies")}`}
              items={hboMaxMovies.slice(0, 10)}
              onItemClick={(item) => window.location.href = `/movie/${item.id}`}
              showSeeAllButton={true}
            />
          )}

          {hboMaxSeries.length > 0 && (
            <MediaCarousel
              title={`HBO Max - ${t("home.latestSeries")}`}
              items={hboMaxSeries.slice(0, 10)}
              onItemClick={(item) => window.location.href = `/series/${item.id}`}
              showSeeAllButton={true}
            />
          )}
        </div>
        </div>
        </div>

      </div>
      
      {/* Mobile Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
