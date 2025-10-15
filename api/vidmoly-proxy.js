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
    const { url, referer } = req.query;

    if (!url) {
      return res.status(400).json({ error: 'URL requise' });
    }

    const targetUrl = decodeURIComponent(url);
    const refererUrl = referer ? decodeURIComponent(referer) : 'https://vidmoly.net/';
    
    // Log pour debug
    console.log(`[VIDMOLY PROXY] URL cible: ${targetUrl}`);
    console.log(`[VIDMOLY PROXY] Referer: ${refererUrl}`);

    // Ignorer les requêtes pour le favicon
    if (req.url === '/favicon.ico') {
      res.writeHead(204, { 'Content-Type': 'image/x-icon' });
      res.end();
      return;
    }

    console.log(`[PROXY] Demande pour : ${req.url}`);

    // **Logique de réécriture pour les playlists .m3u8** (exactement comme votre code)
    if (req.url.endsWith('.m3u8')) {
      const response = await axios.get(targetUrl, { 
        headers: { 'Referer': refererUrl }
      });

      // On remplace les URLs par des URLs relatives vers notre proxy VidMoly
      // pour forcer le lecteur à demander les prochains fichiers via notre proxy
      const modifiedPlaylist = response.data.replace(/https?:\/\/[^\/\s]+/g, (match) => {
        // Si c'est une URL complète, la rediriger vers notre proxy VidMoly
        if (match.includes('.ts') || match.includes('.m3u8')) {
          return `/api/vidmoly-proxy?url=${encodeURIComponent(match)}&referer=${encodeURIComponent(refererUrl)}`;
        }
        return match;
      });

      res.writeHead(200, { 'Content-Type': 'application/vnd.apple.mpegurl' });
      res.end(modifiedPlaylist);

    } else {
      // **Logique de streaming pour les segments vidéo .ts** (exactement comme votre code)
      const response = await axios({
        method: 'get',
        url: targetUrl,
        responseType: 'stream',
        headers: { 'Referer': refererUrl }
      });
      res.writeHead(response.status, response.headers);
      response.data.pipe(res);
    }

  } catch (error) {
    console.error(`[PROXY] Erreur pour ${req.query.url}: ${error.message}`);
    res.writeHead(error.response ? error.response.status : 500);
    res.end();
  }
}
