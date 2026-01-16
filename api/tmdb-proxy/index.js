import axios from 'axios';

const TMDB_API_KEY = 'f3d757824f08ea2cff45eb8f47ca3a1e';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Cache for virtual seasons (in-memory, resets on cold start)
const virtualSeasonsCache = new Map();

// Helper to hash string to int (for virtual season IDs)
function stringToIntHash(str) {
    let hash = 0;
    if (!str) return hash;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
}

// Helper function to fetch from TMDB
async function tmdbFetch(endpoint, params = {}) {
    const url = new URL(`${TMDB_BASE_URL}${endpoint}`);
    url.searchParams.append('api_key', TMDB_API_KEY);

    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            url.searchParams.append(key, String(value));
        }
    });

    const response = await axios.get(url.toString());
    return response.data;
}

// Check if episode name is generic
function isGenericEpisodeName(name, episodeNumber) {
    const pattern = /^(Episode|Épisode|Episodio)\s+\d+$/i;
    return pattern.test(name) || name === `Episode ${episodeNumber}`;
}

// Process Episode Groups and create virtual seasons
async function processEpisodeGroups(seriesData, seriesId, language) {
    const episodeGroups = seriesData.episode_groups?.results;
    if (!episodeGroups || episodeGroups.length === 0) {
        return seriesData;
    }

    // Priority: Type 6 AND name starts with "Seasons"
    let seasonsGroup = episodeGroups.find(g => g.type === 6 && g.name.startsWith("Seasons"));

    // Fallback: Any Type 6
    if (!seasonsGroup) {
        seasonsGroup = episodeGroups.find(g => g.type === 6);
    }

    if (!seasonsGroup) {
        return seriesData;
    }

    console.log(`✅ [TMDB PROXY] Found "Seasons" episode group: ${seasonsGroup.name}`);

    try {
        const groupDetails = await tmdbFetch(`/tv/episode_group/${seasonsGroup.id}`, { language });

        if (!groupDetails || !groupDetails.groups) {
            return seriesData;
        }

        // Transform groups into season summaries
        const newSeasons = groupDetails.groups.map(group => ({
            id: stringToIntHash(group.id), // Convert String ID to Int hash for Swift compatibility
            name: group.name,
            season_number: group.order,
            episode_count: group.episodes?.length || 0,
            poster_path: seriesData.poster_path,
            overview: "",
            air_date: group.episodes?.[0]?.air_date,
            vote_average: 0,
            is_virtual: true
        }));

        // Handle Season 0 logic
        const originalSeason0 = seriesData.seasons?.find(s => s.season_number === 0);
        const groupSeason0 = newSeasons.find(s => s.season_number === 0);

        if (originalSeason0 && groupSeason0 && originalSeason0.episode_count > groupSeason0.episode_count) {
            console.warn(`⚠️ [TMDB PROXY] Keeping original Season 0`);
            const index = newSeasons.indexOf(groupSeason0);
            if (index > -1) newSeasons.splice(index, 1);
            newSeasons.push(originalSeason0);
        } else if (originalSeason0 && !groupSeason0) {
            newSeasons.push(originalSeason0);
        }

        newSeasons.sort((a, b) => a.season_number - b.season_number);

        // Hydrate cache for virtual seasons
        groupDetails.groups.forEach(group => {
            const seasonNumber = group.order;

            if (seasonNumber === 0 && originalSeason0 && originalSeason0.episode_count > (group.episodes?.length || 0)) {
                return;
            }

            const cacheKey = `${seriesId}_${seasonNumber}_${language}`;
            const seasonData = {
                _id: group.id,
                air_date: group.episodes?.[0]?.air_date,
                name: group.name,
                overview: "",
                id: stringToIntHash(group.id), // Also here for consistency
                poster_path: null,
                season_number: seasonNumber,
                episodes: group.episodes.map((ep, index) => ({
                    ...ep,
                    id: typeof ep.id === 'string' ? stringToIntHash(ep.id) : ep.id,
                    name: ep.name || `Episode ${index + 1}`,
                    overview: ep.overview || "",
                    episode_number: index + 1,
                    season_number: seasonNumber,
                    show_id: seriesId,
                }))
            };

            virtualSeasonsCache.set(cacheKey, seasonData);
            console.log(`💧 [TMDB PROXY] Hydrated cache for Season ${seasonNumber} (${language})`);
        });

        seriesData.seasons = newSeasons;
        seriesData.number_of_seasons = newSeasons.length;

    } catch (error) {
        console.error('❌ [TMDB PROXY] Failed to process episode group:', error.message);
    }

    return seriesData;
}

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { type, id, seriesId, seasonNumber, language = 'fr-FR' } = req.query;

        // Endpoint 1: Series Details
        if (type === 'series' && id) {
            const seriesIdNum = parseInt(id, 10);
            console.log(`🎬 [TMDB PROXY] Fetching series: ${seriesIdNum} (${language})`);

            let seriesData = await tmdbFetch(`/tv/${seriesIdNum}`, {
                language,
                append_to_response: 'external_ids,credits,episode_groups,watch/providers'
            });

            seriesData = await processEpisodeGroups(seriesData, seriesIdNum, language);

            return res.status(200).json(seriesData);
        }

        // Endpoint 1b: Latest Series (Centralized Logic for Vercel)
        if (type === 'series' && req.query.filter === 'last') {
            const page = req.query.page || 1;
            // Major Networks IDs (Netflix, Amazon, Disney+, etc.)
            const majorNetworks = "213|1024|2739|2552|49|380";
            const today = new Date();
            const lastDateLte = today.toISOString().slice(0, 10);

            console.log(`🆕 [TMDB PROXY] Fetching Latest Series (Page ${page}, Lang: ${language})`);

            const data = await tmdbFetch('/discover/tv', {
                sort_by: 'first_air_date.desc',
                include_adult: 'false',
                include_null_first_air_dates: 'false',
                'first_air_date.lte': lastDateLte,
                with_networks: majorNetworks,
                watch_region: 'FR', // V9.2 Logic: No flatrate filter
                page: page,
                language: language
            });

            return res.status(200).json(data);
        }

        // Endpoint 1c: Latest Movies (Centralized Logic - DVD/Bluray/Digital)
        if (type === 'movie' && req.query.filter === 'last') {
            const page = req.query.page || 1;
            const today = new Date();
            const lastDateLte = today.toISOString().slice(0, 10);

            // Release Types: 4 (Digital), 5 (Physical/DVD/Blu-ray)
            const releaseTypes = "4|5";

            console.log(`🎥 [TMDB PROXY] Fetching Latest Movies (Page ${page}, Lang: ${language})`);

            const data = await tmdbFetch('/discover/movie', {
                sort_by: 'primary_release_date.desc',
                include_adult: 'false',
                include_video: 'false',
                'primary_release_date.lte': lastDateLte,
                with_release_type: releaseTypes,
                'vote_count.gte': '5',
                page: page,
                language: language
            });

            return res.status(200).json(data);
        }

        // Endpoint 1d: Latest Episodes (TMDB Airing Today - fallback from BetaSeries)
        if (type === 'series' && req.query.filter === 'last-episodes') {
            console.log(`📺 [TMDB PROXY] Fetching Airing Today Series (Lang: ${language})`);

            try {
                // Use TMDB's airing_today endpoint (reliable fallback)
                const airingData = await tmdbFetch('/tv/airing_today', {
                    language: language,
                    page: 1
                });

                const series = airingData.results || [];
                console.log(`📺 [TMDB] Got ${series.length} airing today series`);

                // Format results to match MediaItem structure
                const results = series.slice(0, 15).map(show => ({
                    id: show.id,
                    title: show.name,
                    name: show.name,
                    overview: show.overview,
                    poster_path: show.poster_path,
                    posterPath: show.poster_path,
                    backdrop_path: show.backdrop_path,
                    backdropPath: show.backdrop_path,
                    vote_average: show.vote_average,
                    rating: show.vote_average,
                    first_air_date: show.first_air_date,
                    year: show.first_air_date?.substring(0, 4) || '',
                    media_type: 'tv',
                    mediaType: 'tv'
                }));

                console.log(`✅ [TMDB PROXY] Returning ${results.length} airing today series`);

                return res.status(200).json({
                    page: 1,
                    total_pages: 1,
                    total_results: results.length,
                    results: results
                });

            } catch (tmdbError) {
                console.error('❌ [TMDB] Airing Today Error:', tmdbError.message);
                return res.status(500).json({ error: 'TMDB API error', message: tmdbError.message });
            }
        }

        // Endpoint 2: Season Details
        if (type === 'season' && seriesId && seasonNumber !== undefined) {
            const seriesIdNum = parseInt(seriesId, 10);
            const seasonNum = parseInt(seasonNumber, 10);
            const cacheKey = `${seriesIdNum}_${seasonNum}_${language}`;

            console.log(`📺 [TMDB PROXY] Fetching season ${seasonNum} for series ${seriesIdNum} (${language})`);

            // Check virtual seasons cache
            if (virtualSeasonsCache.has(cacheKey)) {
                console.log(`⚡️ [TMDB PROXY] Returning cached season ${seasonNum}`);
                return res.status(200).json(virtualSeasonsCache.get(cacheKey));
            }

            // Fetch from TMDB
            let seasonData = await tmdbFetch(`/tv/${seriesIdNum}/season/${seasonNum}`, { language });

            // Check for generic names
            const hasGenericNames = seasonData.episodes.some(ep =>
                isGenericEpisodeName(ep.name, ep.episode_number)
            );

            if (hasGenericNames && language !== 'en-US') {
                console.log(`⚠️ [TMDB PROXY] Generic names detected, fetching English...`);
                try {
                    const enSeasonData = await tmdbFetch(`/tv/${seriesIdNum}/season/${seasonNum}`, { language: 'en-US' });

                    seasonData.episodes = seasonData.episodes.map(frEp => {
                        if (isGenericEpisodeName(frEp.name, frEp.episode_number)) {
                            const enEp = enSeasonData.episodes.find(e => e.id === frEp.id);
                            if (enEp) {
                                return { ...frEp, name: enEp.name, original_name: enEp.name };
                            }
                        }
                        return frEp;
                    });
                } catch (error) {
                    console.error('❌ [TMDB PROXY] English fallback failed:', error.message);
                }
            }

            return res.status(200).json(seasonData);
        }

        return res.status(400).json({
            error: 'Invalid request. Use type=series&id=X or type=season&seriesId=X&seasonNumber=Y'
        });

    } catch (error) {
        console.error('❌ [TMDB PROXY] Error:', error.message);
        return res.status(500).json({ error: 'Internal server error', message: error.message });
    }
}
