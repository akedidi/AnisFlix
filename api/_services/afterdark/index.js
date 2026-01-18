
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

    async getStreams(tmdbId, type, title, year, season = null, episode = null, originalTitle = null, fetcher = null) {
        try {
            // Strategy: Try multiple proxies in sequence until one works
            // Vercel IPs are often blocked, so we need redundancy.
            const targetEndpoint = `${this.baseUrl}/${type === 'movie' ? 'movies' : 'shows'}`;
            const params = new URLSearchParams();
            params.append('tmdbId', tmdbId);
            if (title) params.append('title', title);
            if (type === 'movie') {
                if (year) params.append('year', year);
                if (originalTitle) params.append('originalTitle', originalTitle);
            } else {
                if (season) params.append('season', season);
                if (episode) params.append('episode', episode);
            }
            const fullTargetUrl = `${targetEndpoint}?${params.toString()}`;

            let attempts = [];
            let successData = null;

            // Priority 1: Use provided fetcher (Puppeteer) if available
            // This is the Vercel-side solution to bypass Cloudflare Challenge
            if (fetcher) {
                console.log(`🌑 [AfterDark] Using custom fetcher (Puppeteer) for: ${fullTargetUrl}`);
                try {
                    const response = await fetcher(fullTargetUrl, {
                        headers: this.headers
                    });

                    // Parse response if it's a string (Puppeteer typically returns text or object)
                    let data = response.data;
                    if (typeof data === 'string') {
                        try {
                            data = JSON.parse(data);
                        } catch (e) {
                            console.warn(`⚠️ [AfterDark] Failed to parse Puppeteer response as JSON. Body preview: ${data.substring(0, 50)}...`);
                        }
                    }

                    if (data && Array.isArray(data)) {
                        // AfterDark direct API returns array of sources
                        // Wrap it in { sources: ... } to match proxy format expected below
                        data = { sources: data };
                    }

                    if (data && Array.isArray(data.sources)) {
                        console.log(`✅ [AfterDark] Success with Puppeteer`);
                        return this.processSources(data.sources);
                    } else {
                        const preview = typeof data === 'string' ? data.substring(0, 100) : 'Object';
                        attempts.push(`Puppeteer Data Invalid: ${preview}`);
                    }
                } catch (err) {
                    const msg = `Puppeteer Failed: ${err.message}`;
                    console.error(`❌ [AfterDark] ${msg}`);
                    attempts.push(msg);
                    // Fallthrough to proxies
                }
            } else {
                console.log(`🌑 [AfterDark] No fetcher provided, skipping Puppeteer (fetcher type: ${typeof fetcher})`);
            }

            // Worker Params
            const workerParams = new URLSearchParams();
            workerParams.append('path', 'afterdark');
            workerParams.append('tmdbId', tmdbId);
            workerParams.append('type', type);
            if (title) workerParams.append('title', title);
            if (type === 'movie') {
                if (year) workerParams.append('year', year);
                if (originalTitle) workerParams.append('originalTitle', originalTitle);
            } else {
                if (season) workerParams.append('season', season);
                if (episode) workerParams.append('episode', episode);
            }

            const proxies = [
                {
                    name: 'CorsProxy.io',
                    url: `https://corsproxy.io/?${fullTargetUrl}`,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Origin': 'https://afterdark.mom',
                        'Referer': 'https://afterdark.mom/'
                    }
                },
                {
                    name: 'Cloudflare Worker',
                    url: `https://anisflix.kedidi-anis.workers.dev?${workerParams.toString()}`,
                    headers: {
                        'User-Agent': 'AnisFlix-Vercel-Proxy',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                        'Sec-Fetch-Dest': 'document',
                        'Sec-Fetch-Mode': 'navigate',
                        'Sec-Fetch-Site': 'none',
                        'Upgrade-Insecure-Requests': '1'
                    }
                },
                {
                    name: 'AllOrigins',
                    url: `https://api.allorigins.win/raw?url=${encodeURIComponent(fullTargetUrl)}`,
                    headers: {}
                }
            ];

            for (const proxy of proxies) {
                console.log(`🌑 [AfterDark] Trying proxy: ${proxy.name} -> ${proxy.url}`);
                try {
                    const response = await axios.get(proxy.url, {
                        headers: proxy.headers,
                        timeout: 15000,
                        validateStatus: null
                    });

                    if (response.status === 200 && response.data && Array.isArray(response.data.sources)) {
                        console.log(`✅ [AfterDark] Success with ${proxy.name}`);
                        successData = response.data;
                        break; // Stop loop on success
                    } else {
                        // Capture failure details (status, body preview)
                        const preview = typeof response.data === 'string'
                            ? response.data.substring(0, 100).replace(/\n/g, ' ')
                            : 'Object or empty';

                        const msg = `Failed ${proxy.name}: Status ${response.status} - Body: ${preview}`;
                        console.warn(`⚠️ [AfterDark] ${msg}`);
                        attempts.push(msg);
                    }
                } catch (err) {
                    const msg = `Error ${proxy.name}: ${err.message}`;
                    console.warn(`⚠️ [AfterDark] ${msg}`);
                    attempts.push(msg);
                }
            }

            if (!successData) {
                return [{
                    name: `DEBUG: Proxies Failed. Trace: ${attempts.join(' | ')}`,
                    url: "debug",
                    quality: "HD",
                    type: "m3u8",
                    provider: "debug",
                    language: "debug"
                }];
            }

            const data = successData;
            console.log(`🌑 [AfterDark] Response keys:`, Object.keys(data));
            if (data.sources) {
                console.log(`🌑 [AfterDark] Sources count raw: ${data.sources.length}`);
            }

            if (!data || !data.sources || !Array.isArray(data.sources)) {
                console.warn(`⚠️ [AfterDark] No sources array in response`);
                return [{
                    name: `DEBUG: Invalid Data - Keys: ${Object.keys(data || {}).join(',')}`,
                    url: "debug",
                    quality: "HD",
                    type: "m3u8",
                    provider: "debug",
                    language: "debug"
                }];
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
            return [{
                name: `DEBUG: Error - ${error.message}`,
                url: "debug",
                quality: "HD",
                type: "m3u8",
                provider: "debug",
                language: "debug"
            }];
        }
    }
}
