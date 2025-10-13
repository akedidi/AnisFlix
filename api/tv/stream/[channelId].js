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
    const { channelId } = req.query;

    if (!channelId) {
      return res.status(400).json({ error: 'Channel ID required' });
    }

    // URL de base pour les flux TV
    const baseUrl = 'https://fremtv.lol';
    const streamUrl = `${baseUrl}/live/5A24C0D16059EDCC6A20E0CE234C7A25/${channelId}.m3u8`;

    console.log(`[TV STREAM] Fetching: ${streamUrl}`);

    // Headers pour simuler un navigateur
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
      'Accept': 'application/vnd.apple.mpegurl, application/x-mpegURL, */*',
      'Accept-Language': 'fr-FR,fr;q=0.7,en;q=0.6',
      'Connection': 'keep-alive',
      'Referer': 'https://fremtv.lol/'
    };

    // Faire la requête vers le flux TV
    const response = await fetch(streamUrl, { headers });

    if (!response.ok) {
      console.error(`[TV STREAM ERROR] ${response.status} ${response.statusText}`);
      return res.status(response.status).json({ 
        error: 'Failed to fetch TV stream',
        status: response.status,
        statusText: response.statusText
      });
    }

    const contentType = response.headers.get('content-type') || '';
    console.log(`[TV STREAM] ${response.status} ${contentType}`);

    // Vérifier le type de contenu
    if (contentType.includes('video/mp4')) {
      // C'est un fichier MP4 direct, le proxifier
      console.log(`[TV STREAM] Direct MP4 stream detected`);
      
      // Créer une playlist m3u8 simple qui pointe vers notre proxy
      const playlist = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:10
#EXT-X-MEDIA-SEQUENCE:0
#EXTINF:10.0,
/api/tv-proxy-segment?url=${encodeURIComponent(streamUrl)}
#EXT-X-ENDLIST`;

      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      res.status(200).send(playlist);
    } else if (contentType.includes('mpegurl') || contentType.includes('m3u8')) {
      // C'est une playlist m3u8, la traiter normalement
      const playlistData = await response.text();

      // Réécrire les URLs dans la playlist pour qu'elles passent par notre proxy
      const rewrittenPlaylist = playlistData
        .split('\n')
        .map((line) => {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) return line;
          
          // Si c'est une URL relative, la rendre absolue
          let absoluteUrl = trimmed;
          if (!trimmed.startsWith('http')) {
            absoluteUrl = new URL(trimmed, streamUrl).toString();
          }
          
          // Proxifier l'URL
          if (absoluteUrl.includes('.m3u8')) {
            return `/api/tv-proxy-m3u8?url=${encodeURIComponent(absoluteUrl)}`;
          } else {
            return `/api/tv-proxy-segment?url=${encodeURIComponent(absoluteUrl)}`;
          }
        })
        .join('\n');

      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      res.status(200).send(rewrittenPlaylist);
    } else {
      return res.status(502).json({ error: 'Unsupported content type: ' + contentType });
    }

  } catch (error) {
    console.error('[TV STREAM ERROR]', error.message);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message
    });
  }
}
