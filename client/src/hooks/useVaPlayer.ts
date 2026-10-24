import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

interface VaPlayerStream {
  name: string;
  title?: string;
  url: string;
  quality?: string;
  type?: string;
  headers?: Record<string, string>;
  provider?: string;
  language?: string;
}

interface VaPlayerResponse {
  success: boolean;
  streams?: VaPlayerStream[];
  error?: string;
}

export const useVaPlayer = (
  type: 'movie' | 'tv',
  id: number,
  season?: number,
  episode?: number,
  enabled = true,
) => {
  return useQuery<VaPlayerResponse>({
    queryKey: ['vaplayer', type, id, season, episode],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        path: 'vaplayer',
        tmdbId: id,
        type,
      };
      if (season !== undefined) params.season = season;
      if (episode !== undefined) params.episode = episode;
      const response = await axios.get('/api/movix-proxy', { params });
      return response.data;
    },
    enabled:
      enabled &&
      !!id &&
      (type === 'movie' ||
        (type === 'tv' &&
          season !== undefined &&
          season >= 0 &&
          episode !== undefined &&
          episode > 0)),
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });
};
