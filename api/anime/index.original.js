import { search } from '../../src/anime-lib/controllers/search.controller.js';
import { getEpisodes } from '../../src/anime-lib/controllers/episodeList.controller.js';
import { getStreamInfo } from '../../src/anime-lib/controllers/streamInfo.controller.js';

/**
 * Main serverless handler for Anime API
 * Mimics the original anime-api-sand-psi.vercel.app/api signature:
 * - /api/anime/search?keyword=...
 * - /api/anime/episodes/:id
 * - /api/anime/stream?id=...&server=...&type=...
 */
export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    // Use action query param for routing (Vercel compatible)
    const { action } = req.query;

    console.log(`🎌 [Anime API] Action: ${action}, Query:`, req.query);

    try {
        let data;

        if (action === 'search') {
            // /api/anime?action=search&keyword=Death Note
            console.log('🔍 [Anime API] Search request:', req.query.keyword);
            const result = await search(req);
            data = result;

        } else if (action === 'episodes') {
            // /api/anime?action=episodes&id=death-note-60
            const id = req.query.id;
            console.log('📺 [Anime API] Episodes request:', id);
            req.params = { id };
            data = await getEpisodes(req, res);

        } else if (action === 'stream') {
            // /api/anime?action=stream&id=death-note-60?ep=1234&server=hd-2&type=sub
            console.log('🎬 [Anime API] Stream request:', req.query.id);
            data = await getStreamInfo(req, res, false);

        } else if (action === 'm3u8-proxy') {
            // /api/anime?action=m3u8-proxy&url=https://netmagcdn.com/.../master.m3u8
            const { url } = req.query;
            if (!url) {
                return res.status(400).json({ success: false, message: 'URL parameter required' });
            }

            console.log('📺 [Anime API] M3U8 Proxy request:', url.substring(0, 50) + '...');

            const axios = (await import('axios')).default;

            // Handle .ts video segments separately (binary)
            if (url.toLowerCase().endsWith('.ts')) {
                console.log('📺 [Anime API] Proxying .ts video segment');
                const response = await axios.get(url, {
                    headers: {
                        'Referer': 'https://rapid-cloud.co/',
                        'Origin': 'https://rapid-cloud.co',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Accept': '*/*',
                    },
                    responseType: 'arraybuffer',
                    timeout: 15000
                });

                res.setHeader('Content-Type', 'video/mp2t');
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.setHeader('Cache-Control', 'public, max-age=31536000');
                return res.status(200).send(Buffer.from(response.data));
            }

            // Handle .m3u8 playlists (text with URL rewriting)
            const response = await axios.get(url, {
                headers: {
                    'Referer': 'https://rapid-cloud.co/',
                    'Origin': 'https://rapid-cloud.co',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': '*/*',
                },
                responseType: 'text',
                timeout: 15000
            });

            let m3u8Content = response.data;

            // Rewrite URLs in m3u8 to proxy through our endpoint
            const urlObj = new URL(url);
            const baseUrl = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname.substring(0, urlObj.pathname.lastIndexOf('/') + 1)}`;

            // Replace relative URLs with proxied URLs
            m3u8Content = m3u8Content.split('\n').map(line => {
                if (line.startsWith('#') || !line.trim()) return line;

                // Convert relative/absolute URLs to proxied URLs
                const absoluteUrl = line.startsWith('http') ? line.trim() : baseUrl + line.trim();
                const protocol = req.headers['x-forwarded-proto'] || 'https';
                const host = req.headers.host || 'anisflix.vercel.app';
                return `${protocol}://${host}/api/anime?action=m3u8-proxy&url=${encodeURIComponent(absoluteUrl)}`;
            }).join('\n');

            // Set appropriate headers and return modified m3u8 content
            res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
            res.setHeader('Access-Control-Allow-Origin', '*');
            return res.status(200).send(m3u8Content);

        } else {
            return res.status(404).json({
                success: false,
                message: `Missing or unknown action. Available: search, episodes, stream, m3u8-proxy`
            });
        }

        // SUCCESS response
        return res.status(200).json({
            success: true,
            results: data
        });

    } catch (error) {
        console.error('❌ [Anime API] Error:', error);
        return res.status(error.status || 500).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
}
