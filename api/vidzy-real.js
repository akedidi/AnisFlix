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
      return res.status(400).json({ error: 'URL Vidzy requise' });
    }

    if (!url.includes('vidzy.org')) {
      return res.status(400).json({ error: 'URL Vidzy invalide' });
    }

    // Extraction réelle avec fetch
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': 'https://vidzy.org/'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    
    // Recherche du lien m3u8 dans le HTML
    let m3u8Link = null;
    
    // Méthode 1: Recherche dans les scripts
    const scriptMatches = html.match(/<script[^>]*>([\s\S]*?)<\/script>/gi);
    if (scriptMatches) {
      for (const script of scriptMatches) {
        const m3u8Match = script.match(/https?:\/\/[^"'\s]+\.m3u8[^"'\s]*/);
        if (m3u8Match) {
          m3u8Link = m3u8Match[0];
          break;
        }
      }
    }

    // Méthode 2: Recherche directe dans le HTML
    if (!m3u8Link) {
      const directMatch = html.match(/https?:\/\/[^"'\s]+\.m3u8[^"'\s]*/);
      if (directMatch) {
        m3u8Link = directMatch[0];
      }
    }

    // Méthode 3: Recherche dans les attributs data
    if (!m3u8Link) {
      const dataMatch = html.match(/data-src="([^"]*\.m3u8[^"]*)"/);
      if (dataMatch) {
        m3u8Link = dataMatch[1];
      }
    }

    if (!m3u8Link) {
      return res.status(404).json({ error: 'Impossible d\'extraire le lien m3u8' });
    }

    return res.status(200).json({ m3u8Url: m3u8Link });

  } catch (error) {
    console.error('Erreur lors de l\'extraction Vidzy:', error);
    return res.status(500).json({ error: 'Erreur serveur lors de l\'extraction' });
  }
}
