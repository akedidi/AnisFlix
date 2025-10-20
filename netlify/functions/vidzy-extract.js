const { getVidzyM3u8Link } = require('./vidzy-scraper');

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { url } = JSON.parse(event.body);
    
    if (!url || typeof url !== 'string') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'URL Vidzy requise' }),
      };
    }
    
    if (!url.includes('vidzy.org')) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'URL Vidzy invalide' }),
      };
    }
    
    const m3u8Link = await getVidzyM3u8Link(url);
    
    if (!m3u8Link) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Impossible d\'extraire le lien m3u8' }),
      };
    }
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ m3u8Url: m3u8Link }),
    };
  } catch (error) {
    console.error('Erreur lors de l\'extraction Vidzy:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Erreur serveur lors de l\'extraction' }),
    };
  }
};
