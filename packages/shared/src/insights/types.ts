import type { FlowLevel, LabFlag } from '../constants';
import type { ISODate } from '../dates';
import type { PbacEntry } from './pbac';

/** Minimal daily-log shape the insight engines work on (decoupled from the database). */
export interface LogRecord {
  date: ISODate;
  flow?: FlowLevel | null;
  mood?: number | null;
  energy?: number | null;
  sleepHours?: number | null;
  painLevel?: number | null;
  systolic?: number | null;
  diastolic?: number | null;
  weightKg?: number | null;
  /** Pictorial blood-loss chart entries for a bleeding day. */
  pbac?: PbacEntry | null;
  symptoms: ReadonlyArray<{ code: string; severity: number }>;
}

export interface LabRecord {
  code: string | null;
  name: string;
  value: number;
  unit?: string | null;
  flag: LabFlag;
  takenAt: ISODate;
}

/** Latest result per catalog code. */
export function latestLabsByCode(labs: readonly LabRecord[]): Map<string, LabRecord> {
  const latest = new Map<string, LabRecord>();
  for (const lab of labs) {
    if (!lab.code) continue;
    const current = latest.get(lab.code);
    if (!current || lab.takenAt > current.takenAt) latest.set(lab.code, lab);
  }
  return latest;
}
