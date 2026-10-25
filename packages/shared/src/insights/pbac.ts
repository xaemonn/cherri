import { z } from 'zod';
import { addDays, type ISODate } from '../dates';
import type { PeriodRecord } from '../cycle/phases';
import type { LogRecord } from './types';

/**
 * Pictorial Blood Loss Assessment Chart (Higham, Shaw & O'Brien, 1990): what she used and how
 * soaked it was, turned into a score. A cycle over 100 points (about 80 mL) is heavy menstrual bleeding.
 */
export const PBAC_POINTS = {
  pad: { light: 1, moderate: 5, soaked: 20 },
  tampon: { light: 1, moderate: 5, soaked: 10 },
  clot: { small: 1, large: 5 },
  flooding: 5,
} as const;

export const PBAC_HEAVY_SCORE = 100;
export const PBAC_HEAVY_ML = 80;
/** Roughly 0.8 mL per PBAC point (100 points ≈ 80 mL), used only to combine cup volumes with pads. */
const ML_PER_POINT = 0.8;

const count = z.number().int().min(0).max(30);

export const pbacEntrySchema = z
  .object({
    padsLight: count,
    padsModerate: count,
    padsSoaked: count,
    tamponsLight: count,
    tamponsModerate: count,
    tamponsSoaked: count,
    /** Menstrual cup: millilitres emptied that day. */
    cupMl: z.number().min(0).max(500),
    clotsSmall: count,
    clotsLarge: count,
    /** Sudden gushes that soak through clothes or bedding. */
    flooding: z.number().int().min(0).max(10),
  })
  .partial()
  .strict();

export type PbacEntry = z.infer<typeof pbacEntrySchema>;

export const EMPTY_PBAC: Required<PbacEntry> = {
  padsLight: 0,
  padsModerate: 0,
  padsSoaked: 0,
  tamponsLight: 0,
  tamponsModerate: 0,
  tamponsSoaked: 0,
  cupMl: 0,
  clotsSmall: 0,
  clotsLarge: 0,
  flooding: 0,
};

export function pbacDayScore(entry: PbacEntry | null | undefined): number {
  if (!entry) return 0;
  const e = { ...EMPTY_PBAC, ...entry };
  return (
    e.padsLight * PBAC_POINTS.pad.light +
    e.padsModerate * PBAC_POINTS.pad.moderate +
    e.padsSoaked * PBAC_POINTS.pad.soaked +
    e.tamponsLight * PBAC_POINTS.tampon.light +
    e.tamponsModerate * PBAC_POINTS.tampon.moderate +
    e.tamponsSoaked * PBAC_POINTS.tampon.soaked +
    e.clotsSmall * PBAC_POINTS.clot.small +
    e.clotsLarge * PBAC_POINTS.clot.large +
    e.flooding * PBAC_POINTS.flooding
  );
}

export function isEmptyPbac(entry: PbacEntry | null | undefined): boolean {
  return !entry || Object.values({ ...EMPTY_PBAC, ...entry }).every((v) => v === 0);
}

export interface PbacTotals {
  score: number;
  cupMl: number;
  /** Cup volume plus the pad/tampon score converted to mL. */
  estimatedMl: number;
  clotsSmall: number;
  clotsLarge: number;
  flooding: number;
  heavy: boolean;
}

export function pbacTotals(entries: ReadonlyArray<PbacEntry | null | undefined>): PbacTotals {
  const sum = (key: keyof PbacEntry) => entries.reduce((acc, e) => acc + (e?.[key] ?? 0), 0);
  const score = entries.reduce((acc, e) => acc + pbacDayScore(e), 0);
  const cupMl = sum('cupMl');
  const estimatedMl = Math.round(cupMl + score * ML_PER_POINT);
  return {
    score,
    cupMl,
    estimatedMl,
    clotsSmall: sum('clotsSmall'),
    clotsLarge: sum('clotsLarge'),
    flooding: sum('flooding'),
    heavy: score > PBAC_HEAVY_SCORE || estimatedMl > PBAC_HEAVY_ML,
  };
}

export interface PbacCycle extends PbacTotals {
  start: ISODate;
  end: ISODate;
  loggedDays: number;
}

/** Blood-loss totals for each period that has PBAC entries, oldest first. */
export function pbacCycles(periods: readonly PeriodRecord[], logs: readonly LogRecord[], today: ISODate): PbacCycle[] {
  const cycles: PbacCycle[] = [];
  for (const period of periods) {
    if (period.startDate > today) continue;
    const end = period.endDate ?? addDays(period.startDate, 9);
    const days = logs.filter((l) => l.date >= period.startDate && l.date <= end && !isEmptyPbac(l.pbac));
    if (days.length === 0) continue;
    cycles.push({ start: period.startDate, end, loggedDays: days.length, ...pbacTotals(days.map((l) => l.pbac)) });
  }
  return cycles;
}
