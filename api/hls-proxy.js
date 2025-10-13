// HLS Proxy for SuperVideo streams
// Handles master.m3u8, index.m3u8, and segment proxying

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url, type } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'URL parameter is required' });
  }

  try {
    console.log(`🎬 HLS Proxy: ${type || 'unknown'} - ${url.substring(0, 80)}...`);

    // Headers for the upstream request
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
      'Accept': '*/*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
    };

    // Add Range header for segments if present
    if (req.headers.range) {
      headers['Range'] = req.headers.range;
    }

    // Fetch the content
    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`Upstream error: ${response.status} ${response.statusText}`);
    }

    // Get content type
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    
    // Set appropriate headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');

    // Copy important headers from upstream
    const headersToCopy = [
      'content-length',
      'content-range', 
      'accept-ranges',
      'cache-control',
      'etag',
      'last-modified'
    ];

    headersToCopy.forEach(header => {
      const value = response.headers.get(header);
      if (value) {
        res.setHeader(header, value);
      }
    });

    // Handle different content types
    if (contentType.includes('application/vnd.apple.mpegurl') || contentType.includes('application/x-mpegurl')) {
      // This is an M3U8 playlist - we need to rewrite URLs
      const playlistText = await response.text();
      const rewrittenPlaylist = rewritePlaylistUrls(playlistText, url);
      
      res.status(response.status);
      res.send(rewrittenPlaylist);
    } else {
      // This is a segment or other binary content - stream it
      res.status(response.status);
      
      // Stream the response body
      const reader = response.body.getReader();
      const pump = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(value);
          }
          res.end();
        } catch (error) {
          console.error('Streaming error:', error);
          res.end();
        }
      };
      
      pump();
    }

  } catch (error) {
    console.error('HLS Proxy error:', error.message);
    res.status(500).json({ 
      error: 'Failed to proxy HLS content',
      details: error.message 
    });
  }
}

/**
 * Rewrite M3U8 playlist URLs to point to our proxy
 */
function rewritePlaylistUrls(playlistText, baseUrl) {
  const baseUrlObj = new URL(baseUrl);
  const basePath = baseUrlObj.pathname.substring(0, baseUrlObj.pathname.lastIndexOf('/'));
  
  return playlistText
    .split('\n')
    .map(line => {
      const trimmedLine = line.trim();
      
      // Skip comments and empty lines
      if (!trimmedLine || trimmedLine.startsWith('#')) {
        return line;
      }
      
      // Skip if it's already a full URL
      if (trimmedLine.startsWith('http')) {
        return line;
      }
      
      // Rewrite relative URLs to point to our proxy
      const proxyUrl = `${baseUrlObj.origin}${basePath}/${trimmedLine}`;
      return `/api/hls-proxy?url=${encodeURIComponent(proxyUrl)}&type=segment`;
    })
    .join('\n');
}
