import { useState, useEffect } from 'react';
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
    // Si pas de titre fourni, on ne peut pas faire la recherche
    if (!title) {
      console.log('❌ [MOVIX DOWNLOAD] No title provided for TMDB to Movix conversion');
      return null;
    }
    
    // Rechercher dans l'API Movix avec le titre
    const searchData: MovixSearchResponse = await movixProxy.search(title);
    
    // Trouver le résultat qui correspond à notre TMDB ID et type
    const matchingResult = searchData.results.find(result => 
      result.tmdb_id === tmdbId && 
      result.type === type
    );
    
    if (matchingResult) {
      console.log('✅ [MOVIX DOWNLOAD] Found Movix ID:', matchingResult.id, 'for TMDB ID:', tmdbId);
      return matchingResult.id;
    }
    
    console.log('❌ [MOVIX DOWNLOAD] No matching Movix ID found for TMDB ID:', tmdbId);
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
    
    // Construire le chemin selon le type
    let path: string;
    if (type === 'movie') {
      path = `films/download/${movixId}`;
    } else {
      if (!season || !episode) {
        console.log('❌ [MOVIX DOWNLOAD] Season and episode required for TV shows');
        return null;
      }
      path = `series/download/${movixId}/season/${season}/episode/${episode}`;
    }
    
    // Utiliser l'API proxifiée
    const url = `/api/movix-proxy?path=${encodeURIComponent(path)}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      console.log('❌ [MOVIX DOWNLOAD] API Response not OK:', response.status);
      return null;
    }
    
    const data = await response.json();
    console.log('✅ [MOVIX DOWNLOAD] API Response:', data);
    
    if (data.sources && Array.isArray(data.sources) && data.sources.length > 0) {
      return data;
    }
    
    console.log('❌ [MOVIX DOWNLOAD] No sources available for:', { type, id, season, episode });
    console.log('❌ [MOVIX DOWNLOAD] API returned:', data);
    return null;
  } catch (error) {
    console.error('❌ [MOVIX DOWNLOAD] Error fetching data:', error);
    return null;
  }
};

export const useMovixDownload = (type: 'movie' | 'tv', tmdbId: number, season?: number, episode?: number, title?: string) => {
  const [data, setData] = useState<MovixDownloadResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
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
  
  useEffect(() => {
    if (!enabled) return;
    
    console.log('🚀 [MOVIX DOWNLOAD] USEEFFECT CALLED!', { type, tmdbId, season, episode, title });
    
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        console.log('🚀 [MOVIX DOWNLOAD] FETCHING DATA!', { type, tmdbId, season, episode, title });
        
        const result = await fetchMovixDownload(type, tmdbId, season, episode, title);
        console.log('✅ [MOVIX DOWNLOAD] FETCH RESULT:', result);
        setData(result);
      } catch (err) {
        console.error('❌ [MOVIX DOWNLOAD] FETCH ERROR:', err);
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [type, tmdbId, season, episode, title, enabled]);
  
  return {
    data,
    isLoading,
    error,
    isFetching: isLoading,
    isStale: false,
    refetch: () => {
      if (enabled) {
        console.log('🔄 [MOVIX DOWNLOAD] REFETCH CALLED!');
        const fetchData = async () => {
          try {
            setIsLoading(true);
            setError(null);
            const result = await fetchMovixDownload(type, tmdbId, season, episode, title);
            setData(result);
          } catch (err) {
            setError(err as Error);
          } finally {
            setIsLoading(false);
          }
        };
        fetchData();
      }
    }
  };
};

// Alias pour la compatibilité avec l'ancien nom
export const useMovixSeriesDownload = (seriesId: number, season: number, episode: number) => {
  return useMovixDownload('tv', seriesId, season, episode);
};
