import { useQuery } from '@tanstack/react-query';
import { movixProxy } from '../lib/movixProxy';

export interface CpasmalSource {
    url: string;
    quality: string;
    type: string;
    provider: string;
    language: string;
    server: string;
}

export interface CpasmalResponse {
    success: boolean;
    sources: CpasmalSource[];
    count: number;
    title?: string;
    year?: string;
}

export const useCpasmalSources = (
    type: 'movie' | 'tv',
    id: number,
    season?: number,
    episode?: number
) => {
    return useQuery({
        queryKey: ['cpasmal', type, id, season, episode],
        queryFn: async () => {
            console.log(`🎬 [Cpasmal] Fetching sources for ${type} ${id}`);
            try {
                const data = await movixProxy.getCpasmal(type, id, season, episode);
                console.log(`✅ [Cpasmal] Sources fetched:`, data);
                return data as CpasmalResponse;
            } catch (error) {
                console.error(`❌ [Cpasmal] Error fetching sources:`, error);
                return null;
            }
        },
        enabled: !!id && (type === 'movie' || (type === 'tv' && !!season && !!episode)),
        staleTime: 10 * 60 * 1000, // 10 minutes
        retry: 1
    });
};
