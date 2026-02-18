
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

    const contentType = response.headers.get('content-type');
    res.setHeader('Content-Type', contentType || 'application/octet-stream');

    // Define M3U8 types
    const isM3U8 = contentType && (
      contentType.includes('application/vnd.apple.mpegurl') ||
      contentType.includes('application/x-mpegURL') ||
      contentType.includes('text/plain') && url.includes('.m3u8') // sometimes servers return wrong type
    );

    if (isM3U8) {
      const content = await response.text();

      const baseUrl = new URL(url);
      const currentReferer = referer || 'https://fsvid.lol/';

      // Simple M3U8 Rewrite
      const rewritten = content.split('\n').map(line => {
        const trimmed = line.trim();
        // Skip empty lines or comments (but check for KEY URI)
        if (!trimmed) return line;

        if (trimmed.startsWith('#')) {
          // Handle Key URIs: #EXT-X-KEY:METHOD=AES-128,URI="key.php"
          if (trimmed.includes('URI="')) {
            return trimmed.replace(/URI="([^"]+)"/g, (match, p1) => {
              const absolute = new URL(p1, baseUrl).href;
              const proxyUrl = `/api/proxy?url=${encodeURIComponent(absolute)}&referer=${encodeURIComponent(currentReferer)}`;
              return `URI="${proxyUrl}"`;
            });
          }
          return line;
        }

        // It is a URL (Playlist or Segment)
        const absolute = new URL(trimmed, baseUrl).href;
        return `/api/proxy?url=${encodeURIComponent(absolute)}&referer=${encodeURIComponent(currentReferer)}`;
      }).join('\n');

      return res.status(200).send(rewritten);
    }

    // Binary Content (Segments, Images, etc.)
    // Use arrayBuffer and convert to Buffer to preserve binary data
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return res.status(200).send(buffer);

  } catch (error) {
    console.error('Proxy Error:', error);
    res.status(500).json({ error: error.message });
  }
}
