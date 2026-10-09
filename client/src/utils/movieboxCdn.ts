const HAKUNAY_HOST = 'hakunaymatata.com';

export interface MovieBoxCdnParams {
  workerOrigin: string;
  targetUrl: string;
  referer: string;
  cookie: string;
  userAgent: string;
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
    };
  } catch {
    return null;
  }
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
    referer: params.referer,
  });
  if (params.cookie) qs.set('cookie', params.cookie);
  if (params.userAgent) qs.set('ua', params.userAgent);
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
