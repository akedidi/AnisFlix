import { useQuery } from '@tanstack/react-query';

interface MovixSeriesDownloadSource {
  src: string;
  language: string;
  quality: string;
  m3u8: string;
}

interface MovixSeriesDownloadResponse {
  sources: MovixSeriesDownloadSource[];
}

const fetchMovixSeriesDownload = async (seriesId: number, season: number, episode: number): Promise<MovixSeriesDownloadResponse | null> => {
  try {
    console.log('🔍 [MOVIX SERIES DOWNLOAD] Fetching data for:', { seriesId, season, episode });
    
    const url = `https://api.movix.club/api/series/download/${seriesId}/season/${season}/episode/${episode}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      console.log('❌ [MOVIX SERIES DOWNLOAD] API Response not OK:', response.status);
      return null;
    }
    
    const data = await response.json();
    console.log('✅ [MOVIX SERIES DOWNLOAD] API Response:', data);
    
    if (data.sources && Array.isArray(data.sources) && data.sources.length > 0) {
      return data;
    }
    
    console.log('❌ [MOVIX SERIES DOWNLOAD] No sources available');
    return null;
  } catch (error) {
    console.error('❌ [MOVIX SERIES DOWNLOAD] Error fetching data:', error);
    return null;
  }
};

export const useMovixSeriesDownload = (seriesId: number, season: number, episode: number) => {
  return useQuery({
    queryKey: ['movix-series-download', seriesId, season, episode],
    queryFn: () => fetchMovixSeriesDownload(seriesId, season, episode),
    enabled: !!seriesId && !!season && !!episode,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
};
