import { useQuery, useQueryClient } from "@tanstack/react-query";
import { tmdb, getImageUrl } from "@/lib/tmdb";
import { getMovixPlayerLinks, extractImdbId, getHLSProxyUrl } from "@/lib/movixPlayer";

// Optimized query options to reduce Fast Origin usage
const CACHE_OPTIONS = {
  staleTime: 1000 * 60 * 30, // 30 minutes
  gcTime: 1000 * 60 * 60, // 1 hour
  refetchOnWindowFocus: false,
  refetchOnMount: false,
  refetchOnReconnect: false,
};

// Transform TMDB movie data to our app format
const transformMovie = (movie: any) => {
  // Debug pour les affiches manquantes
  if (!movie.poster_path) {
    console.warn(`⚠️ [TMDB TRANSFORM] Film sans poster_path:`, {
      id: movie.id,
      title: movie.title,
      poster_path: movie.poster_path,
      backdrop_path: movie.backdrop_path
    });
  }

  return {
    id: movie.id,
    title: movie.title,
    posterPath: movie.poster_path,
    backdropPath: movie.backdrop_path,
    overview: movie.overview,
    rating: Math.round(movie.vote_average * 10) / 10,
    year: movie.release_date ? new Date(movie.release_date).getFullYear().toString() : "",
    mediaType: "movie" as const,
    popularity: movie.popularity || 0,
  };
};

// Transform TMDB series data to our app format
const transformSeries = (series: any) => {
  // Debug pour les affiches manquantes
  if (!series.poster_path) {
    console.warn(`⚠️ [TMDB TRANSFORM] Série sans poster_path:`, {
      id: series.id,
      name: series.name,
      poster_path: series.poster_path,
      backdrop_path: series.backdrop_path
    });
  }

  return {
    id: series.id,
    title: series.name,
    posterPath: series.poster_path,
    backdropPath: series.backdrop_path,
    overview: series.overview,
    rating: Math.round(series.vote_average * 10) / 10,
    year: series.first_air_date ? new Date(series.first_air_date).getFullYear().toString() : "",
    mediaType: "tv" as const,
    popularity: series.popularity || 0,
  };
};

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

