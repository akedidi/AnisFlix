import axios from 'axios';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { seriesId, season, episode } = req.query;

    if (!seriesId || !season || !episode) {
      return res.status(400).json({ 
        error: 'seriesId, season et episode sont requis' 
      });
    }

    console.log(`🎬 Récupération des sources Darki pour série ${seriesId}, saison ${season}, épisode ${episode}`);

    // Appel à l'API Movix pour les sources Darki (liens embed)
    const apiUrl = `https://api.movix.site/api/series/download/${seriesId}/season/${season}/episode/${episode}`;
    
    const response = await axios.get(apiUrl, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.data || !response.data.sources || response.data.sources.length === 0) {
      return res.status(404).json({ 
        error: 'Aucune source Darki trouvée pour cette série' 
      });
    }

    // Filtrer uniquement les sources avec des liens embed (Darki) et utiliser directement le m3u8
    const darkiSources = response.data.sources
      .filter(source => source.src && source.src.includes('darkibox.com/embed-') && source.m3u8)
      .map((source, index) => ({
        id: `darki-series-${index + 1}`,
        language: source.language,
        quality: source.quality,
        m3u8: source.m3u8, // Utiliser directement le lien m3u8
        provider: 'darki',
        type: 'm3u8'
      }));

    if (darkiSources.length === 0) {
      return res.status(404).json({ 
        error: 'Aucune source Darki (embed) trouvée pour cette série' 
      });
    }

    console.log(`✅ ${darkiSources.length} sources Darki trouvées pour la série`);

    return res.status(200).json({
      success: true,
      sources: darkiSources,
      seriesId: parseInt(seriesId),
      season: parseInt(season),
      episode: parseInt(episode),
      total: darkiSources.length
    });

  } catch (error) {
    console.error('❌ Erreur lors de la récupération des sources Darki:', error);
    
    if (error.response) {
      return res.status(error.response.status).json({
        error: 'Erreur API Movix',
        details: error.response.data
      });
    }
    
    return res.status(500).json({ 
      error: 'Erreur serveur lors de la récupération des sources Darki',
      details: error.message 
    });
  }
}
