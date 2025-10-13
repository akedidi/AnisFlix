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
            <Route path="/settings" component={Settings} />
            <Route path="/tv-channels" component={TVChannels} />
            <Route path="/favorites" component={Favorites} />
            
            {/* Provider routes */}
            <Route path="/netflix" component={NetflixContent} />
            <Route path="/amazon" component={AmazonContent} />
            <Route path="/disney" component={DisneyContent} />
            <Route path="/hbo-max" component={HBOMaxContent} />
            <Route path="/apple-tv" component={AppleTVContent} />
            <Route path="/paramount" component={ParamountContent} />
            <Route path="/provider/:id" component={ProviderDetail} />
            
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
