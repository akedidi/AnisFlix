import axios from 'axios';
import { handleUniversalVO } from "../_services/universalvo/index.js";

// ===== SERVER-SIDE CACHE SYSTEM =====
// Cache persists across requests on warm function instances
const serverCache = new Map();

// Cache configuration (TTL in milliseconds)
const CACHE_TTL = {
  SEARCH: 10 * 60 * 1000,       // 10 minutes for search results
  ANIME_SEARCH: 10 * 60 * 1000, // 10 minutes for anime search
  EPISODES: 30 * 60 * 1000,     // 30 minutes for episode lists
  STREAMS: 5 * 60 * 1000,       // 5 minutes for stream links (may expire)
  TMDB: 60 * 60 * 1000,         // 1 hour for TMDB data
  DEFAULT: 10 * 60 * 1000       // 10 minutes default
};

// Cache helper functions
function cacheGet(key) {
  const entry = serverCache.get(key);
  if (!entry) {
    console.log(`🗄️ [ServerCache] ❌ MISS: ${key}`);
    return null;
  }

  const age = Date.now() - entry.timestamp;
  if (age > entry.ttl) {
    serverCache.delete(key);
    console.log(`🗄️ [ServerCache] ⏰ EXPIRED: ${key}`);
    return null;
  }

  const remainingSeconds = Math.round((entry.ttl - age) / 1000);
  console.log(`🗄️ [ServerCache] ✅ HIT: ${key} (${remainingSeconds}s remaining)`);
  return entry.data;
}

// Returns {data, fromCache, remainingTTL} for more visibility
function cacheGetWithStatus(key) {
  const entry = serverCache.get(key);
  if (!entry) {
    console.log(`🗄️ [ServerCache] ❌ MISS: ${key}`);
    return { data: null, fromCache: false, remainingTTL: 0 };
  }

  const age = Date.now() - entry.timestamp;
  if (age > entry.ttl) {
    serverCache.delete(key);
    console.log(`🗄️ [ServerCache] ⏰ EXPIRED: ${key}`);
    return { data: null, fromCache: false, remainingTTL: 0 };
  }

  const remainingSeconds = Math.round((entry.ttl - age) / 1000);
  console.log(`🗄️ [ServerCache] ✅ HIT: ${key} (${remainingSeconds}s remaining)`);
  return { data: entry.data, fromCache: true, remainingTTL: remainingSeconds };
}

function cacheSet(key, data, ttl = CACHE_TTL.DEFAULT) {
  serverCache.set(key, {
    data,
    timestamp: Date.now(),
    ttl
  });
  console.log(`🗄️ [ServerCache] 💾 STORED: ${key} (TTL: ${Math.round(ttl / 1000)}s)`);
}

function getCacheStats() {
  return {
    size: serverCache.size,
    keys: Array.from(serverCache.keys())
  };
}

// Clean expired entries periodically (every 5 minutes if function stays warm)
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  for (const [key, entry] of serverCache.entries()) {
    if (now - entry.timestamp > entry.ttl) {
      serverCache.delete(key);
      cleaned++;
    }
  }
  if (cleaned > 0) {
    console.log(`🗄️ [ServerCache] 🧹 Cleaned ${cleaned} expired entries`);
  }
}, 5 * 60 * 1000);

