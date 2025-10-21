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

const ALLOWED_HOSTS = ['fremtv.lol', 'directfr.lat', 'viamotionhsi.netplus.ch'];

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
        return `/api/tv-proxy?url=${encodeURIComponent(abs)}`;
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
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'URL parameter is required' });
  }

  if (!isAllowedUrl(url)) {
    return res.status(403).send('URL non autorisée.');
  }

  try {
    console.log(`[TV PROXY] Proxying URL: ${url}`);
    
    const response = await http.get(url, {
      headers: browserHeaders,
      responseType: 'text'
    });

    console.log(`[TV PROXY] Response received, status: ${response.status}`);

    const data = response.data;
    
    if (typeof data !== 'string') {
      console.error(`[TV PROXY] Data received is not text`);
      return res.status(502).send('Pas un manifest valide.');
    }

    // Determine content type based on URL
    let contentType = 'application/vnd.apple.mpegurl';
    if (url.includes('.mpd')) {
      contentType = 'application/dash+xml';
    }

    // For M3U8 playlists, rewrite URLs
    let finalData = data;
    if (url.includes('.m3u8')) {
      const baseUrl = url.substring(0, url.lastIndexOf('/') + 1);
      finalData = rewritePlaylistUrls(data, baseUrl);
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.send(finalData);
  } catch (e) {
    console.error('[TV PROXY ERROR]', e.message);
    res.status(500).send(`Erreur lors de la récupération: ${e.message}`);
  }
}
