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
    const { url } = req.body;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL VidMoly requise' });
    }

    if (!url.includes('vidmoly.net')) {
      return res.status(400).json({ error: 'URL VidMoly invalide' });
    }

    console.log(`🚀 Extraction du lien VidMoly pour : ${url}`);

    // Utiliser axios pour récupérer le contenu de la page avec headers anti-détection
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0',
        'DNT': '1',
        'Referer': 'https://www.google.com/',
      },
      timeout: 15000,
      maxRedirects: 5
    });

    const html = response.data;

    // Extraire le lien m3u8 avec une regex
    const playerSetupMatch = html.match(/player\.setup\s*\(\s*\{[^}]*sources:\s*\[\s*\{\s*file:\s*["']([^"']+)["']/);
    
    if (!playerSetupMatch) {
      return res.status(404).json({ 
        error: 'Impossible de trouver le lien m3u8 sur la page VidMoly.' 
      });
    }
    
    const brokenUrl = playerSetupMatch[1];
    const masterM3u8Url = brokenUrl.replace(/,/g, '');
    
    console.log(`✅ Lien master.m3u8 trouvé : ${masterM3u8Url}`);

    return res.status(200).json({ 
      success: true,
      m3u8Url: masterM3u8Url,
      source: 'vidmoly',
      originalUrl: url
    });

  } catch (error) {
    console.error(`❌ Erreur lors de l'extraction VidMoly : ${error.message}`);
    return res.status(500).json({ 
      error: 'Erreur serveur lors de l\'extraction VidMoly',
      details: error.message 
    });
  }
}
