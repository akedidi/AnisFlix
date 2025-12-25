import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';

interface AnimeAPISource {
    provider: string;
    language: string;
    quality: string;
    url: string;
    type: string;
    animeInfo: {
        id: string;
        title: string;
        episode: number;
        totalEpisodes: number;
    };
}

interface UseAnimeAPISourcesOptions {
    mediaId: number;
    mediaType: 'movie' | 'tv';
    title: string;
    genres: Array<{ id: number; name: string }>;
    seasonNumber?: number;
    episodeNumber?: number;
}

export function useAnimeAPISources({
    mediaId,
    mediaType,
    title,
    genres,
    seasonNumber,
    episodeNumber,
}: UseAnimeAPISourcesOptions) {
    return useQuery({
        queryKey: ['anime-api-sources', mediaId, mediaType, seasonNumber, episodeNumber],
        queryFn: async () => {
            // Check if this is an animation (genre ID: 16)
            const isAnimation = genres?.some(g => g.id === 16);

            if (!isAnimation) {
                console.log('[AnimeAPI] Not an animation, skipping');
                return [];
            }

            console.log(`[AnimeAPI] Fetching sources for: ${title} (Season ${seasonNumber || 1}, Episode ${episodeNumber || 1})`);

            const baseUrl = apiClient.getPublicBaseUrl();
            const params = new URLSearchParams({
                path: 'anime-api',
                title,
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

                return data.results as AnimeAPISource[];
            } catch (error) {
                console.error('[AnimeAPI] Error fetching sources:', error);
                return [];
            }
        },
        enabled: !!title && !!genres,
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
    });
}
