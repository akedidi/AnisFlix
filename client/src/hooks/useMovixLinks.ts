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
    data: MovixLinkData | MovixLinkData[]; // Can be object (movies) or array (TV shows)
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
    const enabled = false; // Disabled: movix-proxy?path=link call removed

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

            if (!data.success || !data.data) {
                return { links: [], hasLinks: false };
            }

            // Handle both formats: array for TV shows, object for movies
            let bysebuhoLinks: string[] = [];

            if (Array.isArray(data.data)) {
                // TV shows format: data is array
                if (data.data.length === 0) {
                    return { links: [], hasLinks: false };
                }
                const firstItem = data.data[0];
                bysebuhoLinks = firstItem.links || [];
            } else {
                // Movies format: data is object
                bysebuhoLinks = data.data.links || [];
            }

            console.log(`🎯 [MOVIX LINKS] Found ${bysebuhoLinks.length} Bysebuho links`);

            return {
                links: bysebuhoLinks,
                hasLinks: bysebuhoLinks.length > 0,
                data: Array.isArray(data.data) ? data.data[0] : data.data
            };
        },
        enabled,
        staleTime: 5 * 60 * 1000, // 5 minutes
        retry: 1
    });
}
