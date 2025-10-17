import { useQuery } from "@tanstack/react-query";
import { tmdb, getImageUrl } from "@/lib/tmdb";
import { getMovixPlayerLinks, extractImdbId, getHLSProxyUrl } from "@/lib/movixPlayer";

// Optimized query options to reduce Fast Origin usage
const CACHE_OPTIONS = {
  staleTime: 1000 * 60 * 30, // 30 minutes
  cacheTime: 1000 * 60 * 60, // 1 hour
  refetchOnWindowFocus: false,
  refetchOnMount: false,
  refetchOnReconnect: false,
};

// Transform TMDB movie data to our app format
const transformMovie = (movie: any) => ({
  id: movie.id,
  title: movie.title,
  posterPath: movie.poster_path,
  backdropPath: movie.backdrop_path,
  overview: movie.overview,
  rating: Math.round(movie.vote_average * 10) / 10,
  year: movie.release_date ? new Date(movie.release_date).getFullYear().toString() : "",
  mediaType: "movie" as const,
});

// Transform TMDB series data to our app format
const transformSeries = (series: any) => ({
  id: series.id,
  title: series.name,
  posterPath: series.poster_path,
  backdropPath: series.backdrop_path,
  overview: series.overview,
  rating: Math.round(series.vote_average * 10) / 10,
  year: series.first_air_date ? new Date(series.first_air_date).getFullYear().toString() : "",
  mediaType: "tv" as const,
});

export const usePopularMovies = (page = 1) => {
  return useQuery({
    queryKey: ["movies", "popular", page],
    queryFn: async () => {
      const data = await tmdb.getPopularMovies(page);
      return {
        results: data.results.map(transformMovie),
        total_pages: data.total_pages,
        page: data.page,
      };
    },
    ...CACHE_OPTIONS,
  });
};

export const useLatestMovies = (page = 1) => {
  return useQuery({
    queryKey: ["movies", "latest", page],
    queryFn: async () => {
      const data = await tmdb.getLatestMovies(page);
      return {
        results: data.results.map(transformMovie),
        total_pages: data.total_pages,
        page: data.page,
      };
    },
  });
};

export const usePopularSeries = (page = 1) => {
  return useQuery({
    queryKey: ["series", "popular", page],
    queryFn: async () => {
      const data = await tmdb.getPopularSeries(page);
      return {
        results: data.results.map(transformSeries),
        total_pages: data.total_pages,
        page: data.page,
      };
    },
  });
};

export const useLatestSeries = (page = 1) => {
  return useQuery({
    queryKey: ["series", "latest", page],
    queryFn: async () => {
      const data = await tmdb.getLatestSeries(page);
      return {
        results: data.results.map(transformSeries),
        total_pages: data.total_pages,
        page: data.page,
      };
    },
  });
};

export const useMovieDetails = (movieId: number) => {
  return useQuery({
    queryKey: ["movie", movieId],
    queryFn: () => tmdb.getMovieDetails(movieId),
    enabled: !!movieId,
    ...CACHE_OPTIONS,
  });
};

export const useSeriesDetails = (seriesId: number) => {
  return useQuery({
    queryKey: ["series", seriesId],
    queryFn: () => tmdb.getSeriesDetails(seriesId),
    enabled: !!seriesId,
    ...CACHE_OPTIONS,
  });
};

export const useMovieVideos = (movieId: number) => {
  return useQuery({
    queryKey: ["movie", movieId, "videos"],
    queryFn: () => tmdb.getMovieVideos(movieId),
    enabled: !!movieId,
    ...CACHE_OPTIONS,
  });
};

export const useSeriesVideos = (seriesId: number) => {
  return useQuery({
    queryKey: ["series", seriesId, "videos"],
    queryFn: () => tmdb.getSeriesVideos(seriesId),
    enabled: !!seriesId,
    ...CACHE_OPTIONS,
  });
};

export const useSeasonDetails = (seriesId: number, seasonNumber: number) => {
  return useQuery({
    queryKey: ["series", seriesId, "season", seasonNumber],
    queryFn: () => tmdb.getSeasonDetails(seriesId, seasonNumber),
    enabled: !!seriesId && !!seasonNumber,
    ...CACHE_OPTIONS,
  });
};

export const useSimilarMovies = (movieId: number) => {
  return useQuery({
    queryKey: ["movie", movieId, "similar"],
    queryFn: async () => {
      const data = await tmdb.getSimilarMovies(movieId);
      return data.results.map(transformMovie);
    },
    enabled: !!movieId,
  });
};

export const useSimilarSeries = (seriesId: number) => {
  return useQuery({
    queryKey: ["series", seriesId, "similar"],
    queryFn: async () => {
      const data = await tmdb.getSimilarSeries(seriesId);
      return data.results.map(transformSeries);
    },
    enabled: !!seriesId,
  });
};

