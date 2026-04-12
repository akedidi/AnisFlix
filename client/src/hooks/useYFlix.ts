import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';

interface YFlixSource {
    provider: string;
    language: string;
    quality: string;
    url: string;
    type: string;
    tracks?: Array<{
        file: string;
        label: string;
        kind: string;
        default: boolean;
    }>;
}

interface UseYFlixOptions {
    mediaId: number;
    mediaType: 'movie' | 'tv';
    seasonNumber?: number;
    episodeNumber?: number;
}

export function useYFlix({
    mediaId,
    mediaType,
    seasonNumber,
    episodeNumber,
}: UseYFlixOptions) {
    return useQuery({
        queryKey: ['yflix-sources', mediaId, mediaType, seasonNumber, episodeNumber],
        queryFn: async () => {
            console.log(`[YFlix] Fetching sources for tmdbId=${mediaId} type=${mediaType} S${seasonNumber || ''}E${episodeNumber || ''}`);

            const baseUrl = apiClient.getPublicBaseUrl();
            const params = new URLSearchParams({
                path: 'yflix',
                tmdbId: mediaId.toString(),
                type: mediaType,
                ...(seasonNumber && { season: seasonNumber.toString() }),
                ...(episodeNumber && { episode: episodeNumber.toString() }),
            });

            const url = `${baseUrl}/api/movix-proxy?${params}`;

            try {
                const response = await fetch(url);
                const data = await response.json();

                if (!data.success || !data.results) {
                    return [];
                }

                console.log(`[YFlix] Found ${data.results.length} sources`);
                return data.results as YFlixSource[];
            } catch (error) {
                console.error('[YFlix] Error fetching sources:', error);
                return [];
            }
        },
        enabled: !!mediaId,
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
    });
}
