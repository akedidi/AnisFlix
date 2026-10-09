/**
 * MovieBox — api3.aoneroom.com mobile BFF (HMAC + Bearer auth)
 * Used by movix-proxy path=moviebox (iOS + web client)
 */
import { API_BASE, PROXY_URL } from './constants.js';
import {
  fetchTmdbDetails,
  getFormatType,
  movieBoxRequest,
  normalizeTitle,
  parseQualityNumber,
} from './utils.js';

function searchMovieBox(query) {
  const url = `${API_BASE}/wefeed-mobile-bff/subject-api/search/v2`;
  const body = JSON.stringify({ page: 1, perPage: 20, keyword: query, restrictKid: 1 });
  return movieBoxRequest('POST', url, body).then((response) => {
    if (!response?.data?.data?.results) return [];
    let allSubjects = [];
    response.data.data.results.forEach((group) => {
      if (group.subjects) allSubjects = allSubjects.concat(group.subjects);
    });
    return allSubjects;
  });
}

function classifyVariant(dub, isOriginal = false) {
  const code = String(dub?.lanCode || dub?.language || '').trim().toLowerCase();
  const label = String(dub?.lanName || '').trim().toLowerCase();
  const isSubtitle = Number(dub?.type) === 1 || /\b(sub|subtitle|vostfr)\b/.test(label);
  const isFrench = code === 'fr' || code === 'fra' || label.includes('french') || label.includes('français');
  const isEnglish = code === 'en' || code === 'eng' || label.includes('english') || (isOriginal && label.includes('original'));

  if (isFrench && isSubtitle) return 'VOSTFR';
  if (isFrench) return 'VF';
  if (isEnglish && !isSubtitle) return 'VO';
  return null;
}

function collectStreams(playData) {
  const streams = Array.isArray(playData?.streams) ? [...playData.streams] : [];

  for (const [key, format] of [['netDash', 'DASH'], ['netHls', 'HLS']]) {
    const value = playData?.[key] ?? playData?.data?.[key];
    const values = Array.isArray(value) ? value : value ? [value] : [];
    for (const item of values) {
      if (typeof item === 'string') {
        streams.push({ url: item, format });
      } else if (item && typeof item === 'object') {
        if (item.url || item.playUrl || item.resourceLink || item.streamUrl) {
          streams.push({ ...item, format: item.format || format });
        } else {
          for (const [resolution, resource] of Object.entries(item)) {
            if (typeof resource === 'string' && /^https?:\/\//i.test(resource)) {
              streams.push({ url: resource, resolution, format });
            } else if (resource && typeof resource === 'object') {
              streams.push({
                ...resource,
                resolution: resource.resolution || resolution,
                format: resource.format || format,
              });
            }
          }
        }
      }
    }
  }

  const seen = new Set();
  return streams.filter((stream) => {
    const url = stream?.url || stream?.playUrl || stream?.resourceLink || stream?.streamUrl;
    if (!url || seen.has(url)) return false;
    seen.add(url);
    return true;
  });
}

function parseQualities(value) {
  const qualities = Array.from(String(value || '').matchAll(/(\d{3,4})/g), (match) => Number(match[1]))
    .filter((quality) => quality >= 144 && quality <= 4320);
  return [...new Set(qualities)].sort((a, b) => b - a);
}

function extractPolicyResource(signCookie) {
  if (!signCookie || typeof signCookie !== 'string') return null;

  const edgeMatch = signCookie.match(/Edge-Cache-Cookie=urlprefix=([^:;\s]+)/);
  if (edgeMatch) {
    try {
      let base64 = edgeMatch[1].replace(/_/g, '/').replace(/-/g, '+');
      while (base64.length % 4) base64 += '=';
      const decoded = Buffer.from(base64, 'base64').toString('utf8').replace(/\/+$/, '');
      if (decoded) return `${decoded}/index.mpd`;
    } catch {
      /* Try the raw URL below. */
    }
  }

  const cloudFrontMatch = signCookie.match(/CloudFront-Policy=([^;]+)/);
  if (cloudFrontMatch) {
    try {
      let base64 = cloudFrontMatch[1].replace(/-/g, '+').replace(/~/g, '/').replace(/_/g, '=');
      while (base64.length % 4) base64 += '=';
      const policy = JSON.parse(Buffer.from(base64, 'base64').toString('utf8'));
      const resource = policy?.Statement?.[0]?.Resource;
      if (typeof resource === 'string') {
        const trimmed = resource.replace(/[*/]+$/, '');
        return trimmed.toLowerCase().endsWith('.mpd') ? trimmed : `${trimmed}/index.mpd`;
      }
    } catch {
      /* Try the raw URL below. */
    }
  }

  return null;
}

