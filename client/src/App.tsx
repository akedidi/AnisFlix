import { Router, Route } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LanguageProvider } from "@/lib/i18n/LanguageContext";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import BottomNav from "@/components/BottomNav";

// Pages
import Home from "@/pages/Home";
import Movies from "@/pages/Movies";
import Series from "@/pages/Series";
import MovieDetail from "@/pages/MovieDetail";
import SeriesDetail from "@/pages/SeriesDetail";
import LatestMovies from "@/pages/LatestMovies";
import LatestSeries from "@/pages/LatestSeries";
import PopularMovies from "@/pages/PopularMovies";
import PopularSeries from "@/pages/PopularSeries";
import MovieGenre from "@/pages/MovieGenre";
import SeriesGenre from "@/pages/SeriesGenre";
import MoviesGenre from "@/pages/MoviesGenre";
import SeriesGenreNew from "@/pages/SeriesGenre";

// Anime pages
import AnimeMoviesLatest from "@/pages/AnimeMoviesLatest";
import AnimeSeriesLatest from "@/pages/AnimeSeriesLatest";
import AnimeMoviesPopular from "@/pages/AnimeMoviesPopular";
import AnimeSeriesPopular from "@/pages/AnimeSeriesPopular";
import Settings from "@/pages/Settings";
import TVChannels from "@/pages/TVChannels";
import Favorites from "@/pages/Favorites";
import NotFound from "@/pages/not-found";

// Provider pages
import NetflixContent from "@/pages/NetflixContent";
import AmazonContent from "@/pages/AmazonContent";
import DisneyContent from "@/pages/DisneyContent";
import HBOMaxContent from "@/pages/HBOMaxContent";
import AppleTVContent from "@/pages/AppleTVContent";
import ParamountContent from "@/pages/ParamountContent";
import ProviderDetail from "@/pages/ProviderDetail";

// Provider Movies pages
import NetflixMovies from "@/pages/NetflixMovies";
import NetflixMoviesTest from "@/pages/NetflixMoviesTest";
import NetflixMoviesSimple from "@/pages/NetflixMoviesSimple";
import TestProvider from "@/pages/TestProvider";
import AmazonMovies from "@/pages/AmazonMovies";
import DisneyMovies from "@/pages/DisneyMovies";
import HBOMaxMovies from "@/pages/HBOMaxMovies";
import AppleTVMovies from "@/pages/AppleTVMovies";
import ParamountMovies from "@/pages/ParamountMovies";

// Provider Series pages
import NetflixSeries from "@/pages/NetflixSeries";
import AmazonSeries from "@/pages/AmazonSeries";
import DisneySeries from "@/pages/DisneySeries";
import HBOMaxSeries from "@/pages/HBOMaxSeries";
import AppleTVSeries from "@/pages/AppleTVSeries";
import ParamountSeries from "@/pages/ParamountSeries";

// Test components
import VidSrcTest from "@/components/VidSrcTest";
import MovixDownloadTest from "@/components/MovixDownloadTest";
import MovixDownloadChecker from "@/components/MovixDownloadChecker";

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="anisflix-theme">
        <LanguageProvider>
          <Router>
            <Route path="/" component={Home} />
            <Route path="/movies" component={Movies} />
            <Route path="/series" component={Series} />
            <Route path="/movie/:id" component={MovieDetail} />
            <Route path="/series/:id" component={SeriesDetail} />
            <Route path="/latest-movies" component={LatestMovies} />
            <Route path="/latest-series" component={LatestSeries} />
            <Route path="/popular-movies" component={PopularMovies} />
            <Route path="/popular-series" component={PopularSeries} />
            <Route path="/movies/genre/:id" component={MovieGenre} />
            <Route path="/series/genre/:id" component={SeriesGenre} />
            <Route path="/movies-genre/:genre" component={MoviesGenre} />
            <Route path="/series-genre/:genre" component={SeriesGenreNew} />
            
            {/* Anime routes */}
            <Route path="/anime-movies-latest" component={AnimeMoviesLatest} />
            <Route path="/anime-series-latest" component={AnimeSeriesLatest} />
            <Route path="/anime-movies-popular" component={AnimeMoviesPopular} />
            <Route path="/anime-series-popular" component={AnimeSeriesPopular} />
            <Route path="/settings" component={Settings} />
            <Route path="/tv-channels" component={TVChannels} />
            <Route path="/favorites" component={Favorites} />
            
            {/* Provider routes */}
            <Route path="/netflix" component={NetflixContent} />
            <Route path="/netflix-content" component={NetflixContent} />
            <Route path="/amazon" component={AmazonContent} />
            <Route path="/amazon-content" component={AmazonContent} />
            <Route path="/disney" component={DisneyContent} />
            <Route path="/disney-content" component={DisneyContent} />
            <Route path="/hbo-max" component={HBOMaxContent} />
            <Route path="/hbo-max-content" component={HBOMaxContent} />
            <Route path="/apple-tv" component={AppleTVContent} />
            <Route path="/apple-tv-content" component={AppleTVContent} />
            <Route path="/paramount" component={ParamountContent} />
            <Route path="/paramount-content" component={ParamountContent} />
            <Route path="/provider/:id" component={ProviderDetail} />
            
            {/* Provider Movies routes */}
            <Route path="/netflix-movies" component={NetflixMovies} />
            <Route path="/netflix-movies-original" component={NetflixMovies} />
            <Route path="/netflix-movies-test" component={NetflixMoviesTest} />
            <Route path="/test-provider" component={TestProvider} />
            <Route path="/amazon-movies" component={AmazonMovies} />
            <Route path="/disney-movies" component={DisneyMovies} />
            <Route path="/hbo-max-movies" component={HBOMaxMovies} />
            <Route path="/apple-tv-movies" component={AppleTVMovies} />
            <Route path="/paramount-movies" component={ParamountMovies} />
            
            {/* Provider Series routes */}
            <Route path="/netflix-series" component={NetflixSeries} />
            <Route path="/amazon-series" component={AmazonSeries} />
            <Route path="/disney-series" component={DisneySeries} />
            <Route path="/hbo-max-series" component={HBOMaxSeries} />
            <Route path="/apple-tv-series" component={AppleTVSeries} />
            <Route path="/paramount-series" component={ParamountSeries} />
            
            {/* Test routes */}
            <Route path="/test/vidsrc" component={VidSrcTest} />
            <Route path="/test/movix-download" component={MovixDownloadTest} />
            <Route path="/test/movix-checker" component={MovixDownloadChecker} />
            
            {/* 404 route - only for unmatched paths */}
            {/* <Route path="*" component={NotFound} /> */}
          </Router>
          <Toaster />
          <BottomNav />
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
