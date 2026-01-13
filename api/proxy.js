import axios from 'axios';
import archiver from 'archiver';

const TRAKT_CLIENT_ID = process.env.TRAKT_CLIENT_ID;
const TRAKT_CLIENT_SECRET = process.env.TRAKT_CLIENT_SECRET;
const REDIRECT_URI = 'https://anisflix.vercel.app/auth/trakt/callback';

// --- Subtitle Helpers ---

const LANGUAGE_FLAGS = {
  fre: "🇫🇷", eng: "🇬🇧", spa: "🇪🇸", ger: "🇩🇪", ita: "🇮🇹", por: "🇵🇹", rus: "🇷🇺", tur: "🇹🇷", ara: "🇸🇦", chi: "🇨🇳", jpn: "🇯🇵", kor: "🇰🇷", dut: "🇳🇱", pol: "🇵🇱", swe: "🇸🇪", dan: "🇩🇰", fin: "🇫🇮", nor: "🇳🇴", cze: "🇨🇿", hun: "🇭🇺", rom: "🇷🇴", bul: "🇧🇬", gre: "🇬🇷", heb: "🇮🇱", tha: "🇹🇭", vie: "🇻🇳", ind: "🇮🇩", may: "🇲🇾", per: "🇮🇷", ukr: "🇺🇦", hrv: "🇭🇷", srp: "🇷🇸", slv: "🇸🇮", slk: "🇸🇰", lit: "🇱🇹", lav: "🇱🇻", est: "🇪🇪", zho: "🇨🇳", spl: "🇪🇸"
};

const LANGUAGE_NAMES = {
  fre: "Francais", eng: "English", spa: "Espagnol", ger: "Allemand", ita: "Italien", ara: "Arabe"
};

function srtToVtt(srtContent) {
  if (!srtContent) return "";
  return "WEBVTT\n\n" + srtContent
    .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
}

