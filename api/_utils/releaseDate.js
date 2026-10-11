/**
 * TMDB usually only exposes YYYY-MM-DD for air/release dates (no reliable air time).
 * Same-day titles are treated as released only after a cutoff hour, unless an
 * explicit time / ISO datetime is provided.
 */

export const DEFAULT_TIMEZONE = 'Europe/Paris';
export const DEFAULT_SAME_DAY_CUTOFF_HOUR = 20;

export function getZonedParts(date = new Date(), timeZone = DEFAULT_TIMEZONE) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });

  const parts = Object.fromEntries(
    fmt
      .formatToParts(date)
      .filter((p) => p.type !== 'literal')
      .map((p) => [p.type, p.value])
  );

  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    hour: parseInt(parts.hour, 10) % 24,
    minute: parseInt(parts.minute, 10) || 0,
  };
}

function parseTimeToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return null;
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return hours * 60 + minutes;
}

/**
 * @param {string|null|undefined} dateStr YYYY-MM-DD or ISO datetime
 * @param {string|null|undefined} timeStr Optional HH:mm / HH:mm:ss (or ISO time)
 * @param {object} [options]
 * @param {string} [options.timeZone]
 * @param {number} [options.sameDayCutoffHour] Used when no time is available
 * @param {boolean} [options.missingDateMeansReleased]
 */
export function isReleaseDateAvailable(dateStr, timeStr = null, options = {}) {
  const timeZone = options.timeZone || DEFAULT_TIMEZONE;
  const sameDayCutoffHour =
    options.sameDayCutoffHour ?? DEFAULT_SAME_DAY_CUTOFF_HOUR;
  const missingDateMeansReleased = options.missingDateMeansReleased ?? true;

  if (!dateStr || typeof dateStr !== 'string') {
    return missingDateMeansReleased;
  }

  const trimmed = dateStr.trim();
  if (!trimmed) return missingDateMeansReleased;

  // Full ISO datetime (rare on TMDB, but handle if present)
  if (trimmed.includes('T')) {
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) return missingDateMeansReleased;
    return parsed.getTime() <= Date.now();
  }

  const datePart = trimmed.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    return missingDateMeansReleased;
  }

  const now = getZonedParts(new Date(), timeZone);

  if (datePart < now.date) return true;
  if (datePart > now.date) return false;

  const releaseMinutes = parseTimeToMinutes(timeStr);
  if (releaseMinutes != null) {
    const nowMinutes = now.hour * 60 + now.minute;
    return nowMinutes >= releaseMinutes;
  }

  // No air/release time from TMDB: wait until evening on the air day
  return now.hour >= sameDayCutoffHour;
}

/**
 * Latest YYYY-MM-DD that discover endpoints should accept as "already released".
 */
export function getMaxReleasedDateString(options = {}) {
  const timeZone = options.timeZone || DEFAULT_TIMEZONE;
  const sameDayCutoffHour =
    options.sameDayCutoffHour ?? DEFAULT_SAME_DAY_CUTOFF_HOUR;
  const now = getZonedParts(new Date(), timeZone);

  if (now.hour >= sameDayCutoffHour) {
    return now.date;
  }

  // Calendar yesterday from the zoned date (noon UTC avoids DST edge cases)
  const [y, m, d] = now.date.split('-').map(Number);
  const utcNoon = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  utcNoon.setUTCDate(utcNoon.getUTCDate() - 1);
  const yy = utcNoon.getUTCFullYear();
  const mm = String(utcNoon.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(utcNoon.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}
