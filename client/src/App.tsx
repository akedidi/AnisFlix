import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/lib/i18n/LanguageContext";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Movies from "@/pages/Movies";
import Series from "@/pages/Series";
import TVChannels from "@/pages/TVChannels";
import Settings from "@/pages/Settings";
import MovieDetail from "@/pages/MovieDetail";
import SeriesDetail from "@/pages/SeriesDetail";
import LatestMovies from "@/pages/LatestMovies";
import LatestSeries from "@/pages/LatestSeries";
import BottomNav from "@/components/BottomNav";
import DesktopSidebar from "@/components/DesktopSidebar";

function Router() {
  return (
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
      <Route component={NotFound} />
    </Switch>
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
