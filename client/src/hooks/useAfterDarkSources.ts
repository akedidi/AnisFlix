import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { movixProxy } from '../lib/movixProxy';

export interface AfterDarkSource {
    url: string;
    quality: string;
    type: string;
    provider: string;
    language: string;
    server?: string;
}

export interface AfterDarkResponse {
    success: boolean;
    sources: AfterDarkSource[];
    count: number;
}

export const useAfterDarkSources = (
    type: 'movie' | 'tv',
    id: number,
    title?: string,
    year?: string,
    originalTitle?: string,
    season?: number,
    episode?: number
): UseQueryResult<AfterDarkResponse | null> => {
    return useQuery({
        queryKey: ['afterdark', type, id, season, episode],
        queryFn: async () => {
            console.log(`🌙 [AfterDark] Fetching sources for ${type} ${id} (via proxy)`);
            try {
                const data = await movixProxy.getAfterDark(
                    type,
                    id,
                    title,
                    year,
                    originalTitle,
                    season,
                    episode
                );
                console.log(`✅ [AfterDark] Sources fetched:`, data);
                return data as AfterDarkResponse;
            } catch (error) {
                console.error(`❌ [AfterDark] Error fetching sources:`, error);
                return null;
            }
        },
        enabled: !!id && !!title && (type === 'movie' ? !!year : (!!season && !!episode)),
        staleTime: 10 * 60 * 1000, // 10 minutes
        retry: 1
    });
};
