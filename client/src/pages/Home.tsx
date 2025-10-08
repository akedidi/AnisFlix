import { useState, useEffect } from "react";
import HeroSection from "@/components/HeroSection";
import MediaCarousel from "@/components/MediaCarousel";
import SearchBar from "@/components/SearchBar";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageToggle from "@/components/LanguageToggle";
import ProviderCard from "@/components/ProviderCard";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { 
  usePopularMovies, 
  useLatestMovies, 
  usePopularSeries, 
  useLatestSeries,
  useMoviesByProvider,
  useSeriesByProvider,
  useMultiSearch 
} from "@/hooks/useTMDB";

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  
  // Fetch data from TMDB
  const { data: popularMovies = [] } = usePopularMovies();
  const { data: latestMoviesData } = useLatestMovies();
  const { data: popularSeries = [] } = usePopularSeries();
  const { data: latestSeriesData } = useLatestSeries();
  const { data: netflixMovies = [] } = useMoviesByProvider(8);
  const { data: amazonSeries = [] } = useSeriesByProvider(9);
  const { data: searchResults = [] } = useMultiSearch(searchQuery);

  const latestMovies = latestMoviesData?.results || [];
  const latestSeries = latestSeriesData?.results || [];
  
  // Listen to language changes
  useEffect(() => {
    const handleLanguageChange = () => {
      window.location.reload();
    };
    window.addEventListener('languageChange', handleLanguageChange);
    return () => window.removeEventListener('languageChange', handleLanguageChange);
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

  // Providers with real counts
  const providers = [
    { id: 8, name: "Netflix", logoPath: "/pbpMk2JmcoNnQwx5JGpXngfoWtp.jpg", movieCount: netflixMovies.length, tvCount: 0 },
    { id: 9, name: "Amazon Prime", logoPath: "/emthp39XA2YScoYL1p0sdbAH2WA.jpg", movieCount: 0, tvCount: amazonSeries.length },
    { id: 350, name: "Apple TV+", logoPath: "/6uhKBfmtzFqOcLousHwZuzcrScK.jpg", movieCount: 0, tvCount: 0 },
    { id: 531, name: "Paramount+", logoPath: "/xbhHHa1YgtpwhC8lb1NQ3ACVcLd.jpg", movieCount: 0, tvCount: 0 },
    { id: 337, name: "Disney+", logoPath: "/7rwgEs15tFwyR9NPQ5vpzxTj19Q.jpg", movieCount: 0, tvCount: 0 },
    { id: 384, name: "HBO Max", logoPath: "/Ajqyt5aNxNGjmF9uOfxArGrdf3X.jpg", movieCount: 0, tvCount: 0 },
  ];

  // Mock continue watching - could be stored in localStorage
  const mockContinueWatching = [
    { id: 1, title: "Breaking Bad", posterPath: "/ggFHVNu6YYI5L9pCfOacjizRGt.jpg", rating: 9.5, year: "2008", progress: 45, mediaType: "tv" as const },
    { id: 2, title: "Stranger Things", posterPath: "/49WJfeN0moxb9IPfGn8AIqMGskD.jpg", rating: 8.7, year: "2016", progress: 60, mediaType: "tv" as const },
  ];

  return (
    <div className="min-h-screen pb-20 md:pb-0">
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
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>
      </div>

      <div className="space-y-8 md:space-y-12">
        {featured && (
          <HeroSection
            {...featured}
            onFavorite={() => console.log("Favorite")}
            onInfo={() => console.log("Info")}
          />
        )}

        <div className="container mx-auto px-4 md:px-8 lg:px-12 space-y-8 md:space-y-12">
          {mockContinueWatching.length > 0 && (
            <MediaCarousel
              title="Continuer à regarder"
              items={mockContinueWatching}
              onItemClick={(item) => {
                const path = item.mediaType === 'movie' ? `/movie/${item.id}` : `/series/${item.id}`;
                window.location.href = path;
              }}
            />
          )}

          <MediaCarousel
            title="Derniers films"
            items={latestMovies.slice(0, 10)}
            onItemClick={(item) => window.location.href = `/movie/${item.id}`}
            seeAllLink="/latest-movies"
          />

          <MediaCarousel
            title="Dernières séries"
            items={latestSeries.slice(0, 10)}
            onItemClick={(item) => window.location.href = `/series/${item.id}`}
            seeAllLink="/latest-series"
          />

          <MediaCarousel
            title="Films populaires"
            items={popularMovies.slice(0, 10)}
            onItemClick={(item) => window.location.href = `/movie/${item.id}`}
            seeAllLink="/latest-movies"
          />

          <MediaCarousel
            title="Séries populaires"
            items={popularSeries.slice(0, 10)}
            onItemClick={(item) => window.location.href = `/series/${item.id}`}
            seeAllLink="/latest-series"
          />

          <div className="space-y-4">
            <h2 className="text-2xl md:text-3xl font-semibold">Par plateforme</h2>
            <ScrollArea className="w-full">
              <div className="flex gap-4 pb-4">
                {providers.map((provider) => (
                  <div key={provider.id} className="w-40 flex-shrink-0">
                    <ProviderCard
                      {...provider}
                      onClick={() => console.log("Provider clicked:", provider.name)}
                    />
                  </div>
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>

          {netflixMovies.length > 0 && (
            <MediaCarousel
              title="Netflix - Derniers films"
              items={netflixMovies.slice(0, 10)}
              onItemClick={(item) => window.location.href = `/movie/${item.id}`}
            />
          )}

          {amazonSeries.length > 0 && (
            <MediaCarousel
              title="Amazon Prime - Dernières séries"
              items={amazonSeries.slice(0, 10)}
              onItemClick={(item) => window.location.href = `/series/${item.id}`}
            />
          )}
        </div>
      </div>
    </div>
  );
}
