import axios from "axios";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
  Connection: "keep-alive",
};

const API = "https://enc-dec.app/api";
const DB_API = "https://enc-dec.app/db/flix";
const YFLIX_AJAX = "https://yflix.to/ajax";

function extraHeaders(url) {
  try {
    const host = new URL(url).hostname;
    if (host.endsWith("yflix.to"))
      return { Referer: "https://yflix.to/", Origin: "https://yflix.to" };
    if (host.endsWith("enc-dec.app"))
      return { Referer: "https://enc-dec.app/", Origin: "https://enc-dec.app" };
    if (host.endsWith("rapidshare.cc") || host.endsWith("rapidshare.work") || host.includes("rapidshare"))
      return { Referer: "https://yflix.to/", Origin: "https://yflix.to" };
  } catch {}
  return {};
}

async function getJson(url, { timeout = 15000 } = {}) {
  const res = await axios.get(url, {
    headers: { ...HEADERS, ...extraHeaders(url) },
    timeout,
    validateStatus: (s) => s >= 200 && s < 300,
  });
  return res.data;
}

async function postJson(url, body, { timeout = 15000 } = {}) {
  const res = await axios.post(url, body, {
    headers: {
      ...HEADERS,
      ...extraHeaders(url),
      "Content-Type": "application/json",
    },
    timeout,
    validateStatus: (s) => s >= 200 && s < 300,
  });
  return res.data;
}

async function getText(url, { timeout = 20000 } = {}) {
  const res = await axios.get(url, {
    headers: { ...HEADERS, ...extraHeaders(url) },
    timeout,
    responseType: "text",
    validateStatus: (s) => s >= 200 && s < 300,
  });
  return res.data;
}

function encrypt(text) {
  return getJson(`${API}/enc-movies-flix?text=${encodeURIComponent(text)}`).then(
    (j) => j.result
  );
}

function decrypt(text) {
  return postJson(`${API}/dec-movies-flix`, { text }).then((j) => j.result);
}

function parseHtml(html) {
  return postJson(`${API}/parse-html`, { text: html }).then((j) => j.result);
}

async function decryptRapidMedia(embedUrl) {
  const mediaUrl = embedUrl.replace("/e/", "/media/").replace("/e2/", "/media/");
  const mediaResp = await getJson(mediaUrl, { timeout: 20000 });
  const encrypted = mediaResp?.result;
  if (!encrypted) return null;
  const dec = await postJson(
    `${API}/dec-rapid`,
    { text: encrypted, agent: HEADERS["User-Agent"] },
    { timeout: 20000 }
  );
  return dec?.result || null;
}

async function findInDatabase(tmdbId, mediaType) {
  const type = mediaType === "movie" ? "movie" : "tv";
  const results = await getJson(
    `${DB_API}/find?tmdb_id=${tmdbId}&type=${type}`,
    { timeout: 15000 }
  );
  return Array.isArray(results) && results.length > 0 ? results[0] : null;
}

function parseM3U8Master(content, baseUrl) {
  const lines = content.split(/\r?\n/);
  const streams = [];
  let cur = null;
  for (const raw of lines) {
    const line = raw.trim();
    if (line.startsWith("#EXT-X-STREAM-INF")) {
      cur = {};
      const bw = line.match(/BANDWIDTH=(\d+)/i);
      if (bw) cur.bandwidth = parseInt(bw[1]);
      const res = line.match(/RESOLUTION=(\d+)x(\d+)/i);
      if (res) {
        cur.width = parseInt(res[1]);
        cur.height = parseInt(res[2]);
        cur.quality = `${cur.height}p`;
      }
      if (!cur.quality && cur.bandwidth) {
        const b = cur.bandwidth;
        cur.quality =
          b >= 4000000
            ? "1440p"
            : b >= 2500000
              ? "1080p"
              : b >= 1500000
                ? "720p"
                : b >= 800000
                  ? "480p"
                  : "360p";
      }
    } else if (line && !line.startsWith("#") && cur) {
      let streamUrl = line;
      if (!streamUrl.startsWith("http") && baseUrl) {
        try {
          streamUrl = new URL(line, baseUrl).href;
        } catch {}
      }
      streams.push({
        url: streamUrl,
        quality: cur.quality || "unknown",
        bandwidth: cur.bandwidth,
        height: cur.height,
        type: "hls",
      });
      cur = null;
    }
  }
  return streams.sort((a, b) => (b.height || 0) - (a.height || 0));
}

