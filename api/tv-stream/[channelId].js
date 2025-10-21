import axios from "axios";
import { CookieJar } from "tough-cookie";
import { wrapper } from "axios-cookiejar-support";

const ORIGIN_HOST = 'https://fremtv.lol';
const EMBED_HOST = 'https://directfr.lat';

const jar = new CookieJar();
const http = wrapper(axios.create({ 
  jar, 
  withCredentials: true, 
  timeout: 15000 
}));

const browserHeaders = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
  'Origin': EMBED_HOST,
  'Referer': EMBED_HOST + '/',
  'Accept': 'application/vnd.apple.mpegurl, application/x-mpegURL, */*',
  'Accept-Language': 'fr-FR,fr;q=0.7,en;q=0.6',
  'Connection': 'keep-alive'
};

function toAbsolute(base, maybeRelative) {
  try { 
    return new URL(maybeRelative, base).toString(); 
  } catch { 
    return maybeRelative; 
  }
}

function rewritePlaylistUrls(playlist, baseUrl) {
  const lines = playlist.split('\n');
  const rewritten = lines.map(line => {
    if (line.startsWith('#') || line.trim() === '') {
      return line;
    }
    
    if (line.startsWith('http')) {
      return line;
    }
    
    return toAbsolute(baseUrl, line);
  });
  
  return rewritten.join('\n');
}

export default async function handler(req, res) {
  const { channelId } = req.query;
  
  if (!channelId) {
    return res.status(400).json({ error: 'Channel ID is required' });
  }

  console.log(`[TV STREAM] Début de la requête pour le channel ${channelId}`);
  
  try {
    const originalUrl = `${ORIGIN_HOST}/live/5A24C0D16059EDCC6A20E0CE234C7A25/${channelId}.m3u8`;
    console.log(`[TV STREAM] URL originale: ${originalUrl}`);
    
    const response = await http.get(originalUrl, {
      headers: browserHeaders,
      responseType: 'text'
    });

    console.log(`[TV STREAM] Réponse reçue, status: ${response.status}`);
    console.log(`[TV STREAM] Headers de réponse:`, response.headers);
    
    const manifestData = response.data;
    const finalUrl = `${ORIGIN_HOST}/live/5A24C0D16059EDCC6A20E0CE234C7A25/`;

    if (typeof manifestData !== 'string') {
      console.error(`[TV STREAM] Données reçues ne sont pas du texte`);
      return res.status(502).send('Pas une playlist M3U8.');
    }

    console.log(`[TV STREAM] Premières lignes du manifest:`);
    console.log(manifestData.split('\n').slice(0, 10).join('\n'));

    const rewritten = rewritePlaylistUrls(manifestData, finalUrl);
    
    console.log(`[TV STREAM] Manifest réécrit, envoi de la réponse`);
    console.log(`[TV STREAM] Taille du manifest réécrit: ${rewritten.length} caractères`);

    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.send(rewritten);
  } catch (e) {
    console.error('[TV STREAM ERROR]', e.message);
    console.error('[TV STREAM ERROR] Stack:', e.stack);
    res.status(500).send(`Erreur lors de la récupération de la playlist: ${e.message}`);
  }
}
