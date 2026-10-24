/**
 * VaPlayer HLS proxy (web only).
 * CDN blocks browser Origin: anisflix.vercel.app on /content/ segments (403).
 * This rewrites playlists and relays segments with a trusted Referer — no CF Worker streaming.
 */

const UPSTREAM_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Referer: 'https://nextgencloudfabric.com/',
  Origin: 'https://nextgencloudfabric.com',
  Accept: '*/*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'identity',
};

function isPlaylistUrl(url) {
  const lower = url.toLowerCase();
  if (lower.includes('.m3u8')) return true;
  // VaPlayer variant playlists live under /pl/…; media segments under /content/
  if (lower.includes('/pl/') && !lower.includes('/content/')) return true;
  return false;
}

function proxyUrl(origin, absoluteUrl) {
  const ext = absoluteUrl.includes('.m3u8')
    ? '&ext=.m3u8'
    : absoluteUrl.includes('/content/')
      ? '&ext=.ts'
      : absoluteUrl.includes('/pl/')
        ? '&ext=.m3u8'
        : '';
  return `${origin}/api/vaplayer-proxy?url=${encodeURIComponent(absoluteUrl)}${ext}`;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range, Authorization, *');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader(
    'Access-Control-Expose-Headers',
    'Content-Length, Content-Range, Content-Type, Accept-Ranges',
  );

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { url } = req.query;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL Missing' });
    }

    let decodedUrl = url;
    if (decodedUrl.includes('/api/vaplayer-proxy')) {
      const match = decodedUrl.match(/[?&]url=([^&]+)/);
      if (match) decodedUrl = decodeURIComponent(match[1]);
    }

    // Only allow VaPlayer CDN hosts (rotating *.site mirrors).
    let parsed;
    try {
      parsed = new URL(decodedUrl);
    } catch {
      return res.status(400).json({ error: 'Invalid URL' });
    }
    if (!/^https?:$/i.test(parsed.protocol)) {
      return res.status(400).json({ error: 'Invalid protocol' });
    }

    const playlist = isPlaylistUrl(decodedUrl);
    const headers = { ...UPSTREAM_HEADERS };
    if (!playlist && req.headers.range) {
      headers.Range = req.headers.range;
    }

    const response = await fetch(decodedUrl, {
      method: req.method === 'HEAD' ? 'GET' : req.method,
      headers,
      redirect: 'follow',
    });

    if (!response.ok) {
      return res.status(response.status).send(`Upstream Error: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || '';
    const isHlsContent =
      playlist ||
      contentType.includes('mpegurl') ||
      contentType.includes('application/vnd.apple.mpegurl') ||
      contentType.includes('application/x-mpegURL');

    ['accept-ranges', 'content-range'].forEach((h) => {
      const val = response.headers.get(h);
      if (val) {
        res.setHeader(
          h.replace(/(^|-)(\w)/g, (c) => c.toUpperCase()),
          val,
        );
      }
    });

    if (isHlsContent) {
      const text = await response.text();
      const baseUrl = new URL(decodedUrl);
      const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
      const host = req.headers.host;
      const origin = `${protocol}://${host}`;

      const rewritten = text
        .split(/\r?\n/)
        .map((line) => {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#')) {
            try {
              const abs = new URL(trimmed, baseUrl).toString();
              return proxyUrl(origin, abs);
            } catch {
              return line;
            }
          }
          if (line.includes('URI="')) {
            return line.replace(/URI="([^"]+)"/g, (_, uri) => {
              try {
                const abs = new URL(uri, baseUrl).toString();
                return `URI="${proxyUrl(origin, abs)}"`;
              } catch {
                return _;
              }
            });
          }
          return line;
        })
        .join('\n');

      const body = Buffer.from(rewritten);
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      res.setHeader('Content-Length', body.length);
      return res.status(200).send(body);
    }

    if (contentType) res.setHeader('Content-Type', contentType);
    else if (decodedUrl.includes('/content/')) {
      res.setHeader('Content-Type', 'video/mp2t');
    }

    res.removeHeader('Content-Length');
    res.status(response.status);

    if (!response.body) {
      const buf = Buffer.from(await response.arrayBuffer());
      return res.end(buf);
    }

    const reader = response.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
    res.end();
  } catch (error) {
    console.error('[VAPLAYER PROXY] Error:', error);
    if (!res.headersSent) res.status(500).json({ error: error.message });
  }
}
