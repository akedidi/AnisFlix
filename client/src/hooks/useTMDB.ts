import { useQuery } from "@tanstack/react-query";
import { tmdb, getImageUrl } from "@/lib/tmdb";

// Transform TMDB movie data to our app format
const transformMovie = (movie: any) => ({
  id: movie.id,
  title: movie.title,
  posterPath: movie.poster_path,
  rating: Math.round(movie.vote_average * 10) / 10,
  year: movie.release_date ? new Date(movie.release_date).getFullYear().toString() : "",
  mediaType: "movie" as const,
});

// Transform TMDB series data to our app format
const transformSeries = (series: any) => ({
  id: series.id,
  title: series.name,
  posterPath: series.poster_path,
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
  });
};

export const useSeriesDetails = (seriesId: number) => {
  return useQuery({
    queryKey: ["series", seriesId],
    queryFn: () => tmdb.getSeriesDetails(seriesId),
    enabled: !!seriesId,
  });
};

export const useMovieVideos = (movieId: number) => {
  return useQuery({
    queryKey: ["movie", movieId, "videos"],
    queryFn: () => tmdb.getMovieVideos(movieId),
    enabled: !!movieId,
  });
};

export const useSeriesVideos = (seriesId: number) => {
  return useQuery({
    queryKey: ["series", seriesId, "videos"],
    queryFn: () => tmdb.getSeriesVideos(seriesId),
    enabled: !!seriesId,
  });
};

export const useSeasonDetails = (seriesId: number, seasonNumber: number) => {
  return useQuery({
    queryKey: ["series", seriesId, "season", seasonNumber],
    queryFn: () => tmdb.getSeasonDetails(seriesId, seasonNumber),
    enabled: !!seriesId && !!seasonNumber,
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