function inferCodec(codecName, url) {
  const name = String(codecName || '').toLowerCase();
  if (name.includes('hevc') || name.includes('h265')) return 'hevc';
  if (name.includes('h264') || name.includes('avc')) return 'h264';
  const u = String(url || '').toLowerCase();
  if (u.includes('h265') || u.includes('hevc') || u.includes('hev1') || u.includes('hvc1')) return 'hevc';
  if (u.includes('h264') || u.includes('avc1')) return 'h264';
  return null;
}

function findBestMatch(subjects, tmdbTitle, tmdbYear, mediaType) {
  const normTmdbTitle = normalizeTitle(tmdbTitle);
  const targetType = mediaType === 'movie' ? 1 : 2;
  let bestMatch = null;
  let bestScore = 0;

  for (const subject of subjects) {
    if (subject.subjectType !== targetType) continue;
    const normTitle = normalizeTitle(subject.title);
    const year = subject.year || (subject.releaseDate ? subject.releaseDate.substring(0, 4) : null);
    let score = 0;
    if (normTitle === normTmdbTitle) score += 50;
    else if (normTitle.includes(normTmdbTitle) || normTmdbTitle.includes(normTitle)) score += 15;
    if (tmdbYear && year && tmdbYear == year) score += 35;
    if (score > bestScore) {
      bestScore = score;
      bestMatch = subject;
    }
  }

  return bestScore >= 40 ? bestMatch : null;
}

const H5_METADATA_BASE = 'https://hm-cinema.me';
const H5_API_BASE = 'https://h5.aoneroom.com';

async function fetchJson(url, options = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.warn(`[MovieBox H5] ${url}: ${error.message}`);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function h5Request(targetUrl, headers = {}) {
  const relay = new URL(PROXY_URL);
  relay.searchParams.set('path', 'mob');
  relay.searchParams.set('url', targetUrl);
  relay.searchParams.set('method', 'GET');

  return fetchJson(relay.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'okhttp/4.12.0',
        'X-Client-Info': JSON.stringify({ timezone: 'Africa/Nairobi' }),
        ...headers,
      },
      body: null,
    }),
  });
}

function mapH5Captions(captions, languageLabel) {
  return (Array.isArray(captions) ? captions : [])
    .filter((caption) => caption?.url)
    .map((caption) => {
      const rawLanguage = caption.lanName || caption.language || caption.lan || 'Unknown';
      const normalized = String(caption.lan || caption.language || rawLanguage).trim().toLowerCase();
      const code = normalized === 'fr'
        || normalized === 'fra'
        || normalized.includes('français')
        || normalized.includes('french')
        ? 'fr'
        : normalized === 'en'
          || normalized === 'eng'
          || normalized.includes('english')
          ? 'en'
          : normalized;
      return {
        url: caption.url,
        language: rawLanguage,
        code,
        label: `${rawLanguage} (${languageLabel})`,
        headers: { Referer: `${H5_API_BASE}/` },
      };
    });
}

async function fetchH5Downloads(subjectId, detailPath, season, episode) {
  const endpoint = new URL(`${H5_API_BASE}/wefeed-h5-bff/web/subject/download`);
  endpoint.searchParams.set('subjectId', subjectId);
  endpoint.searchParams.set('se', String(season));
  endpoint.searchParams.set('ep', String(episode));
  const referer = `${H5_API_BASE}/movies/${detailPath}`;
  const response = await h5Request(endpoint.toString(), {
    Referer: referer,
    Origin: H5_API_BASE,
  });
  return response?.code === 0 ? response.data : null;
}

