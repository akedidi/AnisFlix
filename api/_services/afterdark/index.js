
import axios from 'axios';

export class AfterDarkScraper {
    constructor() {
        this.baseUrl = 'https://afterdark.mom/api/sources';
        this.headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': 'https://afterdark.mom/',
            'Origin': 'https://afterdark.mom',
            'Accept': '*/*',
            'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'same-origin',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'DNT': '1',
            'Upgrade-Insecure-Requests': '1'
        };
    }

    async getStreams(tmdbId, type, title, year, season = null, episode = null, originalTitle = null) {
        try {
            // Use Cloudflare Worker as intermediate proxy to bypass blocking
            // Vercel IPs -> corsproxy.io often gets blocked
            // Worker IPs -> corsproxy.io usually works
            const WORKER_URL = 'https://anisflix.kedidi-anis.workers.dev';

            // Parameters for the worker
            // params are: path=afterdark, type, tmdbId, ...
            const params = new URLSearchParams();
            params.append('path', 'afterdark');
            params.append('tmdbId', tmdbId);
            params.append('type', type);

            if (title) params.append('title', title);

            if (type === 'movie') {
                if (year) params.append('year', year);
                if (originalTitle) params.append('originalTitle', originalTitle);
            } else {
                if (season) params.append('season', season);
                if (episode) params.append('episode', episode);
            }

            const finalUrl = `${WORKER_URL}?${params.toString()}`;
            console.log(`🌑 [AfterDark] Fetching via Worker: ${finalUrl}`);

            const response = await axios.get(finalUrl, {
                headers: {
                    'User-Agent': 'AnisFlix-Vercel-Proxy',
                },
                timeout: 20000,
                validateStatus: null
            });

            console.log(`🌑 [AfterDark] Response Status: ${response.status}`);

            if (response.status !== 200) {
                console.warn(`⚠️ [AfterDark] Worker returned status ${response.status}`);
                // Fallback? No, just return empty if worker fails.
                return [];
            }

            const data = response.data;
            console.log(`🌑 [AfterDark] Response keys:`, Object.keys(data));
            if (data.sources) {
                console.log(`🌑 [AfterDark] Sources count raw: ${data.sources.length}`);
            }

            if (!data || !data.sources || !Array.isArray(data.sources)) {
                console.warn(`⚠️ [AfterDark] No sources array in response`);
                return [];
            }

            const sources = data.sources
                .filter(source => {
                    // Filter: kind must be hls AND proxied must be false (as per Swift/User req)
                    if (source.proxied !== false) return false;
                    if (source.kind !== 'hls') return false;
                    return true;
                })
                .map(source => {
                    // Map Language
                    let language = 'VF';
                    const lang = (source.language || '').toLowerCase();

                    if (lang === 'english' || lang === 'eng' || lang === 'en' || lang.includes('vo')) {
                        language = 'VO';
                    } else if (lang === 'multi') {
                        language = 'VF'; // Treat Multi as VF base
                    } else if (lang.includes('vostfr')) {
                        language = 'VOSTFR';
                    }
                    // Default to VF if "french", "fr", or unknown

                    return {
                        name: `AfterDark ${language} ${source.quality || 'HD'}`,
                        url: source.url,
                        quality: source.quality || 'HD',
                        type: 'm3u8', // Filtered for hls
                        provider: 'afterdark',
                        language: language,
                        headers: {
                            // Ensure client uses these headers if needed for playback, 
                            // though usually M3U8s from AfterDark might work directly or need these.
                            // We pass them just in case existing logic needs them.
                            'Referer': 'https://proxy.afterdark.click/',
                            'Origin': 'https://proxy.afterdark.click',
                            'User-Agent': this.headers['User-Agent']
                        }
                    };
                });

            console.log(`✅ [AfterDark] Found ${sources.length} sources`);
            return sources;

        } catch (error) {
            console.error(`❌ [AfterDark] Error: ${error.message}`);
            return [];
        }
    }
}
