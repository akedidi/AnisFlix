import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

interface FourKHDHubStream {
    url: string;
    quality: string;
    provider: string;
    label: string;
    size: string;
    type: string;
}

interface FourKHDHubResponse {
    success: boolean;
    streams?: FourKHDHubStream[];
}

export const useFourKHDHub = (
    type: 'movie' | 'tv',
    id: number,
    season?: number,
    episode?: number
) => {
    return useQuery<FourKHDHubResponse>({
        queryKey: ['fourkhdhub', type, id, season, episode],
        queryFn: async () => {
            const params = new URLSearchParams({
                path: '4KHDHUB',
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
