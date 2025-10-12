import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { getVidzyM3u8Link } from "./vidzy-scraper";
import { extractVidSrcM3u8, vidsrcScraper } from "./vidsrc-scraper";
import { registerHLSProxyRoutes } from "./hls-proxy";

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

  // Enregistrer les routes proxy HLS pour les chaînes TV
  registerHLSProxyRoutes(app);

  const httpServer = createServer(app);

  return httpServer;
}
