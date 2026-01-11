import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

interface AfterDarkStream {
    url: string;
    quality: string;
    provider: string;
    name: string;
    type: string;
    language: string;
    headers?: Record<string, string>;
}

interface AfterDarkResponse {
    success: boolean;
    streams?: AfterDarkStream[];
}

export const useAfterDark = (
    type: 'movie' | 'tv',
    id: number,
    season?: number,
    episode?: number
) => {
    return useQuery<AfterDarkResponse>({
        queryKey: ['afterdark', type, id, season, episode],
        queryFn: async () => {
            const params = new URLSearchParams({
                path: 'afterdark',
                tmdbId: id.toString(),
                type,
            });

            if (season !== undefined) {
                params.append('season', season.toString());
            }
            if (episode !== undefined) {
                params.append('episode', episode.toString());
            }

            const response = await axios.get('/api/movix-proxy', {
                params,
            });

            return response.data;
        },
        enabled: !!id,
        staleTime: 1000 * 60 * 10, // 10 minutes
        retry: 1,
    });
};
