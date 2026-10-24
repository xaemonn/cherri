import type { FamilyCondition, FlowLevel } from './constants';
import type { RawLabResult } from './catalog/labs';
import type { SymptomCode } from './catalog/symptoms';
import { addDays, diffDays, type ISODate } from './dates';
import type { PeriodRecord } from './cycle/phases';
import type { LogRecord } from './insights/types';
import { PREGNANCY_DAYS } from './pregnancy/care';
import type { MedicationInput } from './schemas/visit';
import { structureStoryHeuristic, type StructuredStory } from './visit/story';

/** Small seeded PRNG (mulberry32) so the demo story is identical on every run. */
function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface DemoLog extends LogRecord {
  stress: number;
  notes: string | null;
}

export interface DemoData {
  profile: {
    name: string;
    birthYear: number;
    avgCycleLength: number;
    avgPeriodLength: number;
    lifeStage: 'CYCLE' | 'PREGNANCY';
    dueDate: ISODate | null;
  };
  periods: PeriodRecord[];
  logs: DemoLog[];
  labReport: { takenAt: ISODate; labName: string; results: RawLabResult[] };
  /** What she'd fill in on the Visit prep page. */
  background: { menarcheAge: number; familyHistory: FamilyCondition[]; allergies: string | null; surgeries: string | null };
  medications: MedicationInput[];
  story: { text: string; structured: StructuredStory };
}

const ANANYA_STORY =
  'My periods have been irregular since I was 16, sometimes 45 days apart. The cramps on the first two days are 8/10 and I miss college almost every month. ' +
  'Meftal helps a little but a hot water bag helps more. The pain gets worse when I stand for long. I also get acne on my jaw and my hair is falling more. ' +
  'I am worried it could be PCOS like my mother has. I want to know which tests I should get.';

const MEERA_STORY =
  'Since last week I get a headache most evenings and my face and feet look puffy in the morning. Yesterday my BP at home was 142/92. ' +
  'Lying on my left side helps the headache a bit. I am worried about the baby. I want to know if I need to change anything before my delivery.';

/** Oldest first. Long, irregular cycles, as you might see with PCOS. */
const CYCLE_LENGTHS = [36, 41, 34, 45, 38];
const CURRENT_CYCLE_DAY = 20;

/**
 * Demo persona "Ananya", 21: irregular long cycles, painful heavy periods,
 * premenstrual headaches and low mood, acne and fatigue, plus low iron on her labs.
 */
