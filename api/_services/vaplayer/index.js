/**
 * VaPlayer — IMDB-keyed HLS streams (Streamline port).
 * Labels qualities from the master playlist RESOLUTION tags (never "Auto",
 * never guess from opaque CDN tokens which false-match "4k"/"1080"/…).
 */

const TMDB_API_KEY = '68e094699525b18a70bab2f86b1fa706';
const VAPLAYER_API = 'https://streamdata.vaplayer.ru';
const REFERER = 'https://nextgencloudfabric.com/';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const STREAM_HEADERS = {
  Referer: REFERER,
  'User-Agent': UA,
};

async function getImdbId(tmdbId, mediaType) {
  const type = mediaType === 'tv' ? 'tv' : 'movie';
  const res = await fetch(
    `https://api.themoviedb.org/3/${type}/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=external_ids`,
    { headers: { Accept: 'application/json', 'User-Agent': UA } },
  );
  if (!res.ok) throw new Error(`TMDB HTTP ${res.status}`);
  const data = await res.json();
  const imdb = data.imdb_id || data.external_ids?.imdb_id;
  if (!imdb) throw new Error('Missing IMDB id');
  const title =
    type === 'tv' ? data.name || data.original_name : data.title || data.original_title;
  return { imdbId: imdb, title: title || 'Unknown' };
}

/** Label by long edge — VaPlayer masters are often ultrawide (e.g. 1920×800). */
function qualityFromResolution(width, height) {
  const longEdge = Math.max(width || 0, height || 0);
  if (longEdge < 1) return null;
  if (longEdge >= 3800) return '4K';
  if (longEdge >= 1800) return '1080p';
  if (longEdge >= 1200) return '720p';
  if (longEdge >= 800) return '480p';
  if (longEdge >= 600) return '360p';
  return `${longEdge}p`;
}

function absoluteUrl(base, relative) {
  try {
    return new URL(relative, base).href;
  } catch {
    return null;
  }
}

/** Parse ABR variants from a master playlist; skip unlabeled / Auto. */
function parseVariants(playlistText, playlistUrl) {
  const lines = playlistText.split(/\r?\n/);
  const variants = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.startsWith('#EXT-X-STREAM-INF:')) continue;
    const res = /RESOLUTION=(\d+)x(\d+)/i.exec(line);
    const width = res ? parseInt(res[1], 10) : 0;
    const height = res ? parseInt(res[2], 10) : 0;
    const quality = qualityFromResolution(width, height);
    if (!quality) continue;
    const next = (lines[i + 1] || '').trim();
    if (!next || next.startsWith('#')) continue;
    const url = absoluteUrl(playlistUrl, next);
    if (!url) continue;
    const rank = Math.max(width, height);
    variants.push({ url, quality, rank });
  }
  // One entry per quality label (keep highest resolution when duplicates).
  const byQuality = new Map();
  for (const v of variants) {
    const prev = byQuality.get(v.quality);
    if (!prev || v.rank > prev.rank) byQuality.set(v.quality, v);
  }
  return [...byQuality.values()].sort((a, b) => b.rank - a.rank);
}

async function fetchPlaylist(url) {
  const res = await fetch(url, {
    headers: {
      Accept: '*/*',
      Referer: REFERER,
      Origin: 'https://nextgencloudfabric.com',
      'User-Agent': UA,
    },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`playlist HTTP ${res.status}`);
  return res.text();
}

/**
 * VaPlayer often returns several CDN mirrors of the same ABR master.
 * Expand the first working master into real resolution variants.
 */
async function expandToQualityStreams(candidateUrls) {
  for (const masterUrl of candidateUrls) {
    try {
      const text = await fetchPlaylist(masterUrl);
      const variants = parseVariants(text, masterUrl);
      if (variants.length > 0) return variants;
      // Media playlist (no STREAM-INF): single rendition, no height → skip Auto.
      if (text.includes('#EXTINF')) {
        return [{ url: masterUrl, quality: 'HD', height: 0 }];
      }
    } catch {
      // try next mirror
    }
  }
  return [];
}

export async function getVaPlayerStreams(
  tmdbId,
  mediaType = 'movie',
  season = null,
  episode = null,
) {
  const type = mediaType === 'tv' ? 'tv' : 'movie';
  const { imdbId, title } = await getImdbId(tmdbId, type);

  const apiUrl =
    type === 'movie'
      ? `${VAPLAYER_API}/api.php?imdb=${encodeURIComponent(imdbId)}&type=movie`
      : `${VAPLAYER_API}/api.php?imdb=${encodeURIComponent(imdbId)}&type=tv&season=${Number(season) || 1}&episode=${Number(episode) || 1}`;

  const res = await fetch(apiUrl, {
    headers: { Accept: 'application/json', Referer: REFERER, 'User-Agent': UA },
  });
  if (!res.ok) throw new Error(`VaPlayer HTTP ${res.status}`);
  const json = await res.json();
  const urls = (Array.isArray(json?.data?.stream_urls) ? json.data.stream_urls : []).filter(
    (u) => typeof u === 'string' && u.startsWith('http'),
  );

  const streamTitle =
    type === 'tv' && season && episode
      ? `${title} S${String(season).padStart(2, '0')}E${String(episode).padStart(2, '0')}`
      : title;

  const variants = await expandToQualityStreams(urls);
  return variants.map(({ url, quality }) => ({
    name: `VaPlayer - ${quality}`,
    title: streamTitle,
    url,
    quality,
    type: url.includes('.m3u8') ? 'm3u8' : 'mp4',
    provider: 'vaplayer',
    language: 'VO',
    headers: STREAM_HEADERS,
  }));
}
