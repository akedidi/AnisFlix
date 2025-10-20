import axios from 'axios';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

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

    // Fetch the m3u8 content with proper headers
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        'Accept': 'application/vnd.apple.mpegurl, application/x-mpegURL, application/octet-stream, */*',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        ...(referer && { 'Referer': referer })
      },
      timeout: 15000,
      maxRedirects: 5,
      responseType: 'text'
    });

    const content = response.data;
    
    // Check if it's a valid m3u8 content
    if (!content.includes('#EXTM3U') && !content.includes('#EXT-X-')) {
      console.error('❌ Vidzy Proxy - Invalid m3u8 content received');
      return res.status(400).json({ error: 'Invalid m3u8 content' });
    }

    // Set proper headers for m3u8 content
    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    console.log('✅ Vidzy Proxy - Successfully proxied m3u8 content');
    return res.status(200).send(content);

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
