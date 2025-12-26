import axios from 'axios';
import { handleUniversalVO } from "../_services/universalvo/index.js";


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
      console.log('🎌 [AnimeAPI] Handler triggered');
      try {
        const { title, season, episode } = queryParams;
        console.log('🎌 [AnimeAPI] Raw query params:', { title, season, episode });

        if (!title) {
          return res.status(400).json({
            error: 'Paramètre title manquant pour AnimeAPI'
          });
        }

        const seasonNumber = season ? parseInt(season) : null;
        const episodeNumber = episode ? parseInt(episode) : 1;
        console.log('🎌 [AnimeAPI] Parsed:', { title, seasonNumber, episodeNumber });

        const ANIME_API_BASE = 'https://anime-api-sand-psi.vercel.app/api';

        // Fonction de filtrage intelligent par saison
        const filterResultsBySeason = (results, title, seasonNumber) => {
          console.log(`🔍 [FILTER] === START ===`);
          console.log(`🔍 [FILTER] Inputs: ${results.length} results, title="${title}", season=${seasonNumber}`);

          if (!seasonNumber || seasonNumber === 1) {
            console.log(`🔍 [FILTER] Mode: SEASON 1 or NULL`);
            let match = results.find(r => {
              const lowerTitle = r.title.toLowerCase();
              const cleanTitle = title.toLowerCase();
              console.log(`🔍 Checking "${r.title}"`);
              console.log(`  exact: ${lowerTitle === cleanTitle}, includes: ${lowerTitle.includes(cleanTitle)}, showType: ${r.tvInfo?.showType}`);

              return lowerTitle === cleanTitle ||
                (lowerTitle.includes(cleanTitle) &&
                  !lowerTitle.match(/season\s*\d+/i) &&
                  !lowerTitle.match(/\d+nd\s+season/i) &&
                  !lowerTitle.match(/\d+rd\s+season/i) &&
                  !lowerTitle.match(/\d+th\s+season/i) &&
                  r.tvInfo?.showType === 'TV');
            });

            if (!match) {
              console.log(`🔍 [FILTER] No exact match, trying fallback`);
              match = results.find(r => r.tvInfo?.showType === 'TV');
            }

            console.log(`🔍 [FILTER] Result: ${match ? match.title : 'NO MATCH'}`);
            console.log(`🔍 [FILTER] === END ===`);
            return match;
          }

          // Season 2+
          console.log(`🔍 [FILTER] Mode: SEASON ${seasonNumber}`);
          const seasonPatterns = [
            new RegExp(`season\\s*${seasonNumber}`, 'i'),
            new RegExp(`${seasonNumber}nd\\s+season`, 'i'),
            new RegExp(`${seasonNumber}rd\\s+season`, 'i'),
            new RegExp(`${seasonNumber}th\\s+season`, 'i'),
            new RegExp(`${title}\\s+${seasonNumber}`, 'i'),
          ];

          for (let i = 0; i < seasonPatterns.length; i++) {
            console.log(`🔍 [FILTER] Pattern ${i + 1}: ${seasonPatterns[i]}`);
            const match = results.find(r => seasonPatterns[i].test(r.title));
            if (match) {
              console.log(`🔍 [FILTER] ✅ Matched: ${match.title}`);
              console.log(`🔍 [FILTER] === END ===`);
              return match;
            }
          }

          console.log(`🔍 [FILTER] ❌ No match`);
          console.log(`🔍 [FILTER] === END ===`);
          return null;
        };

        // Étape 1: Rechercher l'anime
        console.log(`🎌 [AnimeAPI] === STEP 1: SEARCH ===`);
        console.log(`🎌 [AnimeAPI] Searching: ${title}, Season: ${seasonNumber || 1}`);
        const searchUrl = `${ANIME_API_BASE}/search?keyword=${encodeURIComponent(title)}`;
        console.log(`🎌 [AnimeAPI] Search URL: ${searchUrl}`);
        const searchResponse = await axios.get(searchUrl, { timeout: 10000 });
        console.log(`🎌 [AnimeAPI] Search response status: ${searchResponse.status}`);
        console.log(`🎌 [AnimeAPI] Search data:`, JSON.stringify(searchResponse.data).substring(0, 200));

        if (!searchResponse.data?.success || !searchResponse.data?.results?.data) {
          console.log('🎌 [AnimeAPI] ❌ No search results');
          return res.status(200).json({ success: true, results: [] });
        }

        const results = searchResponse.data.results.data;
        console.log(`🎌 [AnimeAPI] Found ${results.length} results:`);
        results.slice(0, 3).forEach((r, i) => console.log(`  ${i + 1}. ${r.title} (${r.id})`));

        const anime = filterResultsBySeason(results, title, seasonNumber);
        console.log(`🎌 [AnimeAPI] After filtering: ${anime ? anime.title : 'NO MATCH'}`);

        if (!anime) {
          console.log('🎌 [AnimeAPI] ❌ No anime matched after filtering');
          return res.status(200).json({ success: true, results: [] });
        }

        console.log(`🎌 [AnimeAPI] ✅ Selected: ${anime.title} (ID: ${anime.id})`);

        // Étape 2: Récupérer les épisodes
        console.log(`🎌 [AnimeAPI] === STEP 2: EPISODES ===`);
        const episodesUrl = `${ANIME_API_BASE}/episodes/${anime.id}`;
        console.log(`🎌 [AnimeAPI] Episodes URL: ${episodesUrl}`);
        const episodesResponse = await axios.get(episodesUrl, { timeout: 10000 });
        console.log(`🎌 [AnimeAPI] Episodes response status: ${episodesResponse.status}`);

        if (!episodesResponse.data?.success || !episodesResponse.data?.results?.episodes) {
          console.log('🎌 [AnimeAPI] ❌ No episodes found');
          return res.status(200).json({ success: true, results: [] });
        }

        const episodes = episodesResponse.data.results.episodes;
        console.log(`🎌 [AnimeAPI] Found ${episodes.length} episodes`);
        const targetEpisode = episodes.find(ep => ep.number === episodeNumber) || episodes[0];

        console.log(`🎌 [AnimeAPI] Target episode: #${targetEpisode.number}, episode_no: ${targetEpisode.episode_no}`);

        // Étape 3: Récupérer le lien streaming
        console.log(`🎌 [AnimeAPI] === STEP 3: STREAM LINK ===`);
        // Use full episode ID from episode list (e.g. "attack-on-titan-112?ep=3303")
        const streamUrl = `${ANIME_API_BASE}/stream?id=${targetEpisode.id}&server=hd-2&type=sub`;
        console.log(`🎌 [AnimeAPI] Stream URL: ${streamUrl}`);
        const streamResponse = await axios.get(streamUrl, { timeout: 15000 });
        console.log(`🎌 [AnimeAPI] Stream response status: ${streamResponse.status}`);

        if (!streamResponse.data?.success || !streamResponse.data?.results?.streamingLink) {
          console.log('🎌 [AnimeAPI] ❌ No streaming link');
          return res.status(200).json({ success: true, results: [] });
        }

        const streamingLink = streamResponse.data.results.streamingLink;
        console.log(`🎌 [AnimeAPI] ✅ Got link:`, streamingLink.link?.file?.substring(0, 80));
        console.log('🎌 [AnimeAPI] ========== SUCCESS ==========');

        return res.status(200).json({
          success: true,
          results: [{
            provider: 'AnimeAPI',
            language: 'VO',
            quality: 'HD',
            url: streamingLink.link?.file || streamingLink.link,
            type: streamingLink.link?.type || streamingLink.type || 'hls',
            animeInfo: {
              id: anime.id,
              title: anime.title,
              episode: targetEpisode.number,
              totalEpisodes: anime.tvInfo?.eps || episodes.length
            }
          }]
        });

      } catch (error) {
        console.error('🎌 [AnimeAPI] ❌❌❌ ERROR:', error.message);
        console.error('🎌 [AnimeAPI] Stack:', error.stack);
        console.log('🎌 [AnimeAPI] ========== FAILED ==========');
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
            'Referer': 'https://gogoanime3.co/',
            'Origin': 'https://gogoanime3.co'
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
      res.status(response.status).json(response.data);
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
