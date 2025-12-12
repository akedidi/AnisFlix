const TMDB_API_KEY = 'f3d757824f08ea2cff45eb8f47ca3a1e';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

export interface TMDBMovie {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  release_date: string;
  genre_ids: number[];
  runtime?: number;
}

export interface TMDBSeries {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  first_air_date: string;
  genre_ids: number[];
  number_of_seasons?: number;
}

export interface TMDBProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string;
}

// Get language from localStorage (synced with i18n context)
const getLanguage = (): string => {
  return localStorage.getItem('app-language') || 'fr';
};

// Get region based on language or browser locale
const getRegion = (): string => {
  const language = getLanguage();
  const regionMap: Record<string, string> = {
    'fr': 'FR',
    'en': 'US',
    'es': 'ES',
    'de': 'DE',
    'it': 'IT',
    'pt': 'PT'
  };
  return regionMap[language] || 'FR';
};

// Get region for specific providers (some have better US catalogs)
const getRegionForProvider = (providerId: number): string => {
  // Providers with better US catalogs
  const usProviders = [9, 1899, 531]; // Amazon Prime (9), HBO Max (1899), Paramount+ (531)

  if (usProviders.includes(providerId)) {
    return 'US'; // Use US region for better content
  }

  return getRegion(); // Use user's region for others
};

// Some providers have multiple IDs (rebranding/regional IDs)
const expandProviderFilter = (providerId: number): string => {
  // HBO Max/Max
  if (providerId === 384) {
    return '384|1899';
  }
  return providerId.toString();
};

const getMonetizationForProvider = (providerId: number): string => {
  // Amazon Prime Video: éviter le contenu avec pubs (Freevee), conserver l'abonnement inclus
  if (providerId === 9) return 'flatrate';
  return 'flatrate|ads';
};

// Map language codes to TMDB language format
const getLanguageCode = (lang: string): string => {
  const languageMap: Record<string, string> = {
    'fr': 'fr-FR',
    'en': 'en-US',
    'es': 'es-ES',
    'de': 'de-DE',
    'it': 'it-IT',
    'pt': 'pt-PT'
  };
  return languageMap[lang] || 'en-US';
};

// Fetch helpers
const tmdbFetch = async (endpoint: string, params: Record<string, string> = {}) => {
  const language = getLanguage();
  const url = new URL(`${TMDB_BASE_URL}${endpoint}`);
  url.searchParams.append('api_key', TMDB_API_KEY);
  url.searchParams.append('language', getLanguageCode(language));

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });

  const response = await fetch(url.toString());
  if (!response.ok) throw new Error('TMDB API request failed');
  return response.json();
};

