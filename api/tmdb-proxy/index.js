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

    // IMPORTANT: Save original seasons BEFORE any modifications
    const originalSeasons = [...(seriesData.seasons || [])];

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

        // MERGE original seasons with episode group seasons instead of replacing
        // This fixes missing seasons when episode groups are incomplete
        const mergedSeasons = [];

        // Create a map of episode group seasons for quick lookup
        const groupSeasonsMap = new Map(newSeasons.map(s => [s.season_number, s]));

        // Keep track of which seasons we've added from the group
        const addedGroupSeasons = new Set();

        // First, add all original seasons, replacing with group version if exists
        originalSeasons.forEach(originalSeason => {
            const groupSeason = groupSeasonsMap.get(originalSeason.season_number);
            if (groupSeason) {
                // Use the episode group version
                mergedSeasons.push(groupSeason);
                addedGroupSeasons.add(originalSeason.season_number);
            } else {
                // Keep the original season
                mergedSeasons.push(originalSeason);
            }
        });

        // Then add any group seasons that weren't in the original list
        newSeasons.forEach(groupSeason => {
            if (!addedGroupSeasons.has(groupSeason.season_number)) {
                mergedSeasons.push(groupSeason);
            }
        });

        // Sort again to ensure correct order
        mergedSeasons.sort((a, b) => a.season_number - b.season_number);

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

        seriesData.seasons = mergedSeasons;
        seriesData.number_of_seasons = mergedSeasons.length;

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

        // Endpoint 1d: Latest Episodes (TMDB Airing Today with episode details)
        // Filtered to Networks from Western countries (US/GB/FR/CA/AU)
        if (type === 'series' && req.query.filter === 'last-episodes') {
            const clientPage = parseInt(req.query.page) || 1;
            console.log(`📺 [TMDB PROXY] Fetching Latest Episodes (Discover) - Western Networks (Lang: ${language}, ClientPage: ${clientPage})`);

            try {
                // Strategy: Use /discover/tv to filter strictly by network server-side
                // and expand the date range to 1 month to ensure volume (200+ results).

                // Allowed Networks (Expanded for better coverage)
                // Streaming: Netflix (213), Amazon (1024), Apple TV+ (2552), Disney+ (2739), Hulu (453), Crunchyroll (1112), AMC+ (4661), Sundance Now (2363), TVA+ (4590)
                // Premium: HBO (49), HBO Max (3186, 8304), Max (6783), Showtime (67), Starz (318), Peacock (3353), Paramount+ (4330)
                // US/UK Broadcast: NBC (6), ABC (2), CBS (16), Fox (19), FX (88), Warner Bros (3267), BBC One (4), BBC Two (332), National Geographic (43), AMC (174)
                // French/CA: Canal+ (285), TF1 (290), M6 (712), M6+ (6694), Arte (662, 1628), ADN (2278), TVA (302), CBC (23), Global TV (218)
                // Anime: MBS (94), TBS (160), Crunchyroll (1112)
                const allowedNetworkIds = "213|1024|2552|2739|453|1112|49|3186|8304|6783|67|318|3353|4330|6|2|16|19|88|3267|4|332|285|290|712|6694|662|1628|2278|302|23|94|160|2363|4661|43|174|218|4590";

                const today = new Date();
                const todayStr = today.toISOString().slice(0, 10);
                const pastDate = new Date();
                pastDate.setDate(pastDate.getDate() - 60); // Look back 60 days to fill the list (ensures >200 items)
                const pastDateStr = pastDate.toISOString().slice(0, 10);


                // First, fetch shows airing today/this week (catches episodes airing TODAY)
                const onTheAirData = await tmdbFetch('/tv/on_the_air', {
                    language,
                    page: 1 // Only first page to avoid too many requests
                });

                // Then fetch from discover for recent episodes (last 60 days)
                const data = await tmdbFetch('/discover/tv', {
                    language,
                    page: clientPage,
                    'with_networks': allowedNetworkIds,
                    'air_date.lte': todayStr,
                    'air_date.gte': pastDateStr,
                    'sort_by': 'first_air_date.desc', // Show most recent episodes first
                    timezone: 'America/New_York'
                });

                // Combine both sources, prioritizing on_the_air for page 1
                let allCandidates = [];
                if (clientPage === 1 && onTheAirData?.results) {
                    // For page 1: merge on_the_air with discover (on_the_air first)
                    const onTheAirIds = new Set(onTheAirData.results.map(s => s.id));
                    const discoverFiltered = data.results?.filter(s => !onTheAirIds.has(s.id)) || [];
                    allCandidates = [...onTheAirData.results, ...discoverFiltered];
                } else {
                    // For other pages: just use discover
                    allCandidates = data.results || [];
                }

                const maxTMDBPages = data.total_pages;

                console.log(`📺 [TMDB] Fetched Discover Page ${clientPage}. Candidates: ${allCandidates.length}`);

                // Fetch episode details (we still need to enrich with exact episode info and filter specific genres)
                const enrichedResults = await Promise.all(
                    allCandidates.map(async (show) => {
                        try {
                            // Fetch full series details
                            const details = await tmdbFetch(`/tv/${show.id}`, { language });

                            // Filter out unwanted genres: News (10763), Reality (10764), Talk (10767) - Docs allowed
                            const unwantedGenres = [10763, 10764, 10767];
                            const hasUnwantedGenre = details.genres?.some(g => unwantedGenres.includes(g.id));

                            if (hasUnwantedGenre) {
                                return null;
                            }

                            // Determine the correct "latest" episode
                            // TMDB sometimes lists today's episode as "next_episode_to_air" until later in the day
                            let latestEp = details.last_episode_to_air;
                            const nextEp = details.next_episode_to_air;
                            const todayDate = new Date().toISOString().slice(0, 10);

                            if (nextEp && nextEp.air_date && nextEp.air_date <= todayDate) {
                                latestEp = nextEp;
                            }

                            return {
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
                                mediaType: 'tv',
                                episodeInfo: latestEp ? {
                                    season: latestEp.season_number,
                                    episode: latestEp.episode_number,
                                    title: latestEp.name,
                                    date: latestEp.air_date
                                } : null
                            };
                        } catch (err) {
                            return null;
                        }
                    })
                );

                // Remove filtered items (nulls), deduplicate, and ensure valid data
                const finalResults = enrichedResults
                    .filter(item => item !== null)
                    .filter(item => item.episodeInfo && (item.poster_path || item.posterPath)) // Strict check for metadata
                    .filter((v, i, a) => a.findIndex(t => (t.id === v.id)) === i);

                console.log(`✅ [TMDB PROXY] Returning ${finalResults.length} filtered series (Western Networks)`);

                return res.status(200).json({
                    page: clientPage,
                    total_pages: maxTMDBPages,
                    total_results: data.total_results,
                    results: finalResults
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
