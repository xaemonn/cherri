import { addDays, type ISODate } from '../dates';
import { mean } from '../math';
import type { LogRecord } from './types';

export interface MoodShift {
  medication: string;
  startedOn: ISODate;
  /** Mean logged mood (1–5) in the 30 days before she started, and the 60 days after. */
  before: number;
  after: number;
  change: number;
  daysBefore: number;
  daysAfter: number;
}

const MIN_DAYS = 7;
const DROP = 0.8;

/**
 * Mood before and after starting a medicine (hormonal pills, for example, can affect mood).
 * A change worth mentioning to the doctor, never proof the medicine caused it, and never a
 * reason to stop a medicine on her own.
 */
export function moodShifts(
  logs: readonly LogRecord[],
  medications: ReadonlyArray<{ name: string; startedOn: ISODate | null }>,
  today: ISODate,
): MoodShift[] {
  const shifts: MoodShift[] = [];
  for (const med of medications) {
    const start = med.startedOn;
    if (!start || start > addDays(today, -MIN_DAYS * 2) || start < addDays(today, -365)) continue;
    const moods = (from: ISODate, to: ISODate) =>
      logs.filter((l) => l.mood != null && l.date >= from && l.date <= to).map((l) => l.mood!);
    const before = moods(addDays(start, -30), addDays(start, -1));
    const after = moods(start, addDays(start, 60));
    if (before.length < MIN_DAYS || after.length < MIN_DAYS) continue;
    const round = (v: number) => Math.round(v * 10) / 10;
    const change = round(mean(after) - mean(before));
    if (change <= -DROP) {
      shifts.push({
        medication: med.name,
        startedOn: start,
        before: round(mean(before)),
        after: round(mean(after)),
        change,
        daysBefore: before.length,
        daysAfter: after.length,
      });
    }
  }
  return shifts;
}
