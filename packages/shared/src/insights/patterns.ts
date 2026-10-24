import type { CyclePhase, ScreeningType } from '../constants';
import { getSymptom, symptomLabel } from '../catalog/symptoms';
import type { ISODate } from '../dates';
import { fisherExactGreater, round } from '../math';
import { buildTimeline, locateDate, type DatePosition, type PeriodRecord } from '../cycle/phases';
import type { LogRecord } from './types';

export type PatternWindow = CyclePhase | 'PREMENSTRUAL';
const WINDOWS: readonly PatternWindow[] = ['MENSTRUAL', 'FOLLICULAR', 'OVULATORY', 'LUTEAL', 'PREMENSTRUAL'];

const WINDOW_PHRASES: Record<PatternWindow, string> = {
  MENSTRUAL: 'during your period',
  FOLLICULAR: 'in the days after your period',
  OVULATORY: 'around ovulation',
  LUTEAL: 'in the second half of your cycle',
  PREMENSTRUAL: 'in the week before your period',
};

/** Signals derived from the numeric fields of a log, analysed alongside symptoms. */
const DERIVED_FEATURES: Record<string, { label: string; test: (log: LogRecord) => boolean }> = {
  low_mood_score: { label: 'Low mood days', test: (l) => l.mood != null && l.mood <= 2 },
  low_energy: { label: 'Low energy days', test: (l) => l.energy != null && l.energy <= 2 },
  high_pain: { label: 'Strong pain (6+/10)', test: (l) => l.painLevel != null && l.painLevel >= 6 },
  poor_sleep: { label: 'Sleeping under 6 hours', test: (l) => l.sleepHours != null && l.sleepHours < 6 },
};

/** Textbook pairings (cramps during a period) are still reported, but ranked below surprises. */
const EXPECTED_PAIRS: Record<string, readonly PatternWindow[]> = {
  cramps: ['MENSTRUAL'],
  back_pain: ['MENSTRUAL'],
};

const MIN_CYCLES = 2;
const MIN_LOGGED_DAYS = 14;
const MIN_OCCURRENCES = 3;
const MIN_RATE = 0.3;
const MIN_LIFT = 1.5;
const MAX_P = 0.05;

export interface PatternInsight {
  feature: string;
  label: string;
  window: PatternWindow;
  rateInWindow: number;
  rateOutside: number;
  /** null when the feature never appears outside the window. */
  lift: number | null;
  pValue: number;
  cyclesWithPattern: number;
  cyclesObserved: number;
  strength: 'STRONG' | 'MODERATE';
  /** A well-known pairing such as cramps during a period. */
  expected: boolean;
  message: string;
  hint: { note: string; screening?: ScreeningType } | null;
}

export interface PatternReport {
  ready: boolean;
  completedCyclesAnalysed: number;
  loggedDaysAnalysed: number;
  /** What is still needed before patterns can be detected. */
  needs: { cycles: number; loggedDays: number } | null;
  patterns: PatternInsight[];
}

export interface PatternOptions {
  today: ISODate;
  expectedCycleLength: number;
  defaultPeriodLength: number;
  limit?: number;
}

function hintFor(feature: string, window: PatternWindow): PatternInsight['hint'] {
  const symptom = getSymptom(feature);
  const isMood = symptom?.category === 'MOOD' || feature === 'low_mood_score';
  if (isMood && (window === 'PREMENSTRUAL' || window === 'LUTEAL')) {
    return {
      note: 'Mood changes that line up with your cycle like this are worth checking for PMS or PMDD.',
      screening: 'PMDD',
    };
  }
  if ((feature === 'headache' || feature === 'migraine') && (window === 'PREMENSTRUAL' || window === 'MENSTRUAL')) {
    return { note: 'Headaches tied to your cycle can be menstrual migraines. Doctors can treat these specifically.' };
  }
  const endoSignals = ['high_pain', 'pelvic_pain', 'pain_during_sex', 'painful_bowel', 'painful_urination'];
  if (endoSignals.includes(feature) && window === 'MENSTRUAL') {
    return {
      note: 'Strong cyclical pain is not something you just have to live with. It is worth checking for endometriosis.',
      screening: 'ENDOMETRIOSIS',
    };
  }
  return null;
}

function inWindow(position: DatePosition, window: PatternWindow): boolean {
  return window === 'PREMENSTRUAL' ? position.premenstrual : position.phase === window;
}

/**
 * Pattern Radar: finds symptoms that cluster in a specific part of the cycle.
 * Pure statistics (Fisher's exact test on logged days); the wording is templated so
 * nothing here can hallucinate. Only completed cycles are analysed.
 */
