import axios from 'axios';

export default async function handler(req, res) {
  // CORS headers
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
    const { m3u8Url } = req.body;

    if (!m3u8Url || typeof m3u8Url !== 'string') {
      return res.status(400).json({ error: 'URL m3u8 Darkibox requise' });
    }

    if (!m3u8Url.includes('darkibox.com')) {
      return res.status(400).json({ error: 'URL Darkibox invalide' });
    }

    console.log(`🎬 Scraping du lien m3u8 Darkibox : ${m3u8Url}`);

    // Récupérer le contenu de la playlist m3u8
    const response = await axios.get(m3u8Url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://darkibox.com/'
      }
    });

    const playlistContent = response.data;
    
    if (!playlistContent || !playlistContent.includes('#EXTM3U')) {
      return res.status(404).json({ 
        error: 'Contenu de playlist m3u8 invalide' 
      });
    }

    // Extraire les informations de la playlist
    const lines = playlistContent.split('\n');
    const streamInfo = lines.find(line => line.includes('#EXT-X-STREAM-INF'));
    const streamUrl = lines.find(line => line.startsWith('https://') && line.includes('.m3u8'));
    
    if (!streamUrl) {
      return res.status(404).json({ 
        error: 'Impossible de trouver l\'URL de stream dans la playlist' 
      });
    }

    // Extraire les métadonnées si disponibles
    let bandwidth = null;
    let resolution = null;
    let codecs = null;
    
    if (streamInfo) {
      const bandwidthMatch = streamInfo.match(/BANDWIDTH=(\d+)/);
      const resolutionMatch = streamInfo.match(/RESOLUTION=(\d+x\d+)/);
      const codecsMatch = streamInfo.match(/CODECS="([^"]+)"/);
      
      bandwidth = bandwidthMatch ? parseInt(bandwidthMatch[1]) : null;
      resolution = resolutionMatch ? resolutionMatch[1] : null;
      codecs = codecsMatch ? codecsMatch[1] : null;
    }

    console.log(`✅ Stream URL Darkibox extraite : ${streamUrl}`);

    return res.status(200).json({
      success: true,
      streamUrl: streamUrl,
      originalUrl: m3u8Url,
      metadata: {
        bandwidth,
        resolution,
        codecs
      },
      source: 'darkibox'
    });

  } catch (error) {
    console.error('❌ Erreur lors du scraping Darkibox:', error);
    
    if (error.response) {
      return res.status(error.response.status).json({
        error: 'Erreur lors de la récupération de la playlist',
        details: error.response.statusText
      });
    }
    
    return res.status(500).json({ 
      error: 'Erreur serveur lors du scraping Darkibox',
      details: error.message 
    });
  }
}