function formatRapidResult(rapidResult) {
  const streams = [];
  const subtitles = [];
  if (!rapidResult) return { streams, subtitles };

  for (const src of rapidResult.sources || []) {
    if (src?.file) {
      streams.push({
        url: src.file,
        quality: src.file.includes(".m3u8") ? "Adaptive" : "unknown",
        type: src.file.includes(".m3u8") ? "hls" : "file",
      });
    }
  }
  for (const tr of rapidResult.tracks || []) {
    if ((tr?.kind === "captions" || tr?.kind === "subtitles") && tr.file) {
      subtitles.push({
        url: tr.file,
        language: tr.label || "Unknown",
        default: !!tr.default,
      });
    }
  }
  return { streams, subtitles };
}

async function enhanceWithQualities(streams) {
  const enhanced = [];
  for (const s of streams) {
    if (s.url?.includes(".m3u8")) {
      try {
        const content = await getText(s.url);
        if (content.includes("#EXT-X-STREAM-INF")) {
          const variants = parseM3U8Master(content, s.url);
          for (const v of variants) {
            enhanced.push({ ...s, ...v, masterUrl: s.url });
          }
          continue;
        }
      } catch {}
    }
    enhanced.push(s);
  }
  return enhanced;
}

async function runStreamFetch(eid) {
  const encEid = await encrypt(eid);
  const serversResp = await getJson(
    `${YFLIX_AJAX}/links/list?eid=${eid}&_=${encEid}`,
    { timeout: 20000 }
  );
  const servers = await parseHtml(serversResp?.result);
  if (!servers || typeof servers !== "object") return { streams: [], subtitles: [] };

  const allStreams = [];
  const allSubtitles = [];
  const promises = [];

  for (const serverType of Object.keys(servers)) {
    for (const serverKey of Object.keys(servers[serverType] || {})) {
      const lid = servers[serverType][serverKey]?.lid;
      if (!lid) continue;

      promises.push(
        (async () => {
          try {
            const encLid = await encrypt(lid);
            const embedResp = await getJson(
              `${YFLIX_AJAX}/links/view?id=${lid}&_=${encLid}`,
              { timeout: 20000 }
            );
            const decrypted = await decrypt(embedResp?.result);
            if (!decrypted?.url?.includes("rapidshare")) return;

            const rapidData = await decryptRapidMedia(decrypted.url);
            const fmt = formatRapidResult(rapidData);
            const enhanced = await enhanceWithQualities(fmt.streams);
            for (const s of enhanced) {
              allStreams.push({ ...s, serverType, serverKey });
            }
            allSubtitles.push(...fmt.subtitles);
          } catch (err) {
            console.error(`[YFlix] server ${serverType}/${serverKey} error:`, err?.message || err);
          }
        })()
      );
    }
  }

  await Promise.all(promises);

  const seen = new Set();
  const deduped = allStreams.filter((s) => {
    if (!s?.url || seen.has(s.url)) return false;
    seen.add(s.url);
    return true;
  });

  return { streams: deduped, subtitles: allSubtitles };
}

