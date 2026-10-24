import { diffDays, type ISODate } from '../dates';

const LOCALE = 'en-IN';

/** "24 Oct" (or "Fri, 24 Oct" with weekday). Dates are calendar days, so format in UTC. */
export function formatDay(date: ISODate, options: { weekday?: boolean; year?: boolean } = {}): string {
  return new Intl.DateTimeFormat(LOCALE, {
    day: 'numeric',
    month: 'short',
    ...(options.weekday && { weekday: 'short' }),
    ...(options.year && { year: 'numeric' }),
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`));
}

export function formatMonth(date: ISODate): string {
  return new Intl.DateTimeFormat(LOCALE, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`));
}

/** "today", "tomorrow", "in 5 days", "3 days ago". */
export function relativeDay(date: ISODate, today: ISODate): string {
  const days = diffDays(date, today);
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days === -1) return 'yesterday';
  return days > 0 ? `in ${days} days` : `${-days} days ago`;
}

export function greeting(hour: number): string {
  if (hour < 5) return 'Up late';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function firstName(name: string | null | undefined): string | null {
  return name?.trim().split(/\s+/)[0] || null;
}

export function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}
