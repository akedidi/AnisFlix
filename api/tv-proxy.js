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

    // Décoder l'URL
    const targetUrl = decodeURIComponent(url);
    console.log(`[TV PROXY] Fetching: ${targetUrl}`);

    // Headers pour la requête
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
      'Accept': '*/*',
      'Referer': 'https://fremtv.lol/'
    };

    // Ajouter le header Range si présent
    if (req.headers.range) {
      headers.Range = req.headers.range;
    }

    // Faire la requête
    const response = await fetch(targetUrl, { headers });

    if (!response.ok) {
      console.error(`[TV PROXY] Error: ${response.status} ${response.statusText}`);
      return res.status(response.status).json({ 
        error: 'Failed to fetch content',
        status: response.status
      });
    }

    console.log(`[TV PROXY] Success: ${response.status}`);

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
    console.error('[TV PROXY ERROR]', error.message);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message
    });
  }
}
