import { useQuery } from '@tanstack/react-query';

interface MovixDownloadSource {
  src: string;
  language: string;
  quality: string;
  m3u8: string;
}

interface MovixDownloadResponse {
  sources: MovixDownloadSource[];
}

interface MovixSearchResult {
  id: number;
  name: string;
  tmdb_id: number | null;
  type: string;
}

interface MovixSearchResponse {
  results: MovixSearchResult[];
}

// Fonction pour récupérer l'ID Movix depuis l'ID TMDB
// Note: Cette fonction nécessite que le titre soit passé en paramètre
// car nous n'avons pas accès à la clé API TMDB côté client
const getMovixIdFromTmdb = async (tmdbId: number, type: 'movie' | 'tv', title?: string): Promise<number | null> => {
  try {
    // Si pas de titre fourni, on ne peut pas faire la recherche
    if (!title) {
      return null;
    }
    
    // Rechercher dans l'API Movix avec le titre
    const searchUrl = `https://api.movix.site/api/search?title=${encodeURIComponent(title)}`;
    
    const searchResponse = await fetch(searchUrl);
    if (!searchResponse.ok) {
      return null;
    }
    
    const searchData: MovixSearchResponse = await searchResponse.json();
    
    // Trouver le résultat qui correspond à notre TMDB ID et type
    const matchingResult = searchData.results.find(result => 
      result.tmdb_id === tmdbId && 
      result.type === type
    );
    
    if (matchingResult) {
      return matchingResult.id;
    }
    
    return null;
  } catch (error) {
    console.error('[MovixDownload] Error getting Movix ID:', error);
    return null;
  }
};

const fetchMovixDownload = async (
  type: 'movie' | 'tv', 
  tmdbId: number, 
  season?: number, 
  episode?: number,
  title?: string
): Promise<MovixDownloadResponse | null> => {
  try {
    // Récupérer l'ID Movix depuis l'ID TMDB
    const movixId = await getMovixIdFromTmdb(tmdbId, type, title);
    
    if (!movixId) {
      return null;
    }
    
    let url: string;
    
    if (type === 'movie') {
      url = `https://api.movix.site/api/films/download/${movixId}`;
    } else {
      if (!season || !episode) {
        throw new Error('Season and episode are required for TV shows');
      }
      url = `https://api.movix.site/api/series/download/${movixId}/season/${season}/episode/${episode}`;
    }
    
    const response = await fetch(url);
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    
    // Vérifier si on a des sources disponibles
    if (data.sources && Array.isArray(data.sources) && data.sources.length > 0) {
      return data;
    }
    
    return null;
  } catch (error) {
    console.error('[MovixDownload] Error:', error);
    return null;
  }
};

export const useMovixDownload = (
  type: 'movie' | 'tv', 
  tmdbId: number, 
  season?: number, 
  episode?: number,
  title?: string
) => {
  return useQuery({
    queryKey: ['movix-download', type, tmdbId, season, episode, title],
    queryFn: () => fetchMovixDownload(type, tmdbId, season, episode, title),
    enabled: !!tmdbId && !!title && (type === 'movie' || (!!season && !!episode)),
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
  });
};

// Hook spécialisé pour les films (utilise l'ID TMDB)
export const useMovixDownloadMovie = (tmdbId: number, title?: string) => {
  return useMovixDownload('movie', tmdbId, undefined, undefined, title);
};

// Hook spécialisé pour les séries (utilise l'ID TMDB)
export const useMovixDownloadSeries = (tmdbId: number, season: number, episode: number, title?: string) => {
  return useMovixDownload('tv', tmdbId, season, episode, title);
};
