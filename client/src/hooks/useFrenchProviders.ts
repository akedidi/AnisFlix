import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

export interface FrenchProviderStream {
  provider: 'animesama' | 'frenchanime' | 'frenchstream' | 'streamzo';
  url: string;
  quality: string;
  language: 'VF' | 'VOSTFR' | 'VO' | string;
  type: 'm3u8' | 'mp4' | 'embed';
  headers?: Record<string, string>;
}

interface FrenchProvidersResponse {
  success: boolean;
  streams: FrenchProviderStream[];
}

export function useFrenchProviders(
  type: 'movie' | 'tv',
  id: number,
  season: number | undefined,
  episode: number | undefined,
  isAnimation: boolean,
  enabled = true,
) {
  return useQuery<FrenchProvidersResponse>({
    queryKey: ['french-providers', type, id, season, episode, isAnimation],
    queryFn: async () => {
      const providers = isAnimation
        ? ['animesama', 'frenchanime', 'frenchstream', 'streamzo']
        : ['frenchstream', 'streamzo'];
      const results = await Promise.allSettled(providers.map(async provider => {
        const params = new URLSearchParams({
          path: 'french-provider',
          provider,
          tmdbId: String(id),
          type,
        });
        if (season !== undefined) params.set('season', String(season));
        if (episode !== undefined) params.set('episode', String(episode));
        const response = await axios.get<FrenchProvidersResponse>('/api/movix-proxy', { params });
        return response.data.streams || [];
      }));

      // Keep the provider media URLs untouched: web playback must stay direct.
      const streams = results.flatMap(result => result.status === 'fulfilled' ? result.value : []);
      return { success: true, streams };
    },
    enabled: enabled && !!id && (type === 'movie' || (!!season && !!episode)),
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });
}