export function findPatterns(
  logs: readonly LogRecord[],
  periods: readonly PeriodRecord[],
  options: PatternOptions,
): PatternReport {
  const timeline = buildTimeline(periods, options.today, options.expectedCycleLength, options.defaultPeriodLength);
  const positioned = logs
    .map((log) => ({ log, position: locateDate(log.date, timeline) }))
    .filter((x): x is { log: LogRecord; position: DatePosition } => x.position?.cycle.complete === true);

  const cycleIds = new Set(positioned.map((x) => x.position.cycle.index));
  const base = { completedCyclesAnalysed: cycleIds.size, loggedDaysAnalysed: positioned.length };
  if (cycleIds.size < MIN_CYCLES || positioned.length < MIN_LOGGED_DAYS) {
    return {
      ...base,
      ready: false,
      needs: {
        cycles: Math.max(0, MIN_CYCLES - cycleIds.size),
        loggedDays: Math.max(0, MIN_LOGGED_DAYS - positioned.length),
      },
      patterns: [],
    };
  }

  const featureTests = new Map<string, { label: string; test: (log: LogRecord) => boolean }>();
  for (const { log } of positioned) {
    for (const s of log.symptoms) {
      if (featureTests.has(s.code) || getSymptom(s.code)?.category === 'BLEEDING') continue;
      featureTests.set(s.code, { label: symptomLabel(s.code), test: (l) => l.symptoms.some((x) => x.code === s.code) });
    }
  }
  for (const [key, def] of Object.entries(DERIVED_FEATURES)) featureTests.set(key, def);

  const patterns: Array<PatternInsight & { rawP: number; rawLift: number }> = [];
  for (const [feature, { label, test }] of featureTests) {
    const has = positioned.map((x) => test(x.log));
    if (has.filter(Boolean).length < MIN_OCCURRENCES) continue;

    // Among significant windows keep the most concentrated one (highest lift), so
    // "the week before your period" wins over the broader luteal phase.
    let best: (PatternInsight & { rawP: number; rawLift: number }) | null = null;
    for (const window of WINDOWS) {
      let a = 0, b = 0, c = 0, d = 0;
      const cyclesWithWindow = new Set<number>();
      const cyclesWithPattern = new Set<number>();
      positioned.forEach((x, i) => {
        const cycle = x.position.cycle.index;
        if (inWindow(x.position, window)) {
          cyclesWithWindow.add(cycle);
          if (has[i]) {
            a++;
            cyclesWithPattern.add(cycle);
          } else {
            b++;
          }
        } else if (has[i]) {
          c++;
        } else {
          d++;
        }
      });

      if (a < MIN_OCCURRENCES || cyclesWithPattern.size < MIN_CYCLES) continue;
      const rateIn = a / (a + b);
      const rateOut = c + d > 0 ? c / (c + d) : 0;
      const lift = rateOut === 0 ? null : rateIn / rateOut;
      if (rateIn < MIN_RATE || (lift !== null && lift < MIN_LIFT)) continue;
      const pValue = fisherExactGreater(a, b, c, d);
      if (pValue >= MAX_P) continue;
      const rawLift = lift ?? Number.POSITIVE_INFINITY;
      if (best && (rawLift < best.rawLift || (rawLift === best.rawLift && pValue >= best.rawP))) continue;

      const k = cyclesWithPattern.size;
      const n = cyclesWithWindow.size;
      const phrase = WINDOW_PHRASES[window];
      best = {
        feature,
        label,
        window,
        rateInWindow: round(rateIn, 2),
        rateOutside: round(rateOut, 2),
        lift: lift === null ? null : round(lift, 1),
        pValue: round(pValue, 4),
        cyclesWithPattern: k,
        cyclesObserved: n,
        strength: pValue < 0.01 && k / n >= 0.75 ? 'STRONG' : 'MODERATE',
        expected: EXPECTED_PAIRS[feature]?.includes(window) ?? false,
        rawP: pValue,
        rawLift,
        message:
          lift === null
            ? `${label} shows up only ${phrase}, in ${k} of ${n} cycles.`
            : `${label}: ${round(lift, 1)}× more likely ${phrase}, seen in ${k} of ${n} cycles.`,
        hint: hintFor(feature, window),
      };
    }
    if (best) patterns.push(best);
  }

  patterns.sort((x, y) => Number(x.expected) - Number(y.expected) || x.rawP - y.rawP || y.rawLift - x.rawLift);
  return {
    ...base,
    ready: true,
    needs: null,
    patterns: patterns.slice(0, options.limit ?? 10).map(({ rawP: _p, rawLift: _l, ...pattern }) => pattern),
  };
}
