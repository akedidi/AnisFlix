import { createRequire } from 'node:module';

// Vendored from Gowaru/gowaru-nuvio-providers at eb36f837 (GPL-3.0).
// The generated CommonJS provider is kept intact in provider.cjs.
const require = createRequire(import.meta.url);
const gowaruFrenchStream = require('./provider.cjs');

function languageFrom(stream) {
  const label = `${stream.title || ''} ${stream.name || ''}`
    .match(/(?:\[|\()\s*(VOSTFR|VOSTF|VFF|VFQ|VF|VO)\s*(?:\]|\))/i)?.[1]
    ?.toUpperCase();
  if (label === 'VOSTFR' || label === 'VOSTF') return 'VOSTFR';
  if (label === 'VO') return 'VO';
  return 'VF';
}

function streamType(url = '') {
  if (/\.m3u8(?:$|[?#])/i.test(url) || /\/hls\//i.test(url)) return 'm3u8';
  if (/\.(?:mp4|mkv)(?:$|[?#])/i.test(url)) return 'mp4';
  return 'embed';
}

export async function getGowaruFrenchStreamStreams({ tmdbId, mediaType = 'movie', season, episode }) {
  const streams = await gowaruFrenchStream.getStreams(
    String(tmdbId),
    mediaType === 'movie' ? 'movie' : 'tv',
    season,
    episode,
  );

  return (Array.isArray(streams) ? streams : []).filter(stream => stream?.url).map(stream => ({
    provider: 'frenchstream',
    url: stream.url,
    quality: stream.quality || 'HD',
    language: languageFrom(stream),
    type: streamType(stream.url),
    headers: stream.headers || {},
  }));
}
