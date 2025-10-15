import { useQuery } from '@tanstack/react-query';

interface DarkiSource {
  id: string;
  src: string;
  language: string;
  quality: string;
  m3u8: string;
  provider: string;
  type: string;
}

interface DarkiSeriesResponse {
  success: boolean;
  sources: DarkiSource[];
  seriesId: number;
  season: number;
  episode: number;
  total: number;
}

const fetchDarkiSeries = async (seriesId: number, season: number, episode: number): Promise<DarkiSeriesResponse | null> => {
  try {
    const url = `/api/darkibox/series?seriesId=${seriesId}&season=${season}&episode=${episode}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    
    console.log('Darki Series API Response:', {
      url,
      success: data.success,
      sources: data.sources ? data.sources.length : 0,
      data
    });
    
    if (data.success) {
      return data;
    }
    
    return null;
  } catch (error) {
    console.error('Erreur lors de la récupération des sources Darki séries:', error);
    return null;
  }
};

export const useDarkiSeries = (seriesId: number, season: number, episode: number) => {
  return useQuery({
    queryKey: ['darki-series', seriesId, season, episode],
    queryFn: () => fetchDarkiSeries(seriesId, season, episode),
    enabled: !!seriesId && !!season && !!episode,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
};

