import type { CyclePhase } from '../constants';
import { addDays, diffDays, type ISODate } from '../dates';

export const DEFAULT_LUTEAL_LENGTH = 14;
export const PREMENSTRUAL_DAYS = 7;

export interface PeriodRecord {
  startDate: ISODate;
  endDate?: ISODate | null;
}

/** Cycle day (1 = first day of period) on which ovulation is expected. */
export function ovulationDay(cycleLength: number, periodLength: number, lutealLength = DEFAULT_LUTEAL_LENGTH): number {
  return Math.max(periodLength + 2, cycleLength - lutealLength);
}

export function phaseForDay(
  day: number,
  cycleLength: number,
  periodLength: number,
  lutealLength = DEFAULT_LUTEAL_LENGTH,
): CyclePhase {
  if (day <= periodLength) return 'MENSTRUAL';
  const ov = ovulationDay(cycleLength, periodLength, lutealLength);
  if (day < ov - 2) return 'FOLLICULAR';
  if (day <= ov + 1) return 'OVULATORY';
  return 'LUTEAL';
}

export function sortPeriods<T extends PeriodRecord>(periods: readonly T[]): T[] {
  const byStart = new Map<string, T>();
  for (const p of periods) byStart.set(p.startDate, p);
  return [...byStart.values()].sort((a, b) => (a.startDate < b.startDate ? -1 : 1));
}

export function periodLengthOf(period: PeriodRecord, fallback: number): number {
  if (!period.endDate) return fallback;
  const length = diffDays(period.endDate, period.startDate) + 1;
  return length >= 1 && length <= 15 ? length : fallback;
}

export interface TimelineCycle {
  index: number;
  startDate: ISODate;
  /** Inclusive last day: the day before the next period, or `today` for the current cycle. */
  endDate: ISODate;
  /** Actual length for completed cycles, expected length for the current one. */
  length: number;
  periodLength: number;
  complete: boolean;
}

export interface DatePosition {
  cycle: TimelineCycle;
  day: number;
  phase: CyclePhase;
  /** In the last PREMENSTRUAL_DAYS days before the next period (completed cycles only). */
  premenstrual: boolean;
}

export function buildTimeline(
  periods: readonly PeriodRecord[],
  today: ISODate,
  expectedCycleLength: number,
  defaultPeriodLength: number,
): TimelineCycle[] {
  const sorted = sortPeriods(periods).filter((p) => p.startDate <= today);
  return sorted.map((p, i) => {
    const next = sorted[i + 1];
    const complete = next !== undefined;
    return {
      index: i,
      startDate: p.startDate,
      endDate: complete ? addDays(next.startDate, -1) : today,
      length: complete ? diffDays(next.startDate, p.startDate) : expectedCycleLength,
      periodLength: periodLengthOf(p, defaultPeriodLength),
      complete,
    };
  });
}

export function locateDate(
  date: ISODate,
  timeline: readonly TimelineCycle[],
  lutealLength = DEFAULT_LUTEAL_LENGTH,
): DatePosition | null {
  for (let i = timeline.length - 1; i >= 0; i--) {
    const cycle = timeline[i]!;
    if (date < cycle.startDate) continue;
    if (date > cycle.endDate) return null;
    const day = diffDays(date, cycle.startDate) + 1;
    return {
      cycle,
      day,
      phase: phaseForDay(day, cycle.length, cycle.periodLength, lutealLength),
      premenstrual: cycle.complete && day > cycle.length - PREMENSTRUAL_DAYS,
    };
  }
  return null;
}
