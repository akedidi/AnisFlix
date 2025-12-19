import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { getVidzyM3u8Link } from "./vidzy-scraper";
import { extractVidSrcM3u8, vidsrcScraper } from "./vidsrc-scraper";
import { registerHLSProxyRoutes } from "./hls-proxy";
import axios from "axios";
import https from "https"; // Toujours utilisé pour d'autres routes
import { vixsrcScraper } from "./vixsrc-scraper";

export async function registerRoutes(app: Express): Promise<Server> {
  // put application routes here
  // prefix all routes with /api

  // ==========================================
  // SUBTITLE HELPER FUNCTIONS
  // ==========================================

  function srtToVtt(srtContent: string) {
    let vtt = "WEBVTT\n\n" + srtContent
      .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2")
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n");

    return vtt;
  }

  function applyOffset(content: string, offsetSeconds: number) {
    return content.replace(/(\d{2}):(\d{2}):(\d{2})[.,](\d{3})/g, (match, h, m, s, ms) => {
      const totalSeconds = parseInt(h) * 3600 + parseInt(m) * 60 + parseInt(s) + parseInt(ms) / 1000;
      const newTotalSeconds = Math.max(0, totalSeconds + offsetSeconds);

      const newH = Math.floor(newTotalSeconds / 3600);
      const newM = Math.floor((newTotalSeconds % 3600) / 60);
      const newS = Math.floor(newTotalSeconds % 60);
      const newMs = Math.round((newTotalSeconds % 1) * 1000);

      return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}:${String(newS).padStart(2, '0')}.${String(newMs).padStart(3, '0')}`;
    });
  }

  // Route proxy unifiée pour les médias (sous-titres, audio TV, etc.)
  app.get("/api/media-proxy", async (req, res) => {
    try {
      const { type, url, offset } = req.query;

      // Handle Subtitle specifically
      if (type === 'subtitle' && typeof url === 'string') {
        try {
          console.log(`[SUBTITLE PROXY] Fetching: ${url}`);
          const response = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            responseType: 'text'
          });

          let content = response.data;

          // Apply offset if needed
          if (offset) {
            const offsetSec = parseFloat(offset as string);
            if (!isNaN(offsetSec) && offsetSec !== 0) {
              content = applyOffset(content, offsetSec);
            }
          }

          // Convert to VTT if needed
          if (!content.trim().startsWith('WEBVTT')) {
            content = srtToVtt(content);
          }

          res.setHeader('Content-Type', 'text/vtt; charset=utf-8');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.send(content);
          return;
        } catch (err: any) {
          console.error('[SUBTITLE PROXY ERROR]', err.message);
          return res.status(500).send('Subtitle fetch failed');
        }
      }

      // ... other media handlers could go here if needed ...

      // TV Proxy handler (for Google Video, Bein Sports, etc.)
      if (typeof url === 'string') {
        const ALLOWED_HOSTS = ['fremtv.lol', 'directfr.lat', 'viamotionhsi.netplus.ch', 'simulcast-p.ftven.fr', 'cache1a.netplus.ch', 'cachehsi1a.netplus.ch', 'cachehsi1b.netplus.ch', 'cachehsi2b.netplus.ch', 'dcpv2eq7lu6ve.cloudfront.net', 'video.pscp.tv', '135.125.109.73', 'alkassdigital.net', 'ab.footballii.ir', 'py.dencreak.com', 'py.online-tv.biz', 'googlevideo.com', 'manifest.googlevideo.com', 'jitendraunatti.workers.dev', 'workers.dev'];

        const isAllowedUrl = (urlString: string): boolean => {
          try {
            const urlObj = new URL(urlString);
            return ALLOWED_HOSTS.some(host => urlObj.hostname === host || urlObj.hostname.endsWith('.' + host));
          } catch {
            return false;
          }
        };

        // Decode URL
        let cleanUrl = url;
        if (cleanUrl.toLowerCase().startsWith('http%')) {
          cleanUrl = decodeURIComponent(cleanUrl);
        }

        // Check for infinite loops
        if (cleanUrl.includes('/api/media-proxy?url=')) {
          return res.status(400).send('Infinite loop detected');
        }

        // Check if URL is allowed
        if (!isAllowedUrl(cleanUrl)) {
          return res.status(403).send('URL not allowed');
        }

        console.log(`[TV PROXY] Proxying: ${cleanUrl.substring(0, 80)}...`);

        try {
          // Function to rewrite playlist URLs
          const rewritePlaylistUrls = (playlistText: string, baseUrl: string): string => {
            return playlistText.split('\n').map((line) => {
              const t = line.trim();
              if (!t) return line;

              // Handle segment lines (not starting with #)
              if (!t.startsWith('#')) {
                const abs = t.startsWith('http') ? t : new URL(t, baseUrl).toString();
                return `/api/media-proxy?url=${encodeURIComponent(abs)}`;
              }

              // Handle #EXT-X-MEDIA URI tags (audio tracks)
              if (t.startsWith('#EXT-X-MEDIA:') && t.includes('URI=')) {
                const uriMatch = t.match(/URI="([^"]+)"/);
                if (uriMatch) {
                  const audioUrl = uriMatch[1];
                  const abs = audioUrl.startsWith('http') ? audioUrl : new URL(audioUrl, baseUrl).toString();
                  const proxifiedUrl = `/api/media-proxy?url=${encodeURIComponent(abs)}`;
                  return t.replace(/URI="[^"]+"/, `URI="${proxifiedUrl}"`);
                }
              }

              return line;
            }).join('\n');
          };

          // Determine if this is a playlist (M3U8/MPD) or segment
          // For Google Video: manifest URLs contain 'manifest.googlevideo.com' or 'hls_playlist'/'hls_variant'
          // Segment URLs contain 'videoplayback' and/or end with 'file/seg.ts' - they should be treated as binary streams
          // even if they contain '.m3u8' in their path (Google uses embedded paths like /playlist/index.m3u8/sq/1234/)
          const isGoogleVideoSegment = cleanUrl.includes('videoplayback') || cleanUrl.includes('file/seg.ts');
          const isGoogleVideoManifest = (cleanUrl.includes('manifest.googlevideo.com') ||
            cleanUrl.includes('hls_playlist') || cleanUrl.includes('hls_variant')) &&
            !isGoogleVideoSegment;
          const isPlaylist = !isGoogleVideoSegment && (cleanUrl.includes('.m3u8') || cleanUrl.includes('.mpd') ||
            isGoogleVideoManifest || cleanUrl.includes('workers.dev') ||
            cleanUrl.includes('dcpv2eq7lu6ve.cloudfront.net') || cleanUrl.includes('video.pscp.tv'));

          if (isPlaylist && !cleanUrl.endsWith('.js')) {
            // Fetch playlist
            const requestHeaders: Record<string, string> = {
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': '*/*'
            };

            const response = await axios.get(cleanUrl, {
              headers: requestHeaders,
              responseType: 'text',
              timeout: 15000,
              validateStatus: () => true
            });

            if (response.status >= 400) {
              console.error(`[TV PROXY] HTTP error: ${response.status}`);
              return res.status(response.status).send(`Remote error: ${response.status}`);
            }

            if (typeof response.data !== 'string') {
              return res.status(502).send('Invalid playlist');
            }

            // Get final URL after redirects
            const finalUrl = response.request?.res?.responseUrl || cleanUrl;

            // Rewrite URLs in playlist
            const rewrittenPlaylist = rewritePlaylistUrls(response.data, finalUrl);

            console.log(`[TV PROXY] Playlist rewritten successfully`);

            res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            return res.send(rewrittenPlaylist);
          } else {
            // Fetch segment (stream as binary)
            const headers: Record<string, string> = {
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': '*/*'
            };

            if (req.headers.range) {
              headers['Range'] = req.headers.range as string;
            }

            const response = await axios.get(cleanUrl, {
              headers,
              responseType: 'stream',
              timeout: 30000,
              validateStatus: () => true
            });

            if (response.status >= 400) {
              console.error(`[TV PROXY] Segment error: ${response.status}`);
              return res.status(response.status).send('Segment error');
            }

            // Propagate useful headers
            ['content-type', 'accept-ranges', 'content-range', 'cache-control'].forEach(h => {
              if (response.headers[h]) {
                res.setHeader(h, response.headers[h]);
              }
            });

            res.setHeader('Access-Control-Allow-Origin', '*');
            res.status(response.status);
            response.data.pipe(res);
            return;
          }
        } catch (err: any) {
          console.error('[TV PROXY ERROR]', err.message);
          return res.status(500).send(`Proxy error: ${err.message}`);
        }
      }

      return res.status(400).send('Invalid parameters or unsupported type');

    } catch (error: any) {
      console.error('[MEDIA PROXY ERROR]', error.message);
      res.status(500).send('Proxy error');
    }
  });

  // use storage to perform CRUD operations on the storage interface
  // e.g. storage.insertUser(user) or storage.getUserByUsername(username)

  // Route proxy unifiée pour l'API Movix (similaire à api/movix-proxy/index.js)
  app.get("/api/movix-proxy", async (req, res) => {
    try {
      const { path, ...queryParams } = req.query;

      if (!path) {
        return res.status(400).json({ error: 'Paramètre "path" manquant' });
      }

      // Décoder le path pour éviter le double encodage
      const decodedPath = decodeURIComponent(path as string);

      // Déterminer le type de requête pour améliorer les logs
      const isTmdbRequest = decodedPath.startsWith('tmdb/');
      const isAnimeRequest = decodedPath.startsWith('anime/search/');

      if (isTmdbRequest) {
        console.log(`🚀 [MOVIX TMDB] Fetching sources for: ${decodedPath}`);
      } else {
        console.log(`[MOVIX PROXY] Path: ${path}`);
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
          url.searchParams.append(key, String(value));
        }
      });

      if (isTmdbRequest) {
        console.log(`[MOVIX TMDB] URL: ${url.toString()}`);
      } else {
        console.log(`[MOVIX PROXY] Requête vers: ${url.toString()}`);
      }

      // Faire la requête vers Movix
      const response = await axios.get(url.toString(), {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
          'Referer': 'https://movix.site/',
          'Origin': 'https://movix.site',
        },
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

    } catch (error: any) {
      const isTmdbRequest = req.query.path && typeof req.query.path === 'string' && decodeURIComponent(req.query.path).startsWith('tmdb/');
      const errorPrefix = isTmdbRequest ? '[MOVIX TMDB ERROR]' : '[MOVIX PROXY ERROR]';

      console.error(errorPrefix, error.message);

      if (error.response) {
        console.error(errorPrefix, 'Détails:', error.response.data);
        res.status(error.response.status).json({
          error: isTmdbRequest ? 'Erreur proxy Movix TMDB' : 'Erreur proxy Movix',
          status: error.response.status,
          message: error.response.statusText,
          details: error.message
        });
      } else if (error.request) {
        console.error(errorPrefix, 'Pas de réponse du serveur Movix');
        res.status(502).json({
          error: isTmdbRequest ? 'Erreur réseau Movix TMDB' : 'Erreur réseau Movix',
          message: `Impossible de contacter l'API Movix${isTmdbRequest ? ' TMDB' : ''}`,
          details: error.message
        });
      } else {
        console.error(errorPrefix, 'Erreur:', error.message);
        res.status(500).json({
          error: isTmdbRequest ? 'Erreur serveur proxy Movix TMDB' : 'Erreur serveur proxy Movix',
          message: 'Erreur interne du serveur',
          details: error.message
        });
      }
    }
  });

  // Route proxy pour l'API Movix TMDB (pour compatibilité)
  // Utilise maintenant la route movix-proxy locale avec le paramètre path=tmdb
  app.get("/api/movix-tmdb", async (req, res) => {
    try {
      const { movieId } = req.query;

      if (!movieId) {
        return res.status(400).json({ error: 'movieId is required' });
      }

      console.log(`[MOVIX TMDB] Fetching sources for movie: ${movieId}`);

      // Utiliser le proxy local unifié avec le paramètre path
      const proxyUrl = `http://localhost:3000/api/movix-proxy?path=tmdb/movie/${movieId}`;
      console.log(`[MOVIX TMDB] Proxy URL locale: ${proxyUrl}`);

      const response = await axios.get(proxyUrl, {
        timeout: 15000,
        headers: {
          'Accept': 'application/json',
        }
      });

      console.log(`[MOVIX TMDB] Response status: ${response.status}`);

      res.json(response.data);

    } catch (error: any) {
      console.error(`[MOVIX TMDB] Error:`, error.message);

      if (error.response) {
        console.error(`[MOVIX TMDB] Error details:`, error.response.data);
        return res.status(error.response.status).json({
          error: 'Erreur API Movix TMDB via proxy',
          details: error.response.data
        });
      }

      return res.status(500).json({
        error: 'Erreur serveur lors de la récupération des sources Movix TMDB',
        details: error.message
      });
    }
  });

  // Route pour récupérer le lien m3u8 depuis Vidzy
  app.post("/api/vidzy/extract", async (req, res) => {
    try {
      const { url } = req.body;

      if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: 'URL Vidzy requise' });
      }

      if (!url.includes('vidzy.org')) {
        return res.status(400).json({ error: 'URL Vidzy invalide' });
      }

      const m3u8Link = await getVidzyM3u8Link(url);

      if (!m3u8Link) {
        return res.status(404).json({ error: 'Impossible d\'extraire le lien m3u8' });
      }

      res.json({ m3u8Url: m3u8Link });
    } catch (error) {
      console.error('Erreur lors de l\'extraction Vidzy:', error);
      res.status(500).json({ error: 'Erreur serveur lors de l\'extraction' });
    }
  });

  // Route unifiée pour l'extraction (utilisée par l'app native)
  app.post("/api/extract", async (req, res) => {
    try {
      const { type, url } = req.body;

      if (!type || !url) {
        return res.status(400).json({ error: 'Type et URL requis' });
      }

      console.log(`[EXTRACT] Extraction ${type} pour: ${url}`);

      let result;

      switch (type) {
        case 'vidzy':
          const m3u8Link = await getVidzyM3u8Link(url);
          if (!m3u8Link) {
            return res.status(404).json({ error: 'Impossible d\'extraire le lien m3u8' });
          }
          result = { m3u8Url: m3u8Link };
          break;

        case 'vidsrc':
          const vidsrcResult = await vidsrcScraper.extractStreamingLinks(url);
          if (!vidsrcResult.success) {
            return res.status(404).json({ error: 'Impossible d\'extraire les liens VidSrc' });
          }
          result = {
            success: true,
            players: vidsrcResult.players
          };
          break;

        default:
          return res.status(400).json({ error: 'Type d\'extraction non supporté' });
      }

      res.json(result);
    } catch (error) {
      console.error('Erreur lors de l\'extraction:', error);
      res.status(500).json({ error: 'Erreur serveur lors de l\'extraction' });
    }
  });

  // Route pour récupérer les sources Darkibox pour les films et séries via proxy Vercel
  app.get("/api/darkibox", async (req, res) => {
    try {
      const { seriesId, season, episode, movieId, url } = req.query;

      // Vérifier si c'est une requête avec paramètre url (mode proxy)
      if (url) {
        // Mode proxy - faire passer l'URL directement sans traitement supplémentaire
        try {
          const decodedUrl = decodeURIComponent(url as string);
          console.log(`[DARKIBOX PROXY] Mode proxy - URL: ${decodedUrl}`);
          console.log(`[DARKIBOX PROXY] Type de req.query: ${typeof req.query}, url query param: ${url}`);

          const response = await axios.get(decodedUrl, {
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Referer': 'https://darkibox.com/',
              'Accept': 'application/vnd.apple.mpegurl, application/x-mpegURL, application/octet-stream, */*',
              ...(req.headers.range && { 'Range': req.headers.range as string })
            },
            validateStatus: function (status) {
              return status < 500; // Accepter les codes < 500
            }
          });

          if (response.status === 403) {
            return res.status(404).json({ error: 'Accès refusé au stream' });
          }

          if (response.status !== 200) {
            return res.status(404).json({ error: `Erreur HTTP ${response.status}` });
          }

          // Si c'est une playlist M3U8, la réécrire pour proxifier les segments
          console.log(`[DARKIBOX PROXY] URL contient .m3u8: ${decodedUrl.includes('.m3u8')}, type response.data: ${typeof response.data}`);
          if (decodedUrl.includes('.m3u8') && typeof response.data === 'string') {
            let playlistContent = response.data;
            console.log(`[DARKIBOX PROXY] Playlist M3U8 détectée (${playlistContent.length} caractères)`);

            // Fonction pour proxifier une URL
            const proxifyUrl = (url: string) => {
              if (url.includes('anisflix.vercel.app') || url.includes('localhost:3000')) {
                return url;
              }
              return `/api/darkibox?url=${encodeURIComponent(url)}`;
            };

            // Réécrire les URLs dans les attributs URI="..." (pour les balises #EXT-X-MEDIA, etc.)
            playlistContent = playlistContent.replace(/URI="([^"]+\.(m3u8|ts)[^"]*)"/g, (match, url) => {
              return `URI="${proxifyUrl(url)}"`;
            });

            // Réécrire les URLs qui sont seules sur une ligne (segments .ts)
            playlistContent = playlistContent.replace(/^https?:\/\/[^\s]+\.ts[^\s]*$/gm, proxifyUrl);

            // Réécrire les URLs qui sont seules sur une ligne (playlists .m3u8)
            playlistContent = playlistContent.replace(/^https?:\/\/[^\s]+\.m3u8[^\s]*$/gm, proxifyUrl);

            console.log(`[DARKIBOX PROXY] Playlist M3U8 réécrite avec proxy`);

            // Retourner la playlist modifiée
            res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
            res.setHeader('Cache-Control', 'no-cache');
            res.end(playlistContent);
            return;
          }

          // Pour les autres types de contenu (segments TS, etc.), faire un proxy direct
          res.setHeader('Content-Type', response.headers['content-type'] || 'application/vnd.apple.mpegurl');
          if (response.headers['content-length']) {
            res.setHeader('Content-Length', response.headers['content-length']);
          }
          if (response.headers['accept-ranges']) {
            res.setHeader('Accept-Ranges', response.headers['accept-ranges']);
          }
          if (req.headers.range) {
            res.status(206); // Partial Content
          }

          // Si c'est un stream, utiliser pipe, sinon envoyer directement
          if (response.data.pipe) {
            response.data.pipe(res);
          } else {
            res.end(response.data);
          }
          return;
        } catch (error: any) {
          console.error(`[DARKIBOX PROXY] Erreur:`, error.message);
          return res.status(500).json({ error: 'Erreur lors du proxy' });
        }
      }

      // Déterminer si c'est un film ou une série
      const isMovie = !!movieId;
      const isSeries = !!seriesId && !!season && !!episode;

      if (!isMovie && !isSeries) {
        return res.status(400).json({
          error: 'movieId, (seriesId, season, episode) ou url sont requis'
        });
      }

      const id = isMovie ? movieId : seriesId;
      console.log(`[DARKIBOX] Mode ${isMovie ? 'film' : 'série'} - ID: ${id}`);

      // Utiliser le proxy local
      let proxyUrl;
      if (isMovie) {
        proxyUrl = `http://localhost:3000/api/movix-proxy?path=films/download/${id}`;
      } else {
        proxyUrl = `http://localhost:3000/api/movix-proxy?path=series/download/${id}/season/${season}/episode/${episode}`;
      }

      console.log(`[DARKIBOX] Proxy URL: ${proxyUrl}`);

      const response = await axios.get(proxyUrl, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache'
        }
      });

      console.log(`[DARKIBOX] Réponse proxy:`, response.status, response.data);

      // Si l'API Movix retourne une erreur ou pas de sources, retourner une réponse vide
      if (!response.data || !response.data.sources || response.data.sources.length === 0) {
        console.log(`[DARKIBOX] Aucune source trouvée pour ${isMovie ? 'film' : 'série'} ${id}`);
        return res.json({
          success: true,
          sources: [],
          total: 0,
          message: 'Aucune source Darkibox disponible pour ce contenu'
        });
      }

      // Filtrer et formater les sources
      const sources = response.data.sources.map((source, index) => ({
        id: `darkibox-${isMovie ? 'movie' : 'series'}-${index + 1}`,
        src: source.src,
        language: source.language,
        quality: source.quality,
        m3u8: source.m3u8,
        provider: 'darkibox',
        type: isMovie ? 'movie' : 'series'
      }));

      console.log(`[DARKIBOX] ${sources.length} sources trouvées pour le ${isMovie ? 'film' : 'série'}`);

      const responseData: any = {
        success: true,
        sources: sources,
        total: sources.length
      };

      if (isMovie) {
        responseData.movieId = parseInt(movieId as string);
      } else {
        responseData.seriesId = parseInt(seriesId as string);
        responseData.season = parseInt(season as string);
        responseData.episode = parseInt(episode as string);
      }

      return res.status(200).json(responseData);

    } catch (error: any) {
      console.error(`[DARKIBOX SERIES] Erreur:`, error.message);

      if (error.response) {
        console.error(`[DARKIBOX SERIES] Détails erreur:`, error.response.data);

        // Si l'API Movix retourne une erreur 500, retourner une réponse vide au lieu d'une erreur
        if (error.response.status === 500) {
          console.log(`[DARKIBOX] API Movix indisponible, retour d'une réponse vide`);
          return res.json({
            success: true,
            sources: [],
            total: 0,
            message: 'API Movix temporairement indisponible'
          });
        }

        return res.status(error.response.status).json({
          error: 'Erreur API Movix via proxy',
          details: error.response.data
        });
      }

      return res.status(500).json({
        error: 'Erreur serveur lors de la récupération des sources Darkibox',
        details: error.message
      });
    }
  });

  // Route pour récupérer le lien m3u8 depuis Darkibox
  app.post("/api/darkibox", async (req, res) => {
    try {
      const { m3u8Url, action = 'scrape' } = req.body;

      if (!m3u8Url || typeof m3u8Url !== 'string') {
        return res.status(400).json({ error: 'URL m3u8 Darkibox requise' });
      }

      if (!m3u8Url.includes('darkibox.com')) {
        return res.status(400).json({ error: 'URL Darkibox invalide' });
      }

      console.log(`[DARKIBOX] Mode scraping - URL: ${m3u8Url}, Action: ${action}`);

      // Récupérer le contenu de la playlist m3u8
      const response = await axios.get(m3u8Url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://darkibox.com/'
        }
      });

      const playlistContent = response.data;

      if (!playlistContent || !playlistContent.includes('#EXTM3U')) {
        return res.status(404).json({
          error: 'Contenu de playlist m3u8 invalide'
        });
      }

      // Extraire les informations de la playlist
      const lines = playlistContent.split('\n');
      const streamInfo = lines.find(line => line.includes('#EXT-X-STREAM-INF'));
      const streamUrl = lines.find(line => line.startsWith('https://') && line.includes('.m3u8'));

      if (!streamUrl) {
        return res.status(404).json({
          error: 'Impossible de trouver l\'URL de stream dans la playlist'
        });
      }

      // Extraire les métadonnées si disponibles
      let bandwidth = null;
      let resolution = null;
      let codecs = null;

      if (streamInfo) {
        const bandwidthMatch = streamInfo.match(/BANDWIDTH=(\d+)/);
        const resolutionMatch = streamInfo.match(/RESOLUTION=(\d+x\d+)/);
        const codecsMatch = streamInfo.match(/CODECS="([^"]+)"/);

        bandwidth = bandwidthMatch ? parseInt(bandwidthMatch[1]) : null;
        resolution = resolutionMatch ? resolutionMatch[1] : null;
        codecs = codecsMatch ? codecsMatch[1] : null;
      }

      console.log(`[DARKIBOX] Stream URL extraite: ${streamUrl}`);

      return res.status(200).json({
        success: true,
        streamUrl: streamUrl,
        originalUrl: m3u8Url,
        metadata: {
          bandwidth,
          resolution,
          codecs
        },
        source: 'darkibox'
      });

    } catch (error: any) {
      console.error(`[DARKIBOX SCRAPING] Erreur:`, error.message);

      if (error.response) {
        return res.status(error.response.status).json({
          error: 'Erreur lors de la récupération de la playlist',
          details: error.response.statusText
        });
      }

      return res.status(500).json({
        error: 'Erreur serveur lors du scraping Darkibox',
        details: error.message
      });
    }
  });

  // Route proxy pour les URLs Darkibox m3u8
  app.get("/api/darkibox-proxy", async (req, res) => {
    try {
      const { url } = req.query;

      if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: 'URL Darkibox requise' });
      }

      // Décoder l'URL si elle est encodée
      let decodedUrl = decodeURIComponent(url);

      // Vérifier si l'URL contient déjà le chemin du proxy (double encodage)
      if (decodedUrl.includes('/api/darkibox-proxy')) {
        // Extraire l'URL Darkibox du paramètre url
        const urlMatch = decodedUrl.match(/[?&]url=([^&]+)/);
        if (urlMatch) {
          decodedUrl = decodeURIComponent(urlMatch[1]);
        }
      }

      if (!decodedUrl.includes('darkibox.com')) {
        return res.status(400).json({ error: 'URL Darkibox invalide' });
      }

      console.log(`[DARKIBOX PROXY] Proxying URL: ${decodedUrl}`);

      const response = await axios.get(decodedUrl, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/vnd.apple.mpegurl, application/x-mpegurl, */*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache'
        },
        httpsAgent: new https.Agent({ rejectUnauthorized: false })
      });

      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      res.send(response.data);

    } catch (error: any) {
      console.error(`[DARKIBOX PROXY] Erreur:`, error.message);

      res.status(500).json({
        error: 'Erreur serveur lors du proxy Darkibox',
        details: error.message
      });
    }
  });


  // Route pour récupérer le lien m3u8 depuis VidSrc
  app.post("/api/vidsrc/extract", async (req, res) => {
    try {
      const { url } = req.body;

      if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: 'URL VidSrc requise' });
      }

      if (!url.includes('vidsrc.io')) {
        return res.status(400).json({ error: 'URL VidSrc invalide' });
      }

      const result = await vidsrcScraper.extractStreamingLinks(url);

      if (!result.success) {
        return res.status(404).json({
          error: result.error || 'Impossible d\'extraire les liens de streaming'
        });
      }

      res.json({
        success: true,
        m3u8Url: result.m3u8Url,
        players: result.players
      });
    } catch (error) {
      console.error('Erreur lors de l\'extraction VidSrc:', error);
      res.status(500).json({ error: 'Erreur serveur lors de l\'extraction' });
    }
  });

  // Route pour extraire directement le m3u8 depuis Vixsrc
  app.post("/api/vixsrc/extract", async (req, res) => {
    try {
      const { tmdbId, mediaType, season, episode } = req.body;

      if (!tmdbId || !mediaType) {
        return res.status(400).json({ error: 'Paramètres manquants (tmdbId, mediaType)' });
      }

      console.log(`[VIXSRC EXTRACT] Extraction pour ${mediaType} ${tmdbId}`);

      const streams = await vixsrcScraper.getStreams(
        String(tmdbId),
        mediaType as 'movie' | 'tv',
        season ? Number(season) : null,
        episode ? Number(episode) : null
      );

      if (!streams || streams.length === 0) {
        return res.status(404).json({ error: 'Aucun stream trouvé' });
      }

      // Retourner le premier stream (Auto quality)
      const stream = streams[0];
      console.log(`[VIXSRC EXTRACT] Stream trouvé: ${stream.url.substring(0, 50)}...`);

      res.json({
        success: true,
        m3u8Url: stream.url,
        source: 'vixsrc'
      });

    } catch (error: any) {
      console.error('Erreur lors de l\'extraction Vixsrc:', error.message);
      res.status(500).json({ error: `Erreur serveur: ${error.message}` });
    }
  });

  // Route locale pour tester l'extraction VidMoly (utilisée par le player en dev)
  app.post("/api/vidmoly-test", async (req, res) => {
    try {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      const { url } = req.body as { url?: string };
      if (!url || typeof url !== "string") {
        return res.status(400).json({ success: false, error: "URL VidMoly requise" });
      }

      const normalizedUrl = url.replace("vidmoly.to", "vidmoly.net");

      // Récupérer la page directement côté serveur (pas de CORS)
      const response = await axios.get(normalizedUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
          "Accept-Encoding": "gzip, deflate, br",
          Connection: "keep-alive",
          "Upgrade-Insecure-Requests": "1",
          Referer: normalizedUrl,
        },
        timeout: 15000,
        maxRedirects: 5,
      });

      const html: string = response.data ?? "";

      const patterns: RegExp[] = [
        /player\.setup\s*\(\s*\{[^}]*sources:\s*\[\s*\{\s*file:\s*["']([^"']+)["']/, // player.setup first source
        /sources:\s*\[\s*\{\s*file:\s*"([^"]+)"\s*\}/, // sources: [{file:"..."}]
        /sources:\s*\[\s*\{\s*file:\s*'([^']+)'\s*\}/, // sources: [{file:'...'}]
        /https?:\/\/[^"'\s]+\.m3u8[^"'\s]*/, // generic m3u8
      ];

      let m3u8Url: string | null = null;
      for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match) {
          const raw = match[1] || match[0];
          m3u8Url = raw.replace(/\\/g, "").trim();
          break;
        }
      }

      if (!m3u8Url) {
        return res.status(200).json({ success: true, m3u8Url: null, source: "vidmoly" });
      }

      return res.status(200).json({ success: true, m3u8Url, source: "vidmoly", originalUrl: url });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error?.message || "Erreur VidMoly" });
    }
  });

  // Route pour extraire directement le m3u8 depuis VidSrc
  app.post("/api/vidsrc/m3u8", async (req, res) => {
    try {
      const { url } = req.body;

      if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: 'URL VidSrc requise' });
      }

      if (!url.includes('vidsrc.io')) {
        return res.status(400).json({ error: 'URL VidSrc invalide' });
      }

      const m3u8Link = await extractVidSrcM3u8(url);

      if (!m3u8Link) {
        return res.status(404).json({ error: 'Impossible d\'extraire le lien m3u8' });
      }

      res.json({ m3u8Url: m3u8Link });
    } catch (error) {
      console.error('Erreur lors de l\'extraction m3u8 VidSrc:', error);
      res.status(500).json({ error: 'Erreur serveur lors de l\'extraction' });
    }
  });

  // Proxy VidMoly (playlist m3u8 et segments)
  app.get('/api/vidmoly-proxy', async (req, res) => {
    try {
      let url = String(req.query.url || '');
      const referer = String(req.query.referer || 'https://vidmoly.net/');

      // Décoder l'URL si elle est sur-encodée
      while (url.includes('%25')) {
        url = decodeURIComponent(url);
        console.log('🔍 [VIDMOLY PROXY] Décodage URL:', url);
      }

      if (!url || !url.startsWith('http')) {
        return res.status(400).json({ error: 'Paramètre url invalide' });
      }

      // Détection playlist vs segments
      const upstreamHead = await axios.get(url, {
        responseType: 'arraybuffer',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/vnd.apple.mpegurl, application/x-mpegurl, */*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Referer': referer,
          'Origin': 'https://vidmoly.net',
          'Connection': 'keep-alive',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
        timeout: 15000,
        maxRedirects: 5,
        validateStatus: () => true,
      });

      const contentType = String(upstreamHead.headers['content-type'] || '');
      res.setHeader('Access-Control-Allow-Origin', '*');

      const isM3U8 = contentType.toLowerCase().includes('mpegurl') || url.toLowerCase().includes('.m3u8');

      if (isM3U8) {
        // Lire en texte et réécrire les URLs vers le proxy
        const text = Buffer.from(upstreamHead.data).toString('utf8');
        const base = new URL(url);
        const origin = `${req.protocol}://${req.get('host')}`;
        const lines = text.split(/\r?\n/);
        const rewritten = lines.map((line) => {
          if (!line || line.startsWith('#')) return line;
          try {
            const resolved = new URL(line, base).toString();
            const proxied = `${origin}/api/vidmoly-proxy?url=${encodeURIComponent(resolved)}&referer=${encodeURIComponent(referer)}`;
            return proxied;
          } catch {
            return line;
          }
        }).join('\n');
        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
        res.setHeader('Cache-Control', upstreamHead.headers['cache-control'] ? String(upstreamHead.headers['cache-control']) : 'no-cache');
        return res.status(upstreamHead.status).send(rewritten);
      }

      // Flux binaire (segments TS/CMF etc.)
      const upstreamStream = await axios.get(url, {
        responseType: 'stream',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': '*/*',
          'Referer': referer,
          'Origin': 'https://vidmoly.net',
          'Connection': 'keep-alive',
        },
        timeout: 15000,
        maxRedirects: 5,
      });
      if (upstreamStream.headers['content-type']) res.setHeader('Content-Type', String(upstreamStream.headers['content-type']));
      if (upstreamStream.headers['cache-control']) res.setHeader('Cache-Control', String(upstreamStream.headers['cache-control']));
      upstreamStream.data.pipe(res);
    } catch (err: any) {
      const status = err?.response?.status || 500;
      res.status(status).json({ error: 'Proxy error', details: err?.message || 'unknown' });
    }
  });

  // Route VidMoly pour compatibilité avec Vercel
  app.get('/api/vidmoly', async (req, res) => {
    try {
      const url = String(req.query.url || '');
      const referer = String(req.query.referer || 'https://vidmoly.net/');

      if (!url || !url.startsWith('http')) {
        return res.status(400).json({ error: 'Paramètre url invalide' });
      }

      // Rediriger vers la route vidmoly-proxy existante
      const proxyUrl = `/api/vidmoly-proxy?url=${encodeURIComponent(url)}&referer=${encodeURIComponent(referer)}`;
      return res.redirect(proxyUrl);
    } catch (err: any) {
      res.status(500).json({ error: 'VidMoly proxy error', details: err?.message || 'unknown' });
    }
  });

  // Route VidMoly POST pour l'extraction
  app.post('/api/vidmoly', async (req, res) => {
    try {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      const { url, method = 'auto' } = req.body;

      if (!url || typeof url !== 'string') {
        return res.status(400).json({ success: false, error: 'URL VidMoly requise' });
      }

      if (!url.includes('vidmoly.net') && !url.includes('vidmoly.to') && !url.includes('vidmoly.me')) {
        return res.status(400).json({ success: false, error: 'URL VidMoly invalide' });
      }

      // Normaliser l'URL vers vidmoly.net
      let normalizedUrl = url;
      if (url.includes('vidmoly.to')) {
        normalizedUrl = url.replace("vidmoly.to", "vidmoly.net");
      } else if (url.includes('vidmoly.me')) {
        normalizedUrl = url.replace("vidmoly.me", "vidmoly.net");
      }

      // Récupérer la page directement côté serveur (pas de CORS)
      const response = await axios.get(normalizedUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
          "Accept-Encoding": "gzip, deflate, br",
          Connection: "keep-alive",
          "Upgrade-Insecure-Requests": "1",
          Referer: normalizedUrl,
        },
        timeout: 15000,
        maxRedirects: 10, // Augmenter le nombre de redirections
        validateStatus: (status) => status < 400, // Accepter les redirections
      });

      const html: string = response.data ?? "";

      // Debug: afficher un extrait du HTML pour comprendre la structure
      console.log(`[VIDMOLY] HTML reçu (${html.length} caractères)`);
      console.log(`[VIDMOLY] Extrait HTML:`, html.substring(0, 1000));

      // Vérifier si c'est une page de redirection VidMoly
      if (html.includes('meta http-equiv=\'refresh\'') && html.includes('cdn.staticmoly.me')) {
        console.log(`[VIDMOLY] Page de redirection détectée, extraction de l'URL de redirection...`);

        // Extraire l'URL de redirection
        const redirectMatch = html.match(/content='0;URL=([^']+)'/);
        if (redirectMatch && redirectMatch[1]) {
          const redirectUrl = redirectMatch[1];
          console.log(`[VIDMOLY] Redirection vers: ${redirectUrl}`);

          // Suivre la redirection
          try {
            const redirectResponse = await axios.get(redirectUrl, {
              headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
                "Referer": normalizedUrl,
              },
              timeout: 15000,
              maxRedirects: 5,
            });

            const redirectedHtml = redirectResponse.data ?? "";
            console.log(`[VIDMOLY] HTML après redirection (${redirectedHtml.length} caractères)`);
            console.log(`[VIDMOLY] Extrait HTML après redirection:`, redirectedHtml.substring(0, 1000));

            // Utiliser le HTML de la redirection pour l'extraction
            const finalHtml = redirectedHtml;

            // Continuer avec l'extraction sur le HTML final
            const patterns: RegExp[] = [
              // Patterns VidMoly modernes
              /player\.setup\s*\(\s*\{[^}]*sources:\s*\[\s*\{\s*file:\s*["']([^"']+)["']/, // player.setup first source
              /sources:\s*\[\s*\{\s*file:\s*"([^"]+)"\s*\}/, // sources: [{file:"..."}]
              /sources:\s*\[\s*\{\s*file:\s*'([^']+)'\s*\}/, // sources: [{file:'...'}]
              /file:\s*["']([^"']*\.m3u8[^"']*)["']/, // file: "url.m3u8"
              /src:\s*["']([^"']*\.m3u8[^"']*)["']/, // src: "url.m3u8"
              /url:\s*["']([^"']*\.m3u8[^"']*)["']/, // url: "url.m3u8"
              /https?:\/\/[^"'\s]+\.m3u8[^"'\s]*/, // generic m3u8
              // Patterns pour VidMoly spécifiques
              /box-\d+-[^"'\s]+\.m3u8[^"'\s]*/, // box-xxx-xxx.m3u8
              /https?:\/\/box-[^"'\s]+\.m3u8[^"'\s]*/, // https://box-xxx.m3u8
            ];

            let m3u8Url: string | null = null;
            for (const pattern of patterns) {
              const match = finalHtml.match(pattern);
              if (match) {
                const raw = match[1] || match[0];
                m3u8Url = raw.replace(/\\/g, "").trim();
                console.log(`[VIDMOLY] M3u8 trouvé avec pattern: ${m3u8Url}`);
                break;
              }
            }

            if (!m3u8Url) {
              return res.status(200).json({ success: true, m3u8Url: null, source: "vidmoly" });
            }

            return res.status(200).json({
              success: true,
              m3u8Url,
              method: 'extracted_real',
              source: "vidmoly",
              originalUrl: url
            });

          } catch (redirectError) {
            console.error(`[VIDMOLY] Erreur lors de la redirection:`, redirectError);
            return res.status(200).json({ success: true, m3u8Url: null, source: "vidmoly" });
          }
        }
      }

      const patterns: RegExp[] = [
        // Patterns VidMoly modernes
        /player\.setup\s*\(\s*\{[^}]*sources:\s*\[\s*\{\s*file:\s*["']([^"']+)["']/, // player.setup first source
        /sources:\s*\[\s*\{\s*file:\s*"([^"]+)"\s*\}/, // sources: [{file:"..."}]
        /sources:\s*\[\s*\{\s*file:\s*'([^']+)'\s*\}/, // sources: [{file:'...'}]
        /file:\s*["']([^"']*\.m3u8[^"']*)["']/, // file: "url.m3u8"
        /src:\s*["']([^"']*\.m3u8[^"']*)["']/, // src: "url.m3u8"
        /url:\s*["']([^"']*\.m3u8[^"']*)["']/, // url: "url.m3u8"
        /https?:\/\/[^"'\s]+\.m3u8[^"'\s]*/, // generic m3u8
        // Patterns pour VidMoly spécifiques
        /box-\d+-[^"'\s]+\.m3u8[^"'\s]*/, // box-xxx-xxx.m3u8
        /https?:\/\/box-[^"'\s]+\.m3u8[^"'\s]*/, // https://box-xxx.m3u8
      ];

      let m3u8Url: string | null = null;
      for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match) {
          const raw = match[1] || match[0];
          m3u8Url = raw.replace(/\\/g, "").trim();
          break;
        }
      }

      if (!m3u8Url) {
        return res.status(200).json({ success: true, m3u8Url: null, source: "vidmoly" });
      }

      return res.status(200).json({
        success: true,
        m3u8Url,
        method: 'extracted_real',
        source: "vidmoly",
        originalUrl: url
      });
    } catch (error: any) {
      console.error('Erreur extraction VidMoly:', error);
      return res.status(500).json({
        success: false,
        error: error?.message || "Erreur VidMoly"
      });
    }
  });

  // Enregistrer les routes proxy HLS pour les chaînes TV
  registerHLSProxyRoutes(app);

  // Route proxy pour les sous-titres (SRT -> VTT)
  app.get("/api/subtitle-proxy", async (req, res) => {
    try {
      const { url } = req.query;

      if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: 'URL requise' });
      }

      console.log(`[SUBTITLE PROXY] Fetching and converting: ${url}`);

      const response = await axios.get(url, {
        responseType: 'text',
        timeout: 10000
      });

      const srtContent = response.data;

      // Convert SRT to VTT
      // Simple conversion: Replace commas with dots in timestamps and add WEBVTT header
      let vttContent = "WEBVTT\n\n" + srtContent
        .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2")
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n");

      res.setHeader('Content-Type', 'text/vtt');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.send(vttContent);

    } catch (error: any) {
      console.error(`[SUBTITLE PROXY] Erreur:`, error.message);
      res.status(500).json({ error: 'Erreur lors du proxy des sous-titres' });
    }
  });

  const httpServer = createServer(app);

  // Route pour Vixsrc Scraper
  app.get("/api/vixsrc", async (req, res) => {
    try {
      const { tmdbId, type, season, episode } = req.query;

      if (!tmdbId || !type) {
        return res.status(400).json({ error: 'Paramètres manquants (tmdbId, type)' });
      }

      console.log(`🚀 [VIXSRC API] Request: ${type} ${tmdbId} S${season}E${episode}`);

      const streams = await vixsrcScraper.getStreams(
        tmdbId as string,
        type as 'movie' | 'tv',
        season ? parseInt(season as string) : null,
        episode ? parseInt(episode as string) : null
      );

      res.json({ success: true, streams });

    } catch (error: any) {
      console.error('[VIXSRC API] Error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Route proxy pour Vixsrc - Supporte aussi /api/vixsrc-proxy/master.m3u8 pour Chromecast
  app.get(["/api/vixsrc-proxy", "/api/vixsrc-proxy/:filename"], async (req, res) => {
    try {
      const { url } = req.query;

      if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: 'URL Vixsrc requise' });
      }

      // Décoder l'URL si elle est encodée
      let decodedUrl = decodeURIComponent(url);

      // Vérifier si l'URL contient déjà le chemin du proxy (double encodage)
      if (decodedUrl.includes('/api/vixsrc-proxy')) {
        const urlMatch = decodedUrl.match(/[?&]url=([^&]+)/);
        if (urlMatch) {
          decodedUrl = decodeURIComponent(urlMatch[1]);
        }
      }

      // Debug intensif pour Chromecast
      console.log(`[VIXSRC PROXY] Requesting URL: ${decodedUrl}`);
      console.log(`[VIXSRC PROXY] Incoming Headers:`, {
        range: req.headers.range,
        userAgent: req.headers['user-agent'],
        origin: req.headers.origin,
        host: req.headers.host,
        accept: req.headers.accept
      });

      const headers: any = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://vixsrc.to/',
        'Origin': 'https://vixsrc.to',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'identity', // Force uncompressed response for arraybuffer
        'Cache-Control': 'no-cache'
      };

      if (req.headers.range) {
        console.log(`[VIXSRC PROXY] Forwarding Range: ${req.headers.range}`);
        headers['Range'] = req.headers.range;
      }

      const response = await axios.get(decodedUrl, {
        responseType: 'arraybuffer', // Important pour les segments binaires
        timeout: 15000,
        headers: headers,
        validateStatus: () => true // Accepter tous les status codes
      });

      console.log(`[VIXSRC PROXY] Response status: ${response.status}`);
      console.log(`[VIXSRC PROXY] Response headers:`, {
        contentType: response.headers['content-type'],
        contentLength: response.headers['content-length'],
        contentRange: response.headers['content-range'],
        acceptRanges: response.headers['accept-ranges']
      });

      if (response.status >= 400) {
        console.error(`[VIXSRC PROXY] Error from upstream: ${response.status}`);
        return res.status(response.status).send(response.data);
      }

      // Copier les headers pertinents
      const contentType = response.headers['content-type'];
      const isM3U8 = (contentType && contentType.includes('mpegurl')) || decodedUrl.includes('.m3u8');

      if (contentType) res.setHeader('Content-Type', contentType);

      // IMPORTANT: Ne PAS copier Content-Length pour les playlists M3U8 car on va les réécrire (taille modifiée)
      // On ne copie les headers de taille/range que pour les segments binaires
      if (!isM3U8) {
        if (response.headers['content-length']) {
          res.setHeader('Content-Length', response.headers['content-length']);
        }
        if (response.headers['content-range']) {
          res.setHeader('Content-Range', response.headers['content-range']);
        }
        if (response.headers['accept-ranges']) {
          res.setHeader('Accept-Ranges', response.headers['accept-ranges']);
        }
      }

      // IMPORTANT: CORS pour Chromecast - Headers étendus
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS, HEAD');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range, Authorization');
      res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Content-Type, Accept-Ranges');

      console.log(`[VIXSRC PROXY] isM3U8 detected: ${isM3U8}`);

      if (isM3U8) {
        console.log(`[VIXSRC PROXY] Processing M3U8 playlist`);
        let playlist = response.data.toString('utf-8');

        // Log preview of original playlist
        console.log(`[VIXSRC PROXY] Original playlist start: ${playlist.substring(0, 50).replace(/\n/g, '\\n')}`);

        // Tenter d'obtenir l'URL finale pour résoudre correctement les liens relatifs (redirections)
        let finalUrl = decodedUrl;
        // @ts-ignore - Accès aux propriétés internes d'Axios/Node pour récupérer l'URL finale après redirects
        if (response.request && response.request.res && response.request.res.responseUrl) {
          finalUrl = response.request.res.responseUrl;
          console.log(`[VIXSRC PROXY] Redirect detected. Base URL updated to: ${finalUrl}`);
        }

        const baseUrl = new URL(finalUrl);
        const origin = `${req.protocol}://${req.get('host')}`;

        // Réécrire les URLs
        const lines = playlist.split(/\r?\n/);
        const rewritten = lines.map((line: string) => {
          // 1. Gérer les lignes qui sont des URLs directes (segments, playlists variantes)
          if (line && !line.trim().startsWith('#')) {
            try {
              const absoluteUrl = new URL(line, baseUrl).toString();
              return `${origin}/api/vixsrc-proxy/playlist.m3u8?url=${encodeURIComponent(absoluteUrl)}`;
            } catch (e) {
              return line;
            }
          }

          // 2. Gérer les attributs URI="..." dans les tags (ex: #EXT-X-MEDIA:...,URI="...")
          if (line && line.trim().startsWith('#') && line.includes('URI="')) {
            return line.replace(/URI="([^"]+)"/g, (match, uri) => {
              try {
                const absoluteUrl = new URL(uri, baseUrl).toString();
                return `URI="${origin}/api/vixsrc-proxy/playlist.m3u8?url=${encodeURIComponent(absoluteUrl)}"`;
              } catch (e) {
                return match;
              }
            });
          }

          return line;
        }).join('\n');

        // Log preview of rewritten playlist
        console.log(`[VIXSRC PROXY] Rewritten playlist start: ${rewritten.substring(0, 50).replace(/\n/g, '\\n')}`);

        res.send(rewritten);
      } else {
        // Pour les segments TS ou autres, envoyer directement
        console.log(`[VIXSRC PROXY] Proxying binary data (${response.data.length} bytes) - status: ${response.status}`);
        res.status(response.status).send(response.data);
      }

    } catch (error: any) {
      console.error(`[VIXSRC PROXY] Exception:`, error.message);
      res.status(500).json({ error: 'Erreur proxy Vixsrc', details: error.message });
    }
  });

  return httpServer;
}
