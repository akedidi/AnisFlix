import { vixsrcScraper } from '../server/vixsrc-scraper';

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
