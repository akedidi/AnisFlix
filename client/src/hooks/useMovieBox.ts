import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

interface MovieBoxStream {
    name: string;
    quality: string;
    url: string;
    directUrl?: string;
    size: string;
    type: string;
    language: string;
    provider: string;
}

interface MovieBoxResponse {
    success: boolean;
    streams?: MovieBoxStream[];
    matchedContent?: {
        title: string;
        year?: string;
        movieBoxId?: string;
    };
    message?: string;
}

export const useMovieBox = (
    type: 'movie' | 'tv',
    id: number,
    season?: number,
    episode?: number
) => {
    return useQuery<MovieBoxResponse>({
        queryKey: ['moviebox', type, id, season, episode],
        queryFn: async () => {
            const params = new URLSearchParams({
                path: 'moviebox',
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
