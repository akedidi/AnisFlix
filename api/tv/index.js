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
  'Accept': 'application/vnd.apple.mpegurl, application/x-mpegURL, application/dash+xml, */*',
  'Accept-Language': 'fr-FR,fr;q=0.7,en;q=0.6',
  'Connection': 'keep-alive'
};

const ALLOWED_HOSTS = ['fremtv.lol', 'directfr.lat', 'viamotionhsi.netplus.ch', 'simulcast-p.ftven.fr', 'cache1a.netplus.ch'];

function isAllowedUrl(urlString) {
  try {
    const url = new URL(urlString);
    return ALLOWED_HOSTS.some(host => url.hostname === host || url.hostname.endsWith('.' + host));
  } catch {
    return false;
  }
}

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
        return `/api/tv?url=${encodeURIComponent(abs)}`;
      }
      return `/api/tv?url=${encodeURIComponent(abs)}`;
    })
    .join('\n');
}

function rewriteMpdUrls(mpdText, baseUrl) {
  // Réécrire les URLs relatives dans le manifest MPD
  return mpdText.replace(/<BaseURL>([^<]+)<\/BaseURL>/g, (match, relativeUrl) => {
    const absoluteUrl = toAbsolute(baseUrl, relativeUrl);
    return `<BaseURL>/api/tv?url=${encodeURIComponent(absoluteUrl)}</BaseURL>`;
  });
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url, channelId } = req.query;

  // ===== MODE STREAM CHAÎNE (channelId) =====
  if (channelId) {
    console.log(`[TV STREAM] ===== NOUVELLE REQUÊTE CHAÎNE =====`);
    console.log(`[TV STREAM] Channel ID: ${channelId}`);
    
    try {
      const originalUrl = `${ORIGIN_HOST}/live/5A24C0D16059EDCC6A20E0CE234C7A25/${channelId}.m3u8`;
      console.log(`[TV STREAM] URL originale: ${originalUrl}`);
      
      const response = await http.get(originalUrl, {
        headers: browserHeaders,
        responseType: 'text'
      });

      console.log(`[TV STREAM] Réponse reçue - Status: ${response.status}`);
      
      const manifestData = response.data;
      const finalUrl = `${ORIGIN_HOST}/live/5A24C0D16059EDCC6A20E0CE234C7A25/`;

      if (typeof manifestData !== 'string') {
        console.error(`[TV STREAM] Données invalides`);
        return res.status(502).send('Pas une playlist M3U8.');
      }

      console.log(`[TV STREAM] Réécriture des URLs...`);
      const rewritten = rewritePlaylistUrls(manifestData, finalUrl);
      
      console.log(`[TV STREAM] Envoi de la réponse...`);
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.send(rewritten);
      
    } catch (e) {
      console.error('[TV STREAM ERROR]', e.message);
      res.status(500).send(`Erreur lors de la récupération de la playlist: ${e.message}`);
    }
    return;
  }

  // ===== MODE PROXY URL (url) =====
  if (!url) {
    return res.status(400).send('Paramètre "url" ou "channelId" manquant.');
  }
  
  // Validation SSRF: vérifier que l'URL est autorisée
  if (!isAllowedUrl(url)) {
    console.error(`[TV PROXY] URL non autorisée: ${url}`);
    return res.status(403).send('URL non autorisée.');
  }
  
  try {
    console.log(`[TV PROXY] Appel de l'URL: ${url}`);
    
    // ===== MODE PLAYLIST M3U8/MPD =====
    if (url.includes('.m3u8') || url.includes('.mpd')) {
      const r = await http.get(url, { 
        headers: browserHeaders, 
        responseType: 'text' 
      });

      const ctype = (r.headers['content-type'] || '').toLowerCase();
      const finalUrl = r.request?.res?.responseUrl || url;
      
      console.log(`[TV PROXY] Réponse playlist reçue:`);
      console.log(`[TV PROXY] - Status: ${r.status}`);
      console.log(`[TV PROXY] - Content-Type: ${ctype}`);
      console.log(`[TV PROXY] - URL finale: ${finalUrl}`);
      console.log(`[TV PROXY] - Taille: ${r.data?.length || 0} caractères`);
      
      if (r.status >= 400) {
        console.error(`[TV PROXY] Erreur HTTP: ${r.status}`);
        return res.status(r.status).send('Erreur distante playlist.');
      }
      if (typeof r.data !== 'string') {
        console.error(`[TV PROXY] Données invalides`);
        return res.status(502).send('Pas un manifest valide.');
      }

      // Déterminer le type de contenu et traiter en conséquence
      let finalData = r.data;
      let contentType = 'application/vnd.apple.mpegurl';
      
      if (url.includes('.mpd')) {
        // Pour les streams MPD, réécrire les URLs relatives
        contentType = 'application/dash+xml';
        finalData = rewriteMpdUrls(r.data, finalUrl);
        console.log(`[TV PROXY] Stream MPD détecté, URLs relatives réécrites`);
      } else {
        // Pour les streams M3U8, réécrire les URLs
        finalData = rewritePlaylistUrls(r.data, finalUrl);
        console.log(`[TV PROXY] Stream M3U8 détecté, URLs réécrites`);
      }
      
      console.log(`[TV PROXY] Manifest traité, envoi de la réponse`);

      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.send(finalData);
      
    } else {
      // ===== MODE SEGMENT VIDÉO =====
      const headers = { ...browserHeaders };
      if (req.headers.range) {
        headers.Range = req.headers.range;
        console.log(`[TV PROXY] Range demandé: ${req.headers.range}`);
      }

      console.log(`[TV PROXY] Appel de l'URL segment: ${url}`);
      const r = await http.get(url, { 
        headers, 
        responseType: 'stream', 
        validateStatus: () => true 
      });
      
      console.log(`[TV PROXY] Réponse segment reçue:`);
      console.log(`[TV PROXY] - Status: ${r.status}`);
      console.log(`[TV PROXY] - Content-Type: ${r.headers['content-type'] || 'Non spécifié'}`);
      console.log(`[TV PROXY] - Content-Length: ${r.headers['content-length'] || 'Non spécifié'}`);
      console.log(`[TV PROXY] - Accept-Ranges: ${r.headers['accept-ranges'] || 'Non spécifié'}`);
      
      if (r.status >= 400) {
        console.error(`[TV PROXY] Erreur HTTP: ${r.status}`);
        return res.status(r.status).send('Erreur distante segment.');
      }

      // Propager quelques headers utiles
      ['content-type','content-length','accept-ranges','content-range','cache-control'].forEach(h => {
        if (r.headers[h]) {
          res.setHeader(h, r.headers[h]);
          console.log(`[TV PROXY] Header propagé: ${h} = ${r.headers[h]}`);
        }
      });

      console.log(`[TV PROXY] Streaming du segment vers le client`);
      res.status(r.status);
      r.data.pipe(res);
    }
    
  } catch (e) {
    console.error('[TV PROXY ERROR]', e.message);
    console.error('[TV PROXY ERROR] Stack:', e.stack);
    res.status(500).send(`Erreur proxy: ${e.message}`);
  }
}