export const useMoviesByGenre = (genreId: number, page = 1) => {
  return useQuery({
    queryKey: ["movies", "genre", genreId, page],
    queryFn: async () => {
      const data = await tmdb.getMoviesByGenre(genreId, page);
      return {
        results: data.results.map(transformMovie),
        total_pages: data.total_pages,
        page: data.page,
      };
    },
    enabled: !!genreId,
  });
};

export const useSeriesByGenre = (genreId: number, page = 1) => {
  return useQuery({
    queryKey: ["series", "genre", genreId, page],
    queryFn: async () => {
      const data = await tmdb.getSeriesByGenre(genreId, page);
      return {
        results: data.results.map(transformSeries),
        total_pages: data.total_pages,
        page: data.page,
      };
    },
    enabled: !!genreId,
  });
};

export const useMoviesByProvider = (providerId: number, page = 1) => {
  return useQuery({
    queryKey: ["movies", "provider", providerId, page],
    queryFn: async () => {
      const data = await tmdb.discoverMoviesByProvider(providerId, page);
      return {
        results: data.results.map(transformMovie),
        total_pages: data.total_pages,
        page: data.page,
      };
    },
    enabled: !!providerId,
  });
};

export const useSeriesByProvider = (providerId: number, page = 1) => {
  return useQuery({
    queryKey: ["series", "provider", providerId, page],
    queryFn: async () => {
      const data = await tmdb.discoverSeriesByProvider(providerId, page);
      return {
        results: data.results.map(transformSeries),
        total_pages: data.total_pages,
        page: data.page,
      };
    },
    enabled: !!providerId,
  });
};

export const useMoviesByProviderAndGenre = (providerId: number, genreId: number, page = 1) => {
  return useQuery({
    queryKey: ["movies", "provider", providerId, "genre", genreId, page],
    queryFn: async () => {
      const data = await tmdb.discoverMoviesByProviderAndGenre(providerId, genreId, page);
      return {
        results: data.results.map(transformMovie),
        total_pages: data.total_pages,
        page: data.page,
      };
    },
    enabled: !!providerId && !!genreId,
  });
};

export const useSeriesByProviderAndGenre = (providerId: number, genreId: number, page = 1) => {
  return useQuery({
    queryKey: ["series", "provider", providerId, "genre", genreId, page],
    queryFn: async () => {
      const data = await tmdb.discoverSeriesByProviderAndGenre(providerId, genreId, page);
      return {
        results: data.results.map(transformSeries),
        total_pages: data.total_pages,
        page: data.page,
      };
    },
    enabled: !!providerId && !!genreId,
  });
};

export const useMultiSearch = (query: string) => {
  return useQuery({
    queryKey: ["search", query],
    queryFn: async () => {
      const data = await tmdb.searchMulti(query);
      return data.results.map((item: any) => {
        if (item.media_type === "movie") {
          return transformMovie(item);
        } else if (item.media_type === "tv") {
          return transformSeries(item);
        }
        return null;
      }).filter(Boolean);
    },
    enabled: query.length > 2,
  });
};

export const useProviderCounts = (providerId: number) => {
  const { data: movies } = useMoviesByProvider(providerId);
  const { data: series } = useSeriesByProvider(providerId);
  
  return {
    movieCount: movies?.length || 0,
    tvCount: series?.length || 0,
  };
};

// Hook pour récupérer les liens de lecture Movix
export const useMovixPlayerLinks = (imdbId: string | null, mediaType: 'movie' | 'tv') => {
  return useQuery({
    queryKey: ["movix-player-links", imdbId, mediaType],
    queryFn: async () => {
      if (!imdbId) return null;
      
      const cleanImdbId = extractImdbId(imdbId);
      if (!cleanImdbId) {
        throw new Error('Invalid IMDB ID');
      }
      
      return await getMovixPlayerLinks(cleanImdbId, mediaType);
    },
    enabled: !!imdbId && !!extractImdbId(imdbId),
    ...CACHE_OPTIONS,
  });
};


// Hook pour obtenir l'URL proxy HLS complète
export const useHLSProxyUrl = (masterM3u8Url: string | null) => {
  return useQuery({
    queryKey: ["hls-proxy-url", masterM3u8Url],
    queryFn: async () => {
      if (!masterM3u8Url) return null;
      
      return await getHLSProxyUrl(masterM3u8Url);
    },
    enabled: !!masterM3u8Url && masterM3u8Url.includes('.m3u8'),
    staleTime: 1000 * 60 * 2, // 2 minutes (very short cache for streaming URLs)
    cacheTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });
};

