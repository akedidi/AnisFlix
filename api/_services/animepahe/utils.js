import axios from 'axios';
import { MAIN_URL, PROXY_URL, HEADERS, TMDB_API_KEY } from './constants.js';

export async function fetchText(url, options = {}) {
  const { useProxy = true, headers = {}, timeout = 20000, method = 'GET' } = options;
  const finalUrl = url.startsWith('http') ? url : `${MAIN_URL}${url}`;
  const targetUrl = useProxy ? `${PROXY_URL}${encodeURIComponent(finalUrl)}` : finalUrl;

  const res = await axios.request({
    url: targetUrl,
    method,
    headers: { ...HEADERS, ...headers },
    timeout,
    validateStatus: (s) => s >= 200 && s < 400,
    responseType: 'text',
  });
  return res.data;
}

export async function fetchJson(url, options = {}) {
  const text = await fetchText(url, options);
  return JSON.parse(text);
}

export async function getImdbId(tmdbId, mediaType) {
  try {
    const path = mediaType === 'tv' ? 'tv' : 'movie';
    const res = await axios.get(
      `https://api.themoviedb.org/3/${path}/${tmdbId}/external_ids?api_key=${TMDB_API_KEY}`,
      { timeout: 12000 }
    );
    return res.data?.imdb_id || null;
  } catch {
    return null;
  }
}

export async function resolveMapping(imdbId, season, episode) {
  try {
    const res = await axios.get(
      `https://id-mapping-api-malid.hf.space/api/resolve?id=${imdbId}&s=${season}&e=${episode}`,
      { timeout: 12000 }
    );
    if (res.status < 200 || res.status >= 400) return null;
    return res.data;
  } catch {
    return null;
  }
}

export async function getMalTitle(malId) {
  try {
    const res = await axios.get(`https://api.jikan.moe/v4/anime/${malId}`, { timeout: 12000 });
    if (res.status < 200 || res.status >= 400) return null;
    return res.data?.data?.title || null;
  } catch {
    return null;
  }
}

export async function searchAnime(query) {
  const url = `/api?m=search&l=8&q=${encodeURIComponent(query)}`;
  return fetchJson(url);
}

export function extractQuality(text) {
  const match = String(text).match(/(\d{3,4}p)/);
  return match ? match[1] : '720p';
}
