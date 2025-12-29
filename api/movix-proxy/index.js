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

    // GÉRER VIXSRC ICI
    if (decodedPath === 'vixsrc') {

      try {
        const { tmdbId, type, season, episode } = queryParams;

        if (!tmdbId || !type) {
          return res.status(400).json({ error: 'Paramètres manquants pour vixsrc (tmdbId, type)' });
        }

        console.log(`🚀 [MOVIX PROXY VIXSRC] Request: ${type} ${tmdbId} S${season}E${episode}`);

        const streams = await vixsrcScraper.getStreams(
          tmdbId,
          type,
          season ? parseInt(season) : null,
          episode ? parseInt(episode) : null
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
            const tmdbUrl = `https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_KEY}&language=en-US`;
            const tmdbRes = await axios.get(tmdbUrl, { timeout: 5000 });

            if (tmdbRes.data && tmdbRes.data.seasons) {
              const seasons = tmdbRes.data.seasons;
              const targetSeason = seasons.find(s => s.season_number === seasonNumber);

              if (targetSeason) {
                englishSeasonName = targetSeason.name; // ex: "The Final Season"
                console.log(`🎌 [AnimeAPI] TMDB English Season Name: "${englishSeasonName}"`);
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

        // 4. Recherche Titre Seul (Fallback) - only if no override results
        if (candidates.length === 0 || !overrideSearchTitle) {
          const resultsGeneric = await searchAnime(title);
          candidates = [...candidates, ...resultsGeneric];
        }

        // Deduplication par ID
        candidates = candidates.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
        console.log(`🎌 [AnimeAPI] Total Candidates: ${candidates.length}`);

        // Fonction de filtrage avancée
        const findBestMatch = (list) => {
          if (!list || list.length === 0) return null;

          // Normalisation
          const normTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '');
          const normOverride = overrideSearchTitle ? overrideSearchTitle.toLowerCase().replace(/[^a-z0-9]/g, '') : '';
          const normEngSeason = englishSeasonName ? englishSeasonName.toLowerCase() : '';

          // Priorité 0: HIGHEST PRIORITY - Match exact avec override title (pour les specials mappés)
          if (overrideSearchTitle) {
            const exactOverride = list.find(r => {
              const rTitle = r.title.toLowerCase().replace(/[^a-z0-9]/g, '');
              return rTitle === normOverride || rTitle.includes(normOverride) || normOverride.includes(rTitle);
            });
            if (exactOverride) {
              console.log(`🎯 [Match] Found by OVERRIDE title: ${exactOverride.title}`);
              return { match: exactOverride, method: 'specific' };
            }
          }

          // Priorité 0.5: For Season 0 (Specials/OAV), match using the TMDB episode title
          if (seasonNumber === 0 && episodeEnglishTitle) {
            const normEpTitle = episodeEnglishTitle.toLowerCase().replace(/[^a-z0-9]/g, '');
            const fullOavTitle = `${title}: ${episodeEnglishTitle}`.toLowerCase().replace(/[^a-z0-9]/g, '');

            const oavMatch = list.find(r => {
              const rTitle = r.title.toLowerCase().replace(/[^a-z0-9]/g, '');
              // Match: exact episode title, anime title includes episode title, or full combined title
              // Note: We don't use normEpTitle.includes(rTitle) as it's too permissive (e.g., "is" matches everything)
              return rTitle === normEpTitle ||
                rTitle.includes(normEpTitle) ||
                rTitle === fullOavTitle ||
                rTitle.includes(fullOavTitle);
            });

            if (oavMatch) {
              console.log(`🎬 [Match] Found by OAV Episode Title: ${oavMatch.title} (matched: "${episodeEnglishTitle}")`);
              return { match: oavMatch, method: 'specific' };
            }
          }

          // Priorité 0.6: For Season 0, match "[Title] Specials" pattern specifically
          if (seasonNumber === 0) {
            const normTitleSpecials = `${title.toLowerCase().replace(/[^a-z0-9]/g, '')}specials`;

            const specialsMatch = list.find(r => {
              const rTitle = r.title.toLowerCase().replace(/[^a-z0-9]/g, '');
              return rTitle === normTitleSpecials || rTitle.includes(normTitleSpecials);
            });

            if (specialsMatch) {
              console.log(`🎬 [Match] Found by Specials pattern: ${specialsMatch.title}`);
              return { match: specialsMatch, method: 'specials' }; // Use 'specials' method to indicate title matching needed
            }
          }

          // Priorité 1: Match Exact avec English Season Name (but not if it's just "Specials")
          if (englishSeasonName && englishSeasonName.toLowerCase() !== 'specials') {
            const exactEng = list.find(r => r.title.toLowerCase().includes(normEngSeason));
            if (exactEng) {
              console.log(`🎌 [Match] Found by English Season Name: ${exactEng.title}`);
              return { match: exactEng, method: 'specific' };
            }
          }

          // Priorité 2: Match "Season N" ou "Title N"
          if (seasonNumber > 1) {
            const patterns = [
              new RegExp(`season\\s*${seasonNumber}`, 'i'),
              new RegExp(`${seasonNumber}nd\\s+season`, 'i'),
              new RegExp(`${seasonNumber}rd\\s+season`, 'i'),
              new RegExp(`${seasonNumber}th\\s+season`, 'i'),
              // Match finissant par chiffre (ex: "Titan 4")
              new RegExp(`${title}\\s+${seasonNumber}$`, 'i'),
              new RegExp(`${title}.*${seasonNumber}$`, 'i')
            ];

            for (let p of patterns) {
              const match = list.find(r => p.test(r.title));
              if (match) {
                console.log(`🎌 [Match] Found by Pattern ${p}: ${match.title}`);
                return { match: match, method: 'specific' };
              }
            }
          }

          // Priorité 3: Match Generic (Titre "root")
          // On cherche le titre qui ressemble le plus au titre de base.
          // CRUCIAL: On trie par longueur croissante pour privilégier "Attack on Titan" (court) avant "Attack on Titan: Chronicle" (long)
          const sortedList = [...list].sort((a, b) => a.title.length - b.title.length);

          const rootMatch = sortedList.find(r => {
            const rTitle = r.title.toLowerCase().replace(/[^a-z0-9]/g, '');
            // 3.1 Match Exact (Priorité absolue pour le root title)
            if (rTitle === normTitle) return true;

            // 3.2 StartsWith (Pour catcher les variations mineures, mais attention aux spin-offs)
            // Comme on a trié par longueur, le titre le plus court qui commence par le titre cherché sera pris.
            return rTitle.startsWith(normTitle);
          });

          if (rootMatch) {
            console.log(`🎌 [Match] Found Generic/Root Title (Shortest/Exact): ${rootMatch.title}`);
            return { match: rootMatch, method: 'generic' };
          }

          return null;
        };

        const result = findBestMatch(candidates);

        if (!result) {
          console.log('🎌 [AnimeAPI] ❌ No suitable anime found');
          return res.status(200).json({ success: true, results: [] });
        }

        const anime = result.match;
        const isSpecificSeasonMatch = result.method === 'specific';
        console.log(`🎌 [AnimeAPI] Selected Anime: ${anime.title} (Specific Season: ${isSpecificSeasonMatch})`);

        // Etape 2: Récupérer épisodes (avec cache)
        const episodesCacheKey = `anime:episodes:${anime.id}`;
        const episodesCache = cacheGetWithStatus(episodesCacheKey);
        let episodes = episodesCache.data;
        let cacheStatus = episodesCache.fromCache ? 'HIT' : 'MISS';

        if (!episodes) {
          const episodesUrl = `${ANIME_API_BASE}?action=episodes&id=${encodeURIComponent(anime.id)}`;
          const episodesResponse = await axios.get(episodesUrl, { timeout: 10000 });

          if (!episodesResponse.data?.success || !episodesResponse.data?.results?.episodes) {
            return res.status(200).json({ success: true, results: [] });
          }

          episodes = episodesResponse.data.results.episodes;
          cacheSet(episodesCacheKey, episodes, CACHE_TTL.EPISODES);
          cacheStatus = 'MISS';
        }

        // Set cache header for client visibility
        res.setHeader('X-Cache', cacheStatus);
        res.setHeader('X-Cache-Key', episodesCacheKey);
        if (episodesCache.fromCache) {
          res.setHeader('X-Cache-TTL', `${episodesCache.remainingTTL}s`);
        }

        console.log(`🎌 [AnimeAPI] Episodes found: ${episodes.length} (Cache: ${cacheStatus})`);

        // Sélection de l'épisode
        let targetEpisode = null;

        // Stratégie A: On a matché la saison spécifique OU on a un override (specials) -> on cherche episodeNumber (1, 2, ...)
        // Note: Pour les specials (season 0) avec override, episodeNumber est déjà remappé (ex: 36->1, 37->2)
        if (isSpecificSeasonMatch || seasonNumber === 1 || overrideSearchTitle) {
          targetEpisode = episodes.find(ep => (ep.number || ep.episode_no) == episodeNumber);
          if (!targetEpisode) console.log(`🎌 [Episode] Standard match (Ep ${episodeNumber}) failed`);
        }

        // Stratégie B: Fallback Absolute -> On cherche l'épisode absolu (ex: 76)
        // Utilisé si Stratégie A échoue OU si on a matché un titre générique pour une saison > 1
        if (!targetEpisode && seasonNumber > 1) {
          console.log(`🎌 [Episode] Trying Absolute Episode: ${absoluteEpisodeNumber}`);
          targetEpisode = episodes.find(ep => (ep.number || ep.episode_no) == absoluteEpisodeNumber);
        }

        // Stratégie C: For Season 0 Specials, try to match episode by its TITLE
        // This handles cases where the episodeNumber might not match but the title does
        if (!targetEpisode && seasonNumber === 0 && episodeEnglishTitle) {
          console.log(`🎬 [Episode] Season 0: Trying to match by episode title: "${episodeEnglishTitle}"`);

          // Synonym dictionary for common translation differences
          const synonyms = {
            'student': ['pupil', 'learner', 'disciple'],
            'pupil': ['student', 'learner', 'disciple'],
            'storytelling': ['story', 'talking', 'talker', 'narration', 'narrative'],
            'talker': ['storytelling', 'speaker', 'narrator'],
            'talking': ['storytelling', 'speaking', 'narrating'],
            'sucks': ['poor', 'bad', 'terrible', 'awful', 'extremely'],
            'poor': ['sucks', 'bad', 'terrible', 'awful'],
            'shadow': ['shade', 'darkness', 'silhouette'],
            'snuck': ['sneaked', 'crept', 'approached'],
            'close': ['near', 'nearby', 'approaching'],
            'ninja': ['shinobi', 'assassin'],
            'complicated': ['complex', 'difficult', 'intricate'],
            'overbearing': ['domineering', 'pushy', 'forceful'],
            'murder': ['killing', 'death', 'homicide'],
            'impossible': ['unbelievable', 'incredible', 'unthinkable'],
            'sisters': ['siblings', 'family'],
            'memory': ['memories', 'recollection'],
            'loss': ['lost', 'losing'],
          };

          // Normalize text using synonyms
          const normalizeSynonyms = (text) => {
            let normalized = text.toLowerCase();
            for (const [word, syns] of Object.entries(synonyms)) {
              for (const syn of syns) {
                normalized = normalized.replace(new RegExp(`\\b${syn}\\b`, 'g'), word);
              }
            }
            return normalized.replace(/[^a-z0-9]/g, '');
          };

          // Helper function: Extract significant words (ignoring common articles)
          const getSignificantWords = (text) => {
            const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/);
            const articles = ['the', 'a', 'an', 'and', 'of', 'to', 'in', 'is', 'who', 'that', 'too', 'at', 'have', 'has', 'been'];
            return words.filter(w => w.length > 2 && !articles.includes(w));
          };

          // Bigram similarity (compares 2-character sequences)
          const getBigrams = (str) => {
            const bigrams = new Set();
            for (let i = 0; i < str.length - 1; i++) {
              bigrams.add(str.slice(i, i + 2));
            }
            return bigrams;
          };

          const bigramSimilarity = (str1, str2) => {
            const s1 = getBigrams(str1);
            const s2 = getBigrams(str2);
            const intersection = [...s1].filter(b => s2.has(b)).length;
            const union = new Set([...s1, ...s2]).size;
            return union === 0 ? 0 : intersection / union;
          };

          // Levenshtein distance for fuzzy string matching
          const levenshteinDistance = (str1, str2) => {
            const m = str1.length, n = str2.length;
            const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
            for (let i = 0; i <= m; i++) dp[i][0] = i;
            for (let j = 0; j <= n; j++) dp[0][j] = j;
            for (let i = 1; i <= m; i++) {
              for (let j = 1; j <= n; j++) {
                dp[i][j] = str1[i - 1] === str2[j - 1]
                  ? dp[i - 1][j - 1]
                  : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
              }
            }
            return dp[m][n];
          };

          // Calculate combined similarity (0-1)
          const advancedSimilarity = (text1, text2) => {
            // Normalize with synonyms
            const norm1 = normalizeSynonyms(text1);
            const norm2 = normalizeSynonyms(text2);

            // Calculate Levenshtein similarity
            const maxLen = Math.max(norm1.length, norm2.length);
            const levSim = maxLen === 0 ? 1 : 1 - levenshteinDistance(norm1, norm2) / maxLen;

            // Calculate bigram similarity
            const bigSim = bigramSimilarity(norm1, norm2);

            // Calculate word overlap with synonyms
            const words1 = getSignificantWords(text1);
            const words2 = getSignificantWords(text2);
            const normalizedWords1 = words1.map(w => normalizeSynonyms(w));
            const normalizedWords2 = words2.map(w => normalizeSynonyms(w));
            const commonWords = normalizedWords1.filter(w => normalizedWords2.some(w2 => w.includes(w2) || w2.includes(w)));
            const wordSim = words1.length === 0 ? 0 : commonWords.length / words1.length;

            // Combined score: max of all methods (any good match counts)
            return Math.max(levSim, bigSim, wordSim);
          };

          const normEpTitle = episodeEnglishTitle.toLowerCase().replace(/[^a-z0-9]/g, '');
          const tmdbWords = getSignificantWords(episodeEnglishTitle);

          // First try: exact and word-based matching
          targetEpisode = episodes.find(ep => {
            const epTitle = (ep.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');

            // Exact match
            if (epTitle === normEpTitle || epTitle.includes(normEpTitle) || normEpTitle.includes(epTitle)) {
              return true;
            }

            // Fuzzy match: Check if significant words overlap significantly
            const animeWords = getSignificantWords(ep.title || '');
            const commonWords = tmdbWords.filter(w => animeWords.some(aw => aw.includes(w) || w.includes(aw)));
            const matchRatio = commonWords.length / Math.max(tmdbWords.length, 1);

            // If more than 60% of significant words match, consider it a match
            return matchRatio >= 0.6;
          });

          // Second try: Advanced similarity if word matching failed
          if (!targetEpisode && episodes.length > 0) {
            console.log(`🎬 [Episode] Word matching failed, trying advanced similarity...`);

            let bestMatch = null;
            let bestSimilarity = 0;

            for (const ep of episodes) {
              const similarity = advancedSimilarity(episodeEnglishTitle, ep.title || '');

              if (similarity > bestSimilarity) {
                bestSimilarity = similarity;
                bestMatch = ep;
              }
            }

            // Accept if similarity is above 40% (accounts for translation differences)
            if (bestMatch && bestSimilarity >= 0.4) {
              console.log(`🎬 [Episode] Best advanced match: "${bestMatch.title}" (${(bestSimilarity * 100).toFixed(1)}% similar)`);
              targetEpisode = bestMatch;
            }
          }

          if (targetEpisode) {
            console.log(`🎬 [Episode] Found by title match: "${targetEpisode.title}"`);
          }
        }

        // Stratégie D: For Season 0, fallback to "[Title] Specials" anime and match by episode title
        // This handles series like One Punch Man where specials are grouped in a separate "Specials" anime
        if (!targetEpisode && seasonNumber === 0 && episodeEnglishTitle) {
          console.log(`🎬 [Episode] Season 0 FALLBACK: Searching for "${title} Specials" anime...`);

          // Search for "[Title] Specials" anime
          const specialsSearchRes = await searchAnime(`${title} Specials`);
          const normTitleSpecials = `${title.toLowerCase().replace(/[^a-z0-9]/g, '')}specials`;

          const specialsAnime = specialsSearchRes.find(r => {
            const rTitle = r.title.toLowerCase().replace(/[^a-z0-9]/g, '');
            return rTitle === normTitleSpecials || rTitle.includes(normTitleSpecials);
          });

          if (specialsAnime) {
            console.log(`🎬 [Episode] Found Specials anime: "${specialsAnime.title}" (${specialsAnime.id})`);

            // Fetch episodes from this Specials anime
            const specialsEpisodesUrl = `${ANIME_API_BASE}?action=episodes&id=${encodeURIComponent(specialsAnime.id)}`;
            try {
              const specialsEpRes = await axios.get(specialsEpisodesUrl, { timeout: 10000 });

              if (specialsEpRes.data?.success && specialsEpRes.data?.results?.episodes) {
                const specialsEpisodes = specialsEpRes.data.results.episodes;
                console.log(`🎬 [Episode] Specials anime has ${specialsEpisodes.length} episodes`);

                // Same advanced matching as Strategy C
                const synonyms = {
                  'student': ['pupil', 'learner', 'disciple'],
                  'pupil': ['student', 'learner', 'disciple'],
                  'storytelling': ['story', 'talking', 'talker', 'narration', 'narrative'],
                  'talker': ['storytelling', 'speaker', 'narrator'],
                  'talking': ['storytelling', 'speaking', 'narrating'],
                  'sucks': ['poor', 'bad', 'terrible', 'awful', 'extremely'],
                  'poor': ['sucks', 'bad', 'terrible', 'awful'],
                  'shadow': ['shade', 'darkness', 'silhouette'],
                  'snuck': ['sneaked', 'crept', 'approached'],
                  'close': ['near', 'nearby', 'approaching'],
                  'ninja': ['shinobi', 'assassin'],
                  'complicated': ['complex', 'difficult', 'intricate'],
                  'overbearing': ['domineering', 'pushy', 'forceful'],
                  'murder': ['killing', 'death', 'homicide'],
                  'impossible': ['unbelievable', 'incredible', 'unthinkable'],
                  'sisters': ['siblings', 'family'],
                  'memory': ['memories', 'recollection'],
                  'loss': ['lost', 'losing'],
                };

                const normalizeSynonyms = (text) => {
                  let normalized = text.toLowerCase();
                  for (const [word, syns] of Object.entries(synonyms)) {
                    for (const syn of syns) {
                      normalized = normalized.replace(new RegExp(`\\b${syn}\\b`, 'g'), word);
                    }
                  }
                  return normalized.replace(/[^a-z0-9]/g, '');
                };

                const getSignificantWords = (text) => {
                  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/);
                  const articles = ['the', 'a', 'an', 'and', 'of', 'to', 'in', 'is', 'who', 'that', 'too', 'at', 'have', 'has', 'been'];
                  return words.filter(w => w.length > 2 && !articles.includes(w));
                };

                const getBigrams = (str) => {
                  const bigrams = new Set();
                  for (let i = 0; i < str.length - 1; i++) {
                    bigrams.add(str.slice(i, i + 2));
                  }
                  return bigrams;
                };

                const bigramSimilarity = (str1, str2) => {
                  const s1 = getBigrams(str1);
                  const s2 = getBigrams(str2);
                  const intersection = [...s1].filter(b => s2.has(b)).length;
                  const union = new Set([...s1, ...s2]).size;
                  return union === 0 ? 0 : intersection / union;
                };

                const levenshteinDistance = (str1, str2) => {
                  const m = str1.length, n = str2.length;
                  const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
                  for (let i = 0; i <= m; i++) dp[i][0] = i;
                  for (let j = 0; j <= n; j++) dp[0][j] = j;
                  for (let i = 1; i <= m; i++) {
                    for (let j = 1; j <= n; j++) {
                      dp[i][j] = str1[i - 1] === str2[j - 1]
                        ? dp[i - 1][j - 1]
                        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
                    }
                  }
                  return dp[m][n];
                };

                const advancedSimilarity = (text1, text2) => {
                  const norm1 = normalizeSynonyms(text1);
                  const norm2 = normalizeSynonyms(text2);
                  const maxLen = Math.max(norm1.length, norm2.length);
                  const levSim = maxLen === 0 ? 1 : 1 - levenshteinDistance(norm1, norm2) / maxLen;
                  const bigSim = bigramSimilarity(norm1, norm2);
                  const words1 = getSignificantWords(text1);
                  const words2 = getSignificantWords(text2);
                  const normalizedWords1 = words1.map(w => normalizeSynonyms(w));
                  const normalizedWords2 = words2.map(w => normalizeSynonyms(w));
                  const commonWords = normalizedWords1.filter(w => normalizedWords2.some(w2 => w.includes(w2) || w2.includes(w)));
                  const wordSim = words1.length === 0 ? 0 : commonWords.length / words1.length;
                  return Math.max(levSim, bigSim, wordSim);
                };

                // Find best match using advanced similarity
                let bestMatch = null;
                let bestSimilarity = 0;

                for (const ep of specialsEpisodes) {
                  const similarity = advancedSimilarity(episodeEnglishTitle, ep.title || '');
                  if (similarity > bestSimilarity) {
                    bestSimilarity = similarity;
                    bestMatch = ep;
                  }
                }

                if (bestMatch && bestSimilarity >= 0.4) {
                  console.log(`🎬 [Episode] Specials match: "${bestMatch.title}" (${(bestSimilarity * 100).toFixed(1)}% similar)`);
                  targetEpisode = bestMatch;
                }

                if (targetEpisode) {
                  console.log(`🎬 [Episode] ✅ Found in Specials by title: "${targetEpisode.title}" (ep ${targetEpisode.episode_no})`);
                }
              }
            } catch (e) {
              console.warn(`⚠️ [Episode] Failed to fetch Specials episodes: ${e.message}`);
            }
          }
        }

        // Stratégie E: Tolérance (Parfois GogoAnime numérote bizarrement)
        if (!targetEpisode) {
          // Essayer de trouver par "episode_no" ou index si disponible ?
          // Pour l'instant on prend le N-ième si disponible
          // targetEpisode = episodes[episodeNumber - 1]; // Risqué
        }

        if (!targetEpisode) {
          console.log('🎌 [AnimeAPI] ❌ Target episode not found');
          return res.status(200).json({ success: true, results: [] });
        }

        console.log(`🎌 [AnimeAPI] ✅ Target Episode found: Num ${targetEpisode.number} (ID: ${targetEpisode.id})`);

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
            status: cacheStatus,
            key: episodesCacheKey,
            remainingTTL: episodesCache.remainingTTL || 0
          },
          results: [{
            provider: 'AnimeAPI',
            language: 'VO',
            quality: 'HD',
            url: streamingLink.link?.file || streamingLink.link,
            type: streamingLink.link?.type || streamingLink.type || 'hls',
            tracks: streamingLink.tracks, // Pass tracks (subtitles) to client
            animeInfo: {
              id: anime.id,
              title: anime.title,
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

      // FILTER: Remove "Specials" from One Punch Man search results
      // These have numbered episodes that can't be matched by title
      if (isAnimeRequest && decodedPath.toLowerCase().includes('one') && decodedPath.toLowerCase().includes('punch')) {
        const originalCount = responseData.results ? responseData.results.length : (Array.isArray(responseData) ? responseData.length : 0);

        const isOavItem = (item) => {
          const name = (item.title || item.name || item.season_name || '').toLowerCase();
          return name.includes('specials') || name.includes('special') || name.includes('oav');
        };

        const filterList = (list) => {
          if (!Array.isArray(list)) return list;
          return list.filter(item => {
            if (isOavItem(item)) {
              console.log(`🗑️ [Filter] Removing "${item.title || item.name || 'OAV'}" from One Punch Man`);
              return false;
            }
            // Recursive filter for seasons within an anime result
            if (item.seasons && Array.isArray(item.seasons)) {
              item.seasons = filterList(item.seasons);
            }
            return true;
          });
        };

        if (Array.isArray(responseData)) {
          responseData = filterList(responseData);
        } else if (responseData?.results && Array.isArray(responseData.results)) {
          responseData.results = filterList(responseData.results);
        }

        console.log(`🎯 [Filter] Filter applied for One Punch Man (Original count: ${originalCount})`);
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
