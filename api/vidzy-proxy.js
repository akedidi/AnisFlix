import axios from 'axios';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { url, referer } = req.query;

    if (!url) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }

    console.log('🔄 Vidzy Proxy - Fetching URL:', url);
    console.log('🔄 Vidzy Proxy - Referer:', referer);

    // Determine if this is a segment or m3u8 based on URL
    const isSegment = url.includes('.ts') || url.includes('.m4s') || url.includes('.mp4');
    
    // Fetch the content with appropriate headers
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        'Accept': isSegment 
          ? 'video/mp2t, application/octet-stream, */*'
          : 'application/vnd.apple.mpegurl, application/x-mpegURL, application/octet-stream, */*',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        ...(referer && { 'Referer': referer }),
        ...(req.headers.range && { 'Range': req.headers.range })
      },
      timeout: 15000,
      maxRedirects: 5,
      responseType: isSegment ? 'stream' : 'text'
    });

    if (isSegment) {
      // Handle video segments
      console.log('📺 Vidzy Proxy - Proxying video segment');
      
      // Set proper headers for segment content
      res.setHeader('Content-Type', response.headers['content-type'] || 'video/mp2t');
      if (response.headers['content-length']) {
        res.setHeader('Content-Length', response.headers['content-length']);
      }
      if (response.headers['accept-ranges']) {
        res.setHeader('Accept-Ranges', response.headers['accept-ranges']);
      }
      if (response.headers['content-range']) {
        res.setHeader('Content-Range', response.headers['content-range']);
      }
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      console.log('✅ Vidzy Proxy - Successfully proxied video segment');
      response.data.pipe(res);
    } else {
      // Handle m3u8 playlists
      const content = response.data;
      
      // Check if it's a valid m3u8 content
      if (!content.includes('#EXTM3U') && !content.includes('#EXT-X-')) {
        console.error('❌ Vidzy Proxy - Invalid m3u8 content received');
        return res.status(400).json({ error: 'Invalid m3u8 content' });
      }

      // Rewrite segment URLs to use our proxy
      const baseUrl = 'https://anisflix.vercel.app/api/vidzy-proxy';
      const rewrittenContent = content.replace(
        /(https?:\/\/[^\s\n]+\.(?:ts|m4s|mp4)[^\s\n]*)/g,
        (match) => {
          const encodedUrl = encodeURIComponent(match);
          const encodedReferer = referer ? encodeURIComponent(referer) : encodeURIComponent('https://vidzy.org/');
          return `${baseUrl}?url=${encodedUrl}&referer=${encodedReferer}`;
        }
      );

      // Set proper headers for m3u8 content
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      console.log('✅ Vidzy Proxy - Successfully proxied and rewritten m3u8 content');
      return res.status(200).send(rewrittenContent);
    }

  } catch (error) {
    console.error('❌ Vidzy Proxy Error:', error.message);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
      return res.status(error.response.status).json({ 
        error: 'Proxy request failed',
        details: error.response.data 
      });
    }
    
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}
