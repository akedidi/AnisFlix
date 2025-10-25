import axios from 'axios';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { type, url } = req.body;

    if (!type || !url) {
      return res.status(400).json({ error: 'Type and URL are required' });
    }

    console.log(`[EXTRACT] Type: ${type}, URL: ${url}`);

    let headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    };

    // Configuration selon le type d'extraction
    switch (type) {
      case 'vidzy':
        headers['Referer'] = 'https://vidzy.org/';
        break;
      case 'vidsrc':
        headers['Referer'] = 'https://vidsrc.me/';
        break;
      default:
        return res.status(400).json({ error: 'Invalid extraction type' });
    }

    // Faire la requête vers l'URL
    const response = await axios.get(url, {
      headers,
      timeout: 15000,
    });

    // Retourner une réponse basée sur le type
    if (type === 'vidsrc' && req.body.action === 'm3u8') {
      // Pour VidSrc M3U8
      res.json({
        success: true,
        m3u8Url: url,
        message: 'VidSrc M3U8 retrieved'
      });
    } else {
      // Pour les extractions générales
      res.json({
        success: true,
        extractedUrl: url,
        message: `${type} extraction completed`
      });
    }

  } catch (error) {
    console.error(`[EXTRACT ERROR] Type: ${req.body?.type}, Error:`, error.message);
    res.status(500).json({ 
      error: `Failed to extract ${req.body?.type || 'unknown'}`,
      details: error.message 
    });
  }
}
