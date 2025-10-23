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
    console.log(`[MOVIX PROXY] Path original: ${path}`);
    console.log(`[MOVIX PROXY] Path décodé: ${decodedPath}`);
    
    // Gérer le cas spécial pour anime/search qui n'a pas besoin de /api/
    let movixUrl;
    if (decodedPath.startsWith('anime/search/')) {
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

    console.log(`[MOVIX PROXY] Requête vers: ${url.toString()}`);

    // Faire la requête vers Movix
    const response = await axios.get(url.toString(), {
      headers: MOVIX_HEADERS,
      timeout: 15000,
      validateStatus: (status) => status < 500, // Accepter les 4xx mais pas les 5xx
    });

    console.log(`[MOVIX PROXY] Réponse reçue: ${response.status} ${response.statusText}`);

    // Si la réponse est un succès, renvoyer les données
    if (response.status >= 200 && response.status < 300) {
      res.status(response.status).json(response.data);
    } else {
      // Pour les erreurs 4xx, renvoyer l'erreur avec le bon status
      res.status(response.status).json({
        error: 'Erreur API Movix',
        status: response.status,
        message: response.statusText,
        data: response.data
      });
    }

  } catch (error) {
    console.error('[MOVIX PROXY ERROR]', error.message);
    
    if (error.response) {
      // Erreur de réponse HTTP
      console.error(`[MOVIX PROXY ERROR] Status: ${error.response.status}`);
      console.error(`[MOVIX PROXY ERROR] Data:`, error.response.data);
      
      res.status(502).json({
        error: 'Erreur proxy Movix',
        status: error.response.status,
        message: error.response.statusText,
        details: error.message
      });
    } else if (error.request) {
      // Erreur de réseau
      console.error('[MOVIX PROXY ERROR] Pas de réponse reçue');
      
      res.status(502).json({
        error: 'Erreur réseau Movix',
        message: 'Impossible de contacter l\'API Movix',
        details: error.message
      });
    } else {
      // Autre erreur
      console.error('[MOVIX PROXY ERROR] Erreur inconnue:', error.message);
      
      res.status(500).json({
        error: 'Erreur serveur proxy Movix',
        message: 'Erreur interne du serveur',
        details: error.message
      });
    }
  }
}
