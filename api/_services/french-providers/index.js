import axios from 'axios';
import { VidmolyExtractor } from '../universalvo/extractors/VidmolyExtractor.js';
import { VidzyExtractor } from '../universalvo/extractors/VidzyExtractor.js';
import { extract_voe } from '../universalvo/extractors/voe.js';
import { extract_streamwish } from '../universalvo/extractors/streamwish.js';
import { isPacked, unpack } from '../universalvo/extractors/utils/packer.js';
import { getGowaruFrenchStreamStreams } from '../frenchstream/index.js';

const TMDB_API_KEY = '8265bd1679663a7ea12ac168da84d2e8';
const ANIME_SAMA_BASE = 'https://anime-sama.to';
const FRENCH_ANIME_BASE = 'https://french-anime.com';
const COFLIX_BASE = 'https://coflix.wiki';
const STREAMZO_BASE = 'https://streamzo.fr';
const BACKEND_BASE = 'https://anisflix.vercel.app';
const WORKER_BASE = process.env.ANISFLIX_WORKER_URL || 'https://anisflix.kedidi-anis.workers.dev';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36';

// Domains that Vercel egress often cannot open (TLS / CF). Prefer the CF worker.
// NOTE: ansembed.net must NOT go through the worker — its vmpx CDN tokens are
// ASN-bound to the IP that fetched the embed page. Worker page + Vercel m3u8 = 403.
// Catalogue (anime-sama.to) stays on the worker; embed pages use Vercel egress.
const WORKER_PREFERRED_HOSTS = new Set([
  'anime-sama.to',
  'www.anime-sama.to',
]);

function hostnameOf(url) {
  try { return new URL(url).hostname.toLowerCase(); } catch { return ''; }
}

function prefersWorker(url) {
  const host = hostnameOf(url);
  return WORKER_PREFERRED_HOSTS.has(host) || host.endsWith('.anime-sama.to');
}

/** Embed hosts whose CDN tokens are minted for the fetcher ASN (must match playback proxy). */
function isVercelBoundEmbedHost(url) {
  const host = hostnameOf(url);
  return host === 'ansembed.net' || host.endsWith('.ansembed.net')
    || host === 'minochinos.com' || host.endsWith('.minochinos.com');
}

const vidmolyExtractor = new VidmolyExtractor();
const vidzyExtractor = new VidzyExtractor();

function normalize(value = '') {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ').trim();
}

function tokens(value) {
  return normalize(value).split(' ').filter(Boolean);
}

function slugify(value) {
  return normalize(value).replace(/ /g, '-');
}

function unique(values) {
  return [...new Set(values.filter(Boolean).map(value => value.trim()))];
}

function captures(pattern, text) {
  return [...String(text || '').matchAll(pattern)].map(match => match[1]);
}

function captureGroups(pattern, text) {
  return [...String(text || '').matchAll(pattern)].map(match => match.slice(1));
}

function absoluteUrl(value, base) {
  if (value?.startsWith('//')) return `https:${value}`;
  try { return new URL(value, base).toString(); } catch { return value; }
}

function rootUrl(value) {
  try { return `${new URL(value).origin}/`; } catch { return value; }
}

function playbackHeaders(referer) {
  const origin = rootUrl(referer)?.replace(/\/$/, '');
  return { Referer: referer, Origin: origin, 'User-Agent': USER_AGENT };
}

function qualityFrom(value) {
  const match = String(value).match(/(?:^|[^0-9])(2160|1440|1080|720|480|360)p/i);
  return match ? (match[1] === '2160' ? '4K' : `${match[1]}p`) : null;
}

function decodeText(value) {
  return String(value || '').replace(/&amp;/g, '&').replace(/\\\//g, '/')
    .replace(/\\u0026/gi, '&').replace(/\\u([0-9a-f]{4})/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)));
}

function unpackPage(html) {
  if (!isPacked(html)) return html;
  const decoded = unpack(html);
  return decoded ? `${html}\n${decoded}` : html;
}

class HttpStatusError extends Error {
  constructor(status, url) {
    super(`HTTP ${status} for ${url}`);
    this.name = 'HttpStatusError';
    this.status = status;
    this.url = url;
  }
}

