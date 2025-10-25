import axios from 'axios';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    const decodedUrl = decodeURIComponent(url);
    console.log(`[DARKIBOX PROXY] Proxying URL: ${decodedUrl}`);

    const response = await axios.get(decodedUrl, {
      responseType: 'stream',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://darkibox.com/',
        'Origin': 'https://darkibox.com',
        ...(req.headers.range && { 'Range': req.headers.range }),
      },
      timeout: 30000,
    });

    // Set appropriate headers for streaming
    res.setHeader('Content-Type', response.headers['content-type'] || 'application/vnd.apple.mpegurl');
    if (response.headers['content-length']) {
      res.setHeader('Content-Length', response.headers['content-length']);
    }
    if (response.headers['accept-ranges']) {
      res.setHeader('Accept-Ranges', response.headers['accept-ranges']);
    }
    if (response.headers['content-range']) {
      res.setHeader('Content-Range', response.headers['content-range']);
    }

    response.data.pipe(res);
  } catch (error) {
    console.error('Error proxying Darkibox stream:', error.message);
    if (error.response) {
      console.error('Darkibox proxy response error:', error.response.status, error.response.data);
      res.status(error.response.status).json({ error: `Failed to proxy Darkibox stream: ${error.response.statusText}` });
    } else {
      res.status(500).json({ error: 'Failed to proxy Darkibox stream' });
    }
  }
}
