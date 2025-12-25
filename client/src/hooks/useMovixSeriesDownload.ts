import { useQuery } from '@tanstack/react-query';
import { movixProxy } from '@/lib/movixProxy';

interface MovixSearchResult {
  id: number;
  tmdb_id: number;
  type: string;
  name: string;
}

interface MovixSearchResponse {
  results: MovixSearchResult[];
}

interface MovixDownloadSource {
  src: string;
  language: string;
  quality: string;
  m3u8: string;
}

interface MovixDownloadResponse {
  sources: MovixDownloadSource[];
}

const getMovixIdFromTmdb = async (tmdbId: number, type: 'movie' | 'tv', title?: string): Promise<number | null> => {
  try {
    console.log('🔍 [MOVIX DOWNLOAD] getMovixIdFromTmdb called with:', { tmdbId, type, title });

    // Si pas de titre fourni, on ne peut pas faire la recherche
    if (!title) {
      console.log('❌ [MOVIX DOWNLOAD] No title provided for TMDB to Movix conversion');
      return null;
    }

    console.log('🔍 [MOVIX DOWNLOAD] About to call movixProxy.search with title:', title);

    // Rechercher dans l'API Movix avec le titre
    const searchData: MovixSearchResponse = await movixProxy.search(title);

    console.log('🔍 [MOVIX DOWNLOAD] movixProxy.search response:', searchData);

    // Log des IDs TMDB trouvés pour debug
    console.log('🔍 [MOVIX DOWNLOAD] TMDB IDs found in Movix:', searchData.results.map(r => ({ id: r.id, tmdb_id: r.tmdb_id, name: r.name, type: r.type })));

    // Log détaillé pour voir tous les IDs TMDB
    const tmdbIds = searchData.results.map(r => r.tmdb_id);
    console.log('🔍 [MOVIX DOWNLOAD] All TMDB IDs in Movix:', tmdbIds);
    console.log('🔍 [MOVIX DOWNLOAD] Looking for TMDB ID:', tmdbId);
    console.log('🔍 [MOVIX DOWNLOAD] Is our ID in the list?', tmdbIds.includes(tmdbId));

    // Trouver le résultat qui correspond à notre TMDB ID et type
    // Note: Movix API renvoie 'series' pour les séries TV, alors que TMDB utilise 'tv'
    const matchingResult = searchData.results.find(result =>
      result.tmdb_id === tmdbId &&
      (result.type === type || (type === 'tv' && result.type === 'series'))
    );

    if (matchingResult) {
      console.log('✅ [MOVIX DOWNLOAD] Found Movix ID:', matchingResult.id, 'for TMDB ID:', tmdbId);
      return matchingResult.id;
    }

    // Fallback: Si pas de correspondance par ID, essayer par titre strict
    // Cela permet de gérer les cas où l'API Movix n'a pas le bon tmdb_id
    if (title && searchData.results.length > 0) {
      console.log('⚠️ [MOVIX DOWNLOAD] No TMDB ID match, trying title match for:', title);

      const normalizedTitle = title.toLowerCase().trim();

      const titleMatch = searchData.results.find(result => {
        const resultName = result.name.toLowerCase().trim();
        const resultOriginalName = (result as any).original_name?.toLowerCase().trim();

        // Vérifier le type
        const typeMatch = result.type === type || (type === 'tv' && result.type === 'series');
        if (!typeMatch) return false;

        return resultName === normalizedTitle ||
          resultName === normalizedTitle.replace(/:/g, '') || // Gérer les titres avec/sans deux-points
          resultOriginalName === normalizedTitle;
      });

      if (titleMatch) {
        console.log('✅ [MOVIX DOWNLOAD] Found Movix ID by TITLE match:', titleMatch.id, 'Name:', titleMatch.name);
        return titleMatch.id;
      }
    }

    // NE PAS utiliser un autre résultat si aucune correspondance exacte
    // Cela pourrait utiliser un mauvais film
    if (searchData.results.length > 0) {
      console.error('❌ [MOVIX DOWNLOAD] No exact match found. Available results:', searchData.results.map(r => ({
        id: r.id,
        tmdb_id: r.tmdb_id,
        name: r.name,
        type: r.type
      })));
      console.error('❌ [MOVIX DOWNLOAD] Requested tmdbId:', tmdbId, 'type:', type);
      console.error('❌ [MOVIX DOWNLOAD] Rejecting all results to prevent mismatch');
    }

    console.log('❌ [MOVIX DOWNLOAD] No matching result found for search');
    return null;
  } catch (error) {
    console.error('❌ [MOVIX DOWNLOAD] Error getting Movix ID:', error);
    return null;
  }
};

