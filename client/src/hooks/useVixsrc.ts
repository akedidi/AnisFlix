import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

interface VixSrcStream {
    name: string;
    title: string;
    url: string;
    quality: string;
    type: string;
    headers: Record<string, string>;
}

interface VixSrcResponse {
    success: boolean;
    streams: VixSrcStream[];
    error?: string;
}

const fetchVixsrcStreams = async (type: 'movie' | 'tv', id: number, season?: number, episode?: number): Promise<VixSrcResponse | null> => {
    try {
        const params: any = {
            tmdbId: id,
            type
        };

        if (season) params.season = season;
        if (episode) params.episode = episode;

        const response = await axios.get('/api/movix-proxy', {
            params: {
                ...params,
                path: 'vixsrc'
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching Vixsrc streams:', error);
        return null;
    }
};

export const useVixsrc = (type: 'movie' | 'tv', id: number, season?: number, episode?: number) => {
    return useQuery({
        queryKey: ['vixsrc', type, id, season, episode],
        queryFn: () => fetchVixsrcStreams(type, id, season, episode),
        enabled: !!id && (type === 'movie' || (type === 'tv' && !!season && !!episode)),
        staleTime: 10 * 60 * 1000, // 10 minutes
        retry: 1
    });
};
