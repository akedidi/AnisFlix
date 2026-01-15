import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

interface AfterDarkStream {
    url: string;
    quality: string;
    provider: string;
    name: string;
    type: string;
    language: string;
    headers?: Record<string, string>;
}

interface AfterDarkResponse {
    success: boolean;
    streams?: AfterDarkStream[];
}

export const useAfterDark = (
    type: 'movie' | 'tv',
    id: number,
    season?: number,
    episode?: number,
    title?: string,
    year?: string,
    originalTitle?: string
) => {
    return useQuery<AfterDarkResponse>({
        queryKey: ['afterdark', type, id, season, episode, title, year, originalTitle],
        queryFn: async () => {
            const params = {
                path: 'afterdark',
                tmdbId: id.toString(),
                type,
                ...(season !== undefined && { season: season.toString() }),
                ...(episode !== undefined && { episode: episode.toString() }),
                ...(title && { title }),
                ...(year && { year }),
                ...(originalTitle && { originalTitle }),
            };

            console.log(`🌑 [AfterDark Client] Fetching DIRECTLY from AfterDark: ${JSON.stringify(params)}`);

            const baseUrl = `https://afterdark.mom/api/sources/${type === 'movie' ? 'movies' : 'shows'}`;
            const url = new URL(baseUrl);

            // Append params manually to match the exact format requested
            // params object keys might need mapping
            url.searchParams.append('tmdbId', id.toString());
            if (title) url.searchParams.append('title', title);

            if (type === 'movie') {
                if (year) url.searchParams.append('year', year);
                if (originalTitle) url.searchParams.append('originalTitle', originalTitle);
            } else {
                if (season) url.searchParams.append('season', season!.toString());
                if (episode) url.searchParams.append('episode', episode!.toString());
            }

            // Strategy 1: Try CorsProxy.io (Fastest, solving CORS)
            try {
                console.log(`🌑 [AfterDark Client] Strategy 1: Fetching via CorsProxy.io`);
                const corsProxyUrl = `https://corsproxy.io/?${encodeURIComponent(url.toString())}`;
                const response = await axios.get(corsProxyUrl, { timeout: 8000 }); // 8s timeout

                const data = response.data;
                if (data && Array.isArray(data.sources)) {
                    console.log(`✅ [AfterDark Client] CorsProxy Success`);
                    return processAfterDarkData(data);
                }
            } catch (err) {
                console.warn(`⚠️ [AfterDark Client] CorsProxy Failed:`, err);
            }

            // Strategy 2: Fallback to Vercel Proxy (Puppeteer) (Robust, bypasses Cloudflare)
            console.log(`🌑 [AfterDark Client] Strategy 2: Fetching via Vercel Proxy (Puppeteer)`);
            try {
                const response = await axios.get('/api/movix-proxy', {
                    params,
                });
                const data = response.data;
                if (data && (Array.isArray(data.sources) || data.success)) {
                    // movix-proxy returns { success: true, sources: [...] }
                    return processAfterDarkData(data);
                }
            } catch (e) {
                console.error(`❌ [AfterDark Client] All strategies failed`, e);
            }

            return { success: false, streams: [] };
        },
        enabled: !!id,
        staleTime: 1000 * 60 * 10,
        retry: 1,
    });
};

// Helper to parse data (shared between strategies)
const processAfterDarkData = (data: any): AfterDarkResponse => {
    const rawSources = Array.isArray(data.sources) ? data.sources : [];

    const streams = rawSources
        .filter((source: any) => {
            if (source.proxied !== false) return false;
            if (source.kind !== 'hls') return false;
            return true;
        })
        .map((source: any) => {
            let language = 'VF';
            const lang = (source.language || '').toLowerCase();

            if (lang === 'english' || lang === 'eng' || lang === 'en' || lang.includes('vo')) {
                language = 'VO';
            } else if (lang === 'multi') {
                language = 'VF';
            } else if (lang.includes('vostfr')) {
                language = 'VOSTFR';
            }

            return {
                name: `AfterDark ${language} ${source.quality || 'HD'}`,
                url: source.url,
                quality: source.quality || 'HD',
                type: 'm3u8',
                provider: 'afterdark',
                language: language,
                headers: {
                    'Referer': 'https://proxy.afterdark.click/',
                    'Origin': 'https://proxy.afterdark.click',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            };
        });

    return {
        success: true,
        streams
    };
};