async function fetchViaWorker(url, { method = 'GET', body, headers = {}, referer, timeout = 25000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const proxy = `${WORKER_BASE}/?path=mob&url=${encodeURIComponent(url)}&method=${method}`;
    const response = await fetch(proxy, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        headers: {
          'User-Agent': USER_AGENT,
          'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
          Accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
          ...(referer ? { Referer: referer } : {}),
          ...headers,
        },
        body: body ?? null,
      }),
    });
    if (!response.ok) throw new HttpStatusError(response.status, url);
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchText(url, { method = 'GET', body, headers = {}, referer, timeout = 18000 } = {}) {
  if (url.startsWith(BACKEND_BASE) || url.startsWith(WORKER_BASE)) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(url, {
        method,
        body,
        signal: controller.signal,
        headers: {
          'User-Agent': USER_AGENT,
          ...(referer ? { Referer: referer } : {}),
          ...headers,
        },
      });
      if (!response.ok) throw new HttpStatusError(response.status, url);
      return await response.text();
    } finally {
      clearTimeout(timer);
    }
  }

  // Ansembed/minochinos mint vmpx tokens for the fetcher ASN.
  // cinepro-proxy uses axios — native fetch() on Vercel can egress via a different
  // IP, so the later cinepro m3u8 fetch gets 403. Use axios here to match playback.
  // Never HTTP self-call cinepro-proxy from inside the serverless function — it hangs.
  // Off Vercel (local): go through deployed cinepro-proxy so the token is AWS ASN.
  if (method === 'GET' && !body && isVercelBoundEmbedHost(url)) {
    const onVercel = Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
    if (onVercel) {
      try {
        const response = await axios.get(url, {
          timeout: Math.max(timeout, 25000),
          responseType: 'text',
          headers: {
            'User-Agent': USER_AGENT,
            Accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            ...(referer ? { Referer: referer } : { Referer: `${ANIME_SAMA_BASE}/` }),
            ...headers,
          },
          // Same defaults as cinepro-proxy media fetches
          decompress: true,
          validateStatus: (status) => status >= 200 && status < 400,
        });
        console.log(`[FrenchProviders] Axios Vercel embed fetch: ${hostnameOf(url)}`);
        return typeof response.data === 'string' ? response.data : String(response.data);
      } catch (error) {
        const status = error?.response?.status;
        if (status) throw new HttpStatusError(status, url);
        throw error;
      }
    }
    const text = await fetchViaVercelCinepro(url, { referer, timeout: Math.max(timeout, 25000) });
    console.log(`[FrenchProviders] Remote Vercel embed fetch: ${hostnameOf(url)}`);
    return text;
  }

  // Anime-Sama catalogue is unreliable from Vercel egress — CF worker first.
  if (prefersWorker(url)) {
    const text = await fetchViaWorker(url, { method, body, headers, referer, timeout: Math.max(timeout, 25000) });
    console.log(`[FrenchProviders] Worker fetch: ${hostnameOf(url)}`);
    return text;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {
      method,
      body,
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
        'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
        Accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
        ...(referer ? { Referer: referer } : {}),
        ...headers,
      },
    });
    if (!response.ok) throw new HttpStatusError(response.status, url);
    return await response.text();
  } catch (error) {
    // Real 404/410 from the origin — no point retrying through another proxy.
    if (error instanceof HttpStatusError && (error.status === 404 || error.status === 410)) {
      throw error;
    }

    // Worker fallback for GET/POST (search is POST) when direct egress fails.
    try {
      const text = await fetchViaWorker(url, { method, body, headers, referer, timeout: Math.max(timeout, 25000) });
      console.warn(`[FrenchProviders] Worker fallback: ${hostnameOf(url)}`);
      return text;
    } catch (workerError) {
      if (workerError instanceof HttpStatusError && (workerError.status === 404 || workerError.status === 410)) {
        throw workerError;
      }
      console.warn(`[FrenchProviders] Worker fallback failed (${hostnameOf(url)}): ${workerError.message}`);
    }

    // Legacy same-origin GET proxy (still useful for some catalogue hosts).
    if (method === 'GET' && !body) {
      try {
        const params = new URLSearchParams({ url });
        if (referer || headers.Referer) params.set('referer', referer || headers.Referer);
        const response = await fetch(`${BACKEND_BASE}/api/proxy?${params.toString()}`, {
          signal: controller.signal,
          headers: { 'User-Agent': USER_AGENT },
        });
        if (response.ok) {
          console.warn(`[FrenchProviders] Backend proxy fallback: ${hostnameOf(url)}`);
          return await response.text();
        }
      } catch {
        /* keep original error */
      }
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJson(url, options) {
  return JSON.parse(await fetchText(url, options));
}

async function tmdbMetadata(tmdbId, mediaType, season) {
  const endpoint = mediaType === 'movie' ? 'movie' : 'tv';
  const main = await fetchJson(`https://api.themoviedb.org/3/${endpoint}/${tmdbId}?api_key=${TMDB_API_KEY}&language=en-US`);
  const titles = unique([
    endpoint === 'movie' ? main.title : main.name,
    endpoint === 'movie' ? main.original_title : main.original_name,
  ]);
  try {
    const translations = await fetchJson(`https://api.themoviedb.org/3/${endpoint}/${tmdbId}/translations?api_key=${TMDB_API_KEY}`);
    const french = translations.translations?.find(row => row.iso_639_1 === 'fr')?.data;
    const frenchTitle = endpoint === 'movie' ? french?.title : french?.name;
    if (frenchTitle && !titles.some(title => normalize(title) === normalize(frenchTitle))) titles.splice(1, 0, frenchTitle);
  } catch {
    // The original and international titles still provide useful matches.
  }
  if (endpoint === 'tv' && Number(season) > 1) {
    for (const title of titles.slice(0, 3)) titles.push(`${title} Season ${season}`, `${title} Saison ${season}`);
  }
  const date = endpoint === 'movie' ? main.release_date : main.first_air_date;
  return { titles: unique(titles), year: Number(date?.slice(0, 4)) || null };
}

function makeSource(provider, resolved, language, fallbackQuality = 'HD') {
  const mediaUrl = unwrapProxiedMediaUrl(resolved.url);
  const type = /\.m3u8(?:$|[?#])/i.test(mediaUrl) || /\/hls2\//i.test(mediaUrl)
    ? 'm3u8'
    : /\.(?:mp4|mkv)(?:$|[?#])/i.test(mediaUrl)
      ? 'mp4'
      : 'embed';
  return {
    provider,
    url: resolved.url,
    quality: resolved.quality || fallbackQuality || qualityFrom(mediaUrl) || 'HD',
    language,
    type,
    headers: resolved.headers || {},
  };
}

function dedupe(sources) {
  const seen = new Set();
  return sources.filter(source => {
    let key = source.url;
    try { const parsed = new URL(source.url); key = `${parsed.host}${parsed.pathname}`; } catch { /* keep full value */ }
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function resolveGenericPage(page, referer = page, hostBase) {
  const decoded = decodeText(unpackPage(await fetchText(page, { referer })));
  const patterns = [
    /(?:file|video_source|src|hls)\s*[:=]\s*["']([^"']+\.(?:m3u8|mp4)[^"']*)["']/i,
    /<source[^>]+src=["']([^"']+\.(?:m3u8|mp4)[^"']*)["']/i,
    /["']((?:https?:)?\/\/[^"'\s]+\.(?:m3u8|mp4)[^"'\s]*)["']/i,
  ];
  for (const pattern of patterns) {
    const match = decoded.match(pattern);
    if (!match) continue;
    const url = absoluteUrl(match[1], hostBase || page);
    if (isDemoMediaUrl(url) || !isDirectMediaUrl(url)) continue;
    return { url, quality: qualityFrom(url), headers: playbackHeaders(rootUrl(page)) };
  }
  return null;
}

function isDemoMediaUrl(url) {
  return /test-videos\.co\.uk|big_buck_bunny|sample-videos|example\.com\/.*\.(?:mp4|m3u8)/i.test(url);
}

function isDirectMediaUrl(url) {
  if (!url || isDemoMediaUrl(url)) return false;
  return /\.(?:m3u8|mp4|mkv)(?:$|[?#])/i.test(url) || /\/hls2\//i.test(url);
}

function isIpBoundCdn(url) {
  return /(?:vmget|vmpx)\.online/i.test(url);
}

/** Luluvid/Lulustream CDN tokens are minted for AWS ASN (14618). Browser/iOS IPs get 403. */
function isAsnBoundLuluvidCdn(url) {
  if (!url) return false;
  return /dramiyos-cdn\.com/i.test(url)
    || (/\/hls2\//i.test(url) && /\.m3u8(?:$|[?#])/i.test(url));
}

function unwrapProxiedMediaUrl(url) {
  try {
    const parsed = new URL(url);
    if (parsed.origin === new URL(WORKER_BASE).origin && parsed.searchParams.get('path') === 'mob') {
      return parsed.searchParams.get('url') || url;
    }
    if (parsed.origin === new URL(BACKEND_BASE).origin
      && parsed.pathname.includes('movix-proxy')
      && parsed.searchParams.get('path') === 'cinepro-proxy') {
      return parsed.searchParams.get('url') || url;
    }
  } catch { /* keep original */ }
  return url;
}

function isPlayableAnimeSamaUrl(url) {
  return isDirectMediaUrl(unwrapProxiedMediaUrl(url));
}

/** Wrap media through Vercel cinepro-proxy (AWS ASN). Worker path=mob cannot fetch vmpx HLS. */
function wrapViaVercelCinepro(url, referer) {
  const refererBase = referer && /^https?:/i.test(referer)
    ? referer
    : 'https://ansembed.net/';
  let origin = 'https://ansembed.net';
  try { origin = new URL(refererBase).origin; } catch { /* keep default */ }
  const headers = JSON.stringify({
    Referer: refererBase,
    Origin: origin,
    'User-Agent': USER_AGENT,
    Accept: '*/*',
  });
  return `${BACKEND_BASE}/api/movix-proxy?path=cinepro-proxy&url=${encodeURIComponent(url)}&headers=${encodeURIComponent(headers)}`;
}

/**
 * Proxy playback URLs that cannot be fetched from the client:
 * - vmget/vmpx / ansembed hls2 → Vercel cinepro-proxy (token ASN = Vercel)
 * - dramiyos / luluvid hls2 → same Vercel cinepro-proxy
 * Never use CF worker for these CDNs (socket fallback is MovieBox-only → 500).
 */
function wrapPlaybackUrl(url, referer) {
  if (!url) return url;

  if (isAsnBoundLuluvidCdn(url) || isIpBoundCdn(url)) {
    if (isAsnBoundLuluvidCdn(url) && !isIpBoundCdn(url)) {
      const refererBase = /lulustream/i.test(referer || '')
        ? 'https://lulustream.com/'
        : 'https://luluvid.com/';
      return wrapViaVercelCinepro(url, referer && /^https?:/i.test(referer) ? referer : refererBase);
    }
    return wrapViaVercelCinepro(url, referer || 'https://ansembed.net/');
  }

  return url;
}

/** Fetch embed HTML via Vercel so minted CDN tokens match cinepro-proxy egress. */
async function fetchViaVercelCinepro(url, { referer, timeout = 25000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const proxyUrl = wrapViaVercelCinepro(url, referer || `${ANIME_SAMA_BASE}/`);
    const response = await fetch(proxyUrl, { signal: controller.signal });
    if (!response.ok) throw new HttpStatusError(response.status, url);
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

async function resolveEmbed(rawUrl, referer) {
  const url = decodeText(rawUrl).trim();
  if (!/^https?:/i.test(url)) return null;
  if (isDirectMediaUrl(url)) {
    return { url: wrapPlaybackUrl(url, referer), quality: qualityFrom(url), headers: playbackHeaders(referer) };
  }
  const lower = url.toLowerCase();
  try {
    // Gowaru anime-sama.js: ansembeb is resolved like Vidmoly (direct file/m3u8).
    if (lower.includes('vidmoly.') || lower.includes('voembed.') || lower.includes('ansembed.')) {
      // Prefer worker-backed page fetch (Vercel cannot always open these hosts).
      const fromPage = await resolveGenericPage(url, rootUrl(url) || referer);
      if (fromPage?.url && isDirectMediaUrl(fromPage.url)) {
        return {
          ...fromPage,
          url: wrapPlaybackUrl(fromPage.url, fromPage.headers?.Referer || rootUrl(url)),
        };
      }
      try {
        const result = await vidmolyExtractor.extract(url);
        if (result?.success && result.m3u8Url && isDirectMediaUrl(result.m3u8Url)) {
          return {
            url: wrapPlaybackUrl(result.m3u8Url, rootUrl(url)),
            quality: qualityFrom(result.m3u8Url),
            headers: playbackHeaders(rootUrl(url)),
          };
        }
      } catch { /* page extract above is the primary path */ }
      return null;
    }
    if (lower.includes('vidzy.') || lower.includes('fsvid.')) {
      const result = await vidzyExtractor.extract(url);
      if (result?.success && result.m3u8Url) return { url: result.m3u8Url, quality: qualityFrom(result.m3u8Url), headers: result.headers || playbackHeaders(rootUrl(url)) };
    }
    // Gowaru maps several rotating Voe domains (teresa*, jeremy*, etc.).
    if (
      lower.includes('voe.')
      || lower.includes('vocancellario')
      || lower.includes('primevideos.')
      || lower.includes('teresapoliticallearn')
      || lower.includes('jeremyparticipant')
      || lower.includes('weneverbeenfree')
      || lower.includes('maryspecialwatch')
      || lower.includes('charlestoughrace')
      || lower.includes('sandratableother')
    ) {
      const result = await extract_voe(url, referer);
      if (typeof result === 'string' && isDirectMediaUrl(result)) {
        return { url: result, quality: qualityFrom(result), headers: playbackHeaders(rootUrl(url)) };
      }
    }
    if (lower.includes('streamwish') || lower.includes('wishfast') || lower.includes('filelions')) {
      const result = await extract_streamwish(url, referer);
      if (typeof result === 'string' && isDirectMediaUrl(result)) {
        return { url: result, quality: qualityFrom(result), headers: playbackHeaders(rootUrl(url)) };
      }
    }
    if (lower.includes('sibnet.ru')) return await resolveGenericPage(url, 'https://video.sibnet.ru/', 'https://video.sibnet.ru');
    if (lower.includes('sendvid.')) {
      const normalized = url.includes('/embed/') ? url : url.replace(/sendvid\.com\/([a-z0-9]+)/i, 'sendvid.com/embed/$1');
      return await resolveGenericPage(normalized, 'https://sendvid.com/');
    }
    const generic = await resolveGenericPage(url, referer);
    if (generic?.url && isDirectMediaUrl(generic.url)) {
      return {
        ...generic,
        url: wrapPlaybackUrl(generic.url, generic.headers?.Referer || referer),
      };
    }
    return null;
  } catch (error) {
    console.warn(`[FrenchProviders] Could not resolve ${url}: ${error.message}`);
    return null;
  }
}

async function searchAnimeSama(title) {
  const body = new URLSearchParams({ query: title }).toString();
  const html = await fetchText(`${ANIME_SAMA_BASE}/template-php/defaut/fetch.php`, {
    method: 'POST', body,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    referer: ANIME_SAMA_BASE,
  });
  return unique(captures(/\/catalogue\/([^/"']+)\/?/gi, html));
}

function parseJavaScriptArrays(script) {
  return captures(/var\s+[a-z0-9_]+\s*=\s*\[([\s\S]*?)\s*\];/gi, script)
    .map(body => captures(/["']([^"']+)["']/g, body)).filter(row => row.length);
}

function rankAnimeSamaSlug(slug, titles) {
  const slugTokens = tokens(slug.replace(/-/g, ' '));
  let best = 0;
  for (const title of titles) {
    const wanted = tokens(title).filter(token => token.length >= 3);
    if (!wanted.length) continue;
    const hits = wanted.reduce((sum, token) => sum + (slugTokens.includes(token) ? 1 : 0), 0);
    const extras = slugTokens.filter(token => !wanted.includes(token) && !/^\d+$/.test(token)).length;
    // Penalize spin-offs (junior high, movie, ova) when the query is the main series.
    const spinOffPenalty = /(chuugakkou|junior|movie|film|ova|special)/i.test(slug) ? 0.35 : 0;
    best = Math.max(best, hits / wanted.length - extras * 0.08 - spinOffPenalty);
  }
  return best;
}

async function getAnimeSamaStreams(metadata, mediaType, season, episode) {
  const targetSeason = Math.max(Number(season) || 1, 1);
  const targetEpisode = Math.max(Number(episode) || 1, 1);
  const slugs = [];
  // Catalogue results are authoritative. Guessed TMDB slugs used to consume
  // the four-slot limit before the real "shingeki-no-kyojin" result.
  for (const title of metadata.titles.slice(0, 5)) {
    try {
      const cleanTitle = title.replace(/\s+(saison|season|s)\s*\d+$/i, '');
      for (const slug of (await searchAnimeSama(cleanTitle)).slice(0, 8)) if (!slugs.includes(slug)) slugs.push(slug);
    } catch { /* try another title */ }
  }
  if (mediaType !== 'movie') {
    const primary = slugify(metadata.titles[0]);
    for (const fallback of [primary, `${primary}-saison-${targetSeason}`, `${primary}-${targetSeason}`]) {
      if (!slugs.includes(fallback)) slugs.push(fallback);
    }
  }
  slugs.sort((a, b) => rankAnimeSamaSlug(b, metadata.titles) - rankAnimeSamaSlug(a, metadata.titles));
  const output = [];
  for (const slug of slugs.slice(0, 8)) {
    for (const languagePath of ['vostfr', 'vf']) {
      const paths = mediaType === 'movie' ? ['film', 'film2'] : [`saison${targetSeason}`, ''];
      for (const path of paths) {
        const jsUrl = `${ANIME_SAMA_BASE}/catalogue/${slug}${path ? `/${path}` : ''}/${languagePath}/episodes.js`;
        let script;
        try { script = await fetchText(jsUrl); } catch { continue; }
        const index = mediaType === 'movie' ? 0 : targetEpisode - 1;
        // Prefer hosts that extract cleanly (Gowaru-style): never return the
        // Anime-Sama/ansembed HTML player page — only direct m3u8/mp4.
        const embedUrls = parseJavaScriptArrays(script)
          .slice(0, 6)
          .map(row => row[index])
          .filter(Boolean);
        // Prefer hosts that usually yield real CDN links; deprioritize dead/demo
        // Voe mirrors and the Anime-Sama HTML player host.
        const embedRank = (value) => {
          const lower = String(value).toLowerCase();
          // Ansembed → vmpx works when page+playlist both go through Vercel.
          if (lower.includes('ansembed')) return 0;
          if (lower.includes('minochinos') || lower.includes('smoothpre') || lower.includes('sendvid')) return 1;
          if (lower.includes('sibnet') || lower.includes('vidmoly') || lower.includes('vidzy')) return 2;
          if (lower.includes('teresa') || lower.includes('jeremy') || lower.includes('voe')) return 4;
          return 3;
        };
        embedUrls.sort((a, b) => embedRank(a) - embedRank(b));
        for (const embedUrl of embedUrls) {
          const resolved = await resolveEmbed(embedUrl, `${ANIME_SAMA_BASE}/`);
          if (!resolved?.url || !isPlayableAnimeSamaUrl(resolved.url)) continue;
          const source = makeSource('animesama', resolved, languagePath === 'vf' ? 'VF' : 'VOSTFR');
          if (source.type === 'embed') continue;
          output.push(source);
          if (output.length >= 4) return dedupe(output);
        }
        if (output.some(source => source.language === (languagePath === 'vf' ? 'VF' : 'VOSTFR'))) break;
      }
    }
    if (output.length) break;
  }
  return dedupe(output);
}

function titleScore(candidate, wanted) {
  const wantedTokens = tokens(wanted).filter(token => token.length >= 3);
  const ignored = new Set(['saison', 'season', 'vostfr', 'french', 'truefrench']);
  const candidateTokens = tokens(candidate).filter(token => !ignored.has(token) && !/^\d+$/.test(token) && !/^s0/.test(token));
  if (!wantedTokens.length || candidateTokens.findIndex(token => wantedTokens.includes(token)) > 0) return 0;
  const candidateSet = new Set(candidateTokens);
  const hits = wantedTokens.reduce((sum, token) => sum + (candidateSet.has(token) ? (token.length === 3 ? 0.5 : 1) : 0), 0);
  const extra = [...candidateSet].filter(token => !wantedTokens.includes(token)).length;
  return Math.max(0, hits / wantedTokens.length - extra * 0.2);
}

function candidateMatchesSeason(slug, mediaType, season) {
  const match = slug.match(/(?:saison|season)-(\d+)/i);
  if (mediaType === 'movie') return !match;
  if (season > 1) return Number(match?.[1]) === season || slug.endsWith(`-${season}-vf`) || slug.endsWith(`-${season}-vostfr`);
  return !match || Number(match[1]) === 1;
}

async function searchFrenchAnime(title, wantedTitles) {
  const body = new URLSearchParams({ do: 'search', subaction: 'search', story: title }).toString();
  const html = await fetchText(`${FRENCH_ANIME_BASE}/index.php?do=search`, {
    method: 'POST', body, referer: `${FRENCH_ANIME_BASE}/`,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  return captureGroups(/href=["']https?:\/\/french-anime\.com\/animes-(vf|vostfr)\/(\d+)-([^"'/]+?)\.html/gi, html)
    .map(([category, id, slug]) => ({ category: category.toLowerCase(), id, slug, score: Math.max(...wantedTitles.map(title => titleScore(slug, title))) }))
    .filter(candidate => candidate.score >= 0.5);
}

function parseFrenchAnimeEpisodes(html) {
  const body = html.match(/<div[^>]*class=["']eps["'][^>]*>([\s\S]*?)<\/div>/i)?.[1] || html;
  const result = new Map();
  for (const [number, urls] of captureGroups(/(\d+)!(https?:\/\/[^\s<]+)/gi, body)) {
    if (!result.has(Number(number))) result.set(Number(number), urls.split(',').filter(Boolean));
  }
  return result;
}

async function getFrenchAnimeStreams(metadata, mediaType, season, episode) {
  const targetSeason = Math.max(Number(season) || 1, 1);
  const targetEpisode = Math.max(Number(episode) || 1, 1);
  const candidates = [];
  for (const title of metadata.titles.slice(0, 5)) {
    try { candidates.push(...await searchFrenchAnime(title, metadata.titles)); } catch { break; }
    if (candidates.length >= 6) break;
  }
  candidates.sort((a, b) => b.score - a.score);
  const output = [];
  for (const language of ['VF', 'VOSTFR']) {
    const category = language.toLowerCase();
    for (const candidate of candidates.filter(item => item.category === category && candidateMatchesSeason(item.slug, mediaType, targetSeason)).slice(0, 2)) {
      const page = `${FRENCH_ANIME_BASE}/animes-${category}/${candidate.id}-${candidate.slug}.html`;
      try {
        const episodes = parseFrenchAnimeEpisodes(await fetchText(page, { referer: `${FRENCH_ANIME_BASE}/` }));
        for (const embed of (episodes.get(targetEpisode) || []).slice(0, 4)) {
          const resolved = await resolveEmbed(embed, page);
          if (resolved) { output.push(makeSource('frenchanime', resolved, language)); break; }
        }
      } catch { /* try next result */ }
      if (output.some(source => source.language === language)) break;
    }
  }
  if (output.length) return dedupe(output);

  const coflixFallback = await getCoflixFallback(
    metadata,
    mediaType,
    targetSeason,
    targetEpisode,
  );
  if (coflixFallback.length) return dedupe(coflixFallback);

  // Match the active iOS behavior: when French-Anime and Coflix are blocked,
  // reuse the resolved Anime-Sama episode but keep the French-Anime identity.
  return dedupe(
    (await getAnimeSamaStreams(metadata, mediaType, targetSeason, targetEpisode))
      .map(source => ({ ...source, provider: 'frenchanime' })),
  );
}

function ajaxHeaders(base) {
  return { Accept: 'application/json, text/javascript, */*; q=0.01', Referer: `${base}/`, 'X-Requested-With': 'XMLHttpRequest' };
}

async function getCoflixFallback(metadata, mediaType, season, episode) {
  const candidates = [];
  for (const title of metadata.titles.slice(0, 4)) {
    try {
      const json = await fetchJson(`${COFLIX_BASE}/ajax/search/suggest?keyword=${encodeURIComponent(title)}`, { headers: ajaxHeaders(COFLIX_BASE) });
      for (const [slug, episodeId] of captureGroups(/href=["']https?:\/\/coflix\.wiki\/film\/([^"'/]+)\/ep-(\d+)/gi, json.html || '')) {
        const score = Math.max(...metadata.titles.map(wanted => titleScore(slug, wanted)));
        if (score >= 0.34) candidates.push({ slug, episodeId, language: slug.toLowerCase().endsWith('-vostfr') ? 'VOSTFR' : 'VF', score });
      }
    } catch { /* try next title */ }
    if (candidates.length >= 4) break;
  }
  candidates.sort((a, b) => b.score - a.score);
  const output = [];
  for (const language of ['VF', 'VOSTFR']) {
    for (const candidate of candidates.filter(item => item.language === language).slice(0, 3)) {
      let episodeId = candidate.episodeId;
      try {
        if (mediaType !== 'movie') {
          if (!candidateMatchesSeason(candidate.slug, mediaType, season)) continue;
          const page = await fetchText(`${COFLIX_BASE}/film/${candidate.slug}/`, { referer: `${COFLIX_BASE}/` });
          const movieId = page.match(/(?:id=["']watch-page["'][^>]*data-id|data-id)=["'](\d+)["']/i)?.[1];
          if (!movieId) continue;
          const list = await fetchJson(`${COFLIX_BASE}/ajax/episode/list-episode?movieId=${movieId}`, { headers: ajaxHeaders(COFLIX_BASE) });
          const pairs = captureGroups(/data-num=["'](\d+)["'][^>]*data-id=["'](\d+)["']/gi, list.html || '');
          if (new Set(pairs.map(pair => pair[0])).size <= 1) continue;
          episodeId = pairs.find(pair => Number(pair[0]) === episode)?.[1];
          if (!episodeId) continue;
        }
        const body = new URLSearchParams({ episode_id: episodeId }).toString();
        const json = await fetchJson(`${COFLIX_BASE}/ajax/episode/player?episode_id=${encodeURIComponent(episodeId)}`, {
          method: 'POST', body, headers: { ...ajaxHeaders(COFLIX_BASE), 'Content-Type': 'application/x-www-form-urlencoded' },
        });
        for (const server of (json.message || []).slice(0, 5)) {
          const embed = typeof server.server_link === 'string' ? server.server_link : server.server_link?.url;
          const resolved = embed && await resolveEmbed(embed, `${COFLIX_BASE}/`);
          if (!resolved) continue;
          const version = String(server.version || '').toLowerCase();
          output.push(makeSource('frenchanime', resolved, version.includes('vostfr') ? 'VOSTFR' : version.includes('vf') ? 'VF' : language));
          break;
        }
      } catch { /* try next result */ }
      if (output.some(source => source.language === language)) break;
    }
  }
  return dedupe(output);
}

function titleScore100(candidate, wanted) {
  const a = normalize(wanted), b = normalize(candidate);
  if (!a || !b) return 0;
  if (a === b) return 100;
  if (b === `${a} vostfr`) return 95;
  if (a.length >= 5 && (b.includes(a) || a.includes(b))) return 70;
  const at = tokens(a), bt = tokens(b);
  const ratio = at.filter(token => bt.includes(token)).length / Math.max(at.length, bt.length, 1);
  return ratio >= 0.6 ? Math.round(40 + ratio * 30) : ratio >= 0.4 ? 25 : 0;
}

async function findStreamzoMatch(metadata, mediaType) {
  const wantSeries = mediaType !== 'movie';
  let best = null, bestScore = 0;
  for (const query of metadata.titles.slice(0, 3)) {
    const cleaned = query.replace(/\s+(saison|season)\s*\d+$/i, '');
    try {
      const json = await fetchJson(`${STREAMZO_BASE}/api/web/suggest?q=${encodeURIComponent(cleaned)}`, { headers: ajaxHeaders(STREAMZO_BASE) });
      for (const item of json.suggestions || []) {
        if (!item.href?.startsWith('/')) continue;
        const isSeries = (item.content_type || item.kind) === 'series';
        let score = Math.max(...metadata.titles.map(title => Math.max(titleScore100(item.titre || '', title), titleScore100(item.slug || '', title))));
        score += isSeries === wantSeries ? 25 : -60;
        const year = Number(item.year) || null;
        if (year && metadata.year) {
          const difference = Math.abs(year - metadata.year);
          score += difference === 0 ? 30 : difference === 1 ? 15 : difference > 2 ? -25 : 0;
        }
        if (score > bestScore) {
          bestScore = score;
          best = { href: item.href, kind: isSeries ? 'series' : 'movie', quality: item.resolution || item.quality || 'HD' };
        }
      }
    } catch { /* try another title */ }
    if (bestScore >= 110) break;
  }
  return bestScore >= 45 ? best : null;
}

function streamzoMovieEmbed(html) {
  return html.match(/id=["']player-facade["'][^>]*data-embed=["']([^"']+)["']/i)?.[1]
    || html.match(/data-embed=["']([^"']+)["'][^>]*id=["']player-facade["']/i)?.[1]
    || html.match(/<iframe[^>]*src=["']([^"']+)["']/i)?.[1];
}

function streamzoEpisodes(html, season, episode) {
  const output = [];
  for (const tag of captures(/(<button\b[^>]*class=["'][^"']*\bsd-ep\b[^"']*["'][^>]*>)/gi, html)) {
    if (Number(tag.match(/data-season=["']?(\d+)/i)?.[1]) !== season || Number(tag.match(/data-ep=["']?(\d+)/i)?.[1]) !== episode) continue;
    const url = tag.match(/data-src=["']([^"']+)["']/i)?.[1];
    if (!url) continue;
    const raw = tag.match(/data-lang=["']([^"']+)["']/i)?.[1]?.toLowerCase() || 'vf';
    const language = raw === 'vostfr' ? 'VOSTFR' : raw === 'vf' ? 'VF' : raw.toUpperCase();
    if (!output.some(item => item.language === language)) output.push({ url, language });
  }
  return output.sort((a, b) => (a.language === 'VF' ? 0 : 1) - (b.language === 'VF' ? 0 : 1));
}

async function resolveStreamzoEmbed(embed, referer) {
  const full = absoluteUrl(embed, STREAMZO_BASE);
  const decoded = decodeText(unpackPage(await fetchText(full, { referer })));
  const url = captures(/(https?:\/\/[^"'<>\s\\]+\.m3u8[^"'<>\s\\]*)/gi, decoded)[0]
    || captures(/(https?:\/\/[^"'<>\s\\]+\.mp4[^"'<>\s\\]*)/gi, decoded)[0];
  return url ? { url, headers: playbackHeaders(full), quality: qualityFrom(url) } : null;
}

async function isPlayable(source) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(source.url, { signal: controller.signal, headers: { ...source.headers, Range: 'bytes=0-8191' } });
    if (!response.ok) return false;
    const type = response.headers.get('content-type')?.toLowerCase() || '';
    const data = Buffer.from(await response.arrayBuffer());
    const prefix = data.subarray(0, 8192).toString('utf8').trimStart();
    return prefix.startsWith('#EXTM3U') || (data.length > 0 && (type.startsWith('video/') || type.includes('octet-stream') || type.includes('mp2t')));
  } catch { return false; } finally { clearTimeout(timer); }
}

async function getStreamzoStreams(metadata, mediaType, season, episode) {
  const match = await findStreamzoMatch(metadata, mediaType);
  if (!match) return [];
  const pageUrl = absoluteUrl(match.href, STREAMZO_BASE);
  const html = await fetchText(pageUrl, { referer: `${STREAMZO_BASE}/` });
  const output = [];
  if (match.kind === 'movie') {
    const embed = streamzoMovieEmbed(html);
    const resolved = embed && await resolveStreamzoEmbed(embed, pageUrl);
    if (resolved) output.push(makeSource('streamzo', resolved, match.href.toLowerCase().includes('-vostfr') ? 'VOSTFR' : 'VF', match.quality));
  } else {
    for (const variant of streamzoEpisodes(html, Math.max(Number(season) || 1, 1), Math.max(Number(episode) || 1, 1)).slice(0, 2)) {
      try {
        const resolved = await resolveStreamzoEmbed(variant.url, pageUrl);
        if (resolved) output.push(makeSource('streamzo', resolved, variant.language, match.quality));
      } catch { /* try the other language */ }
    }
  }
  const playable = [];
  for (const source of dedupe(output)) if (await isPlayable(source)) playable.push(source);
  return playable;
}

export async function getFrenchProviderStreams({ provider, tmdbId, mediaType = 'movie', season, episode }) {
  if (!['animesama', 'frenchanime', 'frenchstream', 'streamzo'].includes(provider)) throw new Error(`Unsupported provider: ${provider}`);
  if (provider === 'frenchstream') {
    return getGowaruFrenchStreamStreams({ tmdbId, mediaType, season, episode });
  }
  const metadata = await tmdbMetadata(tmdbId, mediaType, season);
  if (!metadata.titles.length) return [];
  if (provider === 'animesama') return getAnimeSamaStreams(metadata, mediaType, season, episode);
  if (provider === 'frenchanime') return getFrenchAnimeStreams(metadata, mediaType, season, episode);
  return getStreamzoStreams(metadata, mediaType, season, episode);
}
