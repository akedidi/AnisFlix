import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/lib/i18n/LanguageContext";
import NotFound from "@/pages/not-found";
import ScraperTest from "@/components/ScraperTest";
import VidzyDistinctionTest from "@/components/VidzyDistinctionTest";
import VidSrcTest from "@/components/VidSrcTest";
import MovixDownloadTest from "@/components/MovixDownloadTest";
import MovixDownloadChecker from "@/components/MovixDownloadChecker";
import Home from "@/pages/Home";
import Movies from "@/pages/Movies";
import Series from "@/pages/Series";
import TVChannels from "@/pages/TVChannels";
import Settings from "@/pages/Settings";
import MovieDetail from "@/pages/MovieDetail";
import SeriesDetail from "@/pages/SeriesDetail";
import LatestMovies from "@/pages/LatestMovies";
import LatestSeries from "@/pages/LatestSeries";
import ProviderDetail from "@/pages/ProviderDetail";
import NetflixContent from "@/pages/NetflixContent";
import AmazonContent from "@/pages/AmazonContent";
import AppleTVContent from "@/pages/AppleTVContent";
import DisneyContent from "@/pages/DisneyContent";
import HBOMaxContent from "@/pages/HBOMaxContent";
import ParamountContent from "@/pages/ParamountContent";
import PopularMovies from "@/pages/PopularMovies";
import PopularSeries from "@/pages/PopularSeries";
import MovieGenre from "@/pages/MovieGenre";
import SeriesGenre from "@/pages/SeriesGenre";
import BottomNav from "@/components/BottomNav";
import DesktopSidebar from "@/components/DesktopSidebar";
import PageTransition from "@/components/PageTransition";

function Router() {
  return (
    <PageTransition className="min-h-full">
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/films" component={Movies} />
        <Route path="/series" component={Series} />
        <Route path="/tv" component={TVChannels} />
        <Route path="/settings" component={Settings} />
        <Route path="/movie/:id" component={MovieDetail} />
        <Route path="/series/:id" component={SeriesDetail} />
        <Route path="/latest-movies" component={LatestMovies} />
        <Route path="/latest-series" component={LatestSeries} />
        <Route path="/popular-movies" component={PopularMovies} />
        <Route path="/popular-series" component={PopularSeries} />
        <Route path="/provider/:id" component={ProviderDetail} />
        <Route path="/netflix-content" component={NetflixContent} />
        <Route path="/amazon-content" component={AmazonContent} />
        <Route path="/apple-tv-content" component={AppleTVContent} />
        <Route path="/disney-content" component={DisneyContent} />
        <Route path="/hbo-max-content" component={HBOMaxContent} />
        <Route path="/paramount-content" component={ParamountContent} />
        <Route path="/movie-genre/:genre" component={MovieGenre} />
        <Route path="/series-genre/:genre" component={SeriesGenre} />
        <Route path="/test-scraper" component={ScraperTest} />
        <Route path="/test-vidzy-distinction" component={VidzyDistinctionTest} />
        <Route path="/test-vidsrc" component={VidSrcTest} />
        <Route path="/test-movix-download" component={MovixDownloadTest} />
        <Route path="/check-movix-download" component={MovixDownloadChecker} />
        <Route component={NotFound} />
      </Switch>
    </PageTransition>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <TooltipProvider>
          <div className="flex min-h-screen">
            <DesktopSidebar />
            <main className="flex-1">
              <Router />
            </main>
            <BottomNav />
          </div>
          <Toaster />
        </TooltipProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;
