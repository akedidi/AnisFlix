import { IonApp, IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel, IonRouterOutlet } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { Route, Redirect } from 'react-router-dom';
import { home, film, tv, radio, heart, settings } from 'ionicons/icons';
import { SplashScreen } from '@capacitor/splash-screen';
import { useEffect } from 'react';
import NativePageWrapper from '@/components/NativePageWrapper';
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useOffline } from "@/hooks/useOffline";

// Import styles pour transitions natives
import '@/styles/native-transitions.css';

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
import Settings from "@/pages/Settings";
import TVChannels from "@/pages/TVChannels";
import Favorites from "@/pages/Favorites";
import NotFound from "@/pages/not-found";

// Anime pages
import AnimeMoviesLatest from "@/pages/AnimeMoviesLatest";
import AnimeMoviesPopular from "@/pages/AnimeMoviesPopular";
import AnimeSeriesLatest from "@/pages/AnimeSeriesLatest";
import AnimeSeriesPopular from "@/pages/AnimeSeriesPopular";

// Provider pages - Netflix
import NetflixMovies from "@/pages/NetflixMovies";
import NetflixSeries from "@/pages/NetflixSeries";

// Provider pages - Amazon
import AmazonMovies from "@/pages/AmazonMovies";
import AmazonSeries from "@/pages/AmazonSeries";

// Provider pages - Apple TV
import AppleTVMovies from "@/pages/AppleTVMovies";
import AppleTVSeries from "@/pages/AppleTVSeries";

// Provider pages - Disney+
import DisneyMovies from "@/pages/DisneyMovies";
import DisneySeries from "@/pages/DisneySeries";

// Provider pages - HBO Max
import HBOMaxMovies from "@/pages/HBOMaxMovies";
import HBOMaxSeries from "@/pages/HBOMaxSeries";

// Provider pages - Paramount
import ParamountMovies from "@/pages/ParamountMovies";
import ParamountSeries from "@/pages/ParamountSeries";

// Provider Detail
import ProviderDetail from "@/pages/ProviderDetail";
import ProviderMoviesGenre from "@/pages/ProviderMoviesGenre";
import ProviderSeriesGenre from "@/pages/ProviderSeriesGenre";

// Genre pages
import MoviesGenre from "@/pages/MoviesGenre";
import SeriesGenre from "@/pages/SeriesGenre";

/**
 * Helper pour wrapper les pages (React Router v5 utilisé par @ionic/react-router)
 * @param Component - Le composant de page à wrapper
 * @param enableRefresh - Activer le pull-to-refresh (true pour listes, false pour détails)
 */
const wrapPage = (Component: any, enableRefresh: boolean = true) => {
  const WrappedComponent = (props: any) => {
    console.log('📄 [wrapPage] Rendering component:', Component.name || 'Anonymous', { enableRefresh });
    return (
      <NativePageWrapper enableRefresh={enableRefresh}>
        <Component {...props} />
      </NativePageWrapper>
    );
  };
  WrappedComponent.displayName = `Wrapped(${Component.name || 'Component'})`;
  return WrappedComponent;
};

/**
 * TabsContainer - Composant qui gère l'architecture Shell Ionic
 * Structure recommandée : /tabs/:tabName pour chaque tab
 */
