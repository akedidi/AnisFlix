const { vidsrcScraper } = require('./vidsrc-scraper');

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
        body: JSON.stringify({ error: 'URL VidSrc requise' }),
      };
    }
    
    if (!url.includes('vidsrc.io')) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'URL VidSrc invalide' }),
      };
    }
    
    const result = await vidsrcScraper.extractStreamingLinks(url);
    
    if (!result.success) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ 
          error: result.error || 'Impossible d\'extraire les liens de streaming' 
        }),
      };
    }
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        m3u8Url: result.m3u8Url,
        players: result.players
      }),
    };
  } catch (error) {
    console.error('Erreur lors de l\'extraction VidSrc:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Erreur serveur lors de l\'extraction' }),
    };
  }
};
