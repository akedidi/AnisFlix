import axios from "axios";

const TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const ANILIST_URL = "https://graphql.anilist.co";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
  Connection: "keep-alive",
};

const API = "https://enc-dec.app/api";
const DB_API = "https://enc-dec.app/db/kai";
const KAI_AJAX = "https://animekai.to/ajax";
const ARM_BASE = "https://arm.haglund.dev/api/v2";

async function fetchJson(url, { method = "GET", headers = {}, body, timeoutMs = 15000 } = {}) {
  const res = await axios.request({
    url,
    method,
    headers: { ...HEADERS, ...headers },
    data: body,
    timeout: timeoutMs,
    validateStatus: (s) => s >= 200 && s < 300,
  });
  return res.data;
}

async function fetchText(url, { method = "GET", headers = {}, body, timeoutMs = 15000 } = {}) {
  const res = await axios.request({
    url,
    method,
    headers: { ...HEADERS, ...headers },
    data: body,
    timeout: timeoutMs,
    responseType: "text",
    validateStatus: (s) => s >= 200 && s < 300,
  });
  return res.data;
}

async function getCinemetaInfo(imdbId, mediaType, season, episode) {
  try {
    const cinemetaType = mediaType === "movie" ? "movie" : "series";
    const url = `https://v3-cinemeta.strem.io/meta/${cinemetaType}/${imdbId}.json`;
    const data = await fetchJson(url, { timeoutMs: 20000 });
    const meta = data?.meta;
    if (!meta) return { date: null, title: null, dayIndex: 1 };

    if (mediaType === "movie") {
      return {
        date: meta.released ? String(meta.released).split("T")[0] : null,
        title: meta.name || null,
        dayIndex: 1,
      };
    }

    const videos = Array.isArray(meta.videos) ? meta.videos : [];
    const target = videos.find((v) => String(v.season) == String(season) && String(v.episode) == String(episode));
    if (!target?.released) return { date: null, title: null, dayIndex: 1 };

    const targetDate = String(target.released).split("T")[0];
    const targetTitle = target.name || null;

    let dayIndex = 1;
    for (const v of videos) {
      if (String(v.season) == String(season) && v.released && String(v.released).split("T")[0] === targetDate) {
        if (parseInt(v.episode, 10) < parseInt(episode, 10)) dayIndex += 1;
      }
    }

    return { date: targetDate, title: targetTitle, dayIndex };
  } catch {
    return { date: null, title: null, dayIndex: 1 };
  }
}

async function getTmdbExternalIds(tmdbId, mediaType) {
  const endpoint = mediaType === "tv" ? "tv" : "movie";
  const url = `${TMDB_BASE_URL}/${endpoint}/${tmdbId}/external_ids?api_key=${TMDB_API_KEY}`;
  return (await fetchJson(url, { timeoutMs: 15000 })) || {};
}

async function getTmdbBase(tmdbId, mediaType) {
  const endpoint = mediaType === "tv" ? "tv" : "movie";
  const url = `${TMDB_BASE_URL}/${endpoint}/${tmdbId}?api_key=${TMDB_API_KEY}`;
  return (await fetchJson(url, { timeoutMs: 15000 })) || {};
}

async function getImdbFromArm(tmdbId) {
  try {
    const url = `${ARM_BASE}/themoviedb?id=${tmdbId}`;
    const data = await fetchJson(url, { timeoutMs: 15000 });
    return Array.isArray(data) && data[0]?.imdb ? data[0].imdb : null;
  } catch {
    return null;
  }
}

async function getSyncInfo(id, mediaType, season, episode) {
  const isImdb = typeof id === "string" && id.startsWith("tt");

  if (isImdb) {
    const c = await getCinemetaInfo(id, mediaType, season, episode);
    if (c.date) return { imdbId: id, releaseDate: c.date, episodeTitle: c.title, dayIndex: c.dayIndex, episode };
    throw new Error("Could not find release date on Cinemata");
  }

  const [details, base] = await Promise.all([
    getTmdbExternalIds(id, mediaType),
    getTmdbBase(id, mediaType),
  ]);
  const title = base?.name || base?.title || null;
  let imdbId = details?.imdb_id || null;

  if (!imdbId) {
    imdbId = await getImdbFromArm(id);
  }
  if (!imdbId) {
    throw new Error(`No IMDb ID found for TMDB ${id}`);
  }

  const cMeta = await getCinemetaInfo(imdbId, mediaType, season, episode);
  let finalDate = cMeta.date;
  if (mediaType === "movie" && base?.release_date) {
    finalDate = base.release_date;
  }
  if (!finalDate) {
    throw new Error(`Could not find release date on Cinemata or TMDB for ${imdbId}`);
  }

  return {
    imdbId,
    tmdbId: id,
    releaseDate: finalDate,
    title,
    episodeTitle: cMeta.title,
    dayIndex: cMeta.dayIndex,
    episode,
  };
}

