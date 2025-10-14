// Proxy pour les playlists M3U8 du lecteur TV
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

    // Headers pour le lecteur TV
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
      'Origin': 'https://directfr.lat',
      'Referer': 'https://directfr.lat/',
      'Accept': 'application/vnd.apple.mpegurl, application/x-mpegURL, */*',
      'Accept-Language': 'fr-FR,fr;q=0.7,en;q=0.6',
      'Connection': 'keep-alive'
    };

    const response = await fetch(url, {
      method: 'GET',
      headers: headers,
      redirect: 'follow'
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch M3U8: ${response.status}`);
    }

    const text = await response.text();
    
    // Réécrire les URLs des segments pour pointer vers notre proxy
    const rewritten = text
      .split('\n')
      .map((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return line;
        
        // Si c'est un segment .ts, le rediriger vers notre proxy
        if (trimmed.endsWith('.ts') || trimmed.includes('.ts?')) {
          return `/api/proxy-segment?url=${encodeURIComponent(trimmed)}`;
        }
        
        return line;
      })
      .join('\n');

    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.send(rewritten);

  } catch (error) {
    console.error('Error in proxy-m3u8:', error);
    res.status(500).json({ error: 'Failed to proxy M3U8' });
  }
}
