import { IonApp, IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel, IonRouterOutlet } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { Route } from 'react-router-dom';
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
 * AppNative - Structure pour applications natives (iOS/Android)
 * Utilise Ionic pour navigation native avec animations push/pop
 */
export default function AppNative() {
  console.log('🚀 [AppNative] Rendering Native App');
  const { t } = useLanguage();
  const { isOffline } = useOffline();
  
  return (
    <IonApp>
      <IonReactRouter>
        <IonTabs>
          <IonRouterOutlet>
            {/* Routes principales */}
            <Route exact path="/" component={wrapPage(Home)} />
            <Route exact path="/movies" component={wrapPage(Movies)} />
            <Route exact path="/series" component={wrapPage(Series)} />
            <Route exact path="/tv-channels" component={wrapPage(TVChannels)} />
            <Route exact path="/favorites" component={wrapPage(Favorites)} />
            <Route exact path="/settings" component={wrapPage(Settings)} />

            {/* Detail routes */}
            <Route exact path="/movie/:id" component={wrapPage(MovieDetail)} />
            <Route exact path="/series/:id" component={wrapPage(SeriesDetail)} />

            {/* Latest & Popular */}
            <Route exact path="/latest-movies" component={wrapPage(LatestMovies)} />
            <Route exact path="/latest-series" component={wrapPage(LatestSeries)} />
            <Route exact path="/popular-movies" component={wrapPage(PopularMovies)} />
            <Route exact path="/popular-series" component={wrapPage(PopularSeries)} />

            {/* Anime routes */}
            <Route exact path="/anime-movies-latest" component={wrapPage(AnimeMoviesLatest)} />
            <Route exact path="/anime-movies-popular" component={wrapPage(AnimeMoviesPopular)} />
            <Route exact path="/anime-series-latest" component={wrapPage(AnimeSeriesLatest)} />
            <Route exact path="/anime-series-popular" component={wrapPage(AnimeSeriesPopular)} />

            {/* Netflix routes */}
            <Route exact path="/netflix-movies" component={wrapPage(NetflixMovies)} />
            <Route exact path="/netflix-series" component={wrapPage(NetflixSeries)} />

            {/* Amazon routes */}
            <Route exact path="/amazon-movies" component={wrapPage(AmazonMovies)} />
            <Route exact path="/amazon-series" component={wrapPage(AmazonSeries)} />

            {/* Apple TV routes */}
            <Route exact path="/apple-tv-movies" component={wrapPage(AppleTVMovies)} />
            <Route exact path="/apple-tv-series" component={wrapPage(AppleTVSeries)} />

            {/* Disney+ routes */}
            <Route exact path="/disney-movies" component={wrapPage(DisneyMovies)} />
            <Route exact path="/disney-series" component={wrapPage(DisneySeries)} />

            {/* HBO Max routes */}
            <Route exact path="/hbo-max-movies" component={wrapPage(HBOMaxMovies)} />
            <Route exact path="/hbo-max-series" component={wrapPage(HBOMaxSeries)} />

            {/* Paramount routes */}
            <Route exact path="/paramount-movies" component={wrapPage(ParamountMovies)} />
            <Route exact path="/paramount-series" component={wrapPage(ParamountSeries)} />

            {/* Provider Detail routes */}
            <Route exact path="/provider/:id" component={wrapPage(ProviderDetail)} />
            <Route exact path="/provider/:id/movies/:genre?" component={wrapPage(ProviderMoviesGenre)} />
            <Route exact path="/provider/:id/series/:genre?" component={wrapPage(ProviderSeriesGenre)} />

            {/* Genre routes */}
            <Route exact path="/movies-genre/:genre" component={wrapPage(MoviesGenre)} />
            <Route exact path="/series-genre/:genre" component={wrapPage(SeriesGenre)} />

            {/* 404 */}
            <Route component={wrapPage(NotFound)} />
          </IonRouterOutlet>
          
          {/* IonTabBar natif - en bas avec safe area */}
          <IonTabBar slot="bottom">
            {/* Accueil - toujours accessible */}
            <IonTabButton tab="home" href="/">
              <IonIcon icon={home} />
              <IonLabel>{t("nav.home")}</IonLabel>
            </IonTabButton>
            
            {/* Films - désactivé en mode offline */}
            <IonTabButton 
              tab="movies" 
              href="/movies"
              className={isOffline ? "offline-disabled" : ""}
              disabled={isOffline}
            >
              <IonIcon icon={film} />
              <IonLabel>{t("nav.movies")}</IonLabel>
            </IonTabButton>
            
            {/* Séries - désactivé en mode offline */}
            <IonTabButton 
              tab="series" 
              href="/series"
              className={isOffline ? "offline-disabled" : ""}
              disabled={isOffline}
            >
              <IonIcon icon={tv} />
              <IonLabel>{t("nav.series")}</IonLabel>
            </IonTabButton>
            
            {/* TV Direct - toujours accessible */}
            <IonTabButton tab="tv-channels" href="/tv-channels">
              <IonIcon icon={radio} />
              <IonLabel>{t("nav.tvChannels")}</IonLabel>
            </IonTabButton>
            
            {/* Favoris - toujours accessible */}
            <IonTabButton tab="favorites" href="/favorites">
              <IonIcon icon={heart} />
              <IonLabel>{t("nav.favorites")}</IonLabel>
            </IonTabButton>
            
            {/* Paramètres - toujours accessible */}
            <IonTabButton tab="settings" href="/settings">
              <IonIcon icon={settings} />
              <IonLabel>{t("nav.settings")}</IonLabel>
            </IonTabButton>
          </IonTabBar>
        </IonTabs>
      </IonReactRouter>
    </IonApp>
  );
}
