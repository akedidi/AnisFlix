// SuperVideo HLS Proxy based on the provided working code
import axios from 'axios';

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

  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'URL parameter is required' });
  }

  try {
    console.log(`🚀 Proxying HLS request for: ${url}`);

    // Extract the target path from the URL
    const targetUrl = new URL(url);
    const targetPath = targetUrl.pathname.substring(1);
    const hostUrl = targetUrl.origin;

    // Headers for the request
    const headers = {
      'Referer': 'https://supervideo.cc/',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
    };

    // Add Range header if present in the request
    if (req.headers.range) {
      headers['Range'] = req.headers.range;
    }

    // Make the request to the target URL
    const response = await axios.get(url, {
      headers: headers,
      responseType: 'arraybuffer',
      maxRedirects: 5,
    });

    // Set appropriate content type
    res.set('Content-Type', response.headers['content-type'] || 'application/octet-stream');

    // If it's a playlist M3U8, modify the internal links to point to our proxy
    if (response.headers['content-type'] && response.headers['content-type'].includes('mpegurl')) {
      let playlistContent = response.data.toString('utf8');
      
      // Replace all segment and playlist links with our proxy URLs
      playlistContent = playlistContent.replace(/([a-zA-Z0-9-]+\.(ts|m3u8))/g, (match) => {
        // Construct the proxy URL for this segment/playlist
        const basePath = targetPath.split('/').slice(0, -1).join('/');
        const fullUrl = `${hostUrl}/${basePath}/${match}`;
        return `/api/supervideo-proxy?url=${encodeURIComponent(fullUrl)}`;
      });
      
      return res.send(playlistContent);
    }

    // For segments and other content, send as-is
    res.send(response.data);

  } catch (error) {
    console.error(`❌ Proxy error for ${url}:`, error.message);
    
    if (error.response) {
      res.status(error.response.status).send(error.response.data);
    } else {
      res.status(500).json({ 
        error: 'Proxy error',
        details: error.message 
      });
    }
  }
}
