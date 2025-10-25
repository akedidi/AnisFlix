import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { getVidzyM3u8Link } from "./vidzy-scraper";
import { extractVidSrcM3u8, vidsrcScraper } from "./vidsrc-scraper";
import { registerHLSProxyRoutes } from "./hls-proxy";
import axios from "axios";
import https from "https";

export async function registerRoutes(app: Express): Promise<Server> {
  // put application routes here
  // prefix all routes with /api

  // use storage to perform CRUD operations on the storage interface
  // e.g. storage.insertUser(user) or storage.getUserByUsername(username)

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

  // Route pour récupérer les sources Darkibox pour les films et séries via proxy Vercel
  app.get("/api/darkibox", async (req, res) => {
    try {
      const { seriesId, season, episode, movieId } = req.query;

      // Déterminer si c'est un film ou une série
      const isMovie = !!movieId;
      const isSeries = !!seriesId && !!season && !!episode;

      if (!isMovie && !isSeries) {
        return res.status(400).json({ 
          error: 'movieId ou (seriesId, season, episode) sont requis' 
        });
      }

      const id = isMovie ? movieId : seriesId;
      console.log(`[DARKIBOX] Mode ${isMovie ? 'film' : 'série'} - ID: ${id}`);

      // Utiliser le proxy Vercel pour contourner le blocage
      const proxyUrl = `https://anisflix.vercel.app/api/movix-proxy?path=films/download/${id}`;
      
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

      if (!response.data || !response.data.sources || response.data.sources.length === 0) {
        return res.status(404).json({ 
          error: 'Aucune source Darkibox trouvée pour cette série' 
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

    } catch (error) {
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
      
      if (!url.includes('darkibox.com')) {
        return res.status(400).json({ error: 'URL Darkibox invalide' });
      }
      
      console.log(`[DARKIBOX PROXY] Proxying URL: ${url}`);
      
      const response = await axios.get(url, {
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

      if (!url.includes('vidmoly.net') && !url.includes('vidmoly.to')) {
        return res.status(400).json({ success: false, error: 'URL VidMoly invalide' });
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

  const httpServer = createServer(app);

  return httpServer;
}
