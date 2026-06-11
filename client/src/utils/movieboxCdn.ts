const HAKUNAY_HOST = 'hakunaymatata.com';

export interface MovieBoxCdnParams {
  workerOrigin: string;
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
      referer: u.searchParams.get('referer') || 'https://api3.aoneroom.com/',
      cookie: u.searchParams.get('cookie') || '',
      userAgent: u.searchParams.get('ua') || '',
    };
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
