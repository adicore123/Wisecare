/**
 * Israel wall-clock helpers.
 *
 * Scheduled video calls store their times as Israel local wall-clock strings
 * (date: 'YYYY-MM-DD', time: 'HH:mm'). Comparing against "now" via Intl with
 * the Asia/Jerusalem zone keeps the logic correct both on the local dev
 * machine and on Vercel's UTC servers, DST included.
 */

export interface IsraelNow {
  /** 'YYYY-MM-DD' in Israel local time */
  date: string;
  /** 'HH:mm' in Israel local time (24h) */
  time: string;
  /** `${date}T${time}` — lexicographically comparable */
  stamp: string;
}

export function israelNow(): IsraelNow {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jerusalem',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  const parts: Record<string, string> = {};
  for (const p of fmt.formatToParts(new Date())) {
    if (p.type !== 'literal') parts[p.type] = p.value;
  }
  // Some ICU versions emit hour '24' at midnight
  const hour = parts.hour === '24' ? '00' : parts.hour;
  const date = `${parts.year}-${parts.month}-${parts.day}`;
  const time = `${hour}:${parts.minute}`;
  return { date, time, stamp: `${date}T${time}` };
}

/**
 * Minutes between two 'YYYY-MM-DDTHH:mm' wall-clock stamps (positive = a is
 * later). Parsed naively on purpose — both stamps shift identically, so the
 * difference is meaningful regardless of the server's timezone.
 */
export function minutesBetween(aStamp: string, bStamp: string): number {
  const a = new Date(`${aStamp}:00`).getTime();
  const b = new Date(`${bStamp}:00`).getTime();
  if (isNaN(a) || isNaN(b)) return NaN;
  return Math.round((a - b) / 60000);
}

/** Validates and normalizes 'YYYY-MM-DD' / 'HH:mm' inputs from the schedule form. */
export function isValidScheduleDateTime(date: string, time: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && /^\d{2}:\d{2}$/.test(time);
}