async function getH5FallbackStreams(details, mediaType, season, episode) {
  const subjectType = mediaType === 'movie' ? 1 : 2;
  const searchUrl = `${H5_METADATA_BASE}/api/search/${encodeURIComponent(details.title)}?page=1&perPage=24&type=${subjectType}`;
  const search = await fetchJson(searchUrl);
  const subjects = search?.data?.items || [];
  const bestMatch = findBestMatch(subjects, details.title, details.year, mediaType);
  if (!bestMatch?.subjectId || !bestMatch?.detailPath) return [];

  const dubsUrl = `${H5_METADATA_BASE}/api/dubs/${encodeURIComponent(bestMatch.subjectId)}?detailPath=${encodeURIComponent(bestMatch.detailPath)}`;
  const dubData = (await fetchJson(dubsUrl))?.data || {};
  const original = dubData.original || {
    subjectId: bestMatch.subjectId,
    detailPath: bestMatch.detailPath,
    lanName: 'Original Audio',
    lanCode: 'en',
  };
  const variants = [{ ...original, language: 'VO' }];

  for (const dub of Array.isArray(dubData.dubs) ? dubData.dubs : []) {
    const code = String(dub.lanCode || '').toLowerCase();
    const name = String(dub.lanName || '').toLowerCase();
    if ((code === 'fr' || name.includes('french') || name.includes('français')) && !name.includes('sub')) {
      variants.push({ ...dub, language: 'VF' });
    }
  }

  const streams = [];
  for (const variant of variants) {
    if (!variant.subjectId || !variant.detailPath) continue;
    const data = await fetchH5Downloads(variant.subjectId, variant.detailPath, season, episode);
    const captions = mapH5Captions(data?.captions, variant.lanName || variant.language);
    for (const download of Array.isArray(data?.downloads) ? data.downloads : []) {
      if (!download?.url) continue;
      const quality = download.resolution ? `${download.resolution}p` : 'Auto';
      streams.push({
        decoded_url: download.url,
        quality,
        format: getFormatType(download.url) === 'VIDEO' ? 'MP4' : getFormatType(download.url),
        codec: 'h264',
        language: variant.language,
        languageLabel: variant.lanName || variant.language,
        subtitles: variant.language === 'VO' ? captions : [],
        headers: {
          Referer: `${H5_API_BASE}/`,
          'User-Agent': 'okhttp/4.12.0',
        },
      });
    }
  }

  const categorized = [];
  for (const stream of streams) {
    categorized.push(stream);
    const frenchSubtitles = stream.subtitles.filter((subtitle) => subtitle.code === 'fr');
    if (stream.language === 'VO' && frenchSubtitles.length > 0) {
      categorized.push({
        ...stream,
        language: 'VOSTFR',
        languageLabel: 'French subtitles',
        subtitles: frenchSubtitles.map((subtitle) => ({ ...subtitle, default: true })),
      });
    }
  }

  return Array.from(new Map(categorized.map((stream) => [
    `${stream.language}:${stream.quality}:${stream.decoded_url}`,
    stream,
  ])).values()).sort((a, b) => parseQualityNumber(b.quality) - parseQualityNumber(a.quality));
}

async function fetchSubtitles(subjectId, streamId, authHeaders, langLabel) {
  const subtitles = [];
  const endpoints = [
    `${API_BASE}/wefeed-mobile-bff/subject-api/get-stream-captions?subjectId=${subjectId}&streamId=${streamId}`,
    `${API_BASE}/wefeed-mobile-bff/subject-api/get-ext-captions?subjectId=${subjectId}&resourceId=${streamId}&episode=0`,
  ];

  for (const capUrl of endpoints) {
    try {
      const capRes = await movieBoxRequest('GET', capUrl, null, authHeaders);
      const caps = capRes?.data?.data?.extCaptions;
      if (!Array.isArray(caps)) continue;
      caps.forEach((cap) => {
        if (!cap.url) return;
        const rawLanguage = cap.language || cap.lanName || cap.lan || 'en';
        const normalizedLanguage = String(rawLanguage).trim().toLowerCase();
        const code = normalizedLanguage === 'fr'
          || normalizedLanguage === 'fra'
          || normalizedLanguage.includes('français')
          || normalizedLanguage.includes('french')
          ? 'fr'
          : normalizedLanguage === 'en'
            || normalizedLanguage === 'eng'
            || normalizedLanguage.includes('english')
            ? 'en'
            : normalizedLanguage;
        subtitles.push({
          url: cap.url,
          language: rawLanguage,
          code,
          label: `${cap.lanName || cap.lan || cap.language || 'Subtitle'} (${langLabel})`,
          headers: { Referer: API_BASE },
        });
      });
    } catch {
      /* optional */
    }
  }

  return Array.from(new Map(subtitles.map((subtitle) => [subtitle.url, subtitle])).values());
}

