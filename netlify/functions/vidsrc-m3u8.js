const { extractVidSrcM3u8 } = require('./vidsrc-scraper');

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
    
    const m3u8Link = await extractVidSrcM3u8(url);
    
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
    console.error('Erreur lors de l\'extraction m3u8 VidSrc:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Erreur serveur lors de l\'extraction' }),
    };
  }
};
