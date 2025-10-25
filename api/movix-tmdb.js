import axios from 'axios';

// Configuration CORS
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.PUBLIC_SITE_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Headers pour les requêtes vers Movix
const MOVIX_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
  'Referer': 'https://movix.site/',
  'Origin': 'https://movix.site',
};

export default async function handler(req, res) {
  // Configuration CORS
  Object.entries(CORS_HEADERS).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { movieId } = req.query;
    
    if (!movieId) {
      return res.status(400).json({ error: 'movieId is required' });
    }
    
    console.log(`[MOVIX TMDB] Fetching sources for movie: ${movieId}`);
    
    // Construire l'URL Movix TMDB
    const movixUrl = `https://api.movix.site/api/tmdb/movie/${movieId}`;
    console.log(`[MOVIX TMDB] URL: ${movixUrl}`);
    
    // Faire la requête vers Movix
    const response = await axios.get(movixUrl, {
      headers: MOVIX_HEADERS,
      timeout: 15000,
      validateStatus: (status) => status < 500, // Accepter les 4xx mais pas les 5xx
    });

    console.log(`[MOVIX TMDB] Response status: ${response.status}`);

    // Si la réponse est un succès, renvoyer les données
    if (response.status >= 200 && response.status < 300) {
      res.status(response.status).json(response.data);
    } else {
      // Pour les erreurs 4xx, renvoyer l'erreur avec le bon status
      res.status(response.status).json({
        error: 'Erreur API Movix TMDB',
        status: response.status,
        message: response.statusText,
        data: response.data
      });
    }

  } catch (error) {
    console.error('[MOVIX TMDB ERROR]', error.message);
    
    if (error.response) {
      // Erreur de réponse HTTP
      console.error(`[MOVIX TMDB ERROR] Status: ${error.response.status}`);
      console.error(`[MOVIX TMDB ERROR] Data:`, error.response.data);
      
      res.status(502).json({
        error: 'Erreur proxy Movix TMDB',
        status: error.response.status,
        message: error.response.statusText,
        details: error.message
      });
    } else if (error.request) {
      // Erreur de réseau
      console.error('[MOVIX TMDB ERROR] Pas de réponse reçue');
      
      res.status(502).json({
        error: 'Erreur réseau Movix TMDB',
        message: 'Impossible de contacter l\'API Movix TMDB',
        details: error.message
      });
    } else {
      // Autre erreur
      console.error('[MOVIX TMDB ERROR] Erreur inconnue:', error.message);
      
      res.status(500).json({
        error: 'Erreur serveur proxy Movix TMDB',
        message: 'Erreur interne du serveur',
        details: error.message
      });
    }
  }
}