export function generateDemoData(today: ISODate, seed = 21): DemoData {
  const random = createRandom(seed);
  const chance = (p: number) => random() < p;
  const pick = (min: number, max: number) => min + Math.floor(random() * (max - min + 1));

  const currentStart = addDays(today, -(CURRENT_CYCLE_DAY - 1));
  const starts: ISODate[] = [currentStart];
  for (const length of [...CYCLE_LENGTHS].reverse()) starts.unshift(addDays(starts[0]!, -length));

  const periods: PeriodRecord[] = starts.map((startDate, i) => {
    const length = i === starts.length - 1 ? 6 : pick(5, 6);
    return { startDate, endDate: addDays(startDate, length - 1) };
  });

  const logs: DemoLog[] = [];
  for (let date = starts[0]!; date <= today; date = addDays(date, 1)) {
    const cycleIndex = starts.findLastIndex((s) => s <= date);
    const start = starts[cycleIndex]!;
    const next = starts[cycleIndex + 1];
    const day = diffDays(date, start) + 1;
    const daysToNext = next ? diffDays(next, date) : null;
    const period = periods[cycleIndex]!;
    const onPeriod = date <= period.endDate!;
    const premenstrual = daysToNext !== null && daysToNext <= 6;

    // Real people skip days: log ~85% of days, but almost always during a period.
    if (!onPeriod && date !== today && !chance(0.85)) continue;

    const symptoms = new Map<SymptomCode, number>();
    const add = (code: SymptomCode, severity: number) => symptoms.set(code, severity);
    let flow: FlowLevel = 'NONE';
    let painLevel: number | null = null;
    let mood = pick(3, 4);
    let energy = pick(2, 4);
    let sleepHours = pick(6, 8) + (chance(0.5) ? 0.5 : 0);
    let notes: string | null = null;

    if (onPeriod) {
      const flowByDay: FlowLevel[] = ['MEDIUM', 'HEAVY', 'HEAVY', 'HEAVY', 'LIGHT', 'SPOTTING'];
      flow = flowByDay[day - 1] ?? 'LIGHT';
      if (day <= 2) {
        painLevel = pick(7, 9);
        add('cramps', 3);
        add('back_pain', 2);
        if (chance(0.6)) add('nausea', 2);
        mood = 2;
        energy = 1;
        if (day === 1) notes = 'Cramps were bad, had to skip class. Meftal barely helped.';
      } else if (day <= 4) {
        painLevel = pick(4, 6);
        add('cramps', 2);
        if (day === 2 || day === 3) add('clots', 2);
      }
      add('fatigue', day <= 3 ? 3 : 2);
    } else if (premenstrual) {
      mood = chance(0.8) ? pick(1, 2) : 3;
      energy = pick(1, 2);
      sleepHours = pick(5, 6);
      if (chance(0.8)) add('low_mood', 2);
      if (chance(0.7)) add('irritability', 2);
      if (chance(0.7)) add('bloating', 2);
      if (chance(0.6)) add('cravings', 2);
      if (daysToNext !== null && daysToNext <= 3 && chance(0.85)) add('headache', 2);
      if (chance(0.6)) add('acne', 2);
      if (chance(0.5)) add('fatigue', 2);
    } else {
      if (chance(0.3)) add('acne', 1);
      if (chance(0.35)) add('fatigue', 2);
      if (chance(0.12)) add('headache', 1);
      if (chance(0.1)) add('low_mood', 1);
      if (chance(0.15)) add('bloating', 1);
    }
    if (chance(0.2)) add('hair_loss', 1);
    if (chance(0.15)) add('dizziness', 1);

    logs.push({
      date,
      flow,
      mood,
      energy,
      stress: premenstrual ? pick(3, 5) : pick(2, 3),
      sleepHours,
      painLevel,
      notes,
      symptoms: [...symptoms.entries()].map(([code, severity]) => ({ code, severity })),
    });
  }

  return {
    profile: { name: 'Ananya', birthYear: Number(today.slice(0, 4)) - 21, avgCycleLength: 32, avgPeriodLength: 5, lifeStage: 'CYCLE', dueDate: null },
    periods,
    logs,
    background: { menarcheAge: 12, familyHistory: ['PCOS', 'DIABETES'], allergies: null, surgeries: null },
    medications: [
      { name: 'Meftal-Spas', dose: '1 tablet', schedule: 'When cramps are bad', reason: 'Period pain' },
      { name: 'Iron-folic acid (IFA)', dose: '1 tablet', schedule: 'Once a day', reason: 'Low haemoglobin', startedOn: addDays(today, -8) },
    ],
    story: { text: ANANYA_STORY, structured: structureStoryHeuristic(ANANYA_STORY) },
    labReport: {
      takenAt: addDays(today, -10),
      labName: 'City Diagnostics, Pune',
      results: [
        { name: 'Haemoglobin', value: 10.2, unit: 'g/dL', refLow: 12, refHigh: 15.5 },
        { name: 'Serum Ferritin', value: 9, unit: 'ng/mL', refLow: 15, refHigh: 150 },
        { name: 'MCV', value: 74, unit: 'fL', refLow: 80, refHigh: 100 },
        { name: 'TSH (Ultrasensitive)', value: 2.1, unit: 'µIU/mL', refLow: 0.4, refHigh: 4.5 },
        { name: 'Vitamin D (25-OH)', value: 14.2, unit: 'ng/mL', refLow: 30, refHigh: 100 },
        { name: 'Vitamin B12', value: 310, unit: 'pg/mL', refLow: 200, refHigh: 900 },
        { name: 'Testosterone, Total', value: 78, unit: 'ng/dL', refLow: 15, refHigh: 70 },
        { name: 'LH', value: 12.4, unit: 'mIU/mL' },
        { name: 'FSH', value: 5.1, unit: 'mIU/mL' },
        { name: 'HbA1c', value: 5.4, unit: '%', refHigh: 5.6 },
      ],
    },
  };
}

/** 30 weeks + 2 days today. */
const MEERA_GESTATION_DAYS = 212;

/**
 * Demo persona "Meera", 27, 30 weeks pregnant: steady blood pressure for months, then a climb
 * past 140/90 with headaches and swelling this week. Pre-eclampsia warning signs, caught early.
 */
