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
    const { channelId } = req.query;
    
    if (!channelId) {
      return res.status(400).json({ error: 'Channel ID required' });
    }
    
    // URL initiale avec l'ID de chaîne
    const initialUrl = `${ORIGIN_HOST}/live/5A24C0D16059EDCC6A20E0CE234C7A25/${channelId}.m3u8`;

    // Amorcer la session/cookies
    try { 
      await http.get(ORIGIN_HOST + '/', { headers: browserHeaders }); 
    } catch {}

    // Laisser suivre la 302 vers /auth/...token=...
    const r = await http.get(initialUrl, { 
      headers: browserHeaders, 
      responseType: 'text' 
    });

    const ctype = (r.headers['content-type'] || '').toLowerCase();
    console.log(`[TV ENTRY] ${r.status} ${ctype} ← ${r.request?.res?.responseUrl || initialUrl}`);

    if (typeof r.data !== 'string') {
      return res.status(502).send('Pas une playlist M3U8.');
    }

    const baseUrl = r.request?.res?.responseUrl || initialUrl;
    const rewritten = rewritePlaylistUrls(r.data, baseUrl);

    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.send(rewritten);
  } catch (e) {
    console.error('[TV ENTRY ERROR]', e.message);
    res.status(500).send('Erreur lors de la récupération de la playlist.');
  }
}
