// Proxy segments (gère Range + stream) - exactement comme votre code fonctionnel
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const target = req.query.url;
    if (!target) return res.status(400).send('Paramètre "url" manquant.');

    // Headers exacts de votre code fonctionnel
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
      'Origin': 'https://directfr.lat',
      'Referer': 'https://directfr.lat/',
      'Accept': 'application/vnd.apple.mpegurl, application/x-mpegURL, */*',
      'Accept-Language': 'fr-FR,fr;q=0.7,en;q=0.6',
      'Connection': 'keep-alive'
    };

    // Ajouter Range header si présent (pour les requêtes de segments)
    if (req.headers.range) {
      headers.Range = req.headers.range;
    }

    const response = await fetch(target, { 
      method: 'GET',
      headers: headers,
      redirect: 'follow'
    });

    console.log(`[SEG] ${response.status} ← ${target}`);

    if (response.status >= 400) {
      return res.status(response.status).send('Erreur distante segment.');
    }

    // Propager quelques headers utiles (comme votre code fonctionnel)
    const headersToPropagate = ['content-type', 'content-length', 'accept-ranges', 'content-range', 'cache-control'];
    headersToPropagate.forEach(h => {
      const value = response.headers.get(h);
      if (value) res.setHeader(h, value);
    });

    res.status(response.status);
    
    // Streamer le contenu
    const reader = response.body.getReader();
    const pump = async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
        res.end();
      } catch (error) {
        console.error('[SEG STREAM ERROR]', error);
        res.end();
      }
    };
    
    pump();

  } catch (error) {
    console.error('[SEG ERROR]', error.message);
    res.status(500).send('Erreur proxy segment.');
  }
}
