
import fetch from 'node-fetch'; // Use import, assuming module type or handled by Vercel

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { url, referer, origin } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'URL parameter is required' });
  }

  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    };

    if (referer) headers['Referer'] = referer;
    if (origin) headers['Origin'] = origin;

    // Default FSVid headers if not provided but url contains fsvid
    if (!referer && (url.includes('fsvid') || url.includes('fstream'))) {
      headers['Referer'] = 'https://fsvid.lol/';
    }

    const response = await fetch(url, { headers });

    if (!response.ok) {
      throw new Error(`Proxy fetch failed: ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || 'application/vnd.apple.mpegurl';
    res.setHeader('Content-Type', contentType);

    const content = await response.text();

    // Return content directly (Hybrid Mode: Playlist via Proxy, Segments Direct)
    res.status(200).send(content);

  } catch (error) {
    console.error('Proxy Error:', error);
    res.status(500).json({ error: error.message });
  }
}
