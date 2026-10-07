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

function playbackUrl(stream: FrenchProviderStream): string {
  if (stream.type !== 'm3u8' || stream.url.startsWith('/api/proxy?')) return stream.url;
  const params = new URLSearchParams({ url: stream.url });
  const referer = stream.headers?.Referer || stream.headers?.referer;
  const origin = stream.headers?.Origin || stream.headers?.origin;
  if (referer) params.set('referer', referer);
  if (origin) params.set('origin', origin);
  return `/api/proxy?${params.toString()}`;
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

      const streams = results.flatMap(result => result.status === 'fulfilled' ? result.value : [])
        .map(stream => ({ ...stream, url: playbackUrl(stream) }));
      return { success: true, streams };
    },
    enabled: enabled && !!id && (type === 'movie' || (!!season && !!episode)),
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });
}
