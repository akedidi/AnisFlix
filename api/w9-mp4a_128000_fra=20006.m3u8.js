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
    console.log(`[TV AUDIO SUB-PLAYLIST] Requête pour la sous-playlist audio W9: ${req.url}`);
    
    // URL complète de la sous-playlist audio W9
    const audioUrl = 'https://viamotionhsi.netplus.ch/live/eds/w9/browser-HLS8/w9-mp4a_128000_fra=20006.m3u8';
    console.log(`[TV AUDIO SUB-PLAYLIST] Proxification de: ${audioUrl}`);
    
    const response = await axios.get(audioUrl, {
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

    console.log(`[TV AUDIO SUB-PLAYLIST] ${response.status} ${response.headers['content-type']} ← ${audioUrl}`);

    if (typeof response.data !== 'string') {
      return res.status(502).send('Pas une playlist M3U8.');
    }

    // Réécrire les URLs dans la playlist pour qu'elles passent par le proxy
    const rewritten = response.data
      .replace(/^(w9-.*\.m3u8)$/gm, '/api/tv?url=https%3A%2F%2Fviamotionhsi.netplus.ch%2Flive%2Feds%2Fw9%2Fbrowser-HLS8%2F$1')
      .replace(/^(w9-.*\.ts)$/gm, '/api/tv?url=https%3A%2F%2Fviamotionhsi.netplus.ch%2Flive%2Feds%2Fw9%2Fbrowser-HLS8%2F$1');

    // Headers spécifiques pour les streams live
    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    res.status(200).send(rewritten);
  } catch (error) {
    console.error('[TV AUDIO SUB-PLAYLIST ERROR]', error.message);
    res.status(500).send('Erreur lors de la récupération de la sous-playlist audio W9.');
  }
}
