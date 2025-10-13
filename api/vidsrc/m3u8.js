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

    // Scraper VidSrc pour m3u8 direct
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': 'https://vidsrc.io/'
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);
    
    let m3u8Link = null;

    // Chercher le lien m3u8 dans les scripts
    $('script').each((i, script) => {
      const scriptContent = $(script).html();
      if (scriptContent) {
        const m3u8Match = scriptContent.match(/https?:\/\/[^"'\s]+\.m3u8[^"'\s]*/);
        if (m3u8Match) {
          m3u8Link = m3u8Match[0];
          return false; // break
        }
      }
    });

    // Chercher dans le contenu de la page
    if (!m3u8Link) {
      const pageContent = response.data;
      const m3u8Match = pageContent.match(/https?:\/\/[^"'\s]+\.m3u8[^"'\s]*/);
      if (m3u8Match) {
        m3u8Link = m3u8Match[0];
      }
    }

    if (!m3u8Link) {
      return res.status(404).json({ error: 'Impossible d\'extraire le lien m3u8' });
    }

    return res.status(200).json({ m3u8Url: m3u8Link });

  } catch (error) {
    console.error('Erreur lors de l\'extraction m3u8 VidSrc:', error);
    return res.status(500).json({ error: 'Erreur serveur lors de l\'extraction' });
  }
}
