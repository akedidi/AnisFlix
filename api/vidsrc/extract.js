const axios = require('axios');
const cheerio = require('cheerio');

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
    const { url } = req.body;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL VidSrc requise' });
    }

    if (!url.includes('vidsrc.io')) {
      return res.status(400).json({ error: 'URL VidSrc invalide' });
    }

    // Scraper VidSrc simplifié
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': 'https://vidsrc.io/'
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);
    
    let m3u8Url = null;
    const players = [];

    // Chercher les liens de streaming
    $('script').each((i, script) => {
      const scriptContent = $(script).html();
      if (scriptContent) {
        // Chercher les URLs m3u8
        const m3u8Matches = scriptContent.match(/https?:\/\/[^"'\s]+\.m3u8[^"'\s]*/g);
        if (m3u8Matches) {
          m3u8Url = m3u8Matches[0];
        }

        // Chercher les players
        const playerMatches = scriptContent.match(/https?:\/\/[^"'\s]*player[^"'\s]*/g);
        if (playerMatches) {
          players.push(...playerMatches);
        }
      }
    });

    // Chercher dans les iframes
    $('iframe').each((i, iframe) => {
      const src = $(iframe).attr('src');
      if (src && (src.includes('m3u8') || src.includes('player'))) {
        if (src.includes('m3u8') && !m3u8Url) {
          m3u8Url = src;
        }
        if (src.includes('player')) {
          players.push(src);
        }
      }
    });

    if (!m3u8Url && players.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Impossible d\'extraire les liens de streaming' 
      });
    }

    return res.status(200).json({
      success: true,
      m3u8Url: m3u8Url,
      players: players
    });

  } catch (error) {
    console.error('Erreur lors de l\'extraction VidSrc:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Erreur serveur lors de l\'extraction' 
    });
  }
}
