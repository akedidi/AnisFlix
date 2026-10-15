import axios from 'axios';

const TMDB_API_KEY = '1865f43a0549ca50d341dd9ab8b29f49';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const BASES = [
  { page: 'https://megaplay.buzz', name: 'MegaPlay' },
  { page: 'https://vidwish.live', name: 'Vidwish' },
  { page: 'https://megacloud.bloggy.click', name: 'MegaCloud' },
];

async function get(url, headers = {}) {
  return axios.get(url, {
    timeout: 18000,
    headers: { 'User-Agent': USER_AGENT, Accept: '*/*', ...headers },
    validateStatus: (status) => status >= 200 && status < 400,
  });
}

function dataIds(html) {
  const tag = String(html).match(/id=["']megaplay-player["'][^>]*>/i)?.[0] || '';
  return {
    id: tag.match(/data-id=["']([^"']+)["']/i)?.[1],
    realId: tag.match(/data-realid=["']([^"']+)["']/i)?.[1],
  };
}

async function tmdbInfo(tmdbId, mediaType) {
  const kind = mediaType === 'movie' ? 'movie' : 'tv';
  const [detail, external] = await Promise.all([
    get(`https://api.themoviedb.org/3/${kind}/${tmdbId}?api_key=${TMDB_API_KEY}&language=en-US`),
    get(`https://api.themoviedb.org/3/${kind}/${tmdbId}/external_ids?api_key=${TMDB_API_KEY}`),
  ]);
  return {
    title: detail.data?.title || detail.data?.name || detail.data?.original_title || detail.data?.original_name,
    imdbId: external.data?.imdb_id,
  };
}

async function malTarget(tmdbId, mediaType, season, episode) {
  const info = await tmdbInfo(tmdbId, mediaType);
  if (mediaType === 'tv' && info.imdbId) {
    try {
      const mapping = await get(
        `https://id-mapping-api-malid.hf.space/api/resolve?id=${encodeURIComponent(info.imdbId)}&s=${season}&e=${episode}`
      );
      if (mapping.data?.mal_id) {
        return { malId: Number(mapping.data.mal_id), episode: Number(mapping.data.mal_episode) || episode };
      }
    } catch { /* Jikan fallback below */ }
  }
  const type = mediaType === 'movie' ? 'movie' : 'tv';
  const search = await get(
    `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(info.title || '')}&type=${type}&limit=1`
  );
  const malId = Number(search.data?.data?.[0]?.mal_id);
  return malId ? { malId, episode: mediaType === 'movie' ? 1 : episode } : null;
}

function sourceFromJson(data, origin, server) {
  const raw = data?.sources;
  const url = Array.isArray(raw) ? raw[0]?.file : raw?.file;
  if (!url) return null;
  const subtitles = (data?.tracks || [])
    .filter((track) => track?.file && track?.kind === 'captions')
    .map((track) => ({
      url: track.file,
      label: track.label || 'English',
      code: String(track.label || 'en').slice(0, 3).toLowerCase(),
    }));
  return {
    url,
    provider: 'hianime',
    quality: 'Auto',
    language: 'VOSTFR',
    type: 'hls',
    subtitles,
    headers: { Referer: `${origin}/`, Origin: origin, 'User-Agent': USER_AGENT },
    server,
  };
}

async function extract(origin, id, referer, server) {
  const response = await get(
    `${origin}/stream/getSources?id=${encodeURIComponent(id)}&id=${encodeURIComponent(id)}`,
    { 'X-Requested-With': 'XMLHttpRequest', Referer: referer, Origin: origin }
  );
  return sourceFromJson(response.data, origin, server);
}

export async function getHiAnimeStreams(tmdbId, mediaType = 'tv', season = 1, episode = 1) {
  const target = await malTarget(Number(tmdbId), mediaType, Number(season), Number(episode));
  if (!target) return [];
  const megaUrl = `${BASES[0].page}/stream/mal/${target.malId}/${target.episode}/sub`;
  const megaPage = await get(megaUrl, { Referer: megaUrl });
  const ids = dataIds(megaPage.data);
  if (ids.id) {
    const direct = await extract(BASES[0].page, ids.id, megaUrl, BASES[0].name).catch(() => null);
    if (direct) return [direct];
  }
  if (!ids.realId) return [];
  const fallbacks = await Promise.all(BASES.slice(1).map(async (server, index) => {
    const pageUrl = `${server.page}/stream/s-${index + 2}/${ids.realId}/sub`;
    const page = await get(pageUrl, { Referer: megaUrl }).catch(() => null);
    const id = dataIds(page?.data).id;
    return id ? extract(server.page, id, pageUrl, server.name).catch(() => null) : null;
  }));
  return fallbacks.filter(Boolean);
}
