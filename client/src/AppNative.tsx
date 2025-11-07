import { IonApp, IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel, IonRouterOutlet } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { Route, Redirect } from 'react-router-dom';
import { home, film, tv, radio, heart, settings } from 'ionicons/icons';
import NativePageWrapper from '@/components/NativePageWrapper';
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useOffline } from "@/hooks/useOffline";

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
 */
const wrapPage = (Component: any) => (props: any) => (
  <NativePageWrapper>
    <Component {...props} />
  </NativePageWrapper>
);

/**
 * TabsContainer - Composant qui gère l'architecture Shell Ionic
 * Structure recommandée : /tabs/:tabName pour chaque tab
 */
function TabsContainer() {
  const { t } = useLanguage();
  const { isOffline } = useOffline();

  return (
    <IonTabs>
      <IonRouterOutlet>
        {/* Tabs principales avec routes imbriquées sous /tabs */}
        <Route exact path="/tabs/home" component={wrapPage(Home)} />
        <Route exact path="/tabs/movies" component={wrapPage(Movies)} />
        <Route exact path="/tabs/series" component={wrapPage(Series)} />
        <Route exact path="/tabs/tv-channels" component={wrapPage(TVChannels)} />
        <Route exact path="/tabs/favorites" component={wrapPage(Favorites)} />
        <Route exact path="/tabs/settings" component={wrapPage(Settings)} />

        {/* Routes de détail et sous-pages dans le même outlet */}
        <Route exact path="/tabs/movie/:id" component={wrapPage(MovieDetail)} />
        <Route exact path="/tabs/series/:id" component={wrapPage(SeriesDetail)} />

        {/* Latest & Popular - accessibles depuis Movies/Series tabs */}
        <Route exact path="/tabs/latest-movies" component={wrapPage(LatestMovies)} />
        <Route exact path="/tabs/latest-series" component={wrapPage(LatestSeries)} />
        <Route exact path="/tabs/popular-movies" component={wrapPage(PopularMovies)} />
        <Route exact path="/tabs/popular-series" component={wrapPage(PopularSeries)} />

        {/* Anime routes */}
        <Route exact path="/tabs/anime-movies-latest" component={wrapPage(AnimeMoviesLatest)} />
        <Route exact path="/tabs/anime-movies-popular" component={wrapPage(AnimeMoviesPopular)} />
        <Route exact path="/tabs/anime-series-latest" component={wrapPage(AnimeSeriesLatest)} />
        <Route exact path="/tabs/anime-series-popular" component={wrapPage(AnimeSeriesPopular)} />

        {/* Netflix routes */}
        <Route exact path="/tabs/netflix-movies" component={wrapPage(NetflixMovies)} />
        <Route exact path="/tabs/netflix-series" component={wrapPage(NetflixSeries)} />

        {/* Amazon routes */}
        <Route exact path="/tabs/amazon-movies" component={wrapPage(AmazonMovies)} />
        <Route exact path="/tabs/amazon-series" component={wrapPage(AmazonSeries)} />

        {/* Apple TV routes */}
        <Route exact path="/tabs/apple-tv-movies" component={wrapPage(AppleTVMovies)} />
        <Route exact path="/tabs/apple-tv-series" component={wrapPage(AppleTVSeries)} />

        {/* Disney+ routes */}
        <Route exact path="/tabs/disney-movies" component={wrapPage(DisneyMovies)} />
        <Route exact path="/tabs/disney-series" component={wrapPage(DisneySeries)} />

        {/* HBO Max routes */}
        <Route exact path="/tabs/hbo-max-movies" component={wrapPage(HBOMaxMovies)} />
        <Route exact path="/tabs/hbo-max-series" component={wrapPage(HBOMaxSeries)} />

        {/* Paramount routes */}
        <Route exact path="/tabs/paramount-movies" component={wrapPage(ParamountMovies)} />
        <Route exact path="/tabs/paramount-series" component={wrapPage(ParamountSeries)} />

        {/* Provider Detail routes */}
        <Route exact path="/tabs/provider/:id" component={wrapPage(ProviderDetail)} />
        <Route exact path="/tabs/provider/:id/movies/:genre?" component={wrapPage(ProviderMoviesGenre)} />
        <Route exact path="/tabs/provider/:id/series/:genre?" component={wrapPage(ProviderSeriesGenre)} />

        {/* Genre routes */}
        <Route exact path="/tabs/movies-genre/:genre" component={wrapPage(MoviesGenre)} />
        <Route exact path="/tabs/series-genre/:genre" component={wrapPage(SeriesGenre)} />

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
  console.log('🚀 [AppNative] Rendering Native App with Shell Architecture');
  
  return (
    <IonApp>
      <IonReactRouter>
        {/* Route parent pour les tabs */}
        <Route path="/tabs" component={TabsContainer} />
        
        {/* Redirect root vers /tabs/home */}
        <Route exact path="/">
          <Redirect to="/tabs/home" />
        </Route>
        
        {/* 404 - en dehors des tabs */}
        <Route path="*" component={wrapPage(NotFound)} />
      </IonReactRouter>
    </IonApp>
  );
}
