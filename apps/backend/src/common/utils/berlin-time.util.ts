const BERLIN_TIMEZONE = 'Europe/Berlin';

const dtfBerlinDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: BERLIN_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const dtfBerlinTime = new Intl.DateTimeFormat('en-US', {
  timeZone: BERLIN_TIMEZONE,
  hour: 'numeric',
  minute: 'numeric',
  hourCycle: 'h23',
});

const dtfBerlinFull = new Intl.DateTimeFormat('en-US', {
  timeZone: BERLIN_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

/**
 * Returns today's date in Europe/Berlin wall-clock time in YYYY-MM-DD format.
 */
export function getBerlinToday(now: Date = new Date()): string {
  return dtfBerlinDate.format(now);
}

/**
 * Returns current Europe/Berlin wall-clock time as total minutes since midnight (0..1439).
 */
export function getBerlinNowMinutes(now: Date = new Date()): number {
  const parts = dtfBerlinTime.formatToParts(now);
  const hour = parseInt(parts.find((p) => p.type === 'hour')!.value, 10);
  const minute = parseInt(parts.find((p) => p.type === 'minute')!.value, 10);
  return hour * 60 + minute;
}

/**
 * Converts a stored Berlin wall-clock date (YYYY-MM-DD) and time (HH:mm or HH:mm:ss)
 * into the correct UTC epoch millisecond instant, accounting for Daylight Saving Time (CEST/CET).
 */
export function berlinWallClockToUtcMs(scheduledDate: string, scheduledTime: string): number {
  const [year, month, day] = scheduledDate.trim().split('-').map(Number);
  const [hour, minute, second = 0] = scheduledTime.trim().split(':').map(Number);

  const naiveUtc = Date.UTC(year, month - 1, day, hour, minute, second);

  const getBerlinAsUtc = (utcMs: number): number => {
    const parts = dtfBerlinFull.formatToParts(new Date(utcMs));
    const p: Record<string, string> = {};
    for (const part of parts) {
      p[part.type] = part.value;
    }
    return Date.UTC(
      Number(p.year),
      Number(p.month) - 1,
      Number(p.day),
      Number(p.hour),
      Number(p.minute),
      Number(p.second),
    );
  };

  // Determine the offset at naive UTC instant
  const berlinAtNaive = getBerlinAsUtc(naiveUtc);
  const offset = berlinAtNaive - naiveUtc;
  let candidateUtc = naiveUtc - offset;

  // Verify and correct if naiveUtc crossed DST transition
  const berlinAtCandidate = getBerlinAsUtc(candidateUtc);
  const diff = berlinAtCandidate - naiveUtc;
  if (diff !== 0) {
    candidateUtc -= diff;
  }

  return candidateUtc;
}
