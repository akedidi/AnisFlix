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

/** Pull the bare CDN URL out of a `?path=moviebox-cdn&url=...` Worker link. */
export function unwrapMovieBoxCdnWorkerUrl(url: string): string | null {
  const params = parseMovieBoxCdnParams(url);
  return params?.targetUrl || null;
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
 *
 * Prefer **local/browser CDN playback** (same idea as Flutter / iOS): the CDN
 * blocks Cloudflare egress IPs, so proxying video through the Worker burns CPU
 * and often OOMs. Device/browser IPs work with the direct hakunaymatata URL.
 *
 * - Detector fallback → bare CDN URL, no Cookie/Referer/UA
 * - Signed streams → bare CDN URL + headers for the player
 * - Legacy Worker URLs → unwrap to the embedded CDN target
 */
export function resolveMovieBoxPlaybackUrl(stream: {
  url?: string | null;
  directUrl?: string | null;
  type?: string | null;
  headers?: Record<string, string> | null;
}): { url: string; headers?: Record<string, string> } {
  const apiUrl = stream.url || '';
  const directUrl = stream.directUrl || '';
  const unwrapped = apiUrl ? unwrapMovieBoxCdnWorkerUrl(apiUrl) : null;
  const candidate = directUrl || unwrapped || apiUrl;

  if (!candidate) {
    return { url: '' };
  }

  if (isMovieBoxDetectorFallback(candidate, stream.headers)) {
    return { url: candidate };
  }

  return {
    url: candidate,
    headers: stream.headers || undefined,
  };
}

/**
 * Optional emergency Worker proxy (kept for tooling / fallback experiments).
 * Normal playback must not use this — it streams video bytes through Cloudflare.
 */
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
  return `${params.workerOrigin || DEFAULT_MOVIEBOX_CDN_WORKER}/?${qs.toString()}`;
}

/**
 * Shaka resolves relative MPD segment names against the manifest URL.
 * When the manifest was historically loaded via the Worker, rebuild against the
 * real CDN base. With local playback this is mostly unused.
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

/** Normalize header map for native / MSE players (Cookie key casing, etc.). */
export function movieBoxPlaybackHeaders(
  headers?: Record<string, string> | null,
): Record<string, string> | undefined {
  if (!headers || Object.keys(headers).length === 0) return undefined;
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (value == null || value === '') continue;
    out[key] = String(value);
  }
  return Object.keys(out).length ? out : undefined;
}