async function resolveByDate(releaseDateStr, showTitle, season, episodeTitle, dayIndex, originalEpisode) {
  if (!releaseDateStr || !/^\d{4}-\d{2}-\d{2}/.test(releaseDateStr)) return null;
  if (!showTitle) return null;

  const query =
    "query($search:String){Page(perPage:20){media(search:$search,type:ANIME){id format title{romaji english}startDate{year month day}endDate{year month day}episodes streamingEpisodes{title}}}}";

  const json = await fetchJson(ANILIST_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables: { search: showTitle } }),
    timeoutMs: 20000,
  });
  const candidates = json?.data?.Page?.media || [];
  if (!Array.isArray(candidates) || candidates.length === 0) return null;

  const targetDate = new Date(releaseDateStr);
  for (const anime of candidates) {
    const s = anime?.startDate;
    const startStr =
      s?.year && s?.month && s?.day
        ? `${s.year}-${String(s.month).padStart(2, "0")}-${String(s.day).padStart(2, "0")}`
        : null;
    if (!startStr) continue;

    const startDate = new Date(startStr);
    const diffDays = Math.ceil(Math.abs(targetDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    let isMatch = false;
    if (anime.format === "MOVIE" || anime.format === "SPECIAL" || anime.episodes === 1) {
      if (diffDays <= 2) isMatch = true;
    } else {
      const startLimit = new Date(startDate);
      startLimit.setDate(startLimit.getDate() - 2);
      if (targetDate >= startLimit) {
        if (anime.endDate?.year) {
          const endDate = new Date(anime.endDate.year, (anime.endDate.month || 12) - 1, anime.endDate.day || 31);
          endDate.setDate(endDate.getDate() + 2);
          if (targetDate <= endDate) isMatch = true;
        } else {
          isMatch = true;
        }
      }
    }

    if (!isMatch) continue;

    const isTV = anime.format !== "MOVIE" && anime.format !== "SPECIAL" && anime.episodes !== 1;
    let episodeNum = isTV && originalEpisode ? originalEpisode : dayIndex || 1;

    const streamingEpisodes = Array.isArray(anime.streamingEpisodes) ? anime.streamingEpisodes : [];
    if (streamingEpisodes.length > 1 && episodeTitle) {
      const cleanTarget = String(episodeTitle).toLowerCase().replace(/[^a-z0-9]/g, "");
      for (let i = 0; i < streamingEpisodes.length; i++) {
        const cleanAl = String(streamingEpisodes[i]?.title || "").toLowerCase().replace(/[^a-z0-9]/g, "");
        if (cleanAl && (cleanAl.includes(cleanTarget) || cleanTarget.includes(cleanAl))) {
          episodeNum = i + 1;
          break;
        }
      }
    }

    return { alId: anime.id, episode: episodeNum, title: episodeTitle, dayIndex };
  }

  return null;
}

async function encryptKai(text) {
  const json = await fetchJson(`${API}/enc-kai?text=${encodeURIComponent(text)}`, { timeoutMs: 15000 });
  return json?.result || null;
}

async function decryptKai(text) {
  const json = await fetchJson(`${API}/dec-kai`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
    timeoutMs: 20000,
  });
  return json?.result || null;
}

async function parseHtmlViaApi(html) {
  const json = await fetchJson(`${API}/parse-html`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: html }),
    timeoutMs: 20000,
  });
  return json?.result || null;
}

async function decryptMegaMedia(embedUrl) {
  const mediaUrl = String(embedUrl).replace("/e/", "/media/");
  const mediaResp = await fetchJson(mediaUrl, { timeoutMs: 20000 });
  const encrypted = mediaResp?.result;
  if (!encrypted) return null;
  const json = await fetchJson(`${API}/dec-mega`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: encrypted, agent: HEADERS["User-Agent"] }),
    timeoutMs: 20000,
  });
  return json?.result || null;
}

async function findInDatabase(alId) {
  try {
    const url = `${DB_API}/find?anilist_id=${encodeURIComponent(String(alId))}`;
    const results = await fetchJson(url, { timeoutMs: 15000 });
    return Array.isArray(results) && results.length > 0 ? results[0] : null;
  } catch {
    return null;
  }
}

