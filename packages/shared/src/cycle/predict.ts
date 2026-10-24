import type { CyclePhase } from '../constants';
import { addDays, diffDays, type ISODate } from '../dates';
import { clamp, mean, normalCdf, round, sampleSd } from '../math';
import {
  DEFAULT_LUTEAL_LENGTH,
  ovulationDay,
  periodLengthOf,
  phaseForDay,
  sortPeriods,
  type PeriodRecord,
} from './phases';

export const MIN_VALID_CYCLE = 15;
export const MAX_VALID_CYCLE = 90;

const POPULATION_CYCLE_MEAN = 28;
/** Uncertainty (days) of the prior mean: wide, so the user's own data dominates quickly. */
const PRIOR_MEAN_SD = 6;
/** Typical cycle-to-cycle variation within one person. */
const PRIOR_CYCLE_SD = 3;
/** How many pseudo-cycles back PRIOR_CYCLE_SD before real variation takes over. */
const PRIOR_SD_WEIGHT = 3;
/** Only the most recent cycles feed the model, so it adapts as the body changes. */
const MODEL_WINDOW = 6;
const CONFIDENCE_HALF_WINDOW = 2;
const Z_80 = 1.2816;

export interface CycleModelOptions {
  today: ISODate;
  /** User-reported typical cycle length; becomes the prior. */
  typicalCycleLength?: number;
  typicalPeriodLength?: number;
  lutealLength?: number;
}

export interface CycleStats {
  completedCycles: number;
  /** Valid cycle lengths, oldest first (last 12). */
  cycleLengths: number[];
  avgCycleLength: number | null;
  shortestCycle: number | null;
  longestCycle: number | null;
  /** Range (longest - shortest) over the last 6 cycles. */
  variability: number | null;
  avgPeriodLength: number | null;
  regularity: 'REGULAR' | 'IRREGULAR' | 'UNKNOWN';
}

export interface CycleModel {
  meanCycleLength: number;
  sd: number;
  basedOnCycles: number;
}

export interface CycleForecast {
  periodStart: ISODate;
  periodEnd: ISODate;
  ovulation: ISODate;
  fertileStart: ISODate;
  fertileEnd: ISODate;
}

export interface CyclePrediction {
  today: ISODate;
  hasData: boolean;
  current: {
    startDate: ISODate;
    day: number;
    phase: CyclePhase;
    isPeriod: boolean;
    expectedLength: number;
    ovulation: ISODate;
    fertileStart: ISODate;
    fertileEnd: ISODate;
  } | null;
  nextPeriod: {
    date: ISODate;
    /** ±2 days around `date`, with `confidence` = probability the period starts inside it. */
    windowStart: ISODate;
    windowEnd: ISODate;
    confidence: number;
    /** 80% prediction interval. */
    likelyStart: ISODate;
    likelyEnd: ISODate;
    daysUntil: number;
    isLate: boolean;
    daysLate: number;
  } | null;
  upcoming: CycleForecast[];
  stats: CycleStats;
  model: CycleModel;
}

export function validCycleLengths(periods: readonly PeriodRecord[]): number[] {
  const sorted = sortPeriods(periods);
  const lengths: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const length = diffDays(sorted[i]!.startDate, sorted[i - 1]!.startDate);
    if (length >= MIN_VALID_CYCLE && length <= MAX_VALID_CYCLE) lengths.push(length);
  }
  return lengths;
}

export function computeCycleStats(periods: readonly PeriodRecord[]): CycleStats {
  const sorted = sortPeriods(periods);
  const lengths = validCycleLengths(sorted).slice(-12);
  const recent = lengths.slice(-MODEL_WINDOW);
  const periodLengths = sorted
    .filter((p) => p.endDate)
    .slice(-MODEL_WINDOW)
    .map((p) => periodLengthOf(p, 0))
    .filter((l) => l > 0);

  const variability = recent.length >= 2 ? Math.max(...recent) - Math.min(...recent) : null;
  return {
    completedCycles: lengths.length,
    cycleLengths: lengths,
    avgCycleLength: lengths.length ? round(mean(recent), 1) : null,
    shortestCycle: lengths.length ? Math.min(...recent) : null,
    longestCycle: lengths.length ? Math.max(...recent) : null,
    variability,
    avgPeriodLength: periodLengths.length ? round(mean(periodLengths), 1) : null,
    // Cycle-to-cycle variation of more than ~9 days is considered irregular (FIGO 2018).
    regularity: recent.length < 3 ? 'UNKNOWN' : variability! <= 9 ? 'REGULAR' : 'IRREGULAR',
  };
}