const fetchMovixDownload = async (type: 'movie' | 'tv', tmdbId: number, season?: number, episode?: number, title?: string): Promise<MovixDownloadResponse | null> => {
  console.log('🚀 [MOVIX DOWNLOAD] FUNCTION CALLED!', { type, tmdbId, season, episode, title });
  try {
    console.log('🔍 [MOVIX DOWNLOAD] Fetching data for:', { type, tmdbId, season, episode, title });

    // Convertir l'ID TMDB en ID Movix
    const movixId = await getMovixIdFromTmdb(tmdbId, type, title);

    if (!movixId) {
      console.log('❌ [MOVIX DOWNLOAD] No Movix ID found for TMDB ID:', tmdbId);
      return null;
    }

    // Utiliser les méthodes du movixProxy comme l'ancien hook
    let data: MovixDownloadResponse;

    if (type === 'movie') {
      data = await movixProxy.getMovieDownload(movixId);
    } else {
      if (!season || !episode) {
        console.log('❌ [MOVIX DOWNLOAD] Season and episode required for TV shows');
        return null;
      }
      data = await movixProxy.getSeriesDownload(movixId, season, episode);
    }

    console.log('✅ [MOVIX DOWNLOAD] API Response:', data);

    if (data.sources && Array.isArray(data.sources) && data.sources.length > 0) {
      return data;
    }

    console.log('❌ [MOVIX DOWNLOAD] No sources available for:', { type, tmdbId, season, episode });
    console.log('❌ [MOVIX DOWNLOAD] API returned:', data);
    return null;
  } catch (error) {
    console.error('❌ [MOVIX DOWNLOAD] Error fetching data:', error);
    return null;
  }
};

export const useMovixDownload = (type: 'movie' | 'tv', tmdbId: number, season?: number, episode?: number, title?: string) => {
  console.log('🚀 [MOVIX DOWNLOAD] HOOK FUNCTION CALLED!', { type, tmdbId, season, episode, title });
  console.log('🔍 [MOVIX DOWNLOAD] Hook render - timestamp:', Date.now());

  const enabled = !!tmdbId && (type === 'movie' || (type === 'tv' && !!season && !!episode));

  console.log('🔍 [MOVIX DOWNLOAD HOOK] Hook called with:', {
    type,
    tmdbId,
    season,
    episode,
    title,
    enabled,
    condition: {
      hasTmdbId: !!tmdbId,
      isMovie: type === 'movie',
      isTvWithSeasonEpisode: type === 'tv' && !!season && !!episode
    }
  });

  // Log plus visible pour le debug
  if (!enabled) {
    console.log('❌ [MOVIX DOWNLOAD] HOOK DISABLED!', {
      hasTmdbId: !!tmdbId,
      isMovie: type === 'movie',
      isTv: type === 'tv',
      hasSeason: !!season,
      hasEpisode: !!episode,
      seasonValue: season,
      episodeValue: episode
    });
  } else {
    console.log('✅ [MOVIX DOWNLOAD] HOOK ENABLED!');
  }

  return useQuery({
    queryKey: ['movix-download', type, tmdbId, season, episode, title],
    queryFn: () => fetchMovixDownload(type, tmdbId, season, episode, title),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes de cache
    gcTime: 10 * 60 * 1000, // 10 minutes de cache
    retry: 1,
    refetchOnMount: false, // Pas de refetch au montage si les données sont en cache
    refetchOnWindowFocus: false, // Pas de refetch au focus
    refetchOnReconnect: false, // Pas de refetch sur reconnexion
  });
};

// Alias pour la compatibilité avec l'ancien nom
export const useMovixSeriesDownload = (seriesId: number, season: number, episode: number) => {
  return useMovixDownload('tv', seriesId, season, episode);
};
