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
    const { path, ...queryParams } = req.query;
    
    if (!path) {
      return res.status(400).json({ error: 'Paramètre "path" manquant' });
    }

    // Construire l'URL Movix
    // Décoder le path pour éviter le double encodage
    const decodedPath = decodeURIComponent(path);
    
    // Déterminer le type de requête pour améliorer les logs
    const isTmdbRequest = decodedPath.startsWith('tmdb/');
    const isAnimeRequest = decodedPath.startsWith('anime/search/');
    
    if (isTmdbRequest) {
      console.log(`🚀 [MOVIX TMDB] Fetching sources for: ${decodedPath}`);
    } else {
      console.log(`[MOVIX PROXY] Path original: ${path}`);
      console.log(`[MOVIX PROXY] Path décodé: ${decodedPath}`);
    }
    
    // Gérer le cas spécial pour anime/search qui n'a pas besoin de /api/
    let movixUrl;
    if (isAnimeRequest) {
      movixUrl = `https://api.movix.site/${decodedPath}`;
    } else {
      movixUrl = `https://api.movix.site/api/${decodedPath}`;
    }
    const url = new URL(movixUrl);
    
    // Ajouter les query parameters
    Object.entries(queryParams).forEach(([key, value]) => {
      if (key !== 'path') {
        url.searchParams.append(key, value);
      }
    });

    if (isTmdbRequest) {
      console.log(`[MOVIX TMDB] URL: ${url.toString()}`);
    } else {
      console.log(`[MOVIX PROXY] Requête vers: ${url.toString()}`);
    }

    // Faire la requête vers Movix
    const response = await axios.get(url.toString(), {
      headers: MOVIX_HEADERS,
      timeout: 15000,
      validateStatus: (status) => status < 500, // Accepter les 4xx mais pas les 5xx
    });

    if (isTmdbRequest) {
      console.log(`[MOVIX TMDB] Response status: ${response.status}`);
    } else {
      console.log(`[MOVIX PROXY] Réponse reçue: ${response.status} ${response.statusText}`);
    }

    // Si la réponse est un succès, renvoyer les données
    if (response.status >= 200 && response.status < 300) {
      res.status(response.status).json(response.data);
    } else {
      // Pour les erreurs 4xx, renvoyer l'erreur avec le bon status
      res.status(response.status).json({
        error: isTmdbRequest ? 'Erreur API Movix TMDB' : 'Erreur API Movix',
        status: response.status,
        message: response.statusText,
        data: response.data
      });
    }

  } catch (error) {
    const isTmdbRequest = req.query.path && decodeURIComponent(req.query.path).startsWith('tmdb/');
    const errorPrefix = isTmdbRequest ? '[MOVIX TMDB ERROR]' : '[MOVIX PROXY ERROR]';
    
    console.error(errorPrefix, error.message);
    
    if (error.response) {
      // Erreur de réponse HTTP
      console.error(`${errorPrefix} Status: ${error.response.status}`);
      console.error(`${errorPrefix} Data:`, error.response.data);
      
      res.status(502).json({
        error: isTmdbRequest ? 'Erreur proxy Movix TMDB' : 'Erreur proxy Movix',
        status: error.response.status,
        message: error.response.statusText,
        details: error.message
      });
    } else if (error.request) {
      // Erreur de réseau
      console.error(`${errorPrefix} Pas de réponse reçue`);
      
      res.status(502).json({
        error: isTmdbRequest ? 'Erreur réseau Movix TMDB' : 'Erreur réseau Movix',
        message: `Impossible de contacter l'API Movix${isTmdbRequest ? ' TMDB' : ''}`,
        details: error.message
      });
    } else {
      // Autre erreur
      console.error(`${errorPrefix} Erreur inconnue:`, error.message);
      
      res.status(500).json({
        error: isTmdbRequest ? 'Erreur serveur proxy Movix TMDB' : 'Erreur serveur proxy Movix',
        message: 'Erreur interne du serveur',
        details: error.message
      });
    }
  }
}
