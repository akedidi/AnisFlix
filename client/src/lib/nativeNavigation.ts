/**
 * Helper de navigation pour gérer les différences entre routes Web et Native
 * 
 * AppWeb utilise : /movie/:id
 * AppNative utilise : /tabs/movie/:id
 */

/**
 * Détecte si on est dans une app Capacitor native
 */
export const isNativeApp = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    return (window as any).Capacitor !== undefined;
  } catch {
    return false;
  }
};

/**
 * Ajoute le préfixe /tabs si on est en mode natif
 */
const withNativePrefix = (path: string): string => {
  if (!path.startsWith('/')) path = '/' + path;
  return isNativeApp() ? `/tabs${path}` : path;
};

/**
 * Helper pour générer les chemins de navigation
 */
export const navPaths = {
  // Pages principales
  home: () => isNativeApp() ? '/tabs/home' : '/',
  movies: () => withNativePrefix('/movies'),
  series: () => withNativePrefix('/series'),
  tvChannels: () => withNativePrefix('/tv-channels'),
  favorites: () => withNativePrefix('/favorites'),
  settings: () => withNativePrefix('/settings'),

  // Détails
  movie: (id: number | string) => withNativePrefix(`/movie/${id}`),
  seriesDetail: (id: number | string) => withNativePrefix(`/series/${id}`),

  // Latest & Popular
  latestMovies: () => withNativePrefix('/latest-movies'),
  latestSeries: () => withNativePrefix('/latest-series'),
  popularMovies: () => withNativePrefix('/popular-movies'),
  popularSeries: () => withNativePrefix('/popular-series'),

  // Anime
  animeMoviesLatest: () => withNativePrefix('/anime-movies-latest'),
  animeMoviesPopular: () => withNativePrefix('/anime-movies-popular'),
  animeSeriesLatest: () => withNativePrefix('/anime-series-latest'),
  animeSeriesPopular: () => withNativePrefix('/anime-series-popular'),

  // Providers - Netflix
  netflixMovies: () => withNativePrefix('/netflix-movies'),
  netflixSeries: () => withNativePrefix('/netflix-series'),

  // Providers - Amazon
  amazonMovies: () => withNativePrefix('/amazon-movies'),
  amazonSeries: () => withNativePrefix('/amazon-series'),

  // Providers - Apple TV
  appleTVMovies: () => withNativePrefix('/apple-tv-movies'),
  appleTVSeries: () => withNativePrefix('/apple-tv-series'),

  // Providers - Disney+
  disneyMovies: () => withNativePrefix('/disney-movies'),
  disneySeries: () => withNativePrefix('/disney-series'),

  // Providers - HBO Max
  hboMaxMovies: () => withNativePrefix('/hbo-max-movies'),
  hboMaxSeries: () => withNativePrefix('/hbo-max-series'),

  // Providers - Paramount
  paramountMovies: () => withNativePrefix('/paramount-movies'),
  paramountSeries: () => withNativePrefix('/paramount-series'),

  // Provider Detail
  provider: (id: number | string) => withNativePrefix(`/provider/${id}`),
  providerMoviesGenre: (id: number | string, genre?: string) => 
    withNativePrefix(`/provider/${id}/movies${genre ? '/' + genre : ''}`),
  providerSeriesGenre: (id: number | string, genre?: string) => 
    withNativePrefix(`/provider/${id}/series${genre ? '/' + genre : ''}`),

  // Genres
  moviesGenre: (genre: string) => withNativePrefix(`/movies-genre/${genre}`),
  seriesGenre: (genre: string) => withNativePrefix(`/series-genre/${genre}`),
};

/**
 * Hook pour obtenir une fonction de navigation compatible natif/web
 */
export const useNativeNavigate = () => {
  return (path: string) => {
    const finalPath = isNativeApp() && !path.startsWith('/tabs') 
      ? `/tabs${path}` 
      : path;
    window.location.href = finalPath;
  };
};

/**
 * Naviguer vers une route (compatible natif/web)
 */
export const navigateTo = (path: string) => {
  const finalPath = isNativeApp() && !path.startsWith('/tabs') 
    ? `/tabs${path}` 
    : path;
  window.location.href = finalPath;
};