async function getStreamLinks(subjectId, season = 0, episode = 0, mediaTitle = '', mediaType = 'movie') {
  const subjectUrl = `${API_BASE}/wefeed-mobile-bff/subject-api/get?subjectId=${subjectId}`;
  const detailRes = await movieBoxRequest('GET', subjectUrl);
  if (!detailRes?.data?.data) return [];

  const subjectData = detailRes.data.data;
  const subjectIds = [];
  const dubs = subjectData.dubs;
  if (Array.isArray(dubs)) {
    dubs.forEach((dub) => {
      const isOriginal = String(dub.subjectId) === String(subjectId) || dub.original === true;
      const language = classifyVariant(dub, isOriginal);
      if (language && dub.subjectId) {
        subjectIds.push({ id: String(dub.subjectId), lang: language, label: dub.lanName || language });
      }
    });
  }
  if (!subjectIds.some((item) => item.id === String(subjectId))) {
    subjectIds.unshift({ id: String(subjectId), lang: 'VO', label: 'Original Audio' });
  }

  const variants = Array.from(new Map(subjectIds.map((item) => [`${item.id}:${item.lang}`, item])).values());

  const allStreams = [];
  const ua = `com.community.mbox.in/50020130 (Linux; U; Android 14; en_IN; MovieBox; Build/UD1A.230803.041; Cronet/145.0.7582.0)`;
  const playbackHeaders = {
    Origin: 'https://moviebox.ph',
    Referer: 'https://moviebox.ph/',
    'User-Agent': ua,
    'x-request-lang': 'en',
    'x-vip-restrict': '0',
    'x-no-high-risk-restrict': '0',
  };

  for (const item of variants) {
    try {
      const params = new URLSearchParams({
        subjectId: item.id,
        se: String(season),
        ep: String(episode),
        streamSignType: '1',
        'supportCodecs[hevc]': '1',
        'supportCodecs[h264]': '1',
      });
      const playUrl = `${API_BASE}/wefeed-mobile-bff/subject-api/play-info?${params}`;
      const playRes = await movieBoxRequest('GET', playUrl, null, playbackHeaders);
      if (!playRes?.data?.data) continue;

      const playData = playRes.data.data;
      const streamsList = collectStreams(playData);
      let hasValidStream = false;

      if (Array.isArray(streamsList) && streamsList.length > 0) {
        for (const stream of streamsList) {
          const rawUrl = stream.url || stream.playUrl || stream.resourceLink || stream.streamUrl || '';
          const finalUrl = extractPolicyResource(stream.signCookie) || rawUrl;
          if (!finalUrl) continue;
          if (finalUrl.includes('b164fbfb4347792950bdfbfb563d39d9')) continue;
          if (finalUrl === rawUrl && rawUrl.includes('/other/2026/09/')) continue;

          const declaredFormat = String(stream.format || '').toUpperCase();
          const detectedFormat = getFormatType(finalUrl);
          const formatType = detectedFormat !== 'VIDEO'
            ? detectedFormat
            : ['DASH', 'HLS', 'MP4', 'MKV'].includes(declaredFormat)
              ? declaredFormat
              : 'VIDEO';
          const qualityValues = parseQualities(stream.resolutions || stream.resolution || stream.quality || '');
          const qualities = qualityValues.length > 0 ? qualityValues.map((value) => `${value}p`) : ['Auto'];
          const streamId = stream.id || `${item.id}|${season}|${episode}`;
          const subtitles = await fetchSubtitles(item.id, streamId, playbackHeaders, item.label);
          const signHeaderKey = stream.signHeaderKey || stream.sign_header_key || 'Cookie';

          for (const quality of qualities) {
            allStreams.push({
              decoded_url: finalUrl,
              quality,
              format: formatType,
              codec: inferCodec(stream.codecName, finalUrl),
              language: item.lang,
              languageLabel: item.label,
              subtitles,
              headers: {
                ...playbackHeaders,
                ...(stream.signCookie ? { [signHeaderKey]: stream.signCookie } : {}),
              },
            });
          }
          hasValidStream = true;
        }
      }

      if (!hasValidStream) {
        const detectors = Array.isArray(playData.resourceDetectors)
          ? playData.resourceDetectors
          : subjectData.resourceDetectors;
        for (const detector of Array.isArray(detectors) ? detectors : []) {
          if (!Array.isArray(detector.resolutionList)) continue;
          for (const video of detector.resolutionList) {
            if (!video.resourceLink) continue;
            const videoSeason = video.se ?? 0;
            const videoEpisode = video.ep ?? 0;
            if ((season > 0 || episode > 0) && (videoSeason !== season || videoEpisode !== episode)) continue;
            allStreams.push({
              decoded_url: video.resourceLink,
              quality: video.resolution ? `${video.resolution}p` : 'Auto',
              format: getFormatType(video.resourceLink),
              codec: inferCodec(video.codecName, video.resourceLink),
              language: item.lang,
              languageLabel: item.label,
              subtitles: [],
              headers: playbackHeaders,
            });
          }
        }
      }
    } catch (err) {
      console.error(`[MovieBox] Stream fetch error ID ${item.id}:`, err.message);
    }
  }

  const categorizedStreams = [];
  for (const stream of allStreams) {
    categorizedStreams.push(stream);

    // MovieBox exposes optional captions separately from dubbed variants. The
    // same English source therefore also belongs in VOSTFR when French captions
    // are available; playback clients receive the French track as the default.
    const frenchSubtitles = stream.subtitles?.filter((subtitle) => subtitle.code === 'fr') || [];
    if (stream.language === 'VO' && frenchSubtitles.length > 0) {
      categorizedStreams.push({
        ...stream,
        language: 'VOSTFR',
        languageLabel: 'French subtitles',
        subtitles: frenchSubtitles.map((subtitle) => ({ ...subtitle, default: true })),
      });
    }
  }

  const deduplicated = Array.from(new Map(categorizedStreams.map((stream) => [
    `${stream.language}:${stream.quality}:${stream.format}:${stream.decoded_url}`,
    stream,
  ])).values());

  return deduplicated.sort((a, b) => parseQualityNumber(b.quality) - parseQualityNumber(a.quality));
}

