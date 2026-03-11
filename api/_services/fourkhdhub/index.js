
import axios from 'axios';

// ==========================================
// PROXY SCRAPER CLASS 
// (Replaces scraping with WebStreamr via FlixNest Proxy)
// ==========================================

export class FourKHDHubScraper {
    constructor() {
        this.userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36';
    }

    async getStreams(tmdbId, type = 'movie', season = null, episode = null, tmdbInfo = null, logs = []) {
        const log = (msg) => { logs.push(msg); console.log(msg); };

        if (!tmdbInfo || !tmdbInfo.imdb_id) {
            log("❌ [WebStreamr] IMDB ID missing in TMDB Info");
            return [];
        }

        const imdbId = tmdbInfo.imdb_id;
        let streamId = imdbId;
        let types = 'movie';

        if (type === 'tv') {
            types = 'series'; // WebStreamr uses 'series'? Or 'tv'? User said tt...:1:2
            // URL format check: https://webstreamr.hayd.uk/stream/movie/tt...
            // For series it is likely stream/series/tt...:s:e.json
            streamId = `${imdbId}:${season}:${episode}`;
        }

        // WebStreamr URL construction
        const targetUrl = `https://webstreamr.hayd.uk/stream/${types}/${streamId}.json?language=eng`;
        log(`🎯 [WebStreamr] Target: ${targetUrl}`);

        try {
            log(`🚀 [WebStreamr] Calling CodeTabs Proxy directly`);

            const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`;
            const response = await axios.get(proxyUrl, {
                headers: {
                    'accept': 'application/json',
                    'user-agent': this.userAgent
                },
                timeout: 10000
            });

            if (typeof response.data === 'string' && response.data.trim().startsWith('<')) {
                throw new Error('CodeTabs proxy returned HTML (Cloudflare block)');
            }

            const data = response.data;

            if (!data || !data.streams) {
                log("⚠️ [WebStreamr] No streams found in response");
                return [];
            }

            log(`✅ [WebStreamr] Found ${data.streams.length} raw streams`);

            // Filter to only keep FSL links (HubCloud FSL)
            const fslStreams = data.streams.filter(stream => {
                const title = stream.title || "";
                // Keep only FSL links, exclude PixelServer and VixSrc
                return title.includes("FSL") || title.includes("HubCloud Server");
            });

            log(`🔍 [WebStreamr] Filtered to ${fslStreams.length} FSL streams`);

            // Map streams to AnisFlix format
            const mappedStreams = fslStreams.map(stream => {
                const title = stream.title || "";
                const name = stream.name || "";

                // Parse quality from name or title
                let quality = "HD";
                if (name.includes("2160p") || title.includes("2160p")) quality = "4K";
                else if (name.includes("1440p") || title.includes("1440p")) quality = "2K";
                else if (name.includes("1080p") || title.includes("1080p")) quality = "1080p";
                else if (name.includes("720p") || title.includes("720p")) quality = "720p";

                // Parse size (from title usually: "💾 18.88 GB")
                const sizeMatch = title.match(/💾 ([\d.]+ [GM]B)/);
                const size = sizeMatch ? sizeMatch[1] : null;

                // Provider label
                let label = `HubCloud FSL - ${quality}`;

                return {
                    url: stream.url,
                    quality: quality,
                    provider: 'FourKHDHub', // Keep provider key for UI logic
                    label: label,
                    size: size,
                    type: 'mkv',
                    isFourKHDHub: true // Helper flag if needed by UI
                };
            });

            return mappedStreams;

        } catch (error) {
            log(`❌ [WebStreamr] Proxy call failed: ${error.message}`);
            if (error.response) {
                log(`❌ [WebStreamr] Status: ${error.response.status}`);
                log(`❌ [WebStreamr] Data: ${JSON.stringify(error.response.data)}`);
            }
            return [];
        }
    }
}
