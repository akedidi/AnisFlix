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

function rewritePlaylistUrls(playlistText, baseUrl) {
  return playlistText
    .split('\n')
    .map((line) => {
      const t = line.trim();
      if (!t || t.startsWith('#')) return line;
      const abs = toAbsolute(baseUrl, t);
      if (/\.m3u8(\?|$)/i.test(abs)) {
        return `/api/tv-proxy-m3u8?url=${encodeURIComponent(abs)}`;
      }
      return `/api/tv-proxy-segment?url=${encodeURIComponent(abs)}`;
    })
    .join('\n');
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Récupérer le channelId depuis les paramètres d'URL (ex: /api/tv/stream/106)
    const channelId = req.url.split('/').pop();
    
    console.log(`[TV STREAM] Début du processus pour channelId: ${channelId}`);
    console.log(`[TV STREAM] URL complète: ${req.url}`);
    
    if (!channelId || isNaN(channelId)) {
      console.error(`[TV STREAM] Channel ID invalide: ${channelId}`);
      return res.status(400).json({ error: 'Channel ID required and must be numeric' });
    }
    
    // URL initiale avec l'ID de chaîne
    const initialUrl = `${ORIGIN_HOST}/live/5A24C0D16059EDCC6A20E0CE234C7A25/${channelId}.m3u8`;
    console.log(`[TV STREAM] URL initiale: ${initialUrl}`);

    // Amorcer la session/cookies
    console.log(`[TV STREAM] Amorce de la session sur ${ORIGIN_HOST}`);
    try { 
      const sessionResponse = await http.get(ORIGIN_HOST + '/', { headers: browserHeaders }); 
      console.log(`[TV STREAM] Session amorcée: ${sessionResponse.status}`);
    } catch (sessionError) {
      console.warn(`[TV STREAM] Erreur session (non critique): ${sessionError.message}`);
    }

    // Laisser suivre la 302 vers /auth/...token=...
    console.log(`[TV STREAM] Appel de l'URL initiale avec redirection automatique`);
    const r = await http.get(initialUrl, { 
      headers: browserHeaders, 
      responseType: 'text',
      maxRedirects: 5 // Permettre les redirections
    });

    const finalUrl = r.request?.res?.responseUrl || initialUrl;
    const ctype = (r.headers['content-type'] || '').toLowerCase();
    
    console.log(`[TV STREAM] Réponse reçue:`);
    console.log(`[TV STREAM] - Status: ${r.status}`);
    console.log(`[TV STREAM] - Content-Type: ${ctype}`);
    console.log(`[TV STREAM] - URL finale: ${finalUrl}`);
    console.log(`[TV STREAM] - Headers Location: ${r.headers.location || 'Aucune'}`);
    console.log(`[TV STREAM] - Taille des données: ${r.data?.length || 0} caractères`);

    if (r.status >= 400) {
      console.error(`[TV STREAM] Erreur HTTP: ${r.status}`);
      return res.status(r.status).send(`Erreur HTTP: ${r.status}`);
    }

    if (typeof r.data !== 'string') {
      console.error(`[TV STREAM] Données reçues ne sont pas du texte`);
      return res.status(502).send('Pas une playlist M3U8.');
    }

    console.log(`[TV STREAM] Premières lignes du manifest:`);
    console.log(r.data.split('\n').slice(0, 10).join('\n'));

    const rewritten = rewritePlaylistUrls(r.data, finalUrl);
    
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