export const useLatestProviderSeries = (page = 1) => {
  return useQuery({
    queryKey: ["series", "latest-provider", page],
    queryFn: async () => {
      const data = await tmdb.getLatestProviderSeries(page);
      return {
        results: data.results.map(transformSeries),
        total_pages: data.total_pages,
        page: data.page,
      };
    },
    staleTime: 0, // Force fresh data on every mount
    gcTime: 1000 * 60 * 5, // 5 minutes garbage collection
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
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ["series", seriesId],
    queryFn: async () => {
      const data = await tmdb.getSeriesDetails(seriesId);

      // Check for Episode Groups (type 6 = "Seasons")
      // Priority: Type 6 AND Name starts with "Seasons" (e.g. "Seasons", "Seasons + OVAs")
      // Fallback: Any Type 6
      let seasonsGroup = data.episode_groups?.results?.find((g: any) =>
        g.type === 6 && g.name.startsWith("Seasons")
      );

      if (!seasonsGroup) {
        seasonsGroup = data.episode_groups?.results?.find((g: any) => g.type === 6);
      }

      if (seasonsGroup) {
        console.log(`✅ [useSeriesDetails] Found "Seasons" episode group:`, seasonsGroup);

        try {
          // Fetch group details
          const groupDetails = await tmdb.getEpisodeGroupDetails(seasonsGroup.id);

          if (groupDetails && groupDetails.groups) {
            // Transform group data to seasons format
            const newSeasons = groupDetails.groups.map((group: any) => {
              // Extract season number from group order or name if possible
              // Typically groups are named "Season 1", "Season 2", etc.
              // We use 'order' as season_number usually
              return {
                id: group.id,
                name: group.name,
                season_number: group.order,
                episode_count: group.episodes?.length || 0,
                poster_path: data.poster_path, // Fallback as groups might not have posters
                overview: "",
                air_date: group.episodes?.[0]?.air_date,
                vote_average: 0
              };
            });

            // Handle Season 0 (Specials) Logic
            // Sometimes Episode Groups have incomplete Specials (e.g., JJK has 5 in group vs 9 in original).
            // If original Season 0 exists and has more episodes than the group's Season 0, we prefer the original.
            const originalSeason0 = data.seasons?.find((s: any) => s.season_number === 0);
            const groupSeason0 = newSeasons.find((s: any) => s.season_number === 0);

            if (originalSeason0 && groupSeason0) {
              if (originalSeason0.episode_count > groupSeason0.episode_count) {
                console.warn(`⚠️ [useSeriesDetails] Episode Group Season 0 has fewer episodes (${groupSeason0.episode_count}) than original Season 0 (${originalSeason0.episode_count}). Keeping original.`);
                // Remove incomplete Season 0 from newSeasons
                const index = newSeasons.indexOf(groupSeason0);
                if (index > -1) {
                  newSeasons.splice(index, 1); // Remove the group version
                }
                // Add original Season 0 back
                newSeasons.push(originalSeason0);

                // Sort seasons by season_number just in case
                newSeasons.sort((a: any, b: any) => a.season_number - b.season_number);
              }
            } else if (originalSeason0 && !groupSeason0) {
              // Group didn't even have Season 0, so we definitely keep the original
              newSeasons.push(originalSeason0);
              newSeasons.sort((a: any, b: any) => a.season_number - b.season_number);
            }

            // Hydrate cache for each season (ONLY for the ones we kept from the group)
            groupDetails.groups.forEach((group: any) => {
              const seasonNumber = group.order;

              // SKIP hydration for Season 0 if we decided to use the original
              if (seasonNumber === 0 && originalSeason0 && (originalSeason0.episode_count > (group.episodes?.length || 0))) {
                return;
              }

              const cacheKey = ["series", seriesId, "season", seasonNumber];

              // Check if data is already in cache to avoid overwriting with partial data if we want
              // But here we want to enforce the group data
              const seasonData = {
                _id: group.id,
                air_date: group.episodes?.[0]?.air_date,
                name: group.name,
                overview: "",
                id: group.id,
                poster_path: null,
                season_number: seasonNumber,
                // Map episodes to standard format
                episodes: group.episodes.map((ep: any) => ({
                  ...ep,
                  still_path: ep.still_path,
                  vote_average: ep.vote_average,
                  vote_count: ep.vote_count,
                  air_date: ep.air_date,
                  episode_number: ep.episode_number,
                  name: ep.name,
                  overview: ep.overview,
                  id: ep.id,
                  production_code: ep.production_code,
                  runtime: ep.runtime,
                  season_number: seasonNumber,
                  show_id: seriesId,
                }))
              };

              console.log(`💧 [useSeriesDetails] Hydrating cache for Season ${seasonNumber}`);
              queryClient.setQueryData(cacheKey, seasonData);
            });

            // Update series data with new seasons
            data.seasons = newSeasons;
            data.number_of_seasons = newSeasons.length;
            console.log(`✨ [useSeriesDetails] Updated series with ${newSeasons.length} seasons from Episode Group`);
          }
        } catch (error) {
          console.error("❌ [useSeriesDetails] Failed to process episode group:", error);
        }
      }

      return data;
    },
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
    queryFn: async () => {
      const frData = await tmdb.getSeasonDetails(seriesId, seasonNumber);

      // Check for generic episode names in the French response
      const hasGenericNames = frData.episodes?.some((ep: any) =>
        (ep.name && ep.name.match(/^(Episode|Épisode|Episodio) \d+$/i)) ||
        ep.name === `Episode ${ep.episode_number}`
      );

      if (hasGenericNames) {
        console.log(`⚠️ [useSeasonDetails] Generic names detected for season ${seasonNumber}, fetching English fallback...`);
        try {
          // Fetch English data
          const enData = await tmdb.getSeasonDetails(seriesId, seasonNumber, 'en-US');

          if (enData && enData.episodes) {
            // Merge English names where French ones are generic
            frData.episodes = frData.episodes.map((frEp: any) => {
              // Logic to detect generic name
              if ((frEp.name && frEp.name.match(/^(Episode|Épisode|Episodio) \d+$/i)) || frEp.name === `Episode ${frEp.episode_number}`) {
                const enEp = enData.episodes.find((e: any) => e.id === frEp.id);
                if (enEp && enEp.name) {
                  console.log(`✅ [useSeasonDetails] Replaced generic "${frEp.name}" with "${enEp.name}"`);
                  // Inject as original_name too for safety with SeriesDetail logic
                  return { ...frEp, name: enEp.name, original_name: enEp.name };
                }
              }
              return frEp;
            });
          }
        } catch (e) {
          console.error("❌ [useSeasonDetails] Failed to fetch English fallback:", e);
        }
      }

      return frData;
    },
    enabled: !!seriesId && seasonNumber !== undefined && seasonNumber !== null,
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
      console.log('🔍 [USE MULTI SEARCH] Searching for:', query);
      const data = await tmdb.searchMulti(query);
      console.log('🔍 [USE MULTI SEARCH] Raw TMDB data:', data);

      const transformedResults = data.results.map((item: any) => {
        console.log('🔍 [USE MULTI SEARCH] Processing item:', {
          id: item.id,
          name: item.name,
          title: item.title,
          media_type: item.media_type,
          poster_path: item.poster_path,
          backdrop_path: item.backdrop_path,
          first_air_date: item.first_air_date
        });

        // Filtrer les films
        if (item.media_type === "movie") {
          const transformed = transformMovie(item);
          console.log('🔍 [USE MULTI SEARCH] Transformed movie:', transformed);
          return transformed;
        }
        // Filtrer les séries TV (pas les chaînes TV)
        else if (item.media_type === "tv" && item.first_air_date) {
          const transformed = transformSeries(item);
          console.log('🔍 [USE MULTI SEARCH] Transformed series:', transformed);
          return transformed;
        }
        console.log('🔍 [USE MULTI SEARCH] Item filtered out:', item);
        return null;
      }).filter(Boolean);

      console.log('🔍 [USE MULTI SEARCH] Final transformed results:', transformedResults);

      // Trier les résultats par popularité (du plus populaire au moins populaire)
      const sortedResults = transformedResults.sort((a: any, b: any) => {
        return (b.popularity || 0) - (a.popularity || 0);
      });

      console.log('🔍 [USE MULTI SEARCH] Sorted by popularity:', sortedResults.slice(0, 5).map((item: any) => ({
        title: item.title,
        popularity: item.popularity,
        mediaType: item.mediaType
      })));

      // Log spécifique pour One-Punch Man
      const onePunchMan = sortedResults.find((item: any) => item.id === 63926);
      if (onePunchMan) {
        console.log('✅ [USE MULTI SEARCH] One-Punch Man found in results:', onePunchMan);
      } else {
        console.log('❌ [USE MULTI SEARCH] One-Punch Man NOT found in transformed results');
      }

      return sortedResults;
    },
    enabled: query.length >= 1,
  });
};

export const useProviderCounts = (providerId: number) => {
  const { data: movies } = useMoviesByProvider(providerId);
  const { data: series } = useSeriesByProvider(providerId);

  return {
    movieCount: movies?.results?.length || 0,
    tvCount: series?.results?.length || 0,
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
    gcTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });
};