function extractQualityFromUrl(url) {
  const u = String(url || "");
  if (/[._/-]2160p?/i.test(u) || /\b(4k|uhd)\b/i.test(u)) return "4K";
  if (/[._/-]1440p?/i.test(u)) return "1440p";
  if (/[._/-]1080p?/i.test(u) || /\b(fhd|1080)\b/i.test(u)) return "1080p";
  if (/[._/-]720p?/i.test(u) || /\b(hd|720)\b/i.test(u)) return "720p";
  if (/[._/-]480p?/i.test(u) || /\b(sd|480)\b/i.test(u)) return "480p";
  if (/[._/-]360p?/i.test(u)) return "360p";
  if (/[._/-]240p?/i.test(u)) return "240p";
  const m = u.match(/quality[_-]?(\d{3,4})/i);
  if (m) return `${parseInt(m[1], 10)}p`;
  return "Unknown";
}

function parseM3U8Master(content, baseUrl) {
  const lines = String(content || "").split("\n");
  const streams = [];
  let current = null;
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith("#EXT-X-STREAM-INF:")) {
      current = { bandwidth: null, resolution: null, url: null };
      const bw = line.match(/BANDWIDTH=(\d+)/);
      if (bw) current.bandwidth = parseInt(bw[1], 10);
      const res = line.match(/RESOLUTION=(\d+x\d+)/);
      if (res) current.resolution = res[1];
    } else if (current && !line.startsWith("#")) {
      try {
        current.url = new URL(line, baseUrl).toString();
      } catch {
        current.url = line;
      }
      streams.push(current);
      current = null;
    }
  }
  return streams;
}

function qualityFromResolutionOrBandwidth(stream) {
  if (stream?.resolution) {
    const h = parseInt(String(stream.resolution).split("x")[1], 10);
    if (h >= 2160) return "4K";
    if (h >= 1440) return "1440p";
    if (h >= 1080) return "1080p";
    if (h >= 720) return "720p";
    if (h >= 480) return "480p";
    if (h >= 360) return "360p";
    return "240p";
  }
  if (stream?.bandwidth) {
    const mbps = stream.bandwidth / 1_000_000;
    if (mbps >= 15) return "4K";
    if (mbps >= 8) return "1440p";
    if (mbps >= 5) return "1080p";
    if (mbps >= 3) return "720p";
    if (mbps >= 1.5) return "480p";
    if (mbps >= 0.8) return "360p";
    return "240p";
  }
  return "Unknown";
}

async function resolveM3U8(url) {
  try {
    const content = await fetchText(url, {
      headers: { Accept: "application/vnd.apple.mpegurl,application/x-mpegURL,*/*" },
      timeoutMs: 20000,
    });

    if (content.includes("#EXT-X-STREAM-INF")) {
      const variants = parseM3U8Master(content, url);
      const out = variants.map((v) => ({
        url: v.url,
        quality: qualityFromResolutionOrBandwidth(v),
        serverType: "sub",
        serverName: "AnimeKai",
      }));
      const order = { "4K": 7, "1440p": 6, "1080p": 5, "720p": 4, "480p": 3, "360p": 2, "240p": 1, "Unknown": 0 };
      out.sort((a, b) => (order[b.quality] || 0) - (order[a.quality] || 0));
      return { success: true, streams: out };
    }

    if (content.includes("#EXTINF:")) {
      return { success: true, streams: [{ url, quality: extractQualityFromUrl(url), serverType: "sub", serverName: "AnimeKai" }] };
    }
  } catch {
    // ignore
  }
  return { success: false, streams: [{ url, quality: extractQualityFromUrl(url), serverType: "sub", serverName: "AnimeKai" }] };
}

async function resolveMultipleM3U8(m3u8Links) {
  const results = await Promise.allSettled(m3u8Links.map((l) => resolveM3U8(l.url)));
  const out = [];
  for (const r of results) {
    if (r.status === "fulfilled" && r.value?.streams) out.push(...r.value.streams);
  }
  return out;
}

function formatToStreams(streamData, mediaTitle) {
  const streams = Array.isArray(streamData?.streams) ? streamData.streams : [];
  const subtitles = Array.isArray(streamData?.subtitles) ? streamData.subtitles : [];

  const filtered = streams.filter((s) => {
    const t = String(s?.serverType || "").toLowerCase();
    // only keep sub/softsub
    return t.includes("sub") && !t.includes("dub");
  });

  const seen = new Set();
  return filtered
    .filter((s) => {
      const url = String(s?.url || "");
      if (!url || seen.has(url)) return false;
      seen.add(url);
      return true;
    })
    .map((s) => ({
      provider: "animekai",
      name: `AnimeKai | ${s.serverName || "Server"} | ${s.quality || "Auto"}`,
      title: mediaTitle || "",
      url: s.url,
      quality: s.quality || extractQualityFromUrl(s.url),
      headers: {
        "User-Agent": HEADERS["User-Agent"],
        Accept:
          "video/webm,video/ogg,video/*;q=0.9,application/ogg;q=0.7,audio/*;q=0.6,*/*;q=0.5",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "identity",
      },
      subtitles,
    }));
}

