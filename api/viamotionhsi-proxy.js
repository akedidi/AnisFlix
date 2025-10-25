import axios from 'axios';

export default async function handler(req, res) {
  // Headers CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { path } = req.query;
    
    if (!path) {
      return res.status(400).json({ error: 'Path parameter is required' });
    }

    // Construire l'URL complète
    const targetUrl = `https://viamotionhsi.netplus.ch/live/eds/${path}`;
    console.log(`[VIAMOTION PROXY] Proxifying: ${targetUrl}`);
    
    const response = await axios.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/vnd.apple.mpegurl, application/x-mpegURL, application/octet-stream, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      timeout: 10000,
      responseType: 'text'
    });

    console.log(`[VIAMOTION PROXY] ${response.status} ${response.headers['content-type']} ← ${targetUrl}`);

    if (typeof response.data !== 'string') {
      return res.status(502).send('Pas une playlist M3U8.');
    }

    // Réécrire les URLs dans la playlist pour qu'elles passent par le proxy
    const rewritten = response.data
      .replace(/^(hd1-.*\.m3u8)$/gm, '/api/tv?url=https%3A%2F%2Fviamotionhsi.netplus.ch%2Flive%2Feds%2Fhd1%2Fbrowser-HLS8%2F$1')
      .replace(/^(hd1-.*\.ts)$/gm, '/api/tv?url=https%3A%2F%2Fviamotionhsi.netplus.ch%2Flive%2Feds%2Fhd1%2Fbrowser-HLS8%2F$1')
      .replace(/^([^#\n].*\.m3u8)$/gm, (match) => {
        // Pour les autres sous-playlists, les proxifier via l'API TV
        const encodedUrl = encodeURIComponent(`https://viamotionhsi.netplus.ch/live/eds/${path.replace(/\/[^\/]*$/, '/')}${match}`);
        return `/api/tv?url=${encodedUrl}`;
      })
      .replace(/^([^#\n].*\.ts)$/gm, (match) => {
        // Pour les segments TS, les proxifier via l'API TV
        const encodedUrl = encodeURIComponent(`https://viamotionhsi.netplus.ch/live/eds/${path.replace(/\/[^\/]*$/, '/')}${match}`);
        return `/api/tv?url=${encodedUrl}`;
      });

    // Headers spécifiques pour les streams live
    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    res.status(200).send(rewritten);
  } catch (error) {
    console.error('[VIAMOTION PROXY ERROR]', error.message);
    res.status(500).send('Erreur lors de la récupération du stream Viamotion.');
  }
}
