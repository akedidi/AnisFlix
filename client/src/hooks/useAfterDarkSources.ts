import { useQuery, UseQueryResult } from '@tanstack/react-query';

export interface AfterDarkSource {
    url: string;
    quality: string;
    type: string;
    provider: string;
    language: string;
    server?: string;
    name?: string;
    kind?: string;
    proxied?: boolean;
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
            console.log(`🌙 [AfterDark] Fetching sources for ${type} ${id} (via CorsProxy.io)`);
            try {
                // Build AfterDark API URL
                const endpoint = type === 'movie' ? 'movies' : 'shows';
                let afterDarkUrl = `https://afterdark.mom/api/sources/${endpoint}?tmdbId=${id}`;

                if (title) {
                    afterDarkUrl += `&title=${encodeURIComponent(title)}`;
                }

                if (type === 'movie') {
                    if (year) afterDarkUrl += `&year=${year}`;
                    if (originalTitle) afterDarkUrl += `&originalTitle=${encodeURIComponent(originalTitle)}`;
                } else {
                    if (season) afterDarkUrl += `&season=${season}`;
                    if (episode) afterDarkUrl += `&episode=${episode}`;
                }

                // Wrap with CorsProxy.io to bypass CORS in browser
                const corsProxyUrl = `https://corsproxy.io/?${afterDarkUrl}`;

                console.log(`🌐 [AfterDark] Calling: ${corsProxyUrl}`);

                const response = await fetch(corsProxyUrl, {
                    headers: {
                        'Accept': 'application/json',
                        'Origin': 'https://afterdark.mom',
                        'Referer': 'https://afterdark.mom/'
                    }
                });

                if (!response.ok) {
                    console.error(`❌ [AfterDark] HTTP Error: ${response.status}`);
                    return null;
                }

                const data = await response.json();
                console.log(`✅ [AfterDark] Raw response:`, data);

                // AfterDark API returns { meta: {...}, sources: [...] }
                // Filter for kind=hls and proxied=false
                const sources = (data.sources || [])
                    .filter((s: any) => s.kind === 'hls' && s.proxied === false)
                    .map((s: any) => ({
                        url: s.url,
                        quality: s.quality || 'HD',
                        type: 'm3u8',
                        provider: 'afterdark',
                        language: s.language?.toLowerCase().includes('english') ? 'VO' : 'VF',
                        server: s.name || 'AfterDark'
                    }));

                console.log(`✅ [AfterDark] Filtered sources:`, sources);

                return {
                    success: true,
                    sources,
                    count: sources.length
                } as AfterDarkResponse;
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