async function runStreamFetch(token) {
  const encToken = await encryptKai(token);
  if (!encToken) return { streams: [], subtitles: [] };

  const serversResp = await fetchJson(
    `${KAI_AJAX}/links/list?token=${encodeURIComponent(token)}&_=${encodeURIComponent(encToken)}`,
    { timeoutMs: 20000 }
  );

  const servers = await parseHtmlViaApi(serversResp?.result);
  if (!servers || typeof servers !== "object") return { streams: [], subtitles: [] };

  const serverPromises = [];
  for (const serverType of Object.keys(servers)) {
    // only sub/softsub types
    const stLower = String(serverType).toLowerCase();
    if (!stLower.includes("sub") || stLower.includes("dub")) continue;

    for (const serverKey of Object.keys(servers[serverType] || {})) {
      const serverData = servers[serverType][serverKey];
      const lid = serverData?.lid;
      if (!lid) continue;
      const serverName = serverData?.name || serverData?.title || serverData?.label || (isNaN(serverKey) ? serverKey : `Server ${serverKey}`);

      const p = (async () => {
        try {
          const encLid = await encryptKai(lid);
          if (!encLid) return { streams: [], subtitles: [] };

          const embedResp = await fetchJson(
            `${KAI_AJAX}/links/view?id=${encodeURIComponent(lid)}&_=${encodeURIComponent(encLid)}`,
            { timeoutMs: 20000 }
          );

          const decrypted = await decryptKai(embedResp?.result);
          if (!decrypted?.url) return { streams: [], subtitles: [] };

          const mediaData = await decryptMegaMedia(decrypted.url);
          const srcs = [];
          if (mediaData?.sources && Array.isArray(mediaData.sources)) {
            for (const src of mediaData.sources) {
              if (src?.file) {
                srcs.push({
                  url: src.file,
                  quality: extractQualityFromUrl(src.file),
                  serverType,
                  serverName,
                });
              }
            }
          }

          const subs = Array.isArray(mediaData?.tracks)
            ? mediaData.tracks
                .filter((t) => t?.kind === "captions" && t?.file)
                .map((t) => ({ language: t.label || "Unknown", url: t.file, default: !!t.default }))
            : [];

          return { streams: srcs, subtitles: subs };
        } catch {
          return { streams: [], subtitles: [] };
        }
      })();

      serverPromises.push(p);
    }
  }

  const results = await Promise.allSettled(serverPromises);
  let allStreams = [];
  let allSubs = [];
  for (const r of results) {
    if (r.status === "fulfilled") {
      allStreams = allStreams.concat(r.value.streams || []);
      allSubs = allSubs.concat(r.value.subtitles || []);
    }
  }

  const m3u8Links = allStreams.filter((s) => s?.url && String(s.url).includes(".m3u8"));
  const directLinks = allStreams.filter((s) => !(s?.url && String(s.url).includes(".m3u8")));
  const resolved = await resolveMultipleM3U8(m3u8Links);
  return { streams: directLinks.concat(resolved), subtitles: allSubs };
}

export async function getAnimeKaiStreams({ id, mediaType, season, episode }) {
  const syncInfo = await getSyncInfo(id, mediaType, season, episode);
  const syncResult = await resolveByDate(
    syncInfo.releaseDate,
    syncInfo.title,
    season,
    syncInfo.episodeTitle,
    syncInfo.dayIndex,
    episode
  );
  if (!syncResult?.alId) return [];

  const dbData = await findInDatabase(syncResult.alId);
  if (!dbData) return [];

  let token = null;
  let epStr = String(syncResult.episode || syncResult.dayIndex || 1);
  const seasons = dbData.episodes || {};

  for (const sKey of Object.keys(seasons)) {
    if (seasons[sKey]?.[epStr]) {
      token = seasons[sKey][epStr].token;
      break;
    }
  }

  if (!token) return [];

  const streamData = await runStreamFetch(token);
  const title = dbData?.info?.title_en || syncInfo.title || "Anime";
  const mediaTitle = `${title} E${epStr}`;
  const formatted = formatToStreams(streamData, mediaTitle);

  const order = { "4K": 7, "1440p": 6, "1080p": 5, "720p": 4, "480p": 3, "360p": 2, "240p": 1, "Unknown": 0, "Auto": 0 };
  formatted.sort((a, b) => (order[b.quality] || 0) - (order[a.quality] || 0));
  return formatted;
}

