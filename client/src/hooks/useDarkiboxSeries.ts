import { useQuery } from '@tanstack/react-query';

interface DarkiboxSource {
  id: string;
  src: string;
  language: string;
  quality: string;
  m3u8: string;
  provider: string;
  type: string;
}

interface DarkiboxSeriesResponse {
  success: boolean;
  sources: DarkiboxSource[];
  seriesId: number;
  season: number;
  episode: number;
  total: number;
}

const fetchDarkiboxSeries = async (seriesId: number, season: number, episode: number): Promise<DarkiboxSeriesResponse | null> => {
  try {
    const url = `/api/darkibox/series?seriesId=${seriesId}&season=${season}&episode=${episode}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    
    console.log('Darkibox Series API Response:', {
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
    console.error('Erreur lors de la récupération des sources Darkibox séries:', error);
    return null;
  }
};

export const useDarkiboxSeries = (seriesId: number, season: number, episode: number) => {
  return useQuery({
    queryKey: ['darkibox-series', seriesId, season, episode],
    queryFn: () => fetchDarkiboxSeries(seriesId, season, episode),
    enabled: !!seriesId && !!season && !!episode,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
};


