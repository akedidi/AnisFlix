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

/**
 * Soft signal only. MovieBox detector URLs carry a `t=` query that often ages
 * out while the CDN link still plays — Android TV never hides on this.
 * Do not use for filtering the source list.
 */
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

function isMovieBoxDashStream(stream: {
  type?: string;
  url?: string | null;
  directUrl?: string | null;
}): boolean {
  const type = (stream.type || "").toLowerCase();
  if (type === "dash") return true;
  // Prefer the raw CDN URL — worker proxy query strings can contain ".mpd".
  const mediaUrl = stream.directUrl || stream.url || "";
  return /\.mpd(?:$|[?#])/i.test(mediaUrl);
}

/**
 * Whether a MovieBox stream should appear in the web source list.
 * Align with Android TV: show detector / signed links even when `t=` is old.
 * Only hide HEVC DASH when the browser cannot play it via MSE.
 */
export function isPlayableMovieBoxStream(stream: {
  type?: string;
  codec?: string | null;
  url?: string | null;
  directUrl?: string | null;
}): boolean {
  const mediaUrl = stream.directUrl || stream.url || "";
  if (!mediaUrl) return false;

  if (
    isMovieBoxDashStream(stream) &&
    streamRequiresHevc(stream.codec, mediaUrl) &&
    !canPlayHevcDash()
  ) {
    return false;
  }
  return true;
}
