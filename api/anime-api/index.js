import axios from 'axios';

// Configuration CORS
const CORS_HEADERS = {
    'Access-Control-Allow-Origin': process.env.PUBLIC_SITE_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const ANIME_API_BASE = 'https://anime-api-sand-psi.vercel.app/api';

/**
 * Search anime by title and filter by season
 */
async function searchAnime(title, seasonNumber = null) {
    try {
        console.log(`[AnimeAPI] Searching for: ${title}, Season: ${seasonNumber || 'any'}`);

        const searchUrl = `${ANIME_API_BASE}/search?keyword=${encodeURIComponent(title)}`;
        const response = await axios.get(searchUrl, { timeout: 10000 });

        if (!response.data?.success || !response.data?.results?.data) {
            console.log('[AnimeAPI] No results found');
            return null;
        }

        const results = response.data.results.data;
        console.log(`[AnimeAPI] Found ${results.length} results`);

        // Filter by season
        return filterResultsBySeason(results, title, seasonNumber);

    } catch (error) {
        console.error('[AnimeAPI] Search error:', error.message);
        return null;
    }
}

/**
 * Intelligent season filtering
 */
function filterResultsBySeason(results, title, seasonNumber) {
    if (!seasonNumber || seasonNumber === 1) {
        // Season 1 or not specified -> Look for the main entry (no season suffix)
        let match = results.find(r => {
            const lowerTitle = r.title.toLowerCase();
            const cleanTitle = title.toLowerCase();

            // Exact match or very close match without season numbers
            return lowerTitle === cleanTitle ||
                (lowerTitle.includes(cleanTitle) &&
                    !lowerTitle.match(/season\s*\d+/i) &&
                    !lowerTitle.match(/\d+nd\s+season/i) &&
                    !lowerTitle.match(/\d+rd\s+season/i) &&
                    !lowerTitle.match(/\d+th\s+season/i) &&
                    r.tvInfo?.showType === 'TV');
        });

        // Fallback to first TV result
        if (!match) {
            match = results.find(r => r.tvInfo?.showType === 'TV');
        }

        return match;
    }

    // Season 2+ -> Look for season indicators
    const seasonPatterns = [
        new RegExp(`season\\s*${seasonNumber}`, 'i'),
        new RegExp(`${seasonNumber}nd\\s+season`, 'i'),
        new RegExp(`${seasonNumber}rd\\s+season`, 'i'),
        new RegExp(`${seasonNumber}th\\s+season`, 'i'),
        new RegExp(`${title}\\s+${seasonNumber}`, 'i'), // "One Punch Man 2"
    ];

    for (const pattern of seasonPatterns) {
        const match = results.find(r => pattern.test(r.title));
        if (match) {
            console.log(`[AnimeAPI] Matched season ${seasonNumber}: ${match.title}`);
            return match;
        }
    }

    console.log(`[AnimeAPI] No match for season ${seasonNumber}`);
    return null;
}

/**
 * Get episodes for an anime ID
 */
async function getEpisodes(animeId) {
    try {
        const episodesUrl = `${ANIME_API_BASE}/episodes/${animeId}`;
        const response = await axios.get(episodesUrl, { timeout: 10000 });

        if (!response.data?.success || !response.data?.results?.episodes) {
            return [];
        }

        return response.data.results.episodes;
    } catch (error) {
        console.error('[AnimeAPI] Episodes fetch error:', error.message);
        return [];
    }
}

/**
 * Get streaming link for a specific episode
 */
async function getStreamingLink(animeId, episodeNo, server = 'hd-2', type = 'sub') {
    try {
        const streamUrl = `${ANIME_API_BASE}/stream?id=${animeId}&ep=${episodeNo}&server=${server}&type=${type}`;
        const response = await axios.get(streamUrl, { timeout: 15000 });

        if (!response.data?.success || !response.data?.results?.streamingLink) {
            throw new Error('No streaming link found');
        }

        const streamingLink = response.data.results.streamingLink;

        return {
            file: streamingLink.link?.file || streamingLink.link,
            type: streamingLink.link?.type || streamingLink.type || 'hls',
        };
    } catch (error) {
        console.error('[AnimeAPI] Streaming link error:', error.message);
        return null;
    }
}

/**
 * Main handler
 */
export default async function handler(req, res) {
    // CORS preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).setHeader('Access-Control-Allow-Origin', '*').end();
    }

    // Set CORS headers
    Object.keys(CORS_HEADERS).forEach(key => {
        res.setHeader(key, CORS_HEADERS[key]);
    });

    try {
        const { title, season, episode } = req.query;

        if (!title) {
            return res.status(400).json({
                success: false,
                error: 'Title parameter is required'
            });
        }

        const seasonNumber = season ? parseInt(season) : null;
        const episodeNumber = episode ? parseInt(episode) : 1;

        // Step 1: Search and filter
        const anime = await searchAnime(title, seasonNumber);

        if (!anime) {
            return res.status(200).json({
                success: true,
                results: []
            });
        }

        console.log(`[AnimeAPI] Selected anime: ${anime.title} (ID: ${anime.id})`);

        // Step 2: Get episodes
        const episodes = await getEpisodes(anime.id);

        if (!episodes.length) {
            console.log('[AnimeAPI] No episodes found');
            return res.status(200).json({
                success: true,
                results: []
            });
        }

        // Step 3: Find the episode
        const targetEpisode = episodes.find(ep => ep.number === episodeNumber) || episodes[0];

        console.log(`[AnimeAPI] Using episode ${targetEpisode.number}, episode_no: ${targetEpisode.episode_no}`);

        // Step 4: Get streaming link
        const streamingData = await getStreamingLink(anime.id, targetEpisode.episode_no);

        if (!streamingData) {
            return res.status(200).json({
                success: true,
                results: []
            });
        }

        // Return formatted response
        return res.status(200).json({
            success: true,
            results: [{
                provider: 'AnimeAPI',
                language: 'VO',
                quality: 'HD',
                url: streamingData.file,
                type: streamingData.type,
                animeInfo: {
                    id: anime.id,
                    title: anime.title,
                    episode: targetEpisode.number,
                    totalEpisodes: anime.tvInfo?.eps || episodes.length
                }
            }]
        });

    } catch (error) {
        console.error('[AnimeAPI] Handler error:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
}
