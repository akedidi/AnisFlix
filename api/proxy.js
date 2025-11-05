import axios from 'axios';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { type, url, channelId } = req.query;

  if (!type) {
    return res.status(400).json({ error: 'Type parameter is required' });
  }

  try {
    let targetUrl;
    let headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    };

    // Configuration selon le type de proxy
    switch (type) {
      case 'darkibox':
        if (!url) return res.status(400).json({ error: 'URL is required for darkibox proxy' });
        targetUrl = decodeURIComponent(url);
        headers['Referer'] = 'https://darkibox.com/';
        headers['Origin'] = 'https://darkibox.com';
        headers['Accept'] = 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8';
        break;
        
      case 'supervideo':
        if (!url) return res.status(400).json({ error: 'URL is required for supervideo proxy' });
        targetUrl = decodeURIComponent(url);
        headers['Referer'] = 'https://supervideo.tv/';
        headers['Origin'] = 'https://supervideo.tv';
        break;
        
      case 'tv-stream':
        if (!channelId) return res.status(400).json({ error: 'Channel ID is required for TV stream' });
        // Simuler l'URL de stream TV
        targetUrl = `https://example.com/stream/${channelId}.m3u8`;
        break;
        
      default:
        return res.status(400).json({ error: 'Invalid proxy type' });
    }

    console.log(`[PROXY] Type: ${type}, URL: ${targetUrl}`);

    if (type === 'tv-stream') {
      // Pour les streams TV, retourner une réponse JSON
      res.json({
        success: true,
        channelId: channelId,
        streamUrl: targetUrl,
        message: 'TV stream retrieved'
      });
    } else if (type === 'darkibox') {
      // Pour Darkibox, d'abord extraire le lien M3U8 depuis la page HTML
      console.log(`[DARKIBOX PROXY] Extracting M3U8 from: ${targetUrl}`);
      
      const htmlResponse = await axios.get(targetUrl, {
        headers,
        timeout: 15000,
      });
      
      const html = htmlResponse.data;
      console.log(`[DARKIBOX PROXY] HTML received (${html.length} chars)`);
      
      // Extraire le lien M3U8 depuis le HTML
      const m3u8Match = html.match(/file:\s*["']([^"']*\.m3u8[^"']*)["']/);
      if (!m3u8Match) {
        console.error('[DARKIBOX PROXY] No M3U8 link found in HTML');
        return res.status(404).json({ error: 'No M3U8 stream found on Darkibox page' });
      }
      
      const m3u8Url = m3u8Match[1];
      console.log(`[DARKIBOX PROXY] Extracted M3U8 URL: ${m3u8Url}`);
      
      // Maintenant faire le proxy du stream M3U8
      const streamResponse = await axios.get(m3u8Url, {
        responseType: 'stream',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://darkibox.com/',
          'Accept': 'application/vnd.apple.mpegurl, application/x-mpegURL, application/octet-stream, */*',
          ...(req.headers.range && { 'Range': req.headers.range }),
        },
        timeout: 30000,
      });

      // Set appropriate headers for streaming
      res.setHeader('Content-Type', streamResponse.headers['content-type'] || 'application/vnd.apple.mpegurl');
      if (streamResponse.headers['content-length']) {
        res.setHeader('Content-Length', streamResponse.headers['content-length']);
      }
      if (streamResponse.headers['accept-ranges']) {
        res.setHeader('Accept-Ranges', streamResponse.headers['accept-ranges']);
      }
      if (streamResponse.headers['content-range']) {
        res.setHeader('Content-Range', streamResponse.headers['content-range']);
      }

      streamResponse.data.pipe(res);
    } else {
      // Pour les autres types, faire un proxy de stream direct
      const response = await axios.get(targetUrl, {
        responseType: 'stream',
        headers: {
          ...headers,
          ...(req.headers.range && { 'Range': req.headers.range }),
        },
        timeout: 30000,
      });

      // Set appropriate headers for streaming
      res.setHeader('Content-Type', response.headers['content-type'] || 'video/mp2t');
      if (response.headers['content-length']) {
        res.setHeader('Content-Length', response.headers['content-length']);
      }
      if (response.headers['accept-ranges']) {
        res.setHeader('Accept-Ranges', response.headers['accept-ranges']);
      }
      if (response.headers['content-range']) {
        res.setHeader('Content-Range', response.headers['content-range']);
      }

      response.data.pipe(res);
    }

  } catch (error) {
    console.error(`[PROXY ERROR] Type: ${type}, Error:`, error.message);
    if (error.response) {
      console.error(`[PROXY ERROR] Response:`, error.response.status, error.response.data);
      res.status(error.response.status).json({ error: `Failed to proxy ${type}: ${error.response.statusText}` });
    } else {
      res.status(500).json({ error: `Failed to proxy ${type}`, details: error.message });
    }
  }
}