// Movie endpoints
export const tmdb = {
  // Movies
  getPopularMovies: async (page = 1) => {
    return tmdbFetch('/movie/popular', { page: page.toString() });
  },

  getLatestMovies: async (page = 1) => {
    return tmdbFetch('/movie/now_playing', { page: page.toString() });
  },

  getMovieDetails: async (movieId: number) => {
    return tmdbFetch(`/movie/${movieId}`, { append_to_response: 'external_ids' });
  },

  getMovieVideos: async (movieId: number) => {
    return tmdbFetch(`/movie/${movieId}/videos`);
  },

  getSimilarMovies: async (movieId: number) => {
    return tmdbFetch(`/movie/${movieId}/similar`);
  },

  getMoviesByGenre: async (genreId: number, page = 1) => {
    // Special handling for Science Fiction (878)
    if (genreId === 878) {
      const today = new Date().toISOString().split('T')[0];
      return tmdbFetch('/discover/movie', {
        with_genres: genreId.toString(),
        sort_by: 'primary_release_date.desc',
        'primary_release_date.lte': today,
        with_watch_monetization_types: 'flatrate',
        watch_region: 'FR',
        page: page.toString(),
      } as any);
    }

    // Default behavior for other genres
    return tmdbFetch('/discover/movie', {
      with_genres: genreId.toString(),
      page: page.toString(),
    });
  },

  // Series
  getPopularSeries: async (page = 1) => {
    return tmdbFetch('/tv/popular', { page: page.toString() });
  },

  getLatestSeries: async (page = 1) => {
    // Découverte des séries récentes (toutes, sans filtre de provider ou de date passée)
    // Tri par date de première diffusion (plus récent au plus ancien)
    const today = new Date();
    const lastDateLte = today.toISOString().slice(0, 10);

    return tmdbFetch('/discover/tv', {
      sort_by: 'first_air_date.desc',
      include_adult: 'false',
      include_null_first_air_dates: 'false',
      'first_air_date.lte': lastDateLte,
      page: page.toString(),
    } as any);
  },

  getLatestProviderSeries: async (page = 1) => {
    // Latest series from major providers, sorted by release date
    // Major Providers: Netflix(8), Amazon FR(119), Disney+(337), Canal+(381), Crunchyroll(283), AppleTV+(350), HBO(1899)
    const majorProviders = "8|119|337|381|283|350|1899";

    const today = new Date();
    const lastDateLte = today.toISOString().slice(0, 10);

    return tmdbFetch('/discover/tv', {
      sort_by: 'first_air_date.desc',
      include_adult: 'false',
      include_null_first_air_dates: 'false',
      'first_air_date.lte': lastDateLte,
      with_watch_providers: majorProviders,
      watch_region: 'FR',
      with_watch_monetization_types: 'flatrate',
      page: page.toString(),
    } as any);
  },

  getSeriesDetails: async (seriesId: number) => {
    return tmdbFetch(`/tv/${seriesId}`, { append_to_response: 'external_ids' });
  },

  getSeriesVideos: async (seriesId: number) => {
    return tmdbFetch(`/tv/${seriesId}/videos`);
  },

  getSeasonDetails: async (seriesId: number, seasonNumber: number) => {
    return tmdbFetch(`/tv/${seriesId}/season/${seasonNumber}`);
  },

  getSimilarSeries: async (seriesId: number) => {
    return tmdbFetch(`/tv/${seriesId}/similar`);
  },

  getSeriesByGenre: async (genreId: number, page = 1) => {
    // Special handling for Sci-Fi & Fantasy (10765)
    if (genreId === 10765) {
      const today = new Date().toISOString().split('T')[0];
      return tmdbFetch('/discover/tv', {
        with_genres: genreId.toString(),
        sort_by: 'first_air_date.desc',
        'first_air_date.lte': today,
        with_watch_monetization_types: 'flatrate',
        watch_region: 'FR',
        page: page.toString(),
      } as any);
    }

    // Default behavior for other genres
    return tmdbFetch('/discover/tv', {
      with_genres: genreId.toString(),
      page: page.toString(),
    });
  },

  // Providers
  getMovieProviders: async (movieId: number) => {
    return tmdbFetch(`/movie/${movieId}/watch/providers`);
  },

  getSeriesProviders: async (seriesId: number) => {
    return tmdbFetch(`/tv/${seriesId}/watch/providers`);
  },

  getAvailableProviders: async () => {
    return tmdbFetch('/watch/providers/movie', { watch_region: 'FR' });
  },

  // Search
  searchMulti: async (query: string) => {
    // Search across multiple languages to find titles in all languages
    const language = getLanguage();
    const userLang = getLanguageCode(language);

    // Search in user's language and English in parallel for maximum coverage
    const searches = [
      fetch(`${TMDB_BASE_URL}/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=${userLang}&include_adult=false`)
    ];

    // Add English search as fallback if not already in English
    if (language !== 'en') {
      searches.push(
        fetch(`${TMDB_BASE_URL}/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=en-US&include_adult=false`)
      );
    }

    // Execute searches in parallel with error handling
    try {
      const responses = await Promise.allSettled(searches);
      const results: any[] = [];

      for (const response of responses) {
        if (response.status === 'fulfilled') {
          const data = await response.value.json();
          if (data.results) {
            results.push(data);
          }
        }
      }

      // Merge results, removing duplicates by ID
      const merged: Record<number, any> = {};
      for (const result of results) {
        if (result.results) {
          for (const item of result.results) {
            if (!merged[item.id]) {
              merged[item.id] = item;
            }
          }
        }
      }

      return {
        results: Object.values(merged),
        page: 1,
        total_pages: Math.ceil(Object.keys(merged).length / 20),
        total_results: Object.keys(merged).length
      };
    } catch (error) {
      console.error('Error in searchMulti:', error);
      return { results: [], page: 1, total_pages: 0, total_results: 0 };
    }
  },

  // Genres
  getMovieGenres: async () => {
    return tmdbFetch('/genre/movie/list');
  },

  getSeriesGenres: async () => {
    return tmdbFetch('/genre/tv/list');
  },

  // Discover by provider
  discoverMoviesByProvider: async (providerId: number, page = 1) => {
    // Récentes sorties et exclure le futur
    const today = new Date();
    const releaseDateLte = today.toISOString().slice(0, 10);

    // Essayer plusieurs régions pour avoir plus de contenu
    const regions = providerId === 9 ? ['US'] : ['US', 'FR', 'GB', 'CA', 'NL', 'DE', 'ES', 'IT'];

    for (const region of regions) {
      try {
        const data = await tmdbFetch('/discover/movie', {
          with_watch_providers: expandProviderFilter(providerId),
          watch_region: region,
          with_watch_monetization_types: getMonetizationForProvider(providerId),
          include_adult: 'false',
          sort_by: 'release_date.desc',
          'release_date.lte': releaseDateLte,
          page: page.toString(),
        } as any);

        if (data.results && data.results.length > 0) {
          return data; // Si on trouve du contenu, on s'arrête
        }
      } catch (err) {
        console.log(`Région ${region} échouée pour films provider, essai suivant...`);
        continue;
      }
    }

    // Fallback sans région
    try {
      return await tmdbFetch('/discover/movie', {
        with_watch_providers: expandProviderFilter(providerId),
        with_watch_monetization_types: getMonetizationForProvider(providerId),
        include_adult: 'false',
        sort_by: 'release_date.desc',
        'release_date.lte': releaseDateLte,
        page: page.toString(),
      } as any);
    } catch (err) {
      // Retourner un résultat vide en cas d'échec total
      return { results: [], total_pages: 0, page: 1 };
    }
  },

  discoverSeriesByProvider: async (providerId: number, page = 1) => {
    // Pour Amazon (9) uniquement, utiliser le network filter pour avoir les Amazon Originals
    if (providerId === 9) {
      try {
        const today = new Date();
        const firstAirDateLte = today.toISOString().slice(0, 10);
        return await tmdbFetch('/discover/tv', {
          with_networks: '1024', // Amazon Studios
          sort_by: 'first_air_date.desc',
          'first_air_date.lte': firstAirDateLte,
          include_null_first_air_dates: 'false',
          include_adult: 'false',
          page: page.toString(),
        } as any);
      } catch (err) {
        console.error('Amazon network filter failed:', err);
        return { results: [], total_pages: 0, page: 1 };
      }
    }

    // Pour les autres providers, utiliser with_watch_providers
    const today = new Date();
    const firstAirDateLte = today.toISOString().slice(0, 10);
    const regions = ['US', 'FR', 'GB', 'CA', 'NL', 'DE', 'ES', 'IT'];

    for (const region of regions) {
      try {
        const data = await tmdbFetch('/discover/tv', {
          with_watch_providers: expandProviderFilter(providerId),
          watch_region: region,
          with_watch_monetization_types: getMonetizationForProvider(providerId),
          sort_by: 'first_air_date.desc',
          include_null_first_air_dates: 'false',
          include_adult: 'false',
          first_air_date_lte: firstAirDateLte,
          page: page.toString(),
        } as any);

        if (data.results && data.results.length > 0) {
          return data;
        }
      } catch (err) {
        console.log(`Région ${region} échouée pour séries provider, essai suivant...`);
        continue;
      }
    }

    // Fallback sans région
    try {
      return await tmdbFetch('/discover/tv', {
        with_watch_providers: expandProviderFilter(providerId),
        with_watch_monetization_types: getMonetizationForProvider(providerId),
        sort_by: 'first_air_date.desc',
        include_null_first_air_dates: 'false',
        include_adult: 'false',
        first_air_date_lte: firstAirDateLte,
        page: page.toString(),
      } as any);
    } catch (err) {
      return { results: [], total_pages: 0, page: 1 };
    }
  },

  // Discover by provider + genre with fallback logic
  discoverMoviesByProviderAndGenre: async (providerId: number, genreId: number, page = 1) => {
    // Exclure le futur, trier par dernières sorties
    const today = new Date();
    const releaseDateLte = today.toISOString().slice(0, 10);

    // Essayer plusieurs régions pour avoir plus de contenu
    const regions = providerId === 9 ? ['US'] : ['US', 'FR', 'GB', 'CA', 'NL', 'DE', 'ES', 'IT'];

    for (const region of regions) {
      try {
        const data = await tmdbFetch('/discover/movie', {
          with_watch_providers: expandProviderFilter(providerId),
          with_genres: genreId.toString(),
          watch_region: region,
          with_watch_monetization_types: getMonetizationForProvider(providerId),
          include_adult: 'false',
          sort_by: 'release_date.desc',
          'release_date.lte': releaseDateLte,
          page: page.toString(),
        } as any);

        if (data.results && data.results.length > 0) {
          return data; // Si on trouve du contenu, on s'arrête
        }
      } catch (err) {
        console.log(`Région ${region} échouée pour films, essai suivant...`);
        continue;
      }
    }

    // Fallback sans région mais filtré provider
    try {
      return await tmdbFetch('/discover/movie', {
        with_watch_providers: expandProviderFilter(providerId),
        with_genres: genreId.toString(),
        with_watch_monetization_types: getMonetizationForProvider(providerId),
        include_adult: 'false',
        sort_by: 'release_date.desc',
        'release_date.lte': releaseDateLte,
        page: page.toString(),
      } as any);
    } catch (err) {
      // Retourner un résultat vide en cas d'échec total
      return { results: [], total_pages: 0, page: 1 };
    }
  },

  discoverSeriesByProviderAndGenre: async (providerId: number, genreId: number, page = 1) => {
    // Exclure le futur, trier par dernières sorties
    const today = new Date();
    const firstAirDateLte = today.toISOString().slice(0, 10);

    // Essayer plusieurs régions pour avoir plus de contenu
    const regions = providerId === 9 ? ['US'] : ['US', 'FR', 'GB', 'CA', 'NL', 'DE', 'ES', 'IT'];

    for (const region of regions) {
      try {
        const data = await tmdbFetch('/discover/tv', {
          with_watch_providers: expandProviderFilter(providerId),
          with_genres: genreId.toString(),
          watch_region: region,
          with_watch_monetization_types: getMonetizationForProvider(providerId),
          include_adult: 'false',
          include_null_first_air_dates: 'false',
          sort_by: 'first_air_date.desc',
          'first_air_date.lte': firstAirDateLte,
          page: page.toString(),
        } as any);

        if (data.results && data.results.length > 0) {
          return data; // Si on trouve du contenu, on s'arrête
        }
      } catch (err) {
        console.log(`Région ${region} échouée pour séries, essai suivant...`);
        continue;
      }
    }

    // Fallback sans région mais filtré provider
    try {
      return await tmdbFetch('/discover/tv', {
        with_watch_providers: expandProviderFilter(providerId),
        with_genres: genreId.toString(),
        with_watch_monetization_types: getMonetizationForProvider(providerId),
        include_adult: 'false',
        include_null_first_air_dates: 'false',
        sort_by: 'first_air_date.desc',
        'first_air_date.lte': firstAirDateLte,
        page: page.toString(),
      } as any);
    } catch (err) {
      // Retourner un résultat vide en cas d'échec total
      return { results: [], total_pages: 0, page: 1 };
    }
  },
};

// Image helpers
export const getImageUrl = (path: string | null, size: 'w500' | 'original' = 'w500') => {
  if (!path) return 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'500\' height=\'750\'%3E%3Crect fill=\'%23334155\' width=\'500\' height=\'750\'/%3E%3C/svg%3E';
  return `${TMDB_IMAGE_BASE_URL}/${size}${path}`;
};

// Genre ID mapping
export const genreIds = {
  // Movies
  action: 28,
  adventure: 12,
  animation: 16,
  comedy: 35,
  crime: 80,
  documentary: 99,
  drama: 18,
  family: 10751,
  fantasy: 14,
  history: 36,
  horror: 27,
  music: 10402,
  mystery: 9648,
  romance: 10749,
  scienceFiction: 878,
  thriller: 53,
  war: 10752,
  western: 37,
};
