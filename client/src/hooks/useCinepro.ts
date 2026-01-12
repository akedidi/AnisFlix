import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

interface CineproStream {
    link: string;
    server: string;
    type: string;
    quality: string;
    lang: string;
}

interface CineproResponse {
    success: boolean;
    streams?: CineproStream[];
}

export const useCinepro = (
    type: 'movie' | 'tv',
    id: number,
    season?: number,
    episode?: number
) => {
    return useQuery<CineproResponse>({
        queryKey: ['cinepro', type, id, season, episode],
        queryFn: async () => {
            const params = new URLSearchParams({
                path: 'cinepro',
                tmdbId: id.toString(),
                type,
            });

            if (season !== undefined) params.append('season', season.toString());
            if (episode !== undefined) params.append('episode', episode.toString());

            const response = await axios.get('/api/movix-proxy', {
                params,
            });

            return response.data;
        },
        enabled: !!id,
        staleTime: 1000 * 60 * 60, // 1 hour
        retry: 1,
    });
};
