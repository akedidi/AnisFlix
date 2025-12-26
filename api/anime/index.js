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

    // Parse URL to determine route (Vercel serverless compatible)
    // req.url format: "/api/anime/search?keyword=..." or "/api/anime/episodes/death-note-60"
    const url = req.url || '';

    // Remove /api/anime prefix and leading slash
    const pathWithQuery = url.replace(/^\/api\/anime\/?/, '');

    // Split path from query string
    const [path, queryString] = pathWithQuery.split('?');

    console.log(`🎌 [Anime API] Path: "${path}", Query:`, req.query);

    try {
        let data;

        if (path.startsWith('search') || path === '') {
            // /api/anime/search?keyword=Death Note
            console.log('🔍 [Anime API] Search request:', req.query.keyword);
            const result = await search(req);
            data = result;

        } else if (path.startsWith('episodes/')) {
            // /api/anime/episodes/death-note-60
            const id = path.replace('episodes/', '');
            console.log('📺 [Anime API] Episodes request:', id);
            req.params = { id };
            data = await getEpisodes(req, res);

        } else if (path.startsWith('stream')) {
            // /api/anime/stream?id=death-note-60?ep=1234&server=hd-2&type=sub
            console.log('🎬 [Anime API] Stream request:', req.query.id);
            data = await getStreamInfo(req, res, false);

        } else {
            return res.status(404).json({
                success: false,
                message: `Unknown path: ${path}. Available: search, episodes/:id, stream`
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