export async function getYFlixStreams({ tmdbId, mediaType, season, episode, debug = false }) {
  const trace = [];
  const log = (msg) => { console.log(msg); trace.push(msg); };
  const logErr = (msg) => { console.error(msg); trace.push(msg); };

  log(`[YFlix] getStreams tmdbId=${tmdbId} type=${mediaType} S=${season || ""} E=${episode || ""}`);

  const dbResult = await findInDatabase(tmdbId, mediaType);
  if (!dbResult) {
    log("[YFlix] no match in database");
    return debug ? { streams: [], trace } : [];
  }

  const info = dbResult.info;
  const episodes = dbResult.episodes;
  log(`[YFlix] DB match: "${info.title_en}" (${info.year}) flix_id=${info.flix_id}`);

  let eid = null;
  if (mediaType === "movie") {
    const seasons = Object.keys(episodes || {});
    if (seasons.length > 0) {
      const eps = Object.keys(episodes[seasons[0]] || {});
      if (eps.length > 0) eid = episodes[seasons[0]][eps[0]].eid;
    }
  } else {
    const ss = String(season || 1);
    const se = String(episode || 1);
    if (episodes?.[ss]?.[se]) {
      eid = episodes[ss][se].eid;
    }
  }

  if (!eid) {
    log("[YFlix] no episode ID found");
    return debug ? { streams: [], trace } : [];
  }
  log(`[YFlix] eid=${eid}`);

  let streams, subtitles;
  try {
    const encEid = await encrypt(eid);
    log(`[YFlix] encrypted eid OK (${(encEid||'').substring(0,20)}...)`);

    const linksUrl = `${YFLIX_AJAX}/links/list?eid=${eid}&_=${encEid}`;
    log(`[YFlix] fetching ${linksUrl}`);

    let serversResp;
    try {
      serversResp = await getJson(linksUrl, { timeout: 20000 });
      log(`[YFlix] links/list response: ${JSON.stringify(serversResp).substring(0, 200)}`);
    } catch (err) {
      logErr(`[YFlix] links/list FAILED: ${err?.response?.status || ''} ${err?.message || err}`);
      return debug ? { streams: [], trace } : [];
    }

    const servers = await parseHtml(serversResp?.result);
    log(`[YFlix] parsed servers: ${JSON.stringify(servers).substring(0, 300)}`);

    if (!servers || typeof servers !== "object" || Object.keys(servers).length === 0) {
      log("[YFlix] no servers found after parsing");
      return debug ? { streams: [], trace } : [];
    }

    const allStreams = [];
    const allSubtitles = [];
    const promises = [];

    for (const serverType of Object.keys(servers)) {
      for (const serverKey of Object.keys(servers[serverType] || {})) {
        const lid = servers[serverType][serverKey]?.lid;
        if (!lid) continue;
        log(`[YFlix] processing server ${serverType}/${serverKey} lid=${lid}`);

        promises.push(
          (async () => {
            try {
              const encLid = await encrypt(lid);
              const viewUrl = `${YFLIX_AJAX}/links/view?id=${lid}&_=${encLid}`;
              const embedResp = await getJson(viewUrl, { timeout: 20000 });
              log(`[YFlix] links/view ${serverType}/${serverKey}: ${JSON.stringify(embedResp).substring(0, 150)}`);

              const decrypted = await decrypt(embedResp?.result);
              log(`[YFlix] decrypted ${serverType}/${serverKey}: ${JSON.stringify(decrypted).substring(0, 150)}`);

              if (!decrypted?.url?.includes("rapidshare")) {
                log(`[YFlix] ${serverType}/${serverKey}: not rapidshare, skipping`);
                return;
              }

              const rapidData = await decryptRapidMedia(decrypted.url);
              log(`[YFlix] rapid data ${serverType}/${serverKey}: ${JSON.stringify(rapidData).substring(0, 200)}`);

              const fmt = formatRapidResult(rapidData);
              const enhanced = await enhanceWithQualities(fmt.streams);
              for (const s of enhanced) {
                allStreams.push({ ...s, serverType, serverKey });
              }
              allSubtitles.push(...fmt.subtitles);
            } catch (err) {
              logErr(`[YFlix] server ${serverType}/${serverKey} error: ${err?.response?.status || ''} ${err?.message || err}`);
            }
          })()
        );
      }
    }

    await Promise.all(promises);

    const seen = new Set();
    streams = allStreams.filter((s) => {
      if (!s?.url || seen.has(s.url)) return false;
      seen.add(s.url);
      return true;
    });
    subtitles = allSubtitles;
  } catch (err) {
    logErr(`[YFlix] runStreamFetch error: ${err?.message || err}`);
    return debug ? { streams: [], trace } : [];
  }
  log(`[YFlix] ${streams.length} stream(s), ${subtitles.length} subtitle(s)`);

  const mapped = streams.map((s) => ({
    provider: "yflix",
    name: `YFlix ${s.serverType || "Server"} - ${s.quality || "Unknown"}`,
    title: `${info.title_en}${info.year ? ` (${info.year})` : ""}${mediaType === "tv" ? ` S${season}E${episode}` : ""}`,
    url: s.url,
    quality: s.quality || "Unknown",
    type: s.type || "hls",
    subtitles,
  }));

  return debug ? { streams: mapped, trace } : mapped;
}