/**
 * Bayesian estimate of the user's cycle length (normal-normal conjugate model).
 * The prior is the length she told us at onboarding; every logged cycle pulls the
 * estimate toward her real data and shrinks the uncertainty.
 */
export function fitCycleModel(cycleLengths: readonly number[], typicalCycleLength?: number): CycleModel {
  const priorMean = clamp(typicalCycleLength ?? POPULATION_CYCLE_MEAN, MIN_VALID_CYCLE, MAX_VALID_CYCLE);
  const recent = cycleLengths.slice(-MODEL_WINDOW);
  const n = recent.length;
  const priorPrecision = 1 / PRIOR_MEAN_SD ** 2;

  if (n === 0) {
    return { meanCycleLength: priorMean, sd: round(Math.hypot(PRIOR_CYCLE_SD, PRIOR_MEAN_SD), 2), basedOnCycles: 0 };
  }

  const sampleVariance = n >= 2 ? sampleSd(recent) ** 2 : 0;
  const sigma2 = (PRIOR_SD_WEIGHT * PRIOR_CYCLE_SD ** 2 + (n - 1) * sampleVariance) / (PRIOR_SD_WEIGHT + n - 1);
  const precision = priorPrecision + n / sigma2;
  const posteriorMean = (priorMean * priorPrecision + (n * mean(recent)) / sigma2) / precision;
  const predictiveSd = Math.sqrt(sigma2 + 1 / precision);

  return { meanCycleLength: round(posteriorMean, 1), sd: round(predictiveSd, 2), basedOnCycles: n };
}

function forecastFrom(start: ISODate, cycleLength: number, periodLength: number, luteal: number): CycleForecast {
  const ovulation = addDays(start, ovulationDay(cycleLength, periodLength, luteal) - 1);
  return {
    periodStart: start,
    periodEnd: addDays(start, periodLength - 1),
    ovulation,
    fertileStart: addDays(ovulation, -5),
    fertileEnd: addDays(ovulation, 1),
  };
}

export function predictCycle(periods: readonly PeriodRecord[], options: CycleModelOptions): CyclePrediction {
  const { today } = options;
  const luteal = options.lutealLength ?? DEFAULT_LUTEAL_LENGTH;
  const sorted = sortPeriods(periods).filter((p) => p.startDate <= today);
  const stats = computeCycleStats(sorted);
  const model = fitCycleModel(stats.cycleLengths, options.typicalCycleLength);
  const periodLength = Math.round(stats.avgPeriodLength ?? options.typicalPeriodLength ?? 5);

  const last = sorted.at(-1);
  if (!last) {
    return { today, hasData: false, current: null, nextPeriod: null, upcoming: [], stats, model };
  }

  const cycleLength = Math.round(model.meanCycleLength);
  const day = diffDays(today, last.startDate) + 1;
  const currentPeriodLength = periodLengthOf(last, periodLength);
  const currentForecast = forecastFrom(last.startDate, cycleLength, currentPeriodLength, luteal);

  const predicted = addDays(last.startDate, cycleLength);
  const daysUntil = diffDays(predicted, today);
  const isLate = daysUntil < 0;
  const likelyHalfWidth = Math.max(1, Math.round(Z_80 * model.sd));

  // When late, keep forecasting from today rather than painting periods into the past.
  const upcomingBase = isLate ? today : predicted;
  const upcoming = [0, 1, 2].map((k) => forecastFrom(addDays(upcomingBase, k * cycleLength), cycleLength, periodLength, luteal));

  return {
    today,
    hasData: true,
    current: {
      startDate: last.startDate,
      day,
      phase: phaseForDay(day, cycleLength, currentPeriodLength, luteal),
      isPeriod: day <= currentPeriodLength,
      expectedLength: cycleLength,
      ovulation: currentForecast.ovulation,
      fertileStart: currentForecast.fertileStart,
      fertileEnd: currentForecast.fertileEnd,
    },
    nextPeriod: {
      date: predicted,
      windowStart: addDays(predicted, -CONFIDENCE_HALF_WINDOW),
      windowEnd: addDays(predicted, CONFIDENCE_HALF_WINDOW),
      confidence: round(2 * normalCdf((CONFIDENCE_HALF_WINDOW + 0.5) / model.sd) - 1, 2),
      likelyStart: addDays(predicted, -likelyHalfWidth),
      likelyEnd: addDays(predicted, likelyHalfWidth),
      daysUntil: Math.max(0, daysUntil),
      isLate,
      daysLate: isLate ? -daysUntil : 0,
    },
    upcoming,
    stats,
    model,
  };
}
