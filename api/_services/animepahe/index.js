import axios from 'axios';

import { HEADERS, MAIN_URL, TMDB_API_KEY } from './constants.js';
import { extractKwik } from './extractors.js';
import {
  fetchJson,
  fetchText,
  getImdbId,
  getMalTitle,
  resolveMapping,
  searchAnime,
} from './utils.js';

function list(value) {
  return Array.isArray(value) ? value : [];
}

async function tmdbMovieTitle(tmdbId) {
  const { data } = await axios.get(
    `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}&language=en-US`,
    { timeout: 12000 }
  );
  return data?.title || data?.original_title || null;
}

async function animeSessionForMal(malId, titles) {
  const checked = new Set();
  for (const title of titles.filter(Boolean)) {
    const search = await searchAnime(title).catch(() => null);
    for (const item of list(search?.data).slice(0, 3)) {
      if (!item?.session || checked.has(item.session)) continue;
      checked.add(item.session);
      const html = await fetchText(`/anime/${item.session}`).catch(() => '');
      if (html.includes(`myanimelist.net/anime/${malId}`)) return item.session;
    }
  }
  return null;
}

async function resolveAnime(tmdbId, mediaType, season, episode) {
  if (mediaType === 'tv') {
    const imdbId = await getImdbId(tmdbId, 'tv');
    if (!imdbId) return null;
    const mapping = await resolveMapping(imdbId, season, episode);
    const malId = Number(mapping?.mal_id);
    if (!malId) return null;
    const jikanTitle = await getMalTitle(malId);
    const titles = [...new Set([mapping?.anime_title, jikanTitle].filter(Boolean))];
    const session = await animeSessionForMal(malId, titles);
    return session
      ? { session, episode: Number(mapping?.mal_episode) || episode }
      : null;
  }

  const title = await tmdbMovieTitle(tmdbId);
  if (!title) return null;
  const search = await searchAnime(title).catch(() => null);
  const match = list(search?.data).find((item) => item?.session);
  return match ? { session: match.session, episode: 1 } : null;
}

async function episodeSession(animeSession, episode) {
  const pageOne = await fetchJson(
    `/api?m=release&id=${encodeURIComponent(animeSession)}&sort=episode_asc&page=1`
  );
  const firstItems = list(pageOne?.data);
  if (!firstItems.length) return null;
  const start = Math.floor(Number(firstItems[0]?.episode) || 1);
  const perPage = Math.max(Number(pageOne?.per_page) || 30, 1);
  const target = start - 1 + episode;
  const page = Math.max(Math.ceil(episode / perPage), 1);
  const payload = page === 1
    ? pageOne
    : await fetchJson(
      `/api?m=release&id=${encodeURIComponent(animeSession)}&sort=episode_asc&page=${page}`
    );
  return list(payload?.data)
    .find((item) => Math.floor(Number(item?.episode) || 0) === target)?.session || null;
}

function kwikButtons(html) {
  const found = [];
  const seen = new Set();
  const buttonPattern = /<button[^>]*data-src=["'](https?:\/\/[^"']*kwik[^"']*)["']([^>]*)>([\s\S]*?)<\/button>/gi;
  for (const match of html.matchAll(buttonPattern)) {
    if (seen.has(match[1])) continue;
    seen.add(match[1]);
    const resolution = match[2].match(/data-resolution=["'](\d+)["']/i)?.[1];
    const audio = match[2].match(/data-audio=["']([^"']+)["']/i)?.[1];
    found.push({ url: match[1], resolution, audio, label: match[3] });
  }
  if (!found.length) {
    const scripted = html.match(/let\s+url\s*=\s*["'](https?:\/\/kwik\.cx\/[^"']+)["']/i)?.[1];
    if (scripted) found.push({ url: scripted, resolution: '1080', audio: 'jpn', label: '1080p' });
  }
  return found;
}

export async function getAnimePaheStreams(tmdbId, mediaType = 'tv', season = 1, episode = 1) {
  const resolved = await resolveAnime(Number(tmdbId), mediaType, Number(season), Number(episode));
  if (!resolved) return [];
  const epSession = await episodeSession(resolved.session, resolved.episode);
  if (!epSession) return [];
  const playUrl = `${MAIN_URL}/play/${resolved.session}/${epSession}`;
  const html = await fetchText(playUrl);
  const extracted = await Promise.all(
    kwikButtons(html).map(async (button) => {
      const stream = await extractKwik(button.url);
      if (!stream?.url) return null;
      const quality = button.resolution
        ? `${button.resolution}p`
        : button.label.match(/(\d{3,4}p)/i)?.[1] || '720p';
      const dub = button.audio?.toLowerCase() === 'eng' || /eng|dub/i.test(button.label);
      return {
        url: stream.url,
        provider: 'animepahe',
        quality,
        language: dub ? 'VO' : 'VOSTFR',
        type: stream.url.includes('.m3u8') ? 'hls' : 'mp4',
        headers: { ...HEADERS, ...stream.headers, Referer: 'https://kwik.cx/', Origin: 'https://kwik.cx' },
      };
    })
  );
  return extracted.filter(Boolean);
}
