import axios from 'axios';

export default async function handler(req, res) {
  // Headers CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { channel } = req.query;
    
    if (!channel) {
      return res.status(400).json({ error: 'Channel parameter is required' });
    }

    // Mapping des chaînes vers leurs URLs audio
    const channelAudioUrls = {
      'hd1': 'https://viamotionhsi.netplus.ch/live/eds/hd1/browser-HLS8/hd1-mp4a_128000_fra=20009.m3u8',
      'nt1': 'https://viamotionhsi.netplus.ch/live/eds/nt1/browser-HLS8/nt1-mp4a_128000_fra=20005.m3u8',
      'france3hd': 'https://viamotionhsi.netplus.ch/live/eds/france3hd/browser-HLS8/france3hd-mp4a_128000_fra=20003.m3u8',
      'm6hd': 'https://viamotionhsi.netplus.ch/live/eds/m6hd/browser-HLS8/m6hd-mp4a_128000_fra=20004.m3u8',
      'w9': 'https://viamotionhsi.netplus.ch/live/eds/w9/browser-HLS8/w9-mp4a_128000_fra=20006.m3u8',
      'gulli': 'https://viamotionhsi.netplus.ch/live/eds/gulli/browser-HLS8/gulli-mp4a_128000_fra=20007.m3u8'
    };

    const audioUrl = channelAudioUrls[channel];
    
    if (!audioUrl) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    console.log(`[TV AUDIO PROXY] Requête pour la chaîne: ${channel}`);
    console.log(`[TV AUDIO PROXY] URL audio: ${audioUrl}`);
    
    const response = await axios.get(audioUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/vnd.apple.mpegurl, application/x-mpegURL, application/octet-stream, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      timeout: 10000,
      responseType: 'text'
    });

    console.log(`[TV AUDIO PROXY] ${response.status} ${response.headers['content-type']} ← ${audioUrl}`);

    if (typeof response.data !== 'string') {
      return res.status(502).send('Pas une playlist M3U8.');
    }

    // Réécrire les URLs dans la playlist pour qu'elles passent par le proxy
    const baseUrl = `https://viamotionhsi.netplus.ch/live/eds/${channel}/browser-HLS8/`;
    const rewritten = response.data
      .replace(/^([^#\n].*\.m3u8)$/gm, (match) => {
        const encodedUrl = encodeURIComponent(baseUrl + match);
        return `/api/tv?url=${encodedUrl}`;
      })
      .replace(/^([^#\n].*\.ts)$/gm, (match) => {
        const encodedUrl = encodeURIComponent(baseUrl + match);
        return `/api/tv?url=${encodedUrl}`;
      });

    // Headers spécifiques pour les streams live
    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    res.status(200).send(rewritten);
  } catch (error) {
    console.error('[TV AUDIO PROXY ERROR]', error.message);
    res.status(500).send('Erreur lors de la récupération de la sous-playlist audio.');
  }
}
