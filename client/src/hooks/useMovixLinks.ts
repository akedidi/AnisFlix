import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';

interface MovixLinkData {
    id: number;
    series_id?: string;
    movie_id?: string;
    season_number?: number;
    episode_number?: number;
    links: string[];
}

interface MovixLinksResponse {
    success: boolean;
    type: 'movie' | 'tv';
    data: MovixLinkData[];
}

/**
 * Hook to fetch Bysebuho links from Movix API
 * @param type - 'movie' or 'tv'
 * @param id - TMDB ID
 * @param season - Season number (for TV)
 * @param episode - Episode number (for TV)
 */
export function useMovixLinks(
    type: 'movie' | 'tv',
    id: number,
    season?: number,
    episode?: number
) {
    const enabled = type === 'movie' || (type === 'tv' && !!season && !!episode);

    return useQuery({
        queryKey: ['movix-links', type, id, season, episode],
        queryFn: async () => {
            console.log(`🔗 [MOVIX LINKS] Fetching for ${type} ${id}`, { season, episode });

            let url = `/api/movix-proxy?path=link&type=${type}&id=${id}`;

            if (type === 'tv') {
                if (!season || !episode) {
                    throw new Error('Season and episode required for TV shows');
                }
                url += `&season=${season}&episode=${episode}`;
            }

            const response = await apiClient.get(url);

            if (!response.ok) {
                throw new Error('Failed to fetch Movix links');
            }

            const data = await response.json();

            console.log(`✅ [MOVIX LINKS] Response:`, data);

            if (!data.success || !data.data || data.data.length === 0) {
                return { links: [], hasLinks: false };
            }

            // Extract Bysebuho links from the first data item
            const firstItem = data.data[0];
            const bysebuhoLinks = firstItem.links || [];

            console.log(`🎯 [MOVIX LINKS] Found ${bysebuhoLinks.length} Bysebuho links`);

            return {
                links: bysebuhoLinks,
                hasLinks: bysebuhoLinks.length > 0,
                data: firstItem
            };
        },
        enabled,
        staleTime: 5 * 60 * 1000, // 5 minutes
        retry: 1
    });
}
