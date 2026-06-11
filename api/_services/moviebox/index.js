/**
 * MovieBox — api3.aoneroom.com mobile BFF (HMAC + Bearer auth)
 * Used by movix-proxy path=moviebox (iOS + web client)
 */
import { API_BASE } from './constants.js';
import {
  fetchTmdbDetails,
  getFormatType,
  mapLanguageLabel,
  movieBoxRequest,
  normalizeTitle,
  parseQualityNumber,
} from './utils.js';

function searchMovieBox(query) {
  const url = `${API_BASE}/wefeed-mobile-bff/subject-api/search/v2`;
  const body = JSON.stringify({ page: 1, perPage: 20, keyword: query });
  return movieBoxRequest('POST', url, body).then((response) => {
    if (!response?.data?.data?.results) return [];
    let allSubjects = [];
    response.data.data.results.forEach((group) => {
      if (group.subjects) allSubjects = allSubjects.concat(group.subjects);
    });
    return allSubjects;
  });
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
        subtitles.push({
          url: cap.url,
          language: cap.language || cap.lanName || cap.lan || 'en',
          label: `${cap.lanName || cap.lan || cap.language || 'Subtitle'} (${langLabel})`,
          headers: { Referer: API_BASE },
        });
      });
    } catch {
      /* optional */
    }
  }

  return subtitles;
}

async function getStreamLinks(subjectId, season = 0, episode = 0, mediaTitle = '', mediaType = 'movie') {
  const subjectUrl = `${API_BASE}/wefeed-mobile-bff/subject-api/get?subjectId=${subjectId}`;
  const detailRes = await movieBoxRequest('GET', subjectUrl);
  if (!detailRes?.data?.data) return [];

  let token = null;
  const xUserHeader = detailRes.headers?.get('x-user');
  if (xUserHeader) {
    try {
      token = JSON.parse(xUserHeader).token;
    } catch {
      /* ignore */
    }
  }

  const subjectIds = [];
  let originalLang = 'Original';
  const dubs = detailRes.data.data.dubs;
  if (Array.isArray(dubs)) {
    dubs.forEach((dub) => {
      if (String(dub.subjectId) === String(subjectId)) {
        originalLang = dub.lanName || 'Original';
      } else {
        const mapped = mapLanguageLabel(dub.lanName);
        if (mapped === 'VO' || mapped === 'VF') {
          subjectIds.push({ id: dub.subjectId, lang: mapped });
        }
      }
    });
  }
  subjectIds.unshift({ id: subjectId, lang: mapLanguageLabel(originalLang) });

  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};
  const allStreams = [];
  const ua = `com.community.mbox.in/50020042 (Linux; U; Android 16; en_IN; MovieBox; Build/BP22.250325.006; Cronet/133.0.6876.3)`;

  for (const item of subjectIds) {
    try {
      const playUrl = `${API_BASE}/wefeed-mobile-bff/subject-api/play-info?subjectId=${item.id}&se=${season}&ep=${episode}`;
      const playRes = await movieBoxRequest('GET', playUrl, null, authHeaders);
      if (!playRes?.data?.data) continue;

      const playData = playRes.data.data;
      const streamsList = playData.streams;

      if (Array.isArray(streamsList) && streamsList.length > 0) {
        for (const stream of streamsList) {
          if (!stream.url) continue;
          const formatType = getFormatType(stream.url);
          const qualNum = parseQualityNumber(stream.resolutions || stream.quality || '');
          const quality = qualNum ? `${qualNum}p` : 'Auto';
          const streamId = stream.id || `${item.id}|${season}|${episode}`;
          const subtitles = await fetchSubtitles(item.id, streamId, authHeaders, item.lang);

          allStreams.push({
            decoded_url: stream.url,
            quality,
            format: formatType,
            codec: inferCodec(stream.codecName, stream.url),
            language: item.lang,
            subtitles,
            headers: {
              Referer: API_BASE,
              'User-Agent': ua,
              ...(stream.signCookie ? { Cookie: stream.signCookie } : {}),
            },
          });
        }
      } else if (Array.isArray(playData.resourceDetectors)) {
        for (const detector of playData.resourceDetectors) {
          if (!Array.isArray(detector.resolutionList)) continue;
          for (const video of detector.resolutionList) {
            if (!video.resourceLink) continue;
            allStreams.push({
              decoded_url: video.resourceLink,
              quality: video.resolution ? `${video.resolution}p` : 'Auto',
              format: getFormatType(video.resourceLink),
              codec: inferCodec(video.codecName, video.resourceLink),
              language: item.lang,
              subtitles: [],
              headers: { Referer: API_BASE, 'User-Agent': ua },
            });
          }
        }
      }
    } catch (err) {
      console.error(`[MovieBox] Stream fetch error ID ${item.id}:`, err.message);
    }
  }

  return allStreams.sort((a, b) => parseQualityNumber(b.quality) - parseQualityNumber(a.quality));
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

  if (!bestMatch) {
    console.log(`📦 [MovieBox] No match for "${details.title}"`);
    return [];
  }

  console.log(`✅ [MovieBox] Matched "${bestMatch.title}" (${bestMatch.subjectId})`);
  const s = mediaType === 'tv' ? seasonNum : 0;
  const e = mediaType === 'tv' ? episodeNum : 0;
  return getStreamLinks(bestMatch.subjectId, s, e, details.title, mediaType);
}
