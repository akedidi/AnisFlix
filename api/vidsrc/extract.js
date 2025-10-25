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
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    console.log(`[VIDSRC EXTRACT] Extracting from URL: ${url}`);

    // Simuler l'extraction VidSrc (à adapter selon vos besoins)
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://vidsrc.me/',
      },
      timeout: 15000,
    });

    // Ici vous devriez implémenter la logique d'extraction VidSrc
    // Pour l'instant, on retourne une réponse simulée
    res.json({
      success: true,
      extractedUrl: url,
      message: 'VidSrc extraction completed'
    });

  } catch (error) {
    console.error('Error extracting VidSrc:', error.message);
    res.status(500).json({ 
      error: 'Failed to extract VidSrc URL',
      details: error.message 
    });
  }
}
