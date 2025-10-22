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

const ALLOWED_HOSTS = ['fremtv.lol', 'directfr.lat', 'viamotionhsi.netplus.ch'];

function isAllowedUrl(urlString) {
  try {
    const url = new URL(urlString);
    return ALLOWED_HOSTS.some(host => url.hostname === host || url.hostname.endsWith('.' + host));
  } catch {
    return false;
  }
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

  const target = req.query.url;
  if (!target) {
    return res.status(400).send('Paramètre "url" manquant.');
  }
  
  // Validation SSRF: vérifier que l'URL est autorisée
  if (!isAllowedUrl(target)) {
    console.error(`[TV SEG] URL non autorisée: ${target}`);
    return res.status(403).send('URL non autorisée.');
  }
  
  try {
    const headers = { ...browserHeaders };
    if (req.headers.range) {
      headers.Range = req.headers.range;
      console.log(`[TV SEG] Range demandé: ${req.headers.range}`);
    }

    console.log(`[TV SEG] Appel de l'URL segment: ${target}`);
    const r = await http.get(target, { 
      headers, 
      responseType: 'stream', 
      validateStatus: () => true 
    });
    
    console.log(`[TV SEG] Réponse reçue:`);
    console.log(`[TV SEG] - Status: ${r.status}`);
    console.log(`[TV SEG] - Content-Type: ${r.headers['content-type'] || 'Non spécifié'}`);
    console.log(`[TV SEG] - Content-Length: ${r.headers['content-length'] || 'Non spécifié'}`);
    console.log(`[TV SEG] - Accept-Ranges: ${r.headers['accept-ranges'] || 'Non spécifié'}`);
    
    if (r.status >= 400) {
      console.error(`[TV SEG] Erreur HTTP: ${r.status}`);
      return res.status(r.status).send('Erreur distante segment.');
    }

    // Propager quelques headers utiles
    ['content-type','content-length','accept-ranges','content-range','cache-control'].forEach(h => {
      if (r.headers[h]) {
        res.setHeader(h, r.headers[h]);
        console.log(`[TV SEG] Header propagé: ${h} = ${r.headers[h]}`);
      }
    });

    console.log(`[TV SEG] Streaming du segment vers le client`);
    res.status(r.status);
    r.data.pipe(res);
  } catch (e) {
    console.error('[TV SEG ERROR]', e.message);
    console.error('[TV SEG ERROR] Stack:', e.stack);
    res.status(500).send(`Erreur proxy segment: ${e.message}`);
  }
}