function TabsContainer() {
  const { t } = useLanguage();
  const { isOffline } = useOffline();

  return (
    <IonTabs>
      <IonRouterOutlet id="main">
        {/* Tabs principales avec routes imbriquées sous /tabs - AVEC refresh */}
        <Route exact path="/tabs/home" render={() => wrapPage(Home, true)({})} />
        <Route exact path="/tabs/movies" render={() => wrapPage(Movies, true)({})} />
        <Route exact path="/tabs/series" render={() => wrapPage(Series, true)({})} />
        <Route exact path="/tabs/tv-channels" render={() => wrapPage(TVChannels, true)({})} />
        <Route exact path="/tabs/favorites" render={() => wrapPage(Favorites, true)({})} />
        <Route exact path="/tabs/settings" render={() => wrapPage(Settings, false)({})} />

        {/* Routes de détail - SANS refresh (navigation push/pop) */}
        <Route exact path="/tabs/movie/:id" render={(props) => wrapPage(MovieDetail, false)(props)} />
        <Route exact path="/tabs/series/:id" render={(props) => wrapPage(SeriesDetail, false)(props)} />

        {/* Latest & Popular - AVEC refresh */}
        <Route exact path="/tabs/latest-movies" render={() => wrapPage(LatestMovies, true)({})} />
        <Route exact path="/tabs/latest-series" render={() => wrapPage(LatestSeries, true)({})} />
        <Route exact path="/tabs/popular-movies" render={() => wrapPage(PopularMovies, true)({})} />
        <Route exact path="/tabs/popular-series" render={() => wrapPage(PopularSeries, true)({})} />

        {/* Anime routes - AVEC refresh */}
        <Route exact path="/tabs/anime-movies-latest" render={() => wrapPage(AnimeMoviesLatest, true)({})} />
        <Route exact path="/tabs/anime-movies-popular" render={() => wrapPage(AnimeMoviesPopular, true)({})} />
        <Route exact path="/tabs/anime-series-latest" render={() => wrapPage(AnimeSeriesLatest, true)({})} />
        <Route exact path="/tabs/anime-series-popular" render={() => wrapPage(AnimeSeriesPopular, true)({})} />

        {/* Netflix routes - AVEC refresh */}
        <Route exact path="/tabs/netflix-movies" render={() => wrapPage(NetflixMovies, true)({})} />
        <Route exact path="/tabs/netflix-series" render={() => wrapPage(NetflixSeries, true)({})} />

        {/* Amazon routes - AVEC refresh */}
        <Route exact path="/tabs/amazon-movies" render={() => wrapPage(AmazonMovies, true)({})} />
        <Route exact path="/tabs/amazon-series" render={() => wrapPage(AmazonSeries, true)({})} />

        {/* Apple TV routes - AVEC refresh */}
        <Route exact path="/tabs/apple-tv-movies" render={() => wrapPage(AppleTVMovies, true)({})} />
        <Route exact path="/tabs/apple-tv-series" render={() => wrapPage(AppleTVSeries, true)({})} />

        {/* Disney+ routes - AVEC refresh */}
        <Route exact path="/tabs/disney-movies" render={() => wrapPage(DisneyMovies, true)({})} />
        <Route exact path="/tabs/disney-series" render={() => wrapPage(DisneySeries, true)({})} />

        {/* HBO Max routes - AVEC refresh */}
        <Route exact path="/tabs/hbo-max-movies" render={() => wrapPage(HBOMaxMovies, true)({})} />
        <Route exact path="/tabs/hbo-max-series" render={() => wrapPage(HBOMaxSeries, true)({})} />

        {/* Paramount routes - AVEC refresh */}
        <Route exact path="/tabs/paramount-movies" render={() => wrapPage(ParamountMovies, true)({})} />
        <Route exact path="/tabs/paramount-series" render={() => wrapPage(ParamountSeries, true)({})} />

        {/* Provider Detail routes - SANS refresh (pages de détail) */}
        <Route exact path="/tabs/provider/:id" render={(props) => wrapPage(ProviderDetail, false)(props)} />
        <Route exact path="/tabs/provider/:id/movies/:genre?" render={(props) => wrapPage(ProviderMoviesGenre, true)(props)} />
        <Route exact path="/tabs/provider/:id/series/:genre?" render={(props) => wrapPage(ProviderSeriesGenre, true)(props)} />

        {/* Genre routes - AVEC refresh */}
        <Route exact path="/tabs/movies-genre/:genre" render={(props) => wrapPage(MoviesGenre, true)(props)} />
        <Route exact path="/tabs/series-genre/:genre" render={(props) => wrapPage(SeriesGenre, true)(props)} />

        {/* Redirect /tabs vers /tabs/home par défaut */}
        <Route exact path="/tabs">
          <Redirect to="/tabs/home" />
        </Route>
      </IonRouterOutlet>
      
      {/* IonTabBar natif - en bas avec safe area */}
      <IonTabBar slot="bottom">
        {/* Accueil - toujours accessible */}
        <IonTabButton tab="home" href="/tabs/home">
          <IonIcon icon={home} />
          <IonLabel>{t("nav.home")}</IonLabel>
        </IonTabButton>
        
        {/* Films - désactivé en mode offline */}
        <IonTabButton 
          tab="movies" 
          href="/tabs/movies"
          className={isOffline ? "offline-disabled" : ""}
          disabled={isOffline}
        >
          <IonIcon icon={film} />
          <IonLabel>{t("nav.movies")}</IonLabel>
        </IonTabButton>
        
        {/* Séries - désactivé en mode offline */}
        <IonTabButton 
          tab="series" 
          href="/tabs/series"
          className={isOffline ? "offline-disabled" : ""}
          disabled={isOffline}
        >
          <IonIcon icon={tv} />
          <IonLabel>{t("nav.series")}</IonLabel>
        </IonTabButton>
        
        {/* TV Direct - toujours accessible */}
        <IonTabButton tab="tv-channels" href="/tabs/tv-channels">
          <IonIcon icon={radio} />
          <IonLabel>{t("nav.tvChannels")}</IonLabel>
        </IonTabButton>
        
        {/* Favoris - toujours accessible */}
        <IonTabButton tab="favorites" href="/tabs/favorites">
          <IonIcon icon={heart} />
          <IonLabel>{t("nav.favorites")}</IonLabel>
        </IonTabButton>
        
        {/* Paramètres - toujours accessible */}
        <IonTabButton tab="settings" href="/tabs/settings">
          <IonIcon icon={settings} />
          <IonLabel>{t("nav.settings")}</IonLabel>
        </IonTabButton>
      </IonTabBar>
    </IonTabs>
  );
}

/**
 * AppNative - Structure pour applications natives (iOS/Android)
 * Utilise Ionic Shell Architecture avec tabs imbriqués sous /tabs
 */
export default function AppNative() {
  console.log('[App] Platform detection:', { hasCapacitor: true, platform: 'ios', isNative: true });
  console.log('🚀 [AppNative] Rendering Native App with Shell Architecture');
  
  // Masquer le SplashScreen au lancement
  useEffect(() => {
    SplashScreen.hide();
  }, []);
  
  return (
    <IonApp>
      <IonReactRouter>
        <Route path="/tabs" component={TabsContainer} />
        <Route exact path="/">
          <Redirect to="/tabs/home" />
        </Route>
      </IonReactRouter>
    </IonApp>
  );
}
