/**
 * Date-only helpers. All health data is keyed by calendar day ("YYYY-MM-DD"),
 * so arithmetic is done on UTC day numbers to stay clear of timezone/DST bugs.
 */
export type ISODate = string;

const DAY_MS = 86_400_000;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isISODate(value: string): boolean {
  if (!ISO_DATE_RE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function toDayNumber(date: ISODate): number {
  return Math.floor(Date.parse(`${date}T00:00:00Z`) / DAY_MS);
}

export function fromDayNumber(day: number): ISODate {
  return new Date(day * DAY_MS).toISOString().slice(0, 10);
}

export function addDays(date: ISODate, days: number): ISODate {
  return fromDayNumber(toDayNumber(date) + days);
}

/** Whole days from `b` to `a` (positive when `a` is later). */
export function diffDays(a: ISODate, b: ISODate): number {
  return toDayNumber(a) - toDayNumber(b);
}

export function maxDate(a: ISODate, b: ISODate): ISODate {
  return a > b ? a : b;
}

/** Today's calendar date in the given IANA timezone. */
export function todayIn(timeZone: string, now: Date = new Date()): ISODate {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** Convert to a JS Date at UTC midnight (what Prisma expects for `@db.Date`). */
export function toUTCDate(date: ISODate): Date {
  return new Date(`${date}T00:00:00Z`);
}

export function fromUTCDate(date: Date): ISODate {
  return date.toISOString().slice(0, 10);
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
}
