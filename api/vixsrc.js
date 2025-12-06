import axios from 'axios';

class VixSrcScraper {
    constructor() {
        this.tmdbApiKey = "68e094699525b18a70bab2f86b1fa706";
        this.baseUrl = 'https://vixsrc.to';
        this.userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    }

    /**
     * Helper function to make HTTP requests with default headers
     */
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

    /**
     * Helper function to get TMDB info
     */
    async getTmdbInfo(tmdbId, mediaType) {
        const url = `https://api.themoviedb.org/3/${mediaType === 'tv' ? 'tv' : 'movie'}/${tmdbId}?api_key=${this.tmdbApiKey}`;

        try {
            const response = await this.makeRequest(url);
            const data = response.data;
            const title = mediaType === 'tv' ? data.name : data.title;
            const year = mediaType === 'tv' ? data.first_air_date?.substring(0, 4) : data.release_date?.substring(0, 4);

            if (!title) {
                throw new Error('Could not extract title from TMDB response');
            }

            console.log(`[Vixsrc] TMDB Info: "${title}" (${year})`);
            return { title, year, data };
        } catch (error) {
            console.error('[Vixsrc] Failed to get TMDB info', error);
            return { title: 'Unknown', year: 'Unknown', data: {} };
        }
    }

    /**
     * Helper function to extract stream URL from Vixsrc page
     */
    async extractStreamFromPage(url, contentType, contentId, seasonNum, episodeNum) {
        let vixsrcUrl;
        let subtitleApiUrl;

        if (contentType === 'movie') {
            vixsrcUrl = `${this.baseUrl}/movie/${contentId}`;
            subtitleApiUrl = `https://sub.wyzie.ru/search?id=${contentId}`;
        } else {
            vixsrcUrl = `${this.baseUrl}/tv/${contentId}/${seasonNum}/${episodeNum}`;
            subtitleApiUrl = `https://sub.wyzie.ru/search?id=${contentId}&season=${seasonNum}&episode=${episodeNum}`;
        }

        console.log(`[Vixsrc] Fetching: ${vixsrcUrl}`);

        try {
            const response = await this.makeRequest(vixsrcUrl, {
                headers: {
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
                }
            });

            const html = response.data;
            console.log(`[Vixsrc] HTML length: ${html.length} characters`);

            let masterPlaylistUrl = null;

            // Method 1: Look for window.masterPlaylist (primary method)
            if (html.includes('window.masterPlaylist')) {
                console.log('[Vixsrc] Found window.masterPlaylist');

                const urlMatch = html.match(/url:\s*['"]([^'"]+)['"]/);
                const tokenMatch = html.match(/['"]?token['"]?\s*:\s*['"]([^'"]+)['"]/);
                const expiresMatch = html.match(/['"]?expires['"]?\s*:\s*['"]([^'"]+)['"]/);

                if (urlMatch && tokenMatch && expiresMatch) {
                    const baseUrl = urlMatch[1];
                    const token = tokenMatch[1];
                    const expires = expiresMatch[1];

                    console.log('[Vixsrc] Extracted tokens:');
                    console.log(`  - Base URL: ${baseUrl}`);
                    console.log(`  - Token: ${token.substring(0, 20)}...`);
                    console.log(`  - Expires: ${expires}`);

                    // Construct the master playlist URL
                    if (baseUrl.includes('?b=1')) {
                        masterPlaylistUrl = `${baseUrl}&token=${token}&expires=${expires}&h=1&lang=en`;
                    } else {
                        masterPlaylistUrl = `${baseUrl}?token=${token}&expires=${expires}&h=1&lang=en`;
                    }

                    console.log(`[Vixsrc] Constructed master playlist URL: ${masterPlaylistUrl}`);
                }
            }

            // Method 2: Look for direct .m3u8 URLs
            if (!masterPlaylistUrl) {
                const m3u8Match = html.match(/(https?:\/\/[^'"\s]+\.m3u8[^'"\s]*)/);
                if (m3u8Match) {
                    masterPlaylistUrl = m3u8Match[1];
                    console.log('[Vixsrc] Found direct .m3u8 URL:', masterPlaylistUrl);
                }
            }

            // Method 3: Look for stream URLs in script tags
            if (!masterPlaylistUrl) {
                const scriptMatches = html.match(/<script[^>]*>(.*?)<\/script>/gs);
                if (scriptMatches) {
                    for (const script of scriptMatches) {
                        const streamMatch = script.match(/['"]?(https?:\/\/[^'"\s]+(?:\.m3u8|playlist)[^'"\s]*)/);
                        if (streamMatch) {
                            masterPlaylistUrl = streamMatch[1];
                            console.log('[Vixsrc] Found stream in script:', masterPlaylistUrl);
                            break;
                        }
                    }
                }
            }

            if (!masterPlaylistUrl) {
                console.log('[Vixsrc] No master playlist URL found');
                return null;
            }

            return { masterPlaylistUrl, subtitleApiUrl };
        } catch (error) {
            console.error('[Vixsrc] Error extracting stream from page:', error);
            return null;
        }
    }

    /**
     * Helper function to get subtitles
     */
    async getSubtitles(subtitleApiUrl) {
        try {
            const response = await this.makeRequest(subtitleApiUrl);
            const subtitleData = response.data;

            if (!Array.isArray(subtitleData)) {
                return '';
            }

            // Find English subtitle track (same logic as original)
            let subtitleTrack = subtitleData.find((track) =>
                track.display.includes('English') && (track.encoding === 'ASCII' || track.encoding === 'UTF-8')
            );

            if (!subtitleTrack) {
                subtitleTrack = subtitleData.find((track) => track.display.includes('English') && track.encoding === 'CP1252');
            }

            if (!subtitleTrack) {
                subtitleTrack = subtitleData.find((track) => track.display.includes('English') && track.encoding === 'CP1250');
            }

            if (!subtitleTrack) {
                subtitleTrack = subtitleData.find((track) => track.display.includes('English') && track.encoding === 'CP850');
            }

            const subtitles = subtitleTrack ? subtitleTrack.url : '';
            console.log(subtitles ? `[Vixsrc] Found subtitles: ${subtitles}` : '[Vixsrc] No English subtitles found');
            return subtitles;
        } catch (error) {
            console.log('[Vixsrc] Subtitle fetch failed:', error.message);
            return '';
        }
    }

    /**
     * Main function to get streams
     */
    async getStreams(tmdbId, mediaType = 'movie', seasonNum = null, episodeNum = null) {
        console.log(`[Vixsrc] Fetching streams for TMDB ID: ${tmdbId}, Type: ${mediaType}`);

        try {
            // Get TMDB info (optional but good for logging)
            await this.getTmdbInfo(tmdbId, mediaType);

            // Extract stream from Vixsrc page
            const streamData = await this.extractStreamFromPage(null, mediaType, tmdbId, seasonNum, episodeNum);

            if (!streamData) {
                console.log('[Vixsrc] No stream data found');
                return [];
            }

            const { masterPlaylistUrl, subtitleApiUrl } = streamData;

            // Return single master playlist with Auto quality
            console.log('[Vixsrc] Returning master playlist with Auto quality...');

            // Get subtitles
            const subtitles = await this.getSubtitles(subtitleApiUrl);

            // Return single stream with master playlist
            const nuvioStreams = [{
                name: "Vixsrc",
                title: "Auto Quality Stream",
                url: masterPlaylistUrl,
                quality: 'Auto',
                type: 'm3u8',
                headers: {
                    'Referer': this.baseUrl,
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
                }
            }];

            console.log('[Vixsrc] Successfully processed 1 stream with Auto quality');
            return nuvioStreams;
        } catch (error) {
            console.error(`[Vixsrc] Error in getStreams: ${error.message}`);
            return [];
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

    try {
        const { tmdbId, type, season, episode } = req.query;

        if (!tmdbId || !type) {
            return res.status(400).json({ error: 'Paramètres manquants (tmdbId, type)' });
        }

        console.log(`🚀 [VIXSRC API] Request: ${type} ${tmdbId} S${season}E${episode}`);

        const streams = await vixsrcScraper.getStreams(
            tmdbId,
            type,
            season ? parseInt(season) : null,
            episode ? parseInt(episode) : null
        );

        res.json({ success: true, streams });

    } catch (error) {
        console.error('[VIXSRC API] Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}
