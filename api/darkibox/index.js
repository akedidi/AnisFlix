import axios from 'axios';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, HEAD, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // ===== MODE PROXY (GET/HEAD) =====
  if (req.method === 'GET' || req.method === 'HEAD') {
    try {
      const { url, action } = req.query;

      if (!url) {
        return res.status(400).json({ error: 'URL requise' });
      }

      const targetUrl = decodeURIComponent(url);
      
      console.log(`[DARKIBOX] Mode proxy - URL: ${targetUrl}, Action: ${action || 'stream'}`);
      
      // Ignorer les requêtes pour le favicon
      if (req.url === '/favicon.ico') {
        res.writeHead(204, { 'Content-Type': 'image/x-icon' });
        res.end();
        return;
      }

      // Headers pour les requêtes Darkibox
      const requestHeaders = { 
        'Referer': 'https://darkibox.com/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache'
      };

      // **Logique pour les pages HTML Darki (extraction M3U8 en morceaux)**
      if (targetUrl.includes('darkibox.com') && !targetUrl.includes('.m3u8')) {
        console.log(`[DARKI] Extraction M3U8 en morceaux depuis page HTML: ${targetUrl}`);
        
        requestHeaders['Accept'] = 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8';
        
        const htmlResponse = await axios.get(targetUrl, {
          headers: requestHeaders,
          timeout: 15000,
        });
        
        const html = htmlResponse.data;
        console.log(`[DARKI] HTML reçu (${html.length} caractères)`);
        
        // Extraire le lien M3U8 depuis le HTML (format Darki)
        const m3u8Match = html.match(/src:\s*["']([^"']*\.m3u8[^"']*)["']/);
        if (!m3u8Match) {
          console.error('[DARKI] Aucun lien M3U8 trouvé dans le HTML');
          return res.status(404).json({ error: 'Aucun stream M3U8 trouvé sur la page Darki' });
        }
        
        const m3u8Url = m3u8Match[1];
        console.log(`[DARKI] Lien M3U8 extrait: ${m3u8Url}`);
        
        // Pour Darki, on doit réécrire les URLs des segments dans la playlist
        const playlistResponse = await axios.get(m3u8Url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://darkibox.com/',
            'Accept': 'application/vnd.apple.mpegurl, application/x-mpegURL, application/octet-stream, */*',
          },
          timeout: 15000,
        });
        
        let playlistContent = playlistResponse.data;
        console.log(`[DARKI] Playlist M3U8 reçue (${playlistContent.length} caractères)`);
        
        // Réécrire les URLs des segments .ts pour qu'elles passent par notre proxy
        playlistContent = playlistContent.replace(/^https?:\/\/[^\s]+\.ts[^\s]*$/gm, (match) => {
          return `/api/darkibox?url=${encodeURIComponent(match)}`;
        });
        
        // Réécrire les URLs des sous-playlists M3U8
        playlistContent = playlistContent.replace(/^https?:\/\/[^\s]+\.m3u8[^\s]*$/gm, (match) => {
          return `/api/darkibox?url=${encodeURIComponent(match)}`;
        });
        
        console.log(`[DARKI] Playlist M3U8 réécrite avec proxy`);
        
        // Retourner la playlist modifiée
        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
        res.setHeader('Cache-Control', 'no-cache');
        res.end(playlistContent);
        return;
      }
      
      // **Logique pour les playlists .m3u8**
      if (targetUrl.includes('.m3u8')) {
        requestHeaders['Accept'] = 'application/vnd.apple.mpegurl, application/x-mpegURL, application/octet-stream, */*';
        
        if (req.method === 'HEAD') {
          const response = await axios.head(targetUrl, {
            headers: requestHeaders,
            timeout: 10000,
            maxRedirects: 5
          });
          res.writeHead(response.status, response.headers);
          res.end();
        } else {
          const response = await axios.get(targetUrl, {
            headers: requestHeaders,
            timeout: 10000,
            maxRedirects: 5
          });

          // Réécrire les URLs pour qu'elles passent par notre proxy
          let modifiedPlaylist = response.data;
          
          // Remplacer les URLs dans les attributs URI=
          modifiedPlaylist = modifiedPlaylist.replace(/URI="([^"]*\.m3u8[^"]*)"/g, (match, url) => {
            return `URI="/api/darkibox?url=${encodeURIComponent(url)}"`;
          });
          
          // Remplacer les URLs sur des lignes séparées
          modifiedPlaylist = modifiedPlaylist.replace(/^https?:\/\/[^\s]+\.m3u8[^\s]*$/gm, (match) => {
            return `/api/darkibox?url=${encodeURIComponent(match)}`;
          });
          
          // Remplacer les URLs de segments .ts
          modifiedPlaylist = modifiedPlaylist.replace(/^https?:\/\/[^\s]+\.ts[^\s]*$/gm, (match) => {
            return `/api/darkibox?url=${encodeURIComponent(match)}`;
          });

          res.writeHead(200, { 
            'Content-Type': 'application/vnd.apple.mpegurl',
            'Cache-Control': 'no-cache'
          });
          res.end(modifiedPlaylist);
        }
      } else {
        // **Logique pour les segments vidéo .ts**
        requestHeaders['Accept'] = 'video/mp2t, video/*, */*';
        
        if (req.method === 'HEAD') {
          const response = await axios.head(targetUrl, {
            headers: requestHeaders,
            timeout: 10000,
            maxRedirects: 5
          });
          res.writeHead(response.status, response.headers);
          res.end();
        } else {
          const response = await axios({
            method: 'get',
            url: targetUrl,
            responseType: 'stream',
            headers: requestHeaders,
            timeout: 30000,
            maxRedirects: 5
          });

          // Copier les headers de la réponse
          const headers = { ...response.headers };
          delete headers['content-encoding']; // Supprimer la compression
          delete headers['transfer-encoding'];

          res.writeHead(response.status, headers);
          response.data.pipe(res);
        }
      }

    } catch (error) {
      console.error(`[DARKIBOX PROXY] Erreur:`, error.message);
      
      if (error.response) {
        res.writeHead(error.response.status, error.response.headers);
        res.end();
      } else {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Erreur serveur proxy Darkibox' }));
      }
    }
    return;
  }

  // ===== MODE SCRAPING (POST) =====
  if (req.method === 'POST') {
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
  }

  // ===== MODE SÉRIES (GET avec paramètres spéciaux) =====
  if (req.method === 'GET' && req.query.seriesId) {
    try {
      const { seriesId, season, episode } = req.query;

      if (!seriesId || !season || !episode) {
        return res.status(400).json({ 
          error: 'seriesId, season et episode sont requis' 
        });
      }

      console.log(`[DARKIBOX] Mode séries - ID: ${seriesId}, Saison: ${season}, Épisode: ${episode}`);

      // Appel à l'API Movix pour les sources Darkibox
      const apiUrl = `https://api.movix.site/api/series/download/${seriesId}/season/${season}/episode/${episode}`;
      
      const response = await axios.get(apiUrl, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (!response.data || !response.data.sources || response.data.sources.length === 0) {
        return res.status(404).json({ 
          error: 'Aucune source Darkibox trouvée pour cette série' 
        });
      }

      // Filtrer et formater les sources
      const sources = response.data.sources.map((source, index) => ({
        id: `darkibox-series-${index + 1}`,
        src: source.src,
        language: source.language,
        quality: source.quality,
        m3u8: source.m3u8,
        provider: 'darkibox',
        type: 'series'
      }));

      console.log(`[DARKIBOX] ${sources.length} sources trouvées pour la série`);

      return res.status(200).json({
        success: true,
        sources: sources,
        seriesId: parseInt(seriesId),
        season: parseInt(season),
        episode: parseInt(episode),
        total: sources.length
      });

    } catch (error) {
      console.error(`[DARKIBOX SERIES] Erreur:`, error.message);
      
      if (error.response) {
        return res.status(error.response.status).json({
          error: 'Erreur API Movix',
          details: error.response.data
        });
      }
      
      return res.status(500).json({ 
        error: 'Erreur serveur lors de la récupération des sources Darkibox',
        details: error.message 
      });
    }
  }

  // ===== MÉTHODE NON AUTORISÉE =====
  return res.status(405).json({ error: 'Method Not Allowed' });
}
