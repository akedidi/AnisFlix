/** HEVC/H.265 in DASH requires MSE support — Chrome/Firefox on most PCs lack it. */
export function isHevcMseSupported(): boolean {
  if (typeof MediaSource === "undefined") return false;
  const probes = [
    'video/mp4; codecs="hvc1.1.6.L120.B0"',
    'video/mp4; codecs="hev1.1.6.L120.B0"',
    'video/mp4; codecs="hev1"',
    'video/mp4; codecs="hvc1"',
  ];
  return probes.some((t) => MediaSource.isTypeSupported(t));
}

export function isHevcCodec(codec?: string | null): boolean {
  if (!codec) return false;
  const c = codec.toLowerCase();
  return c === "hevc" || c === "h265" || c.includes("hev1") || c.includes("hvc1");
}

export function isHevcStreamUrl(url?: string | null): boolean {
  if (!url) return false;
  const u = url.toLowerCase();
  return (
    u.includes("h265") ||
    u.includes("hevc") ||
    u.includes("hev1") ||
    u.includes("hvc1")
  );
}

export function streamRequiresHevc(codec?: string | null, url?: string | null): boolean {
  return isHevcCodec(codec) || isHevcStreamUrl(url);
}

export function isExpiredSignedStreamUrl(url?: string | null, now = Date.now()): boolean {
  if (!url) return false;

  try {
    const parsed = new URL(url);
    const expiresAt = parsed.searchParams.get("t");
    if (!expiresAt || !/^\d{10}$/.test(expiresAt)) return false;
    return Number(expiresAt) * 1000 <= now;
  } catch {
    return false;
  }
}

export function canPlayHevcDash(): boolean {
  return isHevcMseSupported();
}

export function isPlayableMovieBoxStream(stream: {
  type?: string;
  codec?: string | null;
  url?: string | null;
  directUrl?: string | null;
}): boolean {
  const isDash = stream.type === "dash" || !!stream.url?.includes(".mpd");
  const mediaUrl = stream.directUrl || stream.url;
  if (isExpiredSignedStreamUrl(mediaUrl)) return false;

  const isHevc = streamRequiresHevc(stream.codec, mediaUrl);
  if (isDash && isHevc && !canPlayHevcDash()) return false;
  return true;
}
