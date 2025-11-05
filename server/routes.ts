import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { getVidzyM3u8Link } from "./vidzy-scraper";
import { extractVidSrcM3u8, vidsrcScraper } from "./vidsrc-scraper";
import { registerHLSProxyRoutes } from "./hls-proxy";
import axios from "axios";

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
      const url = String(req.query.url || '');
      const referer = String(req.query.referer || 'https://vidmoly.net/');
      if (!url || !url.startsWith('http')) {
        return res.status(400).json({ error: 'Paramètre url invalide' });
      }

      // Détection playlist vs segments
      const upstreamHead = await axios.get(url, {
        responseType: 'arraybuffer',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': '*/*',
          'Referer': referer,
          'Origin': 'https://vidmoly.net',
          'Connection': 'keep-alive',
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

  // Enregistrer les routes proxy HLS pour les chaînes TV
  registerHLSProxyRoutes(app);

  const httpServer = createServer(app);

  return httpServer;
}
