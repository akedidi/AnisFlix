import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

interface VidlinkStream {
    name: string;
    title: string;
    url: string;
    quality: string;
}

interface VidlinkResponse {
    success: boolean;
    streams?: VidlinkStream[];
}

export const useVidlink = (
    type: 'movie' | 'tv',
    id: number,
    season?: number,
    episode?: number
) => {
    return useQuery<VidlinkResponse>({
        queryKey: ['vidlink', type, id, season, episode],
        queryFn: async () => {
            const params = new URLSearchParams({
                path: 'vidlink',
                tmdbId: id.toString(),
                type,
            });
            if (season !== undefined) params.append('season', season.toString());
            if (episode !== undefined) params.append('episode', episode.toString());

            const response = await axios.get('/api/movix-proxy', { params });
            return response.data;
        },
        enabled: !!id,
        staleTime: 1000 * 60 * 60, // 1 hour
        retry: 1,
    });
};
