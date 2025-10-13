export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');
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

    console.log(`[TV SEGMENT PROXY] Fetching: ${url}`);

    const headers = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
      'Accept': '*/*',
      'Accept-Language': 'fr-FR,fr;q=0.7,en;q=0.6',
      'Connection': 'keep-alive',
      'Referer': 'https://fremtv.lol/'
    };

    // Ajouter le header Range si présent
    if (req.headers.range) {
      headers.Range = req.headers.range;
    }

    const response = await fetch(url, { headers });

    if (!response.ok) {
      console.error(`[TV SEGMENT PROXY ERROR] ${response.status} ${response.statusText}`);
      return res.status(response.status).json({ 
        error: 'Failed to fetch segment',
        status: response.status
      });
    }

    console.log(`[TV SEGMENT PROXY] ${response.status}`);

    // Propager les headers importants
    const importantHeaders = [
      'content-type',
      'content-length', 
      'accept-ranges',
      'content-range',
      'cache-control'
    ];

    importantHeaders.forEach(header => {
      const value = response.headers.get(header);
      if (value) {
        res.setHeader(header, value);
      }
    });

    // Streamer le contenu
    const buffer = await response.arrayBuffer();
    res.status(response.status).send(Buffer.from(buffer));

  } catch (error) {
    console.error('[TV SEGMENT PROXY ERROR]', error.message);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message
    });
  }
}
