import axios from 'axios';

class VixSrcScraper {
    constructor() {
        this.tmdbApiKey = "68e094699525b18a70bab2f86b1fa706";
        this.baseUrl = 'https://vixsrc.to';
        this.userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    }

    async makeRequest(url, options = {}) {
        const defaultHeaders = {
            'User-Agent': this.userAgent,
            'Accept': 'application/json,*/*',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            ...options.headers
        };

        try {
            const response = await axios({
                method: options.method || 'GET',
                url,
                headers: defaultHeaders,
                ...options
            });
            return response;
        } catch (error) {
            console.error(`[Vixsrc] Request failed for ${url}: ${error.message}`);
            throw error;
        }
    }

    async extractStreamFromPage(contentType, contentId, seasonNum, episodeNum) {
        let vixsrcUrl;

        if (contentType === 'movie') {
            vixsrcUrl = `${this.baseUrl}/movie/${contentId}`;
        } else {
            vixsrcUrl = `${this.baseUrl}/tv/${contentId}/${seasonNum}/${episodeNum}`;
        }

        console.log(`[Vixsrc] Fetching: ${vixsrcUrl}`);

        try {
            const response = await this.makeRequest(vixsrcUrl, {
                headers: {
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
                }
            });

            const html = response.data;
            let masterPlaylistUrl = null;

            // Method 1: Look for window.masterPlaylist
            if (html.includes('window.masterPlaylist')) {
                const urlMatch = html.match(/url:\s*['"]([^'"]+)['"]/);
                const tokenMatch = html.match(/['"​]?token['"​]?\s*:\s*['"]([^'"]+)['"]/);
                const expiresMatch = html.match(/['"​]?expires['"​]?\s*:\s*['"]([^'"]+)['"]/);

                if (urlMatch && tokenMatch && expiresMatch) {
                    const baseUrl = urlMatch[1];
                    const token = tokenMatch[1];
                    const expires = expiresMatch[1];

                    if (baseUrl.includes('?b=1')) {
                        masterPlaylistUrl = `${baseUrl}&token=${token}&expires=${expires}&h=1&lang=en`;
                    } else {
                        masterPlaylistUrl = `${baseUrl}?token=${token}&expires=${expires}&h=1&lang=en`;
                    }

                    console.log(`[Vixsrc] Constructed master playlist URL`);
                }
            }

            // Method 2: Look for direct .m3u8 URLs
            if (!masterPlaylistUrl) {
                const m3u8Match = html.match(/(https?:\/\/[^'"\s]+\.m3u8[^'"\s]*)/);
                if (m3u8Match) {
                    masterPlaylistUrl = m3u8Match[1];
                }
            }

            if (!masterPlaylistUrl) {
                console.log('[Vixsrc] No master playlist URL found');
                return null;
            }

            return masterPlaylistUrl;
        } catch (error) {
            console.error('[Vixsrc] Error extracting stream from page:', error);
            return null;
        }
    }

    async extractStream(tmdbId, mediaType = 'movie', seasonNum = null, episodeNum = null) {
        console.log(`[Vixsrc Extract] TMDB ID: ${tmdbId}, Type: ${mediaType}`);

        try {
            const masterPlaylistUrl = await this.extractStreamFromPage(mediaType, tmdbId, seasonNum, episodeNum);

            if (!masterPlaylistUrl) {
                return { success: false, error: 'No stream found' };
            }

            return {
                success: true,
                m3u8Url: masterPlaylistUrl
            };
        } catch (error) {
            console.error(`[Vixsrc Extract] Error: ${error.message}`);
            return { success: false, error: error.message };
        }
    }
}

const vixsrcScraper = new VixSrcScraper();

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method POST required' });
    }

    try {
        const { tmdbId, mediaType, season, episode } = req.body;

        if (!tmdbId || !mediaType) {
            return res.status(400).json({ error: 'Missing tmdbId or mediaType' });
        }

        console.log(`🚀 [VIXSRC EXTRACT API] ${mediaType} ${tmdbId} S${season}E${episode}`);

        const result = await vixsrcScraper.extractStream(
            tmdbId,
            mediaType,
            season ? parseInt(season) : null,
            episode ? parseInt(episode) : null
        );

        res.json(result);

    } catch (error) {
        console.error('[VIXSRC EXTRACT API] Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}
