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

const fetchMovixDownload = async (type: 'movie' | 'tv', id: number, season?: number, episode?: number): Promise<MovixDownloadResponse | null> => {
  try {
    console.log('🔍 [MOVIX DOWNLOAD] Fetching data for:', { type, id, season, episode });
    
    // Construire le chemin selon le type
    let path: string;
    if (type === 'movie') {
      path = `films/download/${id}`;
    } else {
      if (!season || !episode) {
        console.log('❌ [MOVIX DOWNLOAD] Season and episode required for TV shows');
        return null;
      }
      path = `series/download/${id}/season/${season}/episode/${episode}`;
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
    
    console.log('❌ [MOVIX DOWNLOAD] No sources available');
    return null;
  } catch (error) {
    console.error('❌ [MOVIX DOWNLOAD] Error fetching data:', error);
    return null;
  }
};

export const useMovixDownload = (type: 'movie' | 'tv', id: number, season?: number, episode?: number) => {
  return useQuery({
    queryKey: ['movix-download', type, id, season, episode],
    queryFn: () => fetchMovixDownload(type, id, season, episode),
    enabled: !!id && (type === 'movie' || (type === 'tv' && !!season && !!episode)),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
};

// Alias pour la compatibilité avec l'ancien nom
export const useMovixSeriesDownload = (seriesId: number, season: number, episode: number) => {
  return useMovixDownload('tv', seriesId, season, episode);
};
