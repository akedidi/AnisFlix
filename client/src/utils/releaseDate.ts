/**
 * TMDB usually only exposes YYYY-MM-DD for air/release dates (no reliable air time).
 * Same-day titles are treated as released only after a cutoff hour, unless an
 * explicit time / ISO datetime is provided.
 */

const DEFAULT_TIMEZONE = 'Europe/Paris';
const DEFAULT_SAME_DAY_CUTOFF_HOUR = 20;

function getZonedParts(date = new Date(), timeZone = DEFAULT_TIMEZONE) {
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

function parseTimeToMinutes(timeStr?: string | null): number | null {
  if (!timeStr) return null;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return null;
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return hours * 60 + minutes;
}

export function getMaxReleasedDateString(
  options: {
    timeZone?: string;
    sameDayCutoffHour?: number;
  } = {}
): string {
  const timeZone = options.timeZone || DEFAULT_TIMEZONE;
  const sameDayCutoffHour =
    options.sameDayCutoffHour ?? DEFAULT_SAME_DAY_CUTOFF_HOUR;
  const now = getZonedParts(new Date(), timeZone);

  if (now.hour >= sameDayCutoffHour) {
    return now.date;
  }

  const [y, m, d] = now.date.split('-').map(Number);
  const utcNoon = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  utcNoon.setUTCDate(utcNoon.getUTCDate() - 1);
  const yy = utcNoon.getUTCFullYear();
  const mm = String(utcNoon.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(utcNoon.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

export function isReleaseDateAvailable(
  dateStr?: string | null,
  timeStr?: string | null,
  options: {
    timeZone?: string;
    sameDayCutoffHour?: number;
    missingDateMeansReleased?: boolean;
  } = {}
): boolean {
  const timeZone = options.timeZone || DEFAULT_TIMEZONE;
  const sameDayCutoffHour =
    options.sameDayCutoffHour ?? DEFAULT_SAME_DAY_CUTOFF_HOUR;
  const missingDateMeansReleased = options.missingDateMeansReleased ?? true;

  if (!dateStr || typeof dateStr !== 'string') {
    return missingDateMeansReleased;
  }

  const trimmed = dateStr.trim();
  if (!trimmed) return missingDateMeansReleased;

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

  return now.hour >= sameDayCutoffHour;
}
