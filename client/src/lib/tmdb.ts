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
    return tmdbFetch(`/movie/${movieId}`);
  },

  getMovieVideos: async (movieId: number) => {
    return tmdbFetch(`/movie/${movieId}/videos`);
  },

  getSimilarMovies: async (movieId: number) => {
    return tmdbFetch(`/movie/${movieId}/similar`);
  },

  getMoviesByGenre: async (genreId: number, page = 1) => {
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
    return tmdbFetch('/tv/on_the_air', { page: page.toString() });
  },

  getSeriesDetails: async (seriesId: number) => {
    return tmdbFetch(`/tv/${seriesId}`);
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
    return tmdbFetch('/search/multi', { query });
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
    // Essayer plusieurs régions pour avoir plus de contenu
    const regions = ['US', 'FR', 'GB', 'CA'];
    
    for (const region of regions) {
      try {
        const data = await tmdbFetch('/discover/movie', {
          with_watch_providers: providerId.toString(),
          watch_region: region,
          with_watch_monetization_types: 'flatrate',
          vote_average_gte: '5',
          vote_count_gte: '50',
          page: page.toString(),
        });
        
        if (data.results && data.results.length > 0) {
          return data; // Si on trouve du contenu, on s'arrête
        }
      } catch (err) {
        console.log(`Région ${region} échouée pour films provider, essai suivant...`);
        continue;
      }
    }
    
    // Si aucune région n'a donné de résultats, essayer sans restriction de région
    try {
      return await tmdbFetch('/discover/movie', {
        with_watch_providers: providerId.toString(),
        with_watch_monetization_types: 'flatrate',
        vote_average_gte: '5',
        vote_count_gte: '50',
        page: page.toString(),
      });
    } catch (err) {
      // Retourner un résultat vide en cas d'échec total
      return { results: [], total_pages: 0, page: 1 };
    }
  },

  discoverSeriesByProvider: async (providerId: number, page = 1) => {
    // Essayer plusieurs régions pour avoir plus de contenu
    const regions = ['US', 'FR', 'GB', 'CA'];
    
    for (const region of regions) {
      try {
        const data = await tmdbFetch('/discover/tv', {
          with_watch_providers: providerId.toString(),
          watch_region: region,
          with_watch_monetization_types: 'flatrate',
          vote_average_gte: '5',
          vote_count_gte: '50',
          page: page.toString(),
        });
        
        if (data.results && data.results.length > 0) {
          return data; // Si on trouve du contenu, on s'arrête
        }
      } catch (err) {
        console.log(`Région ${region} échouée pour séries provider, essai suivant...`);
        continue;
      }
    }
    
    // Si aucune région n'a donné de résultats, essayer sans restriction de région
    try {
      return await tmdbFetch('/discover/tv', {
        with_watch_providers: providerId.toString(),
        with_watch_monetization_types: 'flatrate',
        vote_average_gte: '5',
        vote_count_gte: '50',
        page: page.toString(),
      });
    } catch (err) {
      // Retourner un résultat vide en cas d'échec total
      return { results: [], total_pages: 0, page: 1 };
    }
  },

  // Discover by provider + genre with fallback logic
  discoverMoviesByProviderAndGenre: async (providerId: number, genreId: number, page = 1) => {
    // Essayer plusieurs régions pour avoir plus de contenu
    const regions = ['US', 'FR', 'GB', 'CA'];
    
    for (const region of regions) {
      try {
        const data = await tmdbFetch('/discover/movie', {
          with_watch_providers: providerId.toString(),
          with_genres: genreId.toString(),
          watch_region: region,
          with_watch_monetization_types: 'flatrate',
          vote_average_gte: '5',
          vote_count_gte: '50',
          page: page.toString(),
        });
        
        if (data.results && data.results.length > 0) {
          return data; // Si on trouve du contenu, on s'arrête
        }
      } catch (err) {
        console.log(`Région ${region} échouée pour films, essai suivant...`);
        continue;
      }
    }
    
    // Si aucune région n'a donné de résultats, essayer sans restriction de région
    try {
      return await tmdbFetch('/discover/movie', {
        with_genres: genreId.toString(),
        vote_average_gte: '5',
        vote_count_gte: '50',
        page: page.toString(),
      });
    } catch (err) {
      // Retourner un résultat vide en cas d'échec total
      return { results: [], total_pages: 0, page: 1 };
    }
  },

  discoverSeriesByProviderAndGenre: async (providerId: number, genreId: number, page = 1) => {
    // Essayer plusieurs régions pour avoir plus de contenu
    const regions = ['US', 'FR', 'GB', 'CA'];
    
    for (const region of regions) {
      try {
        const data = await tmdbFetch('/discover/tv', {
          with_watch_providers: providerId.toString(),
          with_genres: genreId.toString(),
          watch_region: region,
          with_watch_monetization_types: 'flatrate',
          vote_average_gte: '5',
          vote_count_gte: '50',
          page: page.toString(),
        });
        
        if (data.results && data.results.length > 0) {
          return data; // Si on trouve du contenu, on s'arrête
        }
      } catch (err) {
        console.log(`Région ${region} échouée pour séries, essai suivant...`);
        continue;
      }
    }
    
    // Si aucune région n'a donné de résultats, essayer sans restriction de région
    try {
      return await tmdbFetch('/discover/tv', {
        with_genres: genreId.toString(),
        vote_average_gte: '5',
        vote_count_gte: '50',
        page: page.toString(),
      });
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
