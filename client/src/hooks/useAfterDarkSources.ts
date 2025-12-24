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
            console.log(`🌙 [AfterDark] Fetching sources for ${type} ${id} (CLIENT-SIDE)`);
            try {
                // Call AfterDark API directly from browser to bypass Vercel IP blocking
                const baseUrl = 'https://afterdark.mom/api/sources';
                let url: string;

                if (type === 'movie') {
                    const params = new URLSearchParams({
                        tmdbId: id.toString(),
                        ...(title && { title }),
                        ...(year && { year }),
                        ...(originalTitle && { originalTitle })
                    });
                    url = `${baseUrl}/movies?${params}`;
                } else {
                    if (!season || !episode) {
                        console.warn('🌙 [AfterDark] Missing season/episode for TV show');
                        return null;
                    }
                    const params = new URLSearchParams({
                        tmdbId: id.toString(),
                        season: season.toString(),
                        episode: episode.toString(),
                        ...(title && { title })
                    });
                    url = `${baseUrl}/shows?${params}`;
                }

                console.log(`🌙 [AfterDark] Direct API call: ${url}`);

                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                    }
                });

                if (!response.ok) {
                    console.error(`❌ [AfterDark] API returned ${response.status}`);
                    return null;
                }

                const data = await response.json();
                console.log(`✅ [AfterDark] Raw API response:`, data);

                // Transform AfterDark response to our format
                const sources: AfterDarkSource[] = [];
                if (Array.isArray(data)) {
                    for (const item of data) {
                        // Filter out proxied links
                        if (item.proxied !== false) {
                            console.log(`🌙 [AfterDark] Skipping proxied link`);
                            continue;
                        }

                        const streamType = item.kind || (item.url?.includes('.m3u8') ? 'hls' : 'mp4');
                        sources.push({
                            url: item.url || item.link,
                            quality: item.quality || 'HD',
                            type: streamType === 'hls' ? 'm3u8' : streamType,
                            provider: 'afterdark',
                            language: 'VF',
                            server: item.server || item.name || 'AfterDark'
                        });
                    }
                }

                console.log(`✅ [AfterDark] Transformed ${sources.length} sources`);
                return {
                    success: true,
                    sources,
                    count: sources.length
                };
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
