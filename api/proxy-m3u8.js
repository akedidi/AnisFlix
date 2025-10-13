// Proxy générique pour toute playlist (master/media) - exactement comme votre code fonctionnel
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
    const target = req.query.url;
    if (!target) return res.status(400).send('Paramètre "url" manquant.');

    // Headers exacts de votre code fonctionnel
    const browserHeaders = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
      'Origin': 'https://directfr.lat',
      'Referer': 'https://directfr.lat/',
      'Accept': 'application/vnd.apple.mpegurl, application/x-mpegURL, */*',
      'Accept-Language': 'fr-FR,fr;q=0.7,en;q=0.6',
      'Connection': 'keep-alive'
    };

    const response = await fetch(target, { 
      method: 'GET',
      headers: browserHeaders,
      redirect: 'follow'
    });

    const contentType = response.headers.get('content-type') || '';
    console.log(`[M3U8] ${response.status} ${contentType} ← ${target}`);

    if (response.status >= 400) {
      return res.status(response.status).send('Erreur distante playlist.');
    }

    const text = await response.text();
    if (typeof text !== 'string') {
      return res.status(502).send('Pas une playlist M3U8.');
    }

    // Fonction toAbsolute exactement comme votre code fonctionnel
    function toAbsolute(base, maybeRelative) {
      try { 
        return new URL(maybeRelative, base).toString(); 
      } catch { 
        return maybeRelative; 
      }
    }

    // Rewrite playlist URLs exactement comme votre code fonctionnel
    function rewritePlaylistUrls(playlistText, baseUrl) {
      return playlistText
        .split('\n')
        .map((line) => {
          const t = line.trim();
          if (!t || t.startsWith('#')) return line;
          const abs = toAbsolute(baseUrl, t);
          if (/\.m3u8(\?|$)/i.test(abs)) return `/api/proxy-m3u8?url=${encodeURIComponent(abs)}`;
          return `/api/proxy-segment?url=${encodeURIComponent(abs)}`;
        })
        .join('\n');
    }

    const baseUrl = response.url || target;
    const rewritten = rewritePlaylistUrls(text, baseUrl);

    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.send(rewritten);

  } catch (error) {
    console.error('[M3U8 ERROR]', error.message);
    res.status(500).send('Erreur proxy playlist.');
  }
}
