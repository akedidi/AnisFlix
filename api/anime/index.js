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

        } else {
            return res.status(404).json({
                success: false,
                message: `Missing or unknown action. Available: search, episodes, stream`
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
