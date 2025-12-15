import axios from 'axios';

export default async function handler(req, res) {
  // Headers CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { url, domain } = req.query;

    if (!url && !domain) {
      return res.status(400).json({ error: 'URL or domain parameter is required' });
    }

    let targetUrl;

    // Si c'est une URL complète, l'utiliser directement
    if (url) {
      targetUrl = decodeURIComponent(url);
    } else {
      // Sinon, construire l'URL à partir du domaine et du path
      const { path } = req.query;
      if (!path) {
        return res.status(400).json({ error: 'Path parameter is required when using domain' });
      }

      switch (domain) {
        case 'viamotionhsi':
          targetUrl = `https://viamotionhsi.netplus.ch/live/eds/${path}`;
          break;
        case 'simulcast-ftven':
          targetUrl = `https://simulcast-p.ftven.fr/${path}`;
          break;
        case 'arte':
          targetUrl = `https://artesimulcast.akamaized.net/hls/live/2031003/artelive_fr/${path}`;
          break;
        case 'bfm':
          targetUrl = `https://ncdn-live-bfm.pfd.sfr.net/shls/${path}`;
          break;
        case 'rt':
          targetUrl = `https://rt-fra.rttv.com/live/rtfrance/${path}`;
          break;
        case 'bfmtv':
          targetUrl = `https://live-cdn-stream-euw1.bfmtv.bct.nextradiotv.com/${path}`;
          break;
        case 'viously':
          targetUrl = `https://www.viously.com/video/hls/${path}`;
          break;
        case 'qna':
          targetUrl = `https://streamer3.qna.org.qa/${path}`;
          break;
        case 'bozztv':
          targetUrl = `https://live20.bozztv.com/${path}`;
          break;
        case 'getaj':
          targetUrl = `https://live-hls-web-${path}`;
          break;
        case 'akamaized':
          targetUrl = `https://shls-live-ak.akamaized.net/${path}`;
          break;
        case 'github':
          targetUrl = `https://raw.githubusercontent.com/${path}`;
          break;
        default:
          return res.status(400).json({ error: 'Unsupported domain' });
      }
    }

    // Determine if we are handling a playlist or a specific media segment
    const isPlaylist = targetUrl.includes('.m3u8') || targetUrl.includes('.mpd');

    console.log(`[TV DIRECT PROXY] Proxifying: ${targetUrl} (Playlist: ${isPlaylist})`);

    // For playlists, we need text to rewrite URLs. For media segments, we need binary stream.
    const responseType = req.method === 'HEAD' ? 'stream' : (isPlaylist ? 'text' : 'stream');

    const response = await axios.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/vnd.apple.mpegurl, application/x-mpegURL, application/octet-stream, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      timeout: 10000,
      responseType: responseType
    });

    console.log(`[TV DIRECT PROXY] ${response.status} ${response.headers['content-type']} ← ${targetUrl}`);

    // Pour les requêtes HEAD (segments), retourner juste les headers
    if (req.method === 'HEAD') {
      // Propager les headers utiles
      ['content-type', 'content-length', 'accept-ranges', 'content-range', 'cache-control'].forEach(h => {
        if (response.headers[h]) {
          res.setHeader(h, response.headers[h]);
        }
      });
      return res.status(response.status).end();
    }

    // If not a playlist (binary segment), pipe directly with correct headers
    if (!isPlaylist) {
      // Force correct MIME types for known extensions because upstream (e.g. GitHub) might be wrong
      if (targetUrl.includes('.ts')) {
        res.setHeader('Content-Type', 'video/mp2t');
      } else if (targetUrl.includes('.mp4')) {
        res.setHeader('Content-Type', 'video/mp4');
      } else if (targetUrl.includes('.aac')) {
        res.setHeader('Content-Type', 'audio/aac');
      } else {
        // Fallback to upstream content-type or default
        res.setHeader('Content-Type', response.headers['content-type'] || 'application/octet-stream');
      }

      // Forward other relevant headers
      if (response.headers['content-length']) res.setHeader('Content-Length', response.headers['content-length']);
      if (response.headers['accept-ranges']) res.setHeader('Accept-Ranges', response.headers['accept-ranges']);
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache long for segments

      response.data.pipe(res);
      return;
    }

    if (typeof response.data !== 'string') {
      return res.status(502).send('Pas une playlist M3U8.');
    }

    // Réécrire les URLs dans la playlist pour qu'elles passent par le proxy
    const baseUrl = new URL(targetUrl);
    const rewritten = response.data
      .replace(/^([^#\n].*\.m3u8)$/gm, (match) => {
        // Pour les sous-playlists, détecter si elles contiennent des tokens JWT
        const resolvedUrl = new URL(match, targetUrl).href;

        // Si l'URL contient un token JWT (cache1a.netplus.ch avec tok_), utiliser l'API TV standard
        if (resolvedUrl.includes('cache1a.netplus.ch') && resolvedUrl.includes('tok_')) {
          const encodedUrl = encodeURIComponent(resolvedUrl);
          return `/api/tv?url=${encodedUrl}`;
        }

        // Si c'est une sous-playlist vidéo (contient hd1-avc1_ et =), utiliser l'API TV standard
        if (resolvedUrl.includes('hd1-avc1_') && resolvedUrl.includes('=')) {
          const encodedUrl = encodeURIComponent(resolvedUrl);
          return `/api/tv?url=${encodedUrl}`;
        }

        // Use generic URL proxying which handles cross-domain (e.g. GitHub -> Dailymotion)
        return `/api/tv-direct-proxy?url=${encodeURIComponent(resolvedUrl)}`;
      })
      .replace(/URI="([^"]+\.m3u8)"/g, (match, uri) => {
        // Handle URI attributes in EXT-X-MEDIA tags (Audio/Subtitles)
        const resolvedUrl = new URL(uri, targetUrl).href;
        const proxiedUrl = `/api/tv-direct-proxy?url=${encodeURIComponent(resolvedUrl)}`;
        return `URI="${proxiedUrl}"`;
      })
      .replace(/^([^#\n].*\.ts)$/gm, (match) => {
        // Pour les segments TS, détecter si elles contiennent des tokens JWT
        const resolvedUrl = new URL(match, targetUrl).href;

        // Si l'URL contient un token JWT, utiliser l'API TV standard
        if (resolvedUrl.includes('cache1a.netplus.ch') && resolvedUrl.includes('tok_')) {
          const encodedUrl = encodeURIComponent(resolvedUrl);
          return `/api/tv?url=${encodedUrl}`;
        }

        // Use generic URL proxying which handles cross-domain (e.g. GitHub -> Dailymotion)
        return `/api/tv-direct-proxy?url=${encodeURIComponent(resolvedUrl)}`;
      });

    // Headers spécifiques pour les streams live
    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    res.status(200).send(rewritten);
  } catch (error) {
    console.error('[TV DIRECT PROXY ERROR]', error.message);
    res.status(500).send('Erreur lors de la récupération du stream TV direct.');
  }
}
