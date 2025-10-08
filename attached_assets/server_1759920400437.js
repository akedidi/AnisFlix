const express = require('express');
const axios = require('axios').default;
const { CookieJar } = require('tough-cookie');
const { wrapper } = require('axios-cookiejar-support');
const { URL } = require('url');

const app = express();
const port = 3000;

const ORIGIN_HOST = 'https://fremtv.lol';
const EMBED_HOST = 'https://directfr.lat'; // vu dans tes DevTools
const jar = new CookieJar();
const http = wrapper(axios.create({ jar, withCredentials: true, timeout: 15000 }));

const browserHeaders = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
  'Origin': EMBED_HOST,
  'Referer': EMBED_HOST + '/',
  'Accept': 'application/vnd.apple.mpegurl, application/x-mpegURL, */*',
  'Accept-Language': 'fr-FR,fr;q=0.7,en;q=0.6',
  'Connection': 'keep-alive'
};

app.use(express.static('public'));

function toAbsolute(base, maybeRelative) {
  try { return new URL(maybeRelative, base).toString(); }
  catch { return maybeRelative; }
}

function rewritePlaylistUrls(playlistText, baseUrl) {
  return playlistText
    .split('\n')
    .map((line) => {
      const t = line.trim();
      if (!t || t.startsWith('#')) return line;
      const abs = toAbsolute(baseUrl, t);
      if (/\.m3u8(\?|$)/i.test(abs)) return `/proxy/m3u8?url=${encodeURIComponent(abs)}`;
      return `/proxy/segment?url=${encodeURIComponent(abs)}`;
    })
    .join('\n');
}

// Entrée: fournit une playlist m3u8 (réécrite) au player
app.get('/stream/playlist.m3u8', async (_req, res) => {
  try {
    // ⚠️ l’ID peut expirer/changer
    const initialUrl = `${ORIGIN_HOST}/live/5A24C0D16059EDCC6A20E0CE234C7A25/78.m3u8`;

    // Amorcer éventuellement la session/cookies
    try { await http.get(ORIGIN_HOST + '/', { headers: browserHeaders }); } catch {}

    // Laisser suivre la 302 vers /auth/...token=...
    const r = await http.get(initialUrl, { headers: browserHeaders, responseType: 'text' });

    const ctype = (r.headers['content-type'] || '').toLowerCase();
    console.log(`[ENTRY] ${r.status} ${ctype} ← ${r.request?.res?.responseUrl || initialUrl}`);

    if (typeof r.data !== 'string') return res.status(502).send('Pas une playlist M3U8.');

    const baseUrl = r.request?.res?.responseUrl || initialUrl;
    const rewritten = rewritePlaylistUrls(r.data, baseUrl);

    res.set('Content-Type', 'application/vnd.apple.mpegurl');
    res.send(rewritten);
  } catch (e) {
    console.error('[ENTRY ERROR]', e.message);
    res.status(500).send('Erreur lors de la récupération de la playlist.');
  }
});

// Proxy générique pour toute playlist (master/media)
app.get('/proxy/m3u8', async (req, res) => {
  const target = req.query.url;
  if (!target) return res.status(400).send('Paramètre "url" manquant.');
  try {
    const r = await http.get(target, { headers: browserHeaders, responseType: 'text' });

    const ctype = (r.headers['content-type'] || '').toLowerCase();
    console.log(`[M3U8] ${r.status} ${ctype} ← ${target}`);
    if (r.status >= 400) return res.status(r.status).send('Erreur distante playlist.');
    if (typeof r.data !== 'string') return res.status(502).send('Pas une playlist M3U8.');

    const baseUrl = r.request?.res?.responseUrl || target;
    const rewritten = rewritePlaylistUrls(r.data, baseUrl);

    res.set('Content-Type', 'application/vnd.apple.mpegurl');
    res.send(rewritten);
  } catch (e) {
    console.error('[M3U8 ERROR]', e.message);
    res.status(500).send('Erreur proxy playlist.');
  }
});

// Proxy segments (gère Range + stream)
app.get('/proxy/segment', async (req, res) => {
  const target = req.query.url;
  if (!target) return res.status(400).send('Paramètre "url" manquant.');
  try {
    const headers = { ...browserHeaders };
    if (req.headers.range) headers.Range = req.headers.range;

    const r = await http.get(target, { headers, responseType: 'stream', validateStatus: () => true });
    console.log(`[SEG] ${r.status} ← ${target}`);
    if (r.status >= 400) return res.status(r.status).send('Erreur distante segment.');

    // Propager quelques headers utiles
    ['content-type','content-length','accept-ranges','content-range','cache-control'].forEach(h => {
      if (r.headers[h]) res.setHeader(h, r.headers[h]);
    });

    res.status(r.status);
    r.data.pipe(res);
  } catch (e) {
    console.error('[SEG ERROR]', e.message);
    res.status(500).send('Erreur proxy segment.');
  }
});

app.listen(port, () => {
  console.log(`✅ Proxy HLS sur http://localhost:${port}`);
  console.log(`   Ouvre http://localhost:${port}/index.html`);
});