export async function getMovieBoxStreams(tmdbId, mediaType, seasonNum = 1, episodeNum = 1) {
  console.log(`📦 [MovieBox] TMDB:${tmdbId} type:${mediaType} S${seasonNum}E${episodeNum}`);
  const details = await fetchTmdbDetails(tmdbId, mediaType);
  if (!details) return [];

  let subjects = await searchMovieBox(details.title);
  let bestMatch = findBestMatch(subjects, details.title, details.year, mediaType);

  if (!bestMatch && details.originalTitle && details.originalTitle !== details.title) {
    subjects = await searchMovieBox(details.originalTitle);
    bestMatch = findBestMatch(subjects, details.originalTitle, details.year, mediaType);
  }

  const s = mediaType === 'tv' ? seasonNum : 0;
  const e = mediaType === 'tv' ? episodeNum : 0;
  if (bestMatch) {
    console.log(`✅ [MovieBox] Matched "${bestMatch.title}" (${bestMatch.subjectId})`);
    const mobileStreams = await getStreamLinks(bestMatch.subjectId, s, e, details.title, mediaType);
    if (mobileStreams.length > 0) return mobileStreams;
  } else {
    console.log(`📦 [MovieBox] Mobile API found no match for "${details.title}"`);
  }

  console.log(`📦 [MovieBox] Trying H5 relay fallback for "${details.title}"`);
  return getH5FallbackStreams(details, mediaType, s, e);
}