async function handleSubtitlesZip(req, res) {
  const { imdbId, type, season, episode, title } = req.query;

  if (!imdbId || !type) {
    return res.status(400).json({ error: 'Missing parameters (imdbId, type)' });
  }

  try {
    let url = "";
    if (type === "movie") {
      url = `https://opensubtitles-v3.strem.io/subtitles/movie/${imdbId}.json`;
    } else {
      if (!season || !episode) return res.status(400).json({ error: 'Missing season/episode' });
      const effEpisode = parseInt(episode) > 100 ? 1 : episode; // Anime absolute mapping fix
      url = `https://opensubtitles-v3.strem.io/subtitles/series/${imdbId}:${season}:${effEpisode}.json`;
    }

    console.log(`[ZIP SUBS] Fetching list from: ${url}`);
    const response = await axios.get(url);

    if (!response.data || !response.data.subtitles || !Array.isArray(response.data.subtitles)) {
      return res.status(404).json({ error: 'No subtitles found to zip' });
    }

    const subtitles = response.data.subtitles;
    console.log(`[ZIP SUBS] Found ${subtitles.length} subtitles`);

    // Create Zip
    const archive = archiver('zip', { zlib: { level: 9 } });

    // Set Headers
    const safeTitle = (title || imdbId).replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `${safeTitle}_subtitles.zip`;

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    archive.pipe(res);

    // Limit to prevent timeouts/limits (e.g. max 20 subs)
    const limit = 20;
    const selectedSubs = subtitles.slice(0, limit);

    for (const sub of selectedSubs) {
      try {
        const subUrl = sub.url;
        const lang = sub.lang;
        const langName = LANGUAGE_NAMES[lang] || lang;
        const subId = sub.id;

        // Fetch subtitle content
        const subResp = await axios.get(subUrl, { responseType: 'text' });
        let content = subResp.data;
        let ext = 'srt';

        // Convert to VTT? Or keep SRT? Let's keep SRT as it's more compatible for offline VLC
        // Actually, existing system converts to VTT. Let's provide SRT if possible, or source format.
        // OpenSubtitles V3 usually returns SRT.

        if (content.startsWith('WEBVTT')) ext = 'vtt';

        const entryName = `${langName}_${subId}.${ext}`;
        archive.append(content, { name: entryName });

      } catch (e) {
        console.warn(`[ZIP SUBS] Failed to fetch sub ${sub.id}: ${e.message}`);
      }
    }

    await archive.finalize();

  } catch (error) {
    console.error('[ZIP SUBS] Error:', error.message);
    if (!res.headersSent) res.status(500).json({ error: 'Failed to generate zip' });
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { type, url, channelId, action } = req.query;

  // New Actions
  if (action === 'subtitles') {
    return handleSubtitlesZip(req, res);
  }

  if (!type) {
    return res.status(400).json({ error: 'Type parameter is required' });
  }

  // Handle Trakt routes
  if (type.startsWith('trakt-')) {
    return handleTrakt(req, res, type.replace('trakt-', ''));
  }

  // Original proxy logic
  try {
    let targetUrl;
    let headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    };

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
        targetUrl = `https://example.com/stream/${channelId}.m3u8`;
        break;

      default:
        return res.status(400).json({ error: 'Invalid proxy type' });
    }

    console.log(`[PROXY] Type: ${type}, URL: ${targetUrl}`);

    if (type === 'tv-stream') {
      res.json({
        success: true,
        channelId: channelId,
        streamUrl: targetUrl,
        message: 'TV stream retrieved'
      });
    } else if (type === 'darkibox') {
      console.log(`[DARKIBOX PROXY] Extracting M3U8 from: ${targetUrl}`);

      const htmlResponse = await axios.get(targetUrl, {
        headers,
        timeout: 15000,
      });

      const html = htmlResponse.data;
      console.log(`[DARKIBOX PROXY] HTML received (${html.length} chars)`);

      const m3u8Match = html.match(/file:\s*["']([^"']*\.m3u8[^"']*)['"]/);
      if (!m3u8Match) {
        console.error('[DARKIBOX PROXY] No M3U8 link found in HTML');
        return res.status(404).json({ error: 'No M3U8 stream found on Darkibox page' });
      }

      const m3u8Url = m3u8Match[1];
      console.log(`[DARKIBOX PROXY] Extracted M3U8 URL: ${m3u8Url}`);

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
      const response = await axios.get(targetUrl, {
        responseType: 'stream',
        headers: {
          ...headers,
          ...(req.headers.range && { 'Range': req.headers.range }),
        },
        timeout: 30000,
      });

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

// Trakt handlers
async function handleTrakt(req, res, action) {
  try {
    switch (action) {
      case 'auth':
        return handleTraktAuth(req, res);
      case 'callback':
        return handleTraktCallback(req, res);
      case 'device-code':
        return handleTraktDeviceCode(req, res);
      case 'device-token':
        return handleTraktDeviceToken(req, res);
      case 'scrobble':
        return handleTraktScrobble(req, res);
      case 'checkin':
        return handleTraktCheckin(req, res);
      case 'status':
        return handleTraktStatus(req, res);
      case 'disconnect':
        return handleTraktDisconnect(req, res);
      default:
        return res.status(404).json({ error: 'Not found' });
    }
  } catch (error) {
    console.error('Trakt API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleTraktAuth(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const authUrl = new URL('https://trakt.tv/oauth/authorize');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', TRAKT_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI);

  return res.status(200).json({ authUrl: authUrl.toString() });
}

async function handleTraktCallback(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { code } = req.query;
  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Missing authorization code' });
  }

  const response = await fetch('https://api.trakt.tv/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code,
      client_id: TRAKT_CLIENT_ID,
      client_secret: TRAKT_CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) return res.redirect(302, '/settings?trakt=error');

  const data = await response.json();
  res.setHeader('Set-Cookie', [
    `trakt_access_token=${data.access_token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${data.expires_in}`,
    `trakt_refresh_token=${data.refresh_token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=7776000`,
  ]);

  return res.redirect(302, '/settings?trakt=connected');
}

async function handleTraktDeviceCode(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const response = await fetch('https://api.trakt.tv/oauth/device/code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: TRAKT_CLIENT_ID }),
  });

  if (!response.ok) throw new Error('Failed to generate device code');

  const data = await response.json();
  return res.status(200).json({
    device_code: data.device_code,
    user_code: data.user_code,
    verification_url: data.verification_url,
    expires_in: data.expires_in,
    interval: data.interval,
  });
}

async function handleTraktDeviceToken(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { device_code } = req.body;
  if (!device_code) return res.status(400).json({ error: 'Missing device_code' });

  const response = await fetch('https://api.trakt.tv/oauth/device/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: device_code,
      client_id: TRAKT_CLIENT_ID,
      client_secret: TRAKT_CLIENT_SECRET,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    if (response.status === 400) return res.status(400).json({ error: 'pending' });
    if (response.status === 404) return res.status(404).json({ error: 'not_found' });
    if (response.status === 409) return res.status(409).json({ error: 'already_used' });
    if (response.status === 410) return res.status(410).json({ error: 'expired' });
    if (response.status === 418) return res.status(418).json({ error: 'denied' });
    if (response.status === 429) return res.status(429).json({ error: 'slow_down' });
    throw new Error('Unknown error');
  }

  return res.status(200).json({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in,
    token_type: data.token_type,
  });
}

async function handleTraktScrobble(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let { access_token, movie, episode, show, progress, action } = req.body;

  // If no token in body, try cookies (Web client)
  if (!access_token && req.headers.cookie) {
    const cookies = req.headers.cookie.split(';').map(c => c.trim());
    const tokenCookie = cookies.find(c => c.startsWith('trakt_access_token='));
    if (tokenCookie) {
      access_token = tokenCookie.split('=')[1];
    }
  }

  if (!access_token) return res.status(401).json({ error: 'Missing access token' });

  const endpoint = action === 'start'
    ? 'https://api.trakt.tv/scrobble/start'
    : action === 'pause'
      ? 'https://api.trakt.tv/scrobble/pause'
      : 'https://api.trakt.tv/scrobble/stop';

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${access_token}`,
      'trakt-api-version': '2',
      'trakt-api-key': TRAKT_CLIENT_ID,
    },
    body: JSON.stringify({
      movie,
      episode,
      show,
      progress,
      app_version: '1.0.0',
      app_date: new Date().toISOString().split('T')[0]
    }),
  });

  if (!response.ok) return res.status(response.status).json({ error: 'Scrobble failed' });

  const data = await response.json();
  return res.status(200).json(data);
}

async function handleTraktCheckin(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let { access_token, movie, episode, show } = req.body;

  // If no token in body, try cookies (Web client)
  if (!access_token && req.headers.cookie) {
    const cookies = req.headers.cookie.split(';').map(c => c.trim());
    const tokenCookie = cookies.find(c => c.startsWith('trakt_access_token='));
    if (tokenCookie) {
      access_token = tokenCookie.split('=')[1];
    }
  }

  if (!access_token) return res.status(401).json({ error: 'Missing access token' });

  const response = await fetch('https://api.trakt.tv/checkin', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${access_token}`,
      'trakt-api-version': '2',
      'trakt-api-key': TRAKT_CLIENT_ID,
    },
    body: JSON.stringify({ movie, episode, show }),
  });

  if (!response.ok) return res.status(response.status).json({ error: 'Checkin failed' });

  const data = await response.json();
  return res.status(200).json(data);
}

async function handleTraktStatus(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const cookies = req.headers.cookie?.split(';').map(c => c.trim()) || [];
  const hasToken = cookies.some(c => c.startsWith('trakt_access_token='));

  if (hasToken) return res.status(200).json({ connected: true });
  return res.status(401).json({ connected: false });
}

async function handleTraktDisconnect(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  res.setHeader('Set-Cookie', [
    'trakt_access_token=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0',
    'trakt_refresh_token=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0',
  ]);

  return res.status(200).json({ success: true });
}
