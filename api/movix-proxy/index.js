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

      return [{
        name: "Vixsrc",
        title: "Auto Quality Stream",
        url: masterPlaylistUrl,
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
            'User-Agent': proxyHeaders['User-Agent'] || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
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

        // Pipe le stream vers la réponse
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
    if (isAnimeRequest) {
      movixUrl = `https://api.movix.site/${decodedPath}`;
    } else {
      movixUrl = `https://api.movix.site/api/${decodedPath}`;
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
