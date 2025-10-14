// Proxy pour les segments .ts du lecteur TV
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
      throw new Error(`Failed to fetch segment: ${response.status}`);
    }

    // Transférer le contenu binaire du segment
    const buffer = await response.arrayBuffer();
    
    // Déterminer le type de contenu
    const contentType = response.headers.get('content-type') || 'video/mp2t';
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', buffer.byteLength);
    res.send(Buffer.from(buffer));

  } catch (error) {
    console.error('Error in proxy-segment:', error);
    res.status(500).json({ error: 'Failed to proxy segment' });
  }
}
