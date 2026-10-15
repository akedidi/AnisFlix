const HAKUNAY_HOST = 'hakunaymatata.com';
const DEFAULT_MOVIEBOX_CDN_WORKER = 'https://anisflix.kedidi-anis.workers.dev';

export interface MovieBoxCdnParams {
  workerOrigin: string;
  targetUrl: string;
  referer: string;
  cookie: string;
  userAgent: string;
  bare?: boolean;
}

/** Parse cookie/referer from a moviebox-cdn worker manifest URL. */
export function parseMovieBoxCdnParams(workerUrl: string): MovieBoxCdnParams | null {
  try {
    const u = new URL(workerUrl);
    if (!u.searchParams.get('path')?.includes('moviebox-cdn')) return null;
    return {
      workerOrigin: u.origin,
      targetUrl: u.searchParams.get('url') || '',
      referer: u.searchParams.get('referer') || 'https://api3.aoneroom.com/',
      cookie: u.searchParams.get('cookie') || '',
      userAgent: u.searchParams.get('ua') || '',
      bare: u.searchParams.get('bare') === '1',
    };
  } catch {
    return null;
  }
}

/**
 * Detector-fallback MovieBox links (resourceDetectors) are public CDN URLs
 * without CloudFront cookies. Their CDN rejects Referer / UA / Cookie — same
 * rule as the Android TV / Flutter client.
 */
export function isMovieBoxDetectorFallback(
  directUrl?: string | null,
  headers?: Record<string, string> | null,
): boolean {
  if (!directUrl || !isHakunaymatataUrl(directUrl)) return false;
  const hasCookie = Object.keys(headers || {}).some(
    (key) => key.toLowerCase() === 'cookie' && Boolean(headers?.[key]),
  );
  return !hasCookie;
}

/**
 * Resolve the playback URL for a MovieBox stream.
 * Hakunaymatata CDN blocks browser Origin/Referer (428/429) and CF HTTP egress,
 * so playback must go through the moviebox-cdn Worker (socket fallback).
 * Prefer an API-provided worker URL when present; otherwise build one.
 */
export function resolveMovieBoxPlaybackUrl(stream: {
  url?: string | null;
  directUrl?: string | null;
  type?: string | null;
  headers?: Record<string, string> | null;
}): { url: string; headers?: Record<string, string> } {
  const apiUrl = stream.url || '';
  const directUrl = stream.directUrl || apiUrl;
  const existing = apiUrl ? parseMovieBoxCdnParams(apiUrl) : null;

  // Already a moviebox-cdn worker URL (signed or bare detector).
  if (existing && apiUrl) {
    return { url: apiUrl };
  }

  // Detector fallback without a prebuilt worker URL — wrap for CORS + CDN access.
  if (isMovieBoxDetectorFallback(directUrl, stream.headers)) {
    return {
      url: buildMovieBoxCdnProxyUrl(directUrl, {
        workerOrigin: DEFAULT_MOVIEBOX_CDN_WORKER,
        targetUrl: directUrl,
        referer: '',
        cookie: '',
        userAgent: '',
        bare: true,
      }),
    };
  }

  // Non-detector streams (e.g. macdn.aoneroom.com): use API URL as-is.
  return {
    url: apiUrl || directUrl,
    headers: stream.headers || undefined,
  };
}

/**
 * Shaka resolves relative MPD segment names against the Worker URL that
 * returned the manifest. Rebuild those URLs against the signed CDN manifest
 * before sending them through the same Worker.
 */
export function resolveMovieBoxSegmentUrl(
  uri: string,
  params: MovieBoxCdnParams,
): string | null {
  if (isHakunaymatataUrl(uri)) return uri;
  if (!params.targetUrl) return null;

  try {
    const candidate = new URL(uri);
    if (candidate.origin !== params.workerOrigin || candidate.searchParams.has('path')) {
      return null;
    }
    const filename = candidate.pathname.split('/').filter(Boolean).pop();
    if (!filename) return null;
    return new URL(`${filename}${candidate.search}`, params.targetUrl).toString();
  } catch {
    return null;
  }
}

export function buildMovieBoxCdnProxyUrl(targetUrl: string, params: MovieBoxCdnParams): string {
  const qs = new URLSearchParams({
    path: 'moviebox-cdn',
    url: targetUrl,
  });
  if (params.bare) {
    qs.set('bare', '1');
  } else if (params.referer) {
    qs.set('referer', params.referer);
  }
  if (!params.bare && params.cookie) qs.set('cookie', params.cookie);
  if (!params.bare && params.userAgent) qs.set('ua', params.userAgent);
  return `${params.workerOrigin}/?${qs.toString()}`;
}

export function isHakunaymatataUrl(uri: string): boolean {
  try {
    return new URL(uri).hostname.toLowerCase().endsWith(HAKUNAY_HOST);
  } catch {
    return uri.includes(HAKUNAY_HOST);
  }
}

export function isDashStream(url: string, type?: string): boolean {
  const t = (type || '').toLowerCase();
  return t === 'dash' || url.includes('.mpd');
}