export function generatePregnancyDemoData(today: ISODate, seed = 27): DemoData {
  const random = createRandom(seed);
  const chance = (p: number) => random() < p;
  const pick = (min: number, max: number) => min + Math.floor(random() * (max - min + 1));
  const dueDate = addDays(today, PREGNANCY_DAYS - MEERA_GESTATION_DAYS);
  const start = addDays(today, -100);

  const logs: DemoLog[] = [];
  for (let date = start; date <= today; date = addDays(date, 1)) {
    const daysAgo = diffDays(today, date);
    const gestation = MEERA_GESTATION_DAYS - daysAgo;
    const bpDay = daysAgo % 4 === 0 || daysAgo <= 2;
    const weighDay = daysAgo % 7 === 0;
    if (!bpDay && !weighDay && daysAgo > 4 && !chance(0.6)) continue;

    const symptoms = new Map<SymptomCode, number>();
    const add = (code: SymptomCode, severity: number) => symptoms.set(code, severity);
    if (gestation < 126 && chance(0.4)) add('nausea', 1);
    if (chance(0.35)) add('fatigue', 2);
    if (gestation > 140 && chance(0.3)) add('back_pain', 1);
    if (gestation > 190 && chance(0.3)) add('insomnia', 2);
    if (gestation > 196 && chance(0.3)) add('swelling', 1);
    if (daysAgo <= 1) add('headache', 2);
    if (daysAgo === 0) add('swelling', 2);

    let systolic: number | null = null;
    let diastolic: number | null = null;
    if (bpDay) {
      if (daysAgo === 0) [systolic, diastolic] = [140, 90];
      else if (daysAgo === 1) [systolic, diastolic] = [142, 92];
      else if (daysAgo === 2) [systolic, diastolic] = [136, 88];
      else if (gestation >= 206) [systolic, diastolic] = [pick(130, 134), pick(84, 86)];
      else if (gestation >= 196) [systolic, diastolic] = [pick(118, 126), pick(76, 82)];
      else [systolic, diastolic] = [pick(106, 114), pick(66, 72)];
    }

    logs.push({
      date,
      flow: null,
      mood: daysAgo <= 1 ? 2 : pick(3, 4),
      energy: pick(2, 4),
      stress: daysAgo <= 2 ? 4 : pick(2, 3),
      sleepHours: gestation > 190 ? pick(5, 7) : pick(7, 8),
      painLevel: null,
      systolic,
      diastolic,
      weightKg: weighDay ? Math.round((58 + ((gestation - 112) / 7) * 0.45) * 10) / 10 : null,
      notes: daysAgo === 1 ? 'Headache since the evening. BP 142/92 on the home machine.' : null,
      symptoms: [...symptoms.entries()].map(([code, severity]) => ({ code, severity })),
    });
  }

  return {
    profile: { name: 'Meera', birthYear: Number(today.slice(0, 4)) - 27, avgCycleLength: 28, avgPeriodLength: 5, lifeStage: 'PREGNANCY', dueDate },
    periods: [],
    logs,
    background: { menarcheAge: 13, familyHistory: ['HYPERTENSION', 'DIABETES'], allergies: 'Penicillin (skin rash)', surgeries: null },
    medications: [
      { name: 'Iron-folic acid (IFA)', dose: '1 tablet', schedule: 'Once a day', reason: 'Pregnancy', startedOn: addDays(today, -100) },
      { name: 'Calcium', dose: '500 mg', schedule: 'Twice a day', reason: 'Pregnancy', startedOn: addDays(today, -100) },
    ],
    story: { text: MEERA_STORY, structured: structureStoryHeuristic(MEERA_STORY) },
    labReport: {
      takenAt: addDays(today, -12),
      labName: 'Government Hospital Lab, Mangaluru',
      results: [
        { name: 'Haemoglobin', value: 10.4, unit: 'g/dL', refLow: 12, refHigh: 15.5 },
        { name: 'TSH', value: 2.0, unit: 'µIU/mL', refLow: 0.4, refHigh: 4.5 },
        { name: 'HbA1c', value: 5.3, unit: '%', refHigh: 5.6 },
        { name: 'Vitamin D (25-OH)', value: 18, unit: 'ng/mL', refLow: 30, refHigh: 100 },
      ],
    },
  };
}
