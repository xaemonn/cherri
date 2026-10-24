import type { CyclePhase } from '../constants';
import { CYCLE_PHASES } from '../constants';
import { symptomLabel } from '../catalog/symptoms';
import { addDays, toDayNumber, type ISODate } from '../dates';
import { mean, round } from '../math';
import { buildTimeline, locateDate, sortPeriods, type PeriodRecord } from '../cycle/phases';
import { computeCycleStats } from '../cycle/predict';
import type { LogRecord } from './types';

export interface TimelineOptions {
  today: ISODate;
  expectedCycleLength: number;
  defaultPeriodLength: number;
}

export interface SymptomSummary {
  code: string;
  label: string;
  days: number;
  /** Share of logged days in the range on which the symptom appeared. */
  share: number;
  avgSeverity: number;
  peakPhase: CyclePhase | null;
}

export function summarizeSymptoms(
  logs: readonly LogRecord[],
  periods: readonly PeriodRecord[],
  options: TimelineOptions & { days: number },
): SymptomSummary[] {
  const from = addDays(options.today, -options.days + 1);
  const inRange = logs.filter((l) => l.date >= from && l.date <= options.today);
  if (inRange.length === 0) return [];

  const timeline = buildTimeline(periods, options.today, options.expectedCycleLength, options.defaultPeriodLength);
  const phaseDays: Partial<Record<CyclePhase, number>> = {};
  const bySymptom = new Map<string, { days: number; severities: number[]; phases: Partial<Record<CyclePhase, number>> }>();

  for (const log of inRange) {
    const phase = locateDate(log.date, timeline)?.phase;
    if (phase) phaseDays[phase] = (phaseDays[phase] ?? 0) + 1;
    for (const s of log.symptoms) {
      const entry = bySymptom.get(s.code) ?? { days: 0, severities: [], phases: {} };
      entry.days++;
      entry.severities.push(s.severity);
      if (phase) entry.phases[phase] = (entry.phases[phase] ?? 0) + 1;
      bySymptom.set(s.code, entry);
    }
  }

  return [...bySymptom.entries()]
    .map(([code, entry]) => {
      // Peak phase = highest rate per logged day in that phase, so long phases don't win by default.
      let peakPhase: CyclePhase | null = null;
      let peakRate = 0;
      for (const phase of CYCLE_PHASES) {
        const total = phaseDays[phase] ?? 0;
        const rate = total >= 2 ? (entry.phases[phase] ?? 0) / total : 0;
        if (rate > peakRate) {
          peakRate = rate;
          peakPhase = phase;
        }
      }
      return {
        code,
        label: symptomLabel(code),
        days: entry.days,
        share: round(entry.days / inRange.length, 2),
        avgSeverity: round(mean(entry.severities), 1),
        peakPhase,
      };
    })
    .sort((a, b) => b.days - a.days);
}

/** Consecutive logged days ending today (or yesterday, so the streak survives until tonight). */
export function currentStreak(loggedDates: readonly ISODate[], today: ISODate): number {
  const days = new Set(loggedDates.map(toDayNumber));
  let cursor = toDayNumber(today);
  if (!days.has(cursor)) cursor--;
  let streak = 0;
  while (days.has(cursor)) {
    streak++;
    cursor--;
  }
  return streak;
}

export function longestStreak(loggedDates: readonly ISODate[]): number {
  const days = [...new Set(loggedDates.map(toDayNumber))].sort((a, b) => a - b);
  let best = 0;
  let run = 0;
  days.forEach((day, i) => {
    run = i > 0 && day === days[i - 1]! + 1 ? run + 1 : 1;
    best = Math.max(best, run);
  });
  return best;
}

export interface WrappedStats {
  rangeStart: ISODate;
  rangeEnd: ISODate;
  daysLogged: number;
  longestStreak: number;
  periodsTracked: number;
  avgCycleLength: number | null;
  topSymptoms: Array<{ code: string; label: string; days: number }>;
  averageMood: number | null;
  /** Phase with the best average mood + energy. */
  powerPhase: CyclePhase | null;
  /** Phase with the highest average pain. */
  toughPhase: CyclePhase | null;
}

export function buildWrapped(
  logs: readonly LogRecord[],
  periods: readonly PeriodRecord[],
  options: TimelineOptions & { days: number },
): WrappedStats {
  const rangeStart = addDays(options.today, -options.days + 1);
  const inRange = logs.filter((l) => l.date >= rangeStart && l.date <= options.today);
  const periodsInRange = sortPeriods(periods).filter((p) => p.startDate >= rangeStart && p.startDate <= options.today);
  const timeline = buildTimeline(periods, options.today, options.expectedCycleLength, options.defaultPeriodLength);

  const byPhase = new Map<CyclePhase, { wellbeing: number[]; pain: number[] }>();
  for (const log of inRange) {
    const phase = locateDate(log.date, timeline)?.phase;
    if (!phase) continue;
    const bucket = byPhase.get(phase) ?? { wellbeing: [], pain: [] };
    if (log.mood != null && log.energy != null) bucket.wellbeing.push(log.mood + log.energy);
    if (log.painLevel != null) bucket.pain.push(log.painLevel);
    byPhase.set(phase, bucket);
  }

  const bestPhase = (pick: (b: { wellbeing: number[]; pain: number[] }) => number[]) => {
    let best: CyclePhase | null = null;
    let bestValue = -Infinity;
    for (const [phase, bucket] of byPhase) {
      const values = pick(bucket);
      if (values.length >= 2 && mean(values) > bestValue) {
        bestValue = mean(values);
        best = phase;
      }
    }
    return best;
  };

  const moods = inRange.map((l) => l.mood).filter((m): m is number => m != null);
  // Include the period just before the range so the first cycle inside it is counted.
  const stats = computeCycleStats(periods.filter((p) => p.startDate >= addDays(rangeStart, -90)));

  return {
    rangeStart,
    rangeEnd: options.today,
    daysLogged: inRange.length,
    longestStreak: longestStreak(inRange.map((l) => l.date)),
    periodsTracked: periodsInRange.length,
    avgCycleLength: stats.avgCycleLength,
    topSymptoms: summarizeSymptoms(logs, periods, options)
      .slice(0, 3)
      .map(({ code, label, days }) => ({ code, label, days })),
    averageMood: moods.length ? round(mean(moods), 1) : null,
    powerPhase: bestPhase((b) => b.wellbeing),
    toughPhase: bestPhase((b) => b.pain),
  };
}
