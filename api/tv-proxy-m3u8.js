export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({ error: 'URL parameter required' });
    }

    // Validation SSRF - autoriser seulement les domaines TV
    const allowedHosts = ['fremtv.lol', 'directfr.lat'];
    const urlObj = new URL(url);
    if (!allowedHosts.some(host => urlObj.hostname === host || urlObj.hostname.endsWith('.' + host))) {
      return res.status(403).json({ error: 'URL not allowed' });
    }

    console.log(`[TV M3U8 PROXY] Fetching: ${url}`);

    const headers = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
      'Accept': 'application/vnd.apple.mpegurl, application/x-mpegURL, */*',
      'Accept-Language': 'fr-FR,fr;q=0.7,en;q=0.6',
      'Connection': 'keep-alive',
      'Referer': 'https://fremtv.lol/'
    };

    const response = await fetch(url, { headers });

    if (!response.ok) {
      console.error(`[TV M3U8 PROXY ERROR] ${response.status} ${response.statusText}`);
      return res.status(response.status).json({ 
        error: 'Failed to fetch M3U8 playlist',
        status: response.status
      });
    }

    const contentType = response.headers.get('content-type') || '';
    console.log(`[TV M3U8 PROXY] ${response.status} ${contentType}`);

    const playlistData = await response.text();

    // Réécrire les URLs dans la playlist
    const rewrittenPlaylist = playlistData
      .split('\n')
      .map((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return line;
        
        let absoluteUrl = trimmed;
        if (!trimmed.startsWith('http')) {
          absoluteUrl = new URL(trimmed, url).toString();
        }
        
        if (absoluteUrl.includes('.m3u8')) {
          return `/api/tv-proxy-m3u8?url=${encodeURIComponent(absoluteUrl)}`;
        } else {
          return `/api/tv-proxy-segment?url=${encodeURIComponent(absoluteUrl)}`;
        }
      })
      .join('\n');

    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.status(200).send(rewrittenPlaylist);

  } catch (error) {
    console.error('[TV M3U8 PROXY ERROR]', error.message);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message
    });
  }
}
