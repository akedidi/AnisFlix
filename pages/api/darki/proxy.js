import axios from 'axios';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({ error: 'URL requise' });
    }

    const targetUrl = decodeURIComponent(url);

    // Ignorer les requêtes pour le favicon
    if (req.url === '/favicon.ico') {
      res.writeHead(204, { 'Content-Type': 'image/x-icon' });
      res.end();
      return;
    }

    console.log(`[DARKI PROXY] Demande pour : ${req.url}`);

    // **Logique de réécriture pour les playlists .m3u8**
    if (req.url.endsWith('.m3u8')) {
      const response = await axios.get(targetUrl, { 
        headers: { 
          'Referer': 'https://darkibox.com/',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 10000
      });

      // Remplacer les domaines distants par des URLs relatives pour forcer le proxy
      const modifiedPlaylist = response.data.replace(/https?:\/\/[^\/\s]+/g, (match) => {
        // Garder les URLs complètes pour les domaines externes, mais proxy les segments
        if (match.includes('.ts') || match.includes('.m3u8')) {
          return `/api/darki/proxy?url=${encodeURIComponent(match)}`;
        }
        return match;
      });

      res.writeHead(200, { 
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Cache-Control': 'no-cache'
      });
      res.end(modifiedPlaylist);

    } else {
      // **Logique de streaming pour les segments vidéo .ts**
      const response = await axios({
        method: 'get',
        url: targetUrl,
        responseType: 'stream',
        headers: { 
          'Referer': 'https://darkibox.com/',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 30000
      });

      // Copier les headers de la réponse
      const headers = { ...response.headers };
      delete headers['content-encoding']; // Supprimer la compression
      delete headers['transfer-encoding'];

      res.writeHead(response.status, headers);
      response.data.pipe(res);
    }

  } catch (error) {
    console.error(`[DARKI PROXY] Erreur pour ${req.query.url}:`, error.message);
    
    if (error.response) {
      res.writeHead(error.response.status, error.response.headers);
      res.end();
    } else {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Erreur serveur proxy Darki' }));
    }
  }
}

