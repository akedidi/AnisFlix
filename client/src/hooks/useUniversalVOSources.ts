import { useQuery } from '@tanstack/react-query';
import { movixProxy } from '../lib/movixProxy';

export interface UniversalVOSource {
    file: string;
    type: string;
    lang?: string;
    extractor?: string;
    provider?: string;
    headers?: Record<string, string>;
}

export interface UniversalVOResponse {
    files: UniversalVOSource[];
    errors?: any[];
}

export const useUniversalVOSources = (
    type: 'movie' | 'tv',
    id: number,
    season?: number,
    episode?: number
) => {
    return useQuery({
        queryKey: ['universalvo', type, id, season, episode],
        queryFn: async () => {
            console.log(`🚀 [UniversalVO] Fetching sources for ${type} ${id}`);
            try {
                const data = await movixProxy.getUniversalVO(type, id, season, episode);
                console.log(`✅ [UniversalVO] Sources fetched:`, data);
                return data as UniversalVOResponse;
            } catch (error) {
                console.error(`❌ [UniversalVO] Error fetching sources:`, error);
                return null;
            }
        },
        enabled: false, // API BROKEN - Disabled Globally
        // enabled: !!id && (type === 'movie' || (type === 'tv' && !!season && !!episode)),
        staleTime: 10 * 60 * 1000, // 10 minutes
        retry: 1
    });
};
