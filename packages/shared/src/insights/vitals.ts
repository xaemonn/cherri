import { addDays, diffDays, type ISODate } from '../dates';
import { median } from '../math';
import type { LogRecord } from './types';

export interface BloodPressureReading {
  date: ISODate;
  systolic: number;
  diastolic: number;
  /** Mean arterial pressure: (systolic + 2 × diastolic) / 3. */
  map: number;
}

export function meanArterialPressure(systolic: number, diastolic: number): number {
  return Math.round((systolic + 2 * diastolic) / 3);
}

/**
 * SEVERE is the range that needs same-day treatment in pregnancy (ACOG, NICE NG133: 160/110);
 * HIGH is hypertension (140/90); ELEVATED is above the healthy adult range (130/80).
 */
export type BloodPressureLevel = 'SEVERE' | 'HIGH' | 'ELEVATED' | 'NORMAL';

export function classifyBloodPressure(systolic: number, diastolic: number): BloodPressureLevel {
  if (systolic >= 160 || diastolic >= 110) return 'SEVERE';
  if (systolic >= 140 || diastolic >= 90) return 'HIGH';
  if (systolic >= 130 || diastolic >= 80) return 'ELEVATED';
  return 'NORMAL';
}

export function bloodPressureReadings(logs: readonly LogRecord[]): BloodPressureReading[] {
  return logs
    .filter((l): l is LogRecord & { systolic: number; diastolic: number } => l.systolic != null && l.diastolic != null)
    .map((l) => ({ date: l.date, systolic: l.systolic, diastolic: l.diastolic, map: meanArterialPressure(l.systolic, l.diastolic) }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

export function weightReadings(logs: readonly LogRecord[]): Array<{ date: ISODate; weightKg: number }> {
  return logs
    .filter((l): l is LogRecord & { weightKg: number } => l.weightKg != null)
    .map((l) => ({ date: l.date, weightKg: l.weightKg }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

export interface PressureRise {
  baselineMap: number;
  baselineSince: ISODate;
  currentMap: number;
  rise: number;
}

/**
 * Her own baseline (median MAP of her first three readings) against her latest reading.
 * A rise of 15 mmHg or more is worth watching even while each reading is under 140/90.
 */
export function pressureRise(readings: readonly BloodPressureReading[]): PressureRise | null {
  if (readings.length < 4) return null;
  const baseline = readings.slice(0, 3);
  const latest = readings.at(-1)!;
  if (diffDays(latest.date, baseline.at(-1)!.date) < 14) return null;
  const baselineMap = Math.round(median(baseline.map((r) => r.map)));
  return { baselineMap, baselineSince: baseline[0]!.date, currentMap: latest.map, rise: latest.map - baselineMap };
}

export interface WeightJump {
  fromDate: ISODate;
  toDate: ISODate;
  gainKg: number;
}

/** More than 3 kg gained within a month (and at least a week apart) is a pregnancy danger sign (MoHFW ANC guidelines). */
export function rapidWeightGain(logs: readonly LogRecord[]): WeightJump | null {
  const weights = weightReadings(logs);
  const latest = weights.at(-1);
  if (!latest) return null;
  const earlier = weights.find((w) => w.date >= addDays(latest.date, -30) && w.date <= addDays(latest.date, -7));
  if (!earlier) return null;
  const gainKg = Math.round((latest.weightKg - earlier.weightKg) * 10) / 10;
  return gainKg > 3 ? { fromDate: earlier.date, toDate: latest.date, gainKg } : null;
}