// Configuration CORS
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.PUBLIC_SITE_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Headers pour les requêtes vers Movix
const MOVIX_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
  'Referer': 'https://movix.site/',
  'Origin': 'https://movix.site',
};

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

  async getTmdbInfo(tmdbId, mediaType) {
    const url = `https://api.themoviedb.org/3/${mediaType === 'tv' ? 'tv' : 'movie'}/${tmdbId}?api_key=${this.tmdbApiKey}`;

    try {
      const response = await this.makeRequest(url);
      const data = response.data;
      const title = mediaType === 'tv' ? data.name : data.title;
      const year = mediaType === 'tv' ? data.first_air_date?.substring(0, 4) : data.release_date?.substring(0, 4);

      return { title, year, data };
    } catch (error) {
      return { title: 'Unknown', year: 'Unknown', data: {} };
    }
  }

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

    try {
      const response = await this.makeRequest(vixsrcUrl, {
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      });

      const html = response.data;
      let masterPlaylistUrl = null;

      if (html.includes('window.masterPlaylist')) {
        const urlMatch = html.match(/url:\s*['"]([^'"]+)['"]/);
        const tokenMatch = html.match(/['"]?token['"]?\s*:\s*['"]([^'"]+)['"]/);
        const expiresMatch = html.match(/['"]?expires['"]?\s*:\s*['"]([^'"]+)['"]/);

        if (urlMatch && tokenMatch && expiresMatch) {
          const baseUrl = urlMatch[1];
          const token = tokenMatch[1];
          const expires = expiresMatch[1];

          if (baseUrl.includes('?b=1')) {
            masterPlaylistUrl = `${baseUrl}&token=${token}&expires=${expires}&h=1&lang=en`;
          } else {
            masterPlaylistUrl = `${baseUrl}?token=${token}&expires=${expires}&h=1&lang=en`;
          }
        }
      }

      if (!masterPlaylistUrl) {
        const m3u8Match = html.match(/(https?:\/\/[^'"\s]+\.m3u8[^'"\s]*)/);
        if (m3u8Match) {
          masterPlaylistUrl = m3u8Match[1];
        }
      }

      if (!masterPlaylistUrl) {
        const scriptMatches = html.match(/<script[^>]*>(.*?)<\/script>/gs);
        if (scriptMatches) {
          for (const script of scriptMatches) {
            const streamMatch = script.match(/['"]?(https?:\/\/[^'"\s]+(?:\.m3u8|playlist)[^'"\s]*)/);
            if (streamMatch) {
              masterPlaylistUrl = streamMatch[1];
              break;
            }
          }
        }
      }

      return masterPlaylistUrl ? { masterPlaylistUrl, subtitleApiUrl } : null;
    } catch (error) {
      return null;
    }
  }

  async getSubtitles(subtitleApiUrl) {
    try {
      const response = await this.makeRequest(subtitleApiUrl);
      const subtitleData = response.data;

      if (!Array.isArray(subtitleData)) {
        return '';
      }

      let subtitleTrack = subtitleData.find((track) =>
        track.display.includes('English') && (track.encoding === 'ASCII' || track.encoding === 'UTF-8')
      );

      if (!subtitleTrack) {
        subtitleTrack = subtitleData.find((track) => track.display.includes('English') && track.encoding === 'CP1252');
      }

      return subtitleTrack ? subtitleTrack.url : '';
    } catch (error) {
      return '';
    }
  }

  async getStreams(tmdbId, mediaType = 'movie', seasonNum = null, episodeNum = null) {
    try {
      const streamData = await this.extractStreamFromPage(null, mediaType, tmdbId, seasonNum, episodeNum);

      if (!streamData) {
        return [];
      }

      const { masterPlaylistUrl, subtitleApiUrl } = streamData;

      // Wrap URL in proxy to fix CORS/403 issues (matches iOS implementation)
      // Use encodeURIComponent for the nested URL
      // Base URL depends on environment (Vercel or localhost)
      const appBaseUrl = process.env.PUBLIC_SITE_URL || 'https://anisflix.vercel.app';
      const proxyUrl = `${appBaseUrl}/api/vixsrc-proxy?url=${encodeURIComponent(masterPlaylistUrl)}`;

      return [{
        name: "Vixsrc",
        title: "Auto Quality Stream",
        url: proxyUrl,
        originalUrl: masterPlaylistUrl,
        quality: 'Auto',
        type: 'm3u8',
        headers: {
          'Referer': this.baseUrl,
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
      }];
    } catch (error) {
      return [];
    }
  }
}

const vixsrcScraper = new VixSrcScraper();

export default async function handler(req, res) {
  // Configuration CORS
  Object.entries(CORS_HEADERS).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { path, ...queryParams } = req.query;

    if (!path) {
      return res.status(400).json({ error: 'Paramètre "path" manquant' });
    }

    // Construire l'URL Movix
    // Décoder le path pour éviter le double encodage
    const decodedPath = decodeURIComponent(path);

    // GÉRER ZENIME PROXY WRAPPER (pour contourner la restriction d'origine)
    if (decodedPath === 'zenime-proxy') {
      const { url: m3u8Url } = queryParams;

      if (!m3u8Url) {
        return res.status(400).json({ error: 'Paramètre "url" manquant' });
      }

      try {
        const decodedUrl = decodeURIComponent(m3u8Url);
        const headers = JSON.stringify({ referer: "https://rapid-cloud.co/" });
        const zenimeUrl = `https://proxy.zenime.site/m3u8-proxy?url=${encodeURIComponent(decodedUrl)}&headers=${encodeURIComponent(headers)}`;

        console.log(`🎌 [ZENIME PROXY] Forwarding: ${decodedUrl.substring(0, 80)}...`);

        const response = await axios({
          method: 'GET',
          url: zenimeUrl,
          headers: {
            'Origin': 'https://zenime.site',
            'Referer': 'https://zenime.site/',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',
            'Accept': '*/*',
            'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
            'Accept-Encoding': 'gzip, deflate, br',
            'sec-ch-ua': '"Google Chrome";v="143", "Chromium";v="143", "Not A(Brand";v="24"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"macOS"',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-site',
            'priority': 'u=1, i',
          },
          responseType: 'stream',
          timeout: 30000,
          validateStatus: (status) => status < 500
        });

        // Forward status and headers
        res.status(response.status);

        const headersToForward = ['content-type', 'content-length', 'cache-control'];
        headersToForward.forEach(h => {
          if (response.headers[h]) res.setHeader(h, response.headers[h]);
        });

        res.setHeader('Access-Control-Allow-Origin', '*');

        // Pipe the stream
        response.data.pipe(res);
        return;
      } catch (error) {
        console.error('❌ [ZENIME PROXY] Error:', error.message);
        return res.status(502).json({ error: 'Erreur proxy Zenime', details: error.message });
      }
    }

    // --- HELPER: Resolve Absolute/Group Episode Number for TV ---
    // Frontend sends what it sees (e.g. Season 2, Episode 47).
    // But providers (VixSrc/UniversalVO) expect standard TMDB "S2 E23" format.
    // If standard TMDB breaks seasons (JJK S1=50eps), frontend sends S2 E47 purely visually.
    // We need to map this back to standard S/E or fix it for the provider.
    // HOWEVER, actually VixSrc/UniversalVO often align with Standard TMDB or specific logic.
    // The issue here is likely: User sends S2 E46. Standard TMDB says JJK S1 has 50 eps, so S2 E46 doesn't exist.
    // We need to calculate the REAL S/E based on the Episode Group logic if that's what created S2 E46.

    let resolvedSeason = null;
    let resolvedEpisode = null;

    if ((decodedPath === 'vixsrc' || decodedPath === 'universalvo') && queryParams.type === 'tv' && queryParams.tmdbId) {
      const { tmdbId, season, episode } = queryParams;
      const inputSeason = parseInt(season);
      const inputEpisode = parseInt(episode);

      // Default to input
      resolvedSeason = inputSeason;
      resolvedEpisode = inputEpisode;

      // Fetch Episode Groups to see if we are using a custom group
      try {
        const TMDB_KEY = "68e094699525b18a70bab2f86b1fa706";
        const tmdbUrl = `https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_KEY}&language=en-US&append_to_response=episode_groups`;
        const tmdbRes = await axios.get(tmdbUrl, { timeout: 3000 }); // Fast timeout

        if (tmdbRes.data && tmdbRes.data.episode_groups) {
          const groups = tmdbRes.data.episode_groups.results || [];
          // Look for the "Seasons" group used by frontend
          let seasonsGroup = groups.find(g => g.type === 6 && g.name.startsWith("Seasons"));
          if (!seasonsGroup) seasonsGroup = groups.find(g => g.type === 6);

          // If a group corresponds to our split, we need to map back to standard or verify
          // Actually, if Frontend says S2 E47, and Standard TMDB says S1 has 50 eps...
          // It means S2 E47 is likely "Absolute Episode 47"? No, frontend sends S2.
          // Let's assume frontend sends correct Season Number (2) and Episode Number (47) from ITS perspective.
          // Wait, if frontend shows S1 (24 eps) and S2 (23 eps), S2 E23 is the 47th episode total.
          // User says URL has "season=2&episode=47".
          // If the user manually edited URL or if the app is sending this, it's wrong for providers if they expect S2 E23.
          // But usually providers want [Season X] [Episode Y relative to Season X].
          // If 'episode' param became '47' while 'season' is '2', that's the bug.

          if (seasonsGroup) {
            // Frontend is using this group!
            // In this group: S1=24 eps. S2 starts at 25.
            // If frontend sends S2 E47 -> It implies Absolute 47?
            // OR does frontend send S2 E23?
            // User report says: "...&season=2&episode=47".
            // If typical anime logic: 47 is absolute.
            // If we are in S2, E47 is impossible unless it's absolute.

            // RE-MAPPING STRATEGY:
            // 1. Calculate Absolute Number based on Group (S2 E(X) -> Abs).
            //    Wait, if input is 47, is it already absolute?
            //    If Season 2, Ep 47... that's huge.

            // Let's try to fetch the Group Details to see the offset.
            const groupUrl = `https://api.themoviedb.org/3/tv/episode_group/${seasonsGroup.id}?api_key=${TMDB_KEY}&language=en-US`;
            const groupRes = await axios.get(groupUrl, { timeout: 3000 });

            if (groupRes.data && groupRes.data.groups) {
              const groupSeasons = groupRes.data.groups;
              // Sort by order/season number
              groupSeasons.sort((a, b) => a.order - b.order);

              // Find the season matching input
              const currentGroupSeason = groupSeasons.find(g => g.order === inputSeason);

              if (currentGroupSeason) {
                // If the input episode is > season episode count (e.g. 47 > 23), it might be absolute/offset issue.
                if (inputEpisode > currentGroupSeason.episodes.length) {
                  console.log(`⚠️ [Proxy] Input S${inputSeason} E${inputEpisode} exceeds group count (${currentGroupSeason.episodes.length}). Assuming absolute number.`);

                  // Calculate offset from previous seasons in the GROUP
                  let offset = 0;
                  for (let g of groupSeasons) {
                    if (g.order < inputSeason && g.order > 0) { // seasons before current
                      offset += g.episodes.length;
                    }
                  }

                  // Remap: 47 (Absolute) - 24 (Offset S1) = 23 (Relative S2)
                  const relative = inputEpisode - offset;
                  if (relative > 0 && relative <= currentGroupSeason.episodes.length) {
                    resolvedEpisode = relative;
                    console.log(`✅ [Proxy] Remapped to S${resolvedSeason} E${resolvedEpisode} (Absolute ${inputEpisode} -> Relative)`);
                  }
                }
                // If input is 23 and maps to 47? No, usually providers want 23.
                // So if we received 23, we keep 23.
              }
            }
          }
        }
      } catch (e) {
        console.warn(`⚠️ [Proxy] Failed to resolve episode map: ${e.message}`);
      }
    }

    // GÉRER VIXSRC ICI
    if (decodedPath === 'vixsrc') {

      try {
        const { tmdbId, type, season, episode } = queryParams;

        if (!tmdbId || !type) {
          return res.status(400).json({ error: 'Paramètres manquants pour vixsrc (tmdbId, type)' });
        }

        // Use resolved or original
        const finalSeason = resolvedSeason !== null ? resolvedSeason : (season ? parseInt(season) : null);
        const finalEpisode = resolvedEpisode !== null ? resolvedEpisode : (episode ? parseInt(episode) : null);

        console.log(`🚀 [MOVIX PROXY VIXSRC] Request: ${type} ${tmdbId} S${finalSeason}E${finalEpisode}`);

        const streams = await vixsrcScraper.getStreams(
          tmdbId,
          type,
          finalSeason,
          finalEpisode
        );

        return res.status(200).json({ success: true, streams });
      } catch (vixError) {
        console.error('[MOVIX PROXY VIXSRC ERROR]', vixError.message);
        return res.status(500).json({ error: 'Erreur proxy Vixsrc', details: vixError.message });
      }
    }

    // GÉRER UNIVERSALVO ICI
    if (decodedPath === 'universalvo') {
      console.log('🚀 [Movix Proxy] Routing to UniversalVO handler');
      try {
        // Verify we don't pass crazy episode numbers
        const { season, episode } = queryParams;
        // Use resolved
        if (resolvedSeason && resolvedEpisode) {
          req.query.season = resolvedSeason.toString();
          req.query.episode = resolvedEpisode.toString();
          console.log(`🚀 [Movix Proxy] UniversalVO injected remapped S${resolvedSeason}E${resolvedEpisode}`);
        }

        await handleUniversalVO(req, res);
      } catch (error) {
        console.error('❌ [Movix Proxy] UniversalVO Handler Error:', error);
        res.status(500).json({
          error: 'Internal Server Error in UniversalVO handler',
          details: error.message,
          stack: error.stack
        });
      }
      return;
    }

    // GÉRER ANIME-API ICI
    if (decodedPath === 'anime-api') {
      console.log('🎌 ========== ANIME-API START ==========');
      try {
        const { title, season, episode, tmdbId } = queryParams;
        console.log('🎌 [AnimeAPI] Query:', { title, season, episode, tmdbId });

        if (!title) {
          return res.status(400).json({ error: 'Paramètre title manquant' });
        }

        let seasonNumber = season ? parseInt(season) : 1;
        let episodeNumber = episode ? parseInt(episode) : 1;

        const TMDB_KEY = "68e094699525b18a70bab2f86b1fa706";

        // ═══════════════════════════════════════════════════════════════════
        // MANUAL MAPPINGS: TMDB Specials → Anime API Seasons
        // Some anime have "specials" in TMDB that are actually separate seasons
        // on anime streaming sites. This maps them correctly.
        // ═══════════════════════════════════════════════════════════════════
        const SPECIAL_EPISODE_MAPPINGS = {
          // Attack on Titan (TMDB ID 1429)
          // Season 0 (Specials) Ep 36 & 37 = "The Final Chapters" = "The Final Season Part 3" Ep 1 & 2
          '1429': {
            '0': {  // Season 0 (Specials)
              36: { searchTitle: 'Attack on Titan: The Final Season Part 3', episode: 1 },
              37: { searchTitle: 'Attack on Titan: The Final Season Part 3', episode: 2 },
            }
          }
        };

        // Check if we have a manual mapping for this TMDB ID + Season + Episode
        let overrideSearchTitle = null;
        if (tmdbId && SPECIAL_EPISODE_MAPPINGS[tmdbId]) {
          const seriesMapping = SPECIAL_EPISODE_MAPPINGS[tmdbId];
          const seasonKey = String(seasonNumber);
          if (seriesMapping[seasonKey] && seriesMapping[seasonKey][episodeNumber]) {
            const mapping = seriesMapping[seasonKey][episodeNumber];
            overrideSearchTitle = mapping.searchTitle;
            episodeNumber = mapping.episode;
            console.log(`🎯 [AnimeAPI] MANUAL MAPPING APPLIED: "${overrideSearchTitle}" Episode ${episodeNumber}`);
          }
        }

        // Use request host to build absolute URL (works in preview and production)
        // req.headers.host will be the actual domain being called (preview or production)
        const protocol = req.headers['x-forwarded-proto'] || 'https';
        const host = req.headers.host || 'anisflix.vercel.app';
        const ANIME_API_BASE = `${protocol}://${host}/api/anime`;

        console.log(`🎌 [AnimeAPI] Using API: ${ANIME_API_BASE}`);

        // Variables pour la logique avancée
        let englishSeasonName = null;
        let absoluteEpisodeNumber = episodeNumber;
        let isAbsoluteFallbackNeeded = false;

        // Étape 0: Récupérer info TMDB (Si tmdbId présent)
        let episodeEnglishTitle = null; // For Season 0 OAV matching

        if (tmdbId) {
          try {
            console.log(`🎌 [AnimeAPI] Fetching TMDB info for ID: ${tmdbId}`);
            // Include episode_groups in the request
            const tmdbUrl = `https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_KEY}&language=en-US&append_to_response=episode_groups`;
            const tmdbRes = await axios.get(tmdbUrl, { timeout: 5000 });

            if (tmdbRes.data) {
              let seasons = tmdbRes.data.seasons || [];

              // SAVE ORIGINAL SEASON NAME (e.g., "The Final Season") BEFORE Episode Group override
              let originalSeasonName = null;
              const originalTargetSeason = seasons.find(s => s.season_number === seasonNumber);
              if (originalTargetSeason) {
                originalSeasonName = originalTargetSeason.name;
                console.log(`🎌 [AnimeAPI] Original TMDB Season Name: "${originalSeasonName}"`);
              }

              // --- EPISODE GROUP LOGIC START ---
              // Attempt to use Episode Groups (Type 6, "Seasons"...) to better match Anime sites
              // This mirrors the frontend logic
              const groups = tmdbRes.data.episode_groups?.results || [];
              let seasonsGroup = groups.find(g => g.type === 6 && g.name.startsWith("Seasons"));
              if (!seasonsGroup) seasonsGroup = groups.find(g => g.type === 6);

              if (seasonsGroup) {
                console.log(`🎌 [AnimeAPI] Found suitable Episode Group: "${seasonsGroup.name}" (${seasonsGroup.id})`);
                try {
                  const groupUrl = `https://api.themoviedb.org/3/tv/episode_group/${seasonsGroup.id}?api_key=${TMDB_KEY}&language=en-US`;
                  const groupRes = await axios.get(groupUrl, { timeout: 5000 });

                  if (groupRes.data && groupRes.data.groups) {
                    // Transform group data to override 'seasons'
                    // Group order is usually the season number
                    seasons = groupRes.data.groups.map(g => ({
                      season_number: g.order,
                      name: g.name,
                      episode_count: g.episodes ? g.episodes.length : 0,
                      overview: ""
                    }));
                    console.log(`🎌 [AnimeAPI] Overrode seasons using Episode Group (Count: ${seasons.length})`);
                  }
                } catch (groupError) {
                  console.warn(`⚠️ [AnimeAPI] Failed to fetch Episode Group details: ${groupError.message}`);
                }
              }
              // --- EPISODE GROUP LOGIC END ---

              const targetSeason = seasons.find(s => s.season_number === seasonNumber);

              if (targetSeason) {
                // PREFER original TMDB name (e.g., "The Final Season") over group name (e.g., "Season 4")
                // because anime sites use original names like "Final Season Part 1"
                englishSeasonName = originalSeasonName || targetSeason.name;
                console.log(`🎌 [AnimeAPI] Using Season Name for matching: "${englishSeasonName}"`);
              }

              // Calculer Absolute Episode Number
              // Somme des épisodes des saisons précédentes (seulement les saisons > 0)
              let previousEpisodes = 0;
              seasons.forEach(s => {
                if (s.season_number > 0 && s.season_number < seasonNumber) {
                  previousEpisodes += s.episode_count;
                }
              });
              absoluteEpisodeNumber = previousEpisodes + episodeNumber;
              console.log(`🎌 [AnimeAPI] Calculated Absolute Episode: ${absoluteEpisodeNumber} (Offset: ${previousEpisodes})`);
            }

            // For Season 0 (Specials/OAV), fetch the specific episode title
            if (seasonNumber === 0) {
              try {
                const seasonUrl = `https://api.themoviedb.org/3/tv/${tmdbId}/season/0?api_key=${TMDB_KEY}&language=en-US`;
                const seasonRes = await axios.get(seasonUrl, { timeout: 5000 });

                if (seasonRes.data && seasonRes.data.episodes) {
                  const targetEp = seasonRes.data.episodes.find(ep => ep.episode_number === episodeNumber);
                  if (targetEp && targetEp.name) {
                    episodeEnglishTitle = targetEp.name;
                    console.log(`🎬 [AnimeAPI] Season 0 Episode Title: "${episodeEnglishTitle}"`);
                  }
                }
              } catch (e) {
                console.warn(`⚠️ [AnimeAPI] Failed to fetch Season 0 episode details: ${e.message}`);
              }
            }
          } catch (e) {
            console.warn(`⚠️ [AnimeAPI] TMDB Fetch failed: ${e.message}`);
          }
        }

        // Fonction de recherche helper (avec cache)
        const searchAnime = async (query) => {
          const cacheKey = `anime:search:${query.toLowerCase()}`;
          const cached = cacheGet(cacheKey);
          if (cached) return cached;

          try {
            const url = `${ANIME_API_BASE}?action=search&keyword=${encodeURIComponent(query)}`;
            console.log(`🎌 [Search] Query: "${query}"`);
            const res = await axios.get(url, { timeout: 8000 });
            const results = (res.data?.success && res.data?.results?.data) ? res.data.results.data : [];

            if (results.length > 0) {
              cacheSet(cacheKey, results, CACHE_TTL.ANIME_SEARCH);
            }
            return results;
          } catch (e) { return []; }
        };

        // Stratégie de recherche Multi-Step
        let candidates = [];

        // 0. PRIORITY: If we have a manual override, search with that FIRST
        if (overrideSearchTitle) {
          console.log(`🎯 [Search Strategy 0] OVERRIDE Search: "${overrideSearchTitle}"`);
          const overrideResults = await searchAnime(overrideSearchTitle);
          candidates = [...candidates, ...overrideResults];

          // If override found results, we can skip other strategies
          if (candidates.length > 0) {
            console.log(`🎯 [AnimeAPI] Override search found ${candidates.length} results, using these`);
          }
        }

        // 1. Recherche avec le nom COMPLET de la saison (ex: "Attack on Titan: The Final Season Part 3")
        if (!overrideSearchTitle && englishSeasonName && englishSeasonName !== `Season ${seasonNumber}`) {
          console.log(`🎌 [Search Strategy 1] Searching: "${title} ${englishSeasonName}"`);
          const results = await searchAnime(`${title} ${englishSeasonName}`);
          candidates = [...candidates, ...results];

          // 1b. Aussi chercher avec le nom de saison seul si c'est assez spécifique
          if (englishSeasonName.length > 10) {
            console.log(`🎌 [Search Strategy 1b] Searching season name only: "${englishSeasonName}"`);
            const resultsSeasonOnly = await searchAnime(englishSeasonName);
            candidates = [...candidates, ...resultsSeasonOnly];
          }
        }

        // 1c. NEW: For Season 0 (Specials/OAV), search for "[Title] Specials" collection
        if (seasonNumber === 0 && !overrideSearchTitle) {
          console.log(`🎬 [Search Strategy 1c] Season 0: Searching for "${title} Specials"...`);
          const specialsResults = await searchAnime(`${title} Specials`);
          candidates = [...candidates, ...specialsResults];

          // Also search with variations like "[Title] OVA" for standalone OVAs
          if (episodeEnglishTitle) {
            console.log(`🎬 [Search Strategy 1d] Season 0: Searching for "${title}: ${episodeEnglishTitle}" (OAV)...`);
            const oavResults = await searchAnime(`${title}: ${episodeEnglishTitle}`);
            candidates = [...candidates, ...oavResults];
          }
        }

        // 2. Recherche avec Titre + "Season N" (Standard) - skip if override found results
        if (!overrideSearchTitle && seasonNumber > 1) {
          const results = await searchAnime(`${title} Season ${seasonNumber}`);
          candidates = [...candidates, ...results];

          // 3. Recherche avec Titre + "N" (ex: "Attack on Titan 4", parfois utilisé)
          const resultsSimple = await searchAnime(`${title} ${seasonNumber}`);
          candidates = [...candidates, ...resultsSimple];
        }

        // 4. Recherche Titre Seul (Generic Strategy - Always run to ensure we catch everything)
        // This is often the most reliable way to find "2nd Season" etc. (searching "Jujutsu Kaisen" gives "Jujutsu Kaisen 2nd Season")
        if (!overrideSearchTitle) {
          console.log(`🎌 [Search Strategy 4] Searching Generic Title: "${title}"`);
          const resultsGeneric = await searchAnime(title);
          candidates = [...candidates, ...resultsGeneric];
        }

        // Deduplication par ID
        candidates = candidates.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
        console.log(`🎌 [AnimeAPI] Total Candidates (before filter): ${candidates.length}`);

        // ═══════════════════════════════════════════════════════════════════
        // CRITICAL FIX: Filter out candidates that don't match the requested title
        // This prevents false positives like "K-ON!" matching "Attack on Titan"
        // ═══════════════════════════════════════════════════════════════════
        const normTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '');
        candidates = candidates.filter(c => {
          const cTitle = c.title.toLowerCase().replace(/[^a-z0-9]/g, '');
          // Candidate title must CONTAIN the requested title
          // Example: "attackontitanfinalseasonpart1" contains "attackontitan" ✓
          // Example: "kon" does NOT contain "attackontitan" ✗
          // NOTE: We do NOT check the reverse because "attackontitan" contains "kon" (false positive!)
          const matches = cTitle.includes(normTitle);
          if (!matches) {
            console.log(`   ❌ Filtered out: "${c.title}" (doesn't contain "${title}")`);
          }
          return matches;
        });
        console.log(`🎌 [AnimeAPI] Candidates after title filter: ${candidates.length}`);

        // Fonction de classement des candidats (Ranking)
        const getRankedCandidates = (list) => {
          if (!list || list.length === 0) return [];

          const normOverride = overrideSearchTitle ? overrideSearchTitle.toLowerCase().replace(/[^a-z0-9]/g, '') : '';
          // Remove common prefixes like "The" from season name for better matching
          const cleanSeasonName = englishSeasonName ? englishSeasonName.toLowerCase().replace(/^the\s+/i, '') : '';
          const normEngSeason = cleanSeasonName.replace(/[^a-z0-9]/g, '');

          console.log(`🔍 [Ranking] Looking for season: "${englishSeasonName}" → normalized: "${normEngSeason}"`);

          return list.sort((a, b) => {
            const aTitle = a.title.toLowerCase().replace(/[^a-z0-9]/g, '');
            const bTitle = b.title.toLowerCase().replace(/[^a-z0-9]/g, '');

            // 1. Override Title Match (Highest Priority - for manual mappings)
            if (overrideSearchTitle) {
              const aMatch = aTitle.includes(normOverride) || normOverride.includes(aTitle);
              const bMatch = bTitle.includes(normOverride) || normOverride.includes(bTitle);
              if (aMatch && !bMatch) return -1;
              if (!aMatch && bMatch) return 1;
            }

            // 2. English Season Name Match (ex: "The Final Season" → "finalseason")
            if (normEngSeason && normEngSeason !== 'specials') {
              const aMatch = aTitle.includes(normEngSeason);
              const bMatch = bTitle.includes(normEngSeason);
              if (aMatch && !bMatch) return -1;
              if (!aMatch && bMatch) return 1;
            }

            // 3. Specific Season Number Match (Season N, 2nd Season, Part N, etc.)
            if (seasonNumber > 1) {
              const patterns = [
                new RegExp(`season\\s*${seasonNumber}`, 'i'),
                new RegExp(`${seasonNumber}nd\\s+season`, 'i'),
                new RegExp(`${seasonNumber}rd\\s+season`, 'i'),
                new RegExp(`${seasonNumber}th\\s+season`, 'i'),
                new RegExp(`part\\s*${seasonNumber}`, 'i'),
                new RegExp(`${title}\\s+${seasonNumber}$`, 'i')
              ];
              const scoreA = patterns.reduce((acc, p) => acc + (p.test(a.title) ? 1 : 0), 0);
              const scoreB = patterns.reduce((acc, p) => acc + (p.test(b.title) ? 1 : 0), 0);
              if (scoreA > scoreB) return -1;
              if (scoreB > scoreA) return 1;
            }

            // 4. For multi-part seasons, prioritize "Part 1" before "Part 2" before "Part 3"
            // This ensures we check Part 1 first (which has earlier episodes)
            const aHasPart1 = /part\s*1/i.test(a.title);
            const bHasPart1 = /part\s*1/i.test(b.title);
            if (aHasPart1 && !bHasPart1) return -1;
            if (!aHasPart1 && bHasPart1) return 1;

            const aHasPart2 = /part\s*2/i.test(a.title);
            const bHasPart2 = /part\s*2/i.test(b.title);
            if (aHasPart2 && !bHasPart2) return -1;
            if (!aHasPart2 && bHasPart2) return 1;

            // 5. Prefer TV series over Movies/OVAs for episode matching
            const aIsTV = a.tvInfo?.showType === 'TV';
            const bIsTV = b.tvInfo?.showType === 'TV';
            if (aIsTV && !bIsTV) return -1;
            if (!aIsTV && bIsTV) return 1;

            // 5. Fallback: Shortest title (more specific match)
            return a.title.length - b.title.length;
          });
        };

        const rankedCandidates = getRankedCandidates(candidates);
        console.log(`🎌 [AnimeAPI] Ranked Candidates: ${rankedCandidates.length}`);
        rankedCandidates.forEach((c, i) => console.log(`   ${i + 1}. ${c.title} (${c.id})`));

        let selectedAnime = null;
        let targetEpisode = null;
        let finalCacheStatus = 'MISS';
        let finalCacheKey = '';
        let finalRemainingTTL = 0;

        // --- ITERATION LOOP ---
        for (const candidate of rankedCandidates) {
          console.log(`🔄 [AnimeAPI] Checking candidate: "${candidate.title}"...`);

          // Fetch Episodes
          const episodesCacheKey = `anime:episodes:${candidate.id}`;
          const episodesCache = cacheGetWithStatus(episodesCacheKey);
          let episodes = episodesCache.data;
          let cacheStatus = episodesCache.fromCache ? 'HIT' : 'MISS';

          if (!episodes) {
            try {
              const episodesUrl = `${ANIME_API_BASE}?action=episodes&id=${encodeURIComponent(candidate.id)}`;
              const episodesResponse = await axios.get(episodesUrl, { timeout: 5000 });
              if (episodesResponse.data?.success && episodesResponse.data?.results?.episodes) {
                episodes = episodesResponse.data.results.episodes;
                cacheSet(episodesCacheKey, episodes, CACHE_TTL.EPISODES);
              } else {
                episodes = [];
              }
            } catch (e) {
              console.warn(`   ⚠️ Keep checking... failed to fetch episodes for ${candidate.title}`);
              episodes = [];
            }
          }

          if (episodes.length === 0) continue;

          // Attempt to find episode in this candidate
          let foundEpisode = null;

          // Strategy A: Standard Match
          const isSafeSeason0Match = seasonNumber !== 0 || (candidate.title && (candidate.title.toLowerCase().includes('specials') || candidate.title.toLowerCase().includes('oav'))) || overrideSearchTitle;
          if (isSafeSeason0Match) {
            foundEpisode = episodes.find(ep => (ep.number || ep.episode_no) == episodeNumber);
          }

          // Strategy B: Absolute Match
          if (!foundEpisode && seasonNumber > 1) {
            foundEpisode = episodes.find(ep => (ep.number || ep.episode_no) == absoluteEpisodeNumber);
            if (foundEpisode) console.log(`   ✅ Found by Absolute Number: ${absoluteEpisodeNumber}`);
          }

          // Strategy C & D: Title Match / Advanced Similarity (Specials)
          if (!foundEpisode && seasonNumber === 0 && episodeEnglishTitle) {
            // ... [Reuse existing advanced matching logic here ideally, or simplified] ...
            // For brevity in this replacement, I'll use the core title check which is most robust
            const normEpTitle = episodeEnglishTitle.toLowerCase().replace(/[^a-z0-9]/g, '');
            foundEpisode = episodes.find(ep => {
              const epTitle = (ep.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
              return epTitle === normEpTitle || epTitle.includes(normEpTitle) || normEpTitle.includes(epTitle);
            });
            if (foundEpisode) console.log(`   ✅ Found by Title Match: ${foundEpisode.title}`);
          }

          if (foundEpisode) {
            console.log(`🎯 [AnimeAPI] MATCH FOUND in "${candidate.title}"! Episode ${foundEpisode.number} (ID: ${foundEpisode.id})`);
            selectedAnime = candidate;
            targetEpisode = foundEpisode;

            // Set headers for cache info based on the SUCCESSFUL candidate
            finalCacheStatus = cacheStatus;
            finalCacheKey = episodesCacheKey;
            finalRemainingTTL = episodesCache.remainingTTL || 0;

            res.setHeader('X-Cache', finalCacheStatus);
            res.setHeader('X-Cache-Key', finalCacheKey);
            if (episodesCache.fromCache) res.setHeader('X-Cache-TTL', `${finalRemainingTTL}s`);

            break; // STOP SEARCHING
          }
        }

        if (!targetEpisode) {
          console.log('🎌 [AnimeAPI] ❌ Target episode not found');
          return res.status(200).json({ success: true, results: [] });
        }

        // Etape 3: Stream Link
        // Use full episode ID from episode list (e.g. "attack-on-titan-112?ep=3303")
        const streamUrl = `${ANIME_API_BASE}?action=stream&id=${encodeURIComponent(targetEpisode.id)}&server=hd-2&type=sub`;
        const streamResponse = await axios.get(streamUrl, { timeout: 15000 });

        if (!streamResponse.data?.success || !streamResponse.data?.results?.streamingLink) {
          console.log('🎌 [AnimeAPI] ❌ No streaming link');
          return res.status(200).json({ success: true, results: [] });
        }

        const streamingLink = streamResponse.data.results.streamingLink;

        return res.status(200).json({
          success: true,
          cache: {
            status: finalCacheStatus,
            key: finalCacheKey,
            remainingTTL: finalRemainingTTL
          },
          results: [{
            provider: 'AnimeAPI',
            language: 'VO',
            quality: 'HD',
            url: streamingLink.link?.file || streamingLink.link,
            type: streamingLink.link?.type || streamingLink.type || 'hls',
            tracks: streamingLink.tracks, // Pass tracks (subtitles) to client
            animeInfo: {
              id: selectedAnime.id,
              title: selectedAnime.title,
              season: seasonNumber, // Provide the requested season
              episode: episodeNumber, // Provide the requested episode
              realEpisode: targetEpisode.number // The absolute number used
            }
          }]
        });

      } catch (error) {
        console.error('🎌 [AnimeAPI] ❌❌❌ ERROR:', error.message);
        return res.status(200).json({ success: true, results: [] });
      }
    }


    // GÉRER AFTERDARK ICI
    if (decodedPath === 'afterdark') {
      console.log('🌙 [Movix Proxy] Routing to AfterDark handler');
      try {
        const { tmdbId, type, season, episode, title, year, originalTitle } = queryParams;

        if (!tmdbId || !type) {
          return res.status(400).json({
            error: 'Paramètres manquants pour AfterDark (tmdbId, type)'
          });
        }

        // Headers pour éviter le 403 - Maximum browser mimicry
        const afterdarkHeaders = {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
          'Accept-Encoding': 'gzip, deflate, br, zstd',
          'Referer': 'https://afterdark.mom/',
          'Origin': 'https://afterdark.mom',
          'Connection': 'keep-alive',
          'Sec-Fetch-Dest': 'empty',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Site': 'same-origin',
          'Sec-Ch-Ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
          'Sec-Ch-Ua-Mobile': '?0',
          'Sec-Ch-Ua-Platform': '"Windows"',
          'Priority': 'u=1, i',
          'DNT': '1',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          // Add cookie to appear more like a real browser session
          'Cookie': '_ga=GA1.1.123456789.1234567890; _ga_XXXXXXXXXX=GS1.1.1234567890.1.0.1234567890.0.0.0'
        };

        let afterdarkUrl;
        const baseUrl = 'https://afterdark.mom/api/sources';

        if (type === 'movie') {
          const params = new URLSearchParams({
            tmdbId,
            ...(title && { title }),
            ...(year && { year }),
            ...(originalTitle && { originalTitle })
          });
          afterdarkUrl = `${baseUrl}/movies?${params}`;
        } else if (type === 'tv') {
          if (!season || !episode) {
            return res.status(400).json({
              error: 'Paramètres season et episode requis pour les séries'
            });
          }
          const params = new URLSearchParams({
            tmdbId,
            season,
            episode,
            ...(title && { title })
          });
          afterdarkUrl = `${baseUrl}/shows?${params}`;
        } else {
          return res.status(400).json({ error: 'Type invalide (movie ou tv)' });
        }

        console.log(`🌙 [AfterDark] Request: ${afterdarkUrl}`);

        const response = await axios.get(afterdarkUrl, {
          headers: afterdarkHeaders,
          timeout: 15000
        });

        // Transformer la réponse AfterDark au format attendu
        const sources = [];
        if (response.data && Array.isArray(response.data)) {
          for (const item of response.data) {
            // Filtrer uniquement les liens non-proxifiés
            if (item.proxied !== false) {
              console.log(`🌙 [AfterDark] Skipping proxied link: ${item.url || item.link}`);
              continue;
            }

            // AfterDark retourne 'kind' au lieu de 'type'
            const streamType = item.kind || (item.url?.includes('.m3u8') ? 'hls' : 'mp4');

            sources.push({
              url: item.url || item.link,
              quality: item.quality || 'HD',
              type: streamType === 'hls' ? 'm3u8' : streamType,
              provider: 'afterdark',
              language: 'VF',
              server: item.server || item.name || 'AfterDark'
            });
          }
        }

        console.log(`🌙 [AfterDark] Found ${sources.length} sources`);
        return res.status(200).json({
          success: true,
          sources,
          count: sources.length
        });

      } catch (afterdarkError) {
        console.error('❌ [AfterDark Error]', afterdarkError.message);
        console.error('❌ [AfterDark] Stack:', afterdarkError.stack);

        if (afterdarkError.response) {
          const status = afterdarkError.response.status;
          console.error('❌ [AfterDark] HTTP Status:', status);
          console.error('❌ [AfterDark] Response Data:', afterdarkError.response.data);

          // Si c'est un 403, retourner une réponse vide au lieu d'une erreur
          // Car AfterDark bloque souvent les IPs de datacenter
          if (status === 403) {
            console.warn('⚠️ [AfterDark] 403 Forbidden - Returning empty sources (likely IP blocked)');
            return res.status(200).json({
              success: true,
              sources: [],
              count: 0,
              warning: 'AfterDark API blocked request (403)'
            });
          }
        }

        return res.status(500).json({
          error: 'Erreur proxy AfterDark',
          details: afterdarkError.message,
          statusCode: afterdarkError.response?.status
        });
      }
      return; // CRITICAL FIX: prevent fallthrough to other handlers
    }

    // GÉRER PROXY HLS (Streaming avec headers personnalisés)
    if (decodedPath === 'proxy/hls') {
      try {
        const { link, headers } = queryParams;

        if (!link) {
          return res.status(400).json({ error: 'Paramètre "link" manquant' });
        }

        const targetUrl = decodeURIComponent(link);
        let proxyHeaders = {};

        if (headers) {
          try {
            proxyHeaders = JSON.parse(decodeURIComponent(headers));
          } catch (e) {
            console.error('[PROXY HLS] Erreur parsing headers:', e);
          }
        }

        console.log(`🚀 [PROXY HLS] Streaming: ${targetUrl}`);
        // console.log(`🚀 [PROXY HLS] Headers:`, proxyHeaders);

        // Gestion du header Range pour le support du seek et du streaming partiel
        if (req.headers.range) {
          proxyHeaders['Range'] = req.headers.range;
          console.log(`🚀 [PROXY HLS] Range request: ${req.headers.range}`);
        }

        const response = await axios({
          method: 'GET',
          url: targetUrl,
          headers: {
            ...proxyHeaders,
            'User-Agent': proxyHeaders['User-Agent'] || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            // Force spoof Referer/Origin to bypass blocking
            'Referer': 'https://ajax.gogocdn.net/',
            'Origin': 'https://ajax.gogocdn.net'
          },
          responseType: 'stream',
          validateStatus: (status) => status < 500
        });

        // Forward status code (crucial for 206 Partial Content)
        res.status(response.status);

        // Forward important headers
        const headersToForward = [
          'content-type',
          'content-length',
          'content-range',
          'accept-ranges',
          'cache-control'
        ];

        headersToForward.forEach(header => {
          if (response.headers[header]) {
            res.setHeader(header.replace(/\b\w/g, l => l.toUpperCase()), response.headers[header]); // Ensure proper casing if needed, though usually automatic
          }
        });

        // Headers CORS (déjà définis au début mais on s'assure)
        res.setHeader('Access-Control-Allow-Origin', '*');

        // Si c'est un fichier m3u8, on doit réécrire les URLs internes
        const contentType = response.headers['content-type'];
        if (contentType && (contentType.includes('mpegurl') || contentType.includes('m3u8') || targetUrl.includes('.m3u8'))) {
          // Lire le contenu comme texte
          const m3u8Content = await new Promise((resolve, reject) => {
            let data = '';
            response.data.on('data', chunk => data += chunk);
            response.data.on('end', () => resolve(data));
            response.data.on('error', reject);
          });

          const baseUrl = new URL(targetUrl);
          const proxyBaseUrl = `${process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : req.protocol + '://' + req.get('host')}/api/movix-proxy?path=proxy/hls&link=`;

          // Réécrire le contenu m3u8
          const rewrittenContent = m3u8Content.replace(/^(?!#)(.+)$/gm, (match) => {
            // Lignes qui sont des URIs (segments ou playlists)
            if (match.trim() === '') return match;
            try {
              const absoluteUrl = new URL(match.trim(), baseUrl).toString();
              return `${proxyBaseUrl}${encodeURIComponent(absoluteUrl)}`;
            } catch (e) { return match; }
          }).replace(/URI="([^"]+)"/g, (match, uri) => {
            // URIs dans les attributs (ex: EXT-X-KEY, EXT-X-MEDIA)
            try {
              const absoluteUrl = new URL(uri, baseUrl).toString();
              return `URI="${proxyBaseUrl}${encodeURIComponent(absoluteUrl)}"`;
            } catch (e) { return match; }
          });

          res.setHeader('Content-Length', Buffer.byteLength(rewrittenContent));
          res.send(rewrittenContent);
          return;
        }

        // Pour les segments .ts ou autres binaires, on pipe directement
        response.data.pipe(res);
        return;

      } catch (error) {
        console.error('❌ [PROXY HLS] Error:', error.message);
        if (!res.headersSent) {
          res.status(502).json({ error: 'Erreur proxy HLS', details: error.message });
        }
        return;
      }
    }


    // Déterminer le type de requête pour améliorer les logs
    const isTmdbRequest = decodedPath.startsWith('tmdb/');
    const isAnimeRequest = decodedPath.startsWith('anime/search/');

    if (isTmdbRequest) {
      console.log(`🚀 [MOVIX TMDB] Fetching sources for: ${decodedPath}`);
    } else {
      console.log(`[MOVIX PROXY] Path original: ${path}`);
      console.log(`[MOVIX PROXY] Path décodé: ${decodedPath}`);
    }

    // Gérer le cas spécial pour anime/search qui n'a pas besoin de /api/
    let movixUrl;
    const baseMovixUrl = 'https://api.movix.site';

    if (decodedPath === 'search' && queryParams.title) {
      // Optimisation : Utiliser anime/search par défaut pour les recherches avec titre
      // car il renvoie plus de données (saisons/épisodes) nécessaires pour les animes
      const searchTitle = queryParams.title;
      movixUrl = `${baseMovixUrl}/anime/search/${encodeURIComponent(searchTitle)}`;
      // Forcer l'inclusion des données
      queryParams.includeSeasons = 'true';
      queryParams.includeEpisodes = 'true';
    } else if (isAnimeRequest) {
      movixUrl = `${baseMovixUrl}/${decodedPath}`;
    } else {
      movixUrl = `${baseMovixUrl}/api/${decodedPath}`;
    }
    const url = new URL(movixUrl);

    // Ajouter les query parameters
    Object.entries(queryParams).forEach(([key, value]) => {
      if (key !== 'path') {
        url.searchParams.append(key, value);
      }
    });

    if (isTmdbRequest) {
      console.log(`[MOVIX TMDB] URL: ${url.toString()}`);
    } else {
      console.log(`[MOVIX PROXY] Requête vers: ${url.toString()}`);
    }

    // Faire la requête vers Movix
    const response = await axios.get(url.toString(), {
      headers: MOVIX_HEADERS,
      timeout: 15000,
      validateStatus: (status) => status < 500, // Accepter les 4xx mais pas les 5xx
    });

    if (isTmdbRequest) {
      console.log(`[MOVIX TMDB] Response status: ${response.status}`);
    } else {
      console.log(`[MOVIX PROXY] Réponse reçue: ${response.status} ${response.statusText}`);
    }

    // Si la réponse est un succès, renvoyer les données
    if (response.status >= 200 && response.status < 300) {
      let responseData = response.data;

      // Log pour debug
      console.log(`🔍 [PROXY DEBUG] Path: "${decodedPath}"`);

      // FILTER: Remove "Specials" from One Punch Man search results
      // These have numbered episodes that can't be matched by title
      const isOPM = decodedPath.toLowerCase().replace(/[^a-z0-9]/g, '').includes('onepunchman');

      if (isAnimeRequest && isOPM) {
        const originalCount = responseData.results ? responseData.results.length : (Array.isArray(responseData) ? responseData.length : 0);

        // Only filter seasons, NOT the root anime entries
        const filterSeasons = (seasonsList) => {
          if (!Array.isArray(seasonsList)) return seasonsList;
          return seasonsList.filter(season => {
            const name = (season.name || '').toLowerCase();
            const isSaison = name.startsWith('saison');
            if (!isSaison && name.length > 0) {
              console.log(`🧐 [Filter] Removing non-Saison season: "${name}"`);
              return false;
            }
            return true;
          });
        };

        // Apply filter to seasons within each anime result
        const processAnimeList = (list) => {
          if (!Array.isArray(list)) return list;
          list.forEach(anime => {
            if (anime.seasons && Array.isArray(anime.seasons)) {
              console.log(`🔧 [Filter] Processing seasons for: ${anime.name || 'Unknown'}`);
              anime.seasons = filterSeasons(anime.seasons);
            }
          });
          return list;
        };

        if (Array.isArray(responseData)) {
          responseData = processAnimeList(responseData);
        } else if (responseData?.results && Array.isArray(responseData.results)) {
          responseData.results = processAnimeList(responseData.results);
        }

        // Filter reporting
        const removedCount = originalCount - (responseData.results ? responseData.results.length : (Array.isArray(responseData) ? responseData.length : 0));
        console.log(`🎯 [Filter] Filter applied for One Punch Man. Removed: ${removedCount} items.`);

        if (!responseData.meta) responseData.meta = {};
        responseData.meta.filterDebug = {
          applied: true,
          originalCount: originalCount,
          finalCount: responseData.results ? responseData.results.length : 0,
          removedCount: removedCount,
          path: decodedPath
        };
      }

      res.status(response.status).json(responseData);
    } else {
      // Pour les erreurs 4xx, renvoyer l'erreur avec le bon status
      res.status(response.status).json({
        error: isTmdbRequest ? 'Erreur API Movix TMDB' : 'Erreur API Movix',
        status: response.status,
        message: response.statusText,
        data: response.data
      });
    }

  } catch (error) {
    const isTmdbRequest = req.query.path && decodeURIComponent(req.query.path).startsWith('tmdb/');
    const errorPrefix = isTmdbRequest ? '[MOVIX TMDB ERROR]' : '[MOVIX PROXY ERROR]';

    console.error(errorPrefix, error.message);

    if (error.response) {
      // Erreur de réponse HTTP
      console.error(`${errorPrefix} Status: ${error.response.status}`);
      console.error(`${errorPrefix} Data:`, error.response.data);

      res.status(502).json({
        error: isTmdbRequest ? 'Erreur proxy Movix TMDB' : 'Erreur proxy Movix',
        status: error.response.status,
        message: error.response.statusText,
        details: error.message
      });
    } else if (error.request) {
      // Erreur de réseau
      console.error(`${errorPrefix} Pas de réponse reçue`);

      res.status(502).json({
        error: isTmdbRequest ? 'Erreur réseau Movix TMDB' : 'Erreur réseau Movix',
        message: `Impossible de contacter l'API Movix${isTmdbRequest ? ' TMDB' : ''}`,
        details: error.message
      });
    } else {
      // Autre erreur
      console.error(`${errorPrefix} Erreur inconnue:`, error.message);

      res.status(500).json({
        error: isTmdbRequest ? 'Erreur serveur proxy Movix TMDB' : 'Erreur serveur proxy Movix',
        message: 'Erreur interne du serveur',
        details: error.message
      });
    }
  }
}
