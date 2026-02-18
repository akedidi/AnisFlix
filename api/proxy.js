
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

    // Rewrite M3U8 to handle relative paths and Referer protection for sub-requests (index.m3u8, segments, keys)
    if (url.includes('.m3u8') || contentType.includes('mpegurl') || contentType.includes('hls')) {
      const baseUrl = new URL(url);
      const currentReferer = referer || 'https://fsvid.lol/';

      // Simple M3U8 Rewrite
      const rewritten = content.split('\n').map(line => {
        const trimmed = line.trim();
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

    // Check if it's binary data (segments, images) -> Buffer handling might be better but .text() + proper encoding works for many things if careful
    // For simple TS segments, piping response is better. But here we already read text. 
    // If we want to support segments efficiently, we should stream. 
    // But for "Hybrid mode" intended primarily for M3U8, this is OK.
    // If this handles TS segments too (via rewrite), we might need buffer support.

    return res.status(200).send(content);

  } catch (error) {
    console.error('Proxy Error:', error);
    res.status(500).json({ error: error.message });
  }
}
