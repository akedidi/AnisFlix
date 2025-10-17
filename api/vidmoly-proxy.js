import axios from 'axios';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
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
    console.log(`[VIDMOLY PROXY] URL brute reçue: ${url}`);
    console.log(`[VIDMOLY PROXY] URL cible décodée: ${targetUrl}`);
    console.log(`[VIDMOLY PROXY] Referer: ${refererUrl}`);
    console.log(`[VIDMOLY PROXY] Type de contenu détecté: ${targetUrl.includes('.m3u8') ? 'M3U8 Playlist' : 'Segment vidéo'}`);

    // Ignorer les requêtes pour le favicon
    if (req.url === '/favicon.ico') {
      res.writeHead(204, { 'Content-Type': 'image/x-icon' });
      res.end();
      return;
    }

    console.log(`[PROXY] Demande pour : ${req.url}`);

    // **Logique de réécriture pour les playlists .m3u8** (exactement comme votre code)
    if (targetUrl.includes('.m3u8')) {
      if (req.method === 'HEAD') {
        // Pour les requêtes HEAD, on fait juste une requête HEAD vers la cible
        const response = await axios.head(targetUrl, {
          headers: { 'Referer': refererUrl }
        });
        res.writeHead(response.status, response.headers);
        res.end();
      } else {
        const response = await axios.get(targetUrl, { 
          headers: { 'Referer': refererUrl }
        });

        // Réécrire les URLs pour qu'elles passent par notre proxy
        let modifiedPlaylist = response.data;
        
        // Remplacer les URLs m3u8 et ts par notre proxy
        modifiedPlaylist = modifiedPlaylist.replace(/https?:\/\/[^\s\n]+\.m3u8[^\s\n]*/g, (match) => {
          return `/api/vidmoly-proxy?url=${encodeURIComponent(match)}&referer=${encodeURIComponent(refererUrl)}`;
        });
        
        modifiedPlaylist = modifiedPlaylist.replace(/https?:\/\/[^\s\n]+\.ts[^\s\n]*/g, (match) => {
          return `/api/vidmoly-proxy?url=${encodeURIComponent(match)}&referer=${encodeURIComponent(refererUrl)}`;
        });

        res.writeHead(200, { 'Content-Type': 'application/vnd.apple.mpegurl' });
        res.end(modifiedPlaylist);
      }

    } else {
      // **Logique de streaming pour les segments vidéo .ts** (exactement comme votre code)
      if (req.method === 'HEAD') {
        // Pour les requêtes HEAD, on fait juste une requête HEAD vers la cible
        const response = await axios.head(targetUrl, {
          headers: { 'Referer': refererUrl }
        });
        res.writeHead(response.status, response.headers);
        res.end();
      } else {
        const response = await axios({
          method: 'get',
          url: targetUrl,
          responseType: 'stream',
          headers: { 'Referer': refererUrl }
        });
        res.writeHead(response.status, response.headers);
        response.data.pipe(res);
      }
    }

  } catch (error) {
    console.error(`[PROXY] Erreur pour ${req.query.url}: ${error.message}`);
    console.error(`[PROXY] Détails de l'erreur:`, error.response ? {
      status: error.response.status,
      statusText: error.response.statusText,
      headers: error.response.headers
    } : error);
    res.writeHead(error.response ? error.response.status : 500);
    res.end();
  }
}
