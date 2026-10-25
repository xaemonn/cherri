import { z } from 'zod';
import type { DoctorReport } from '../api/types';
import { detectSafetyConcern, INDIA_HELPLINES, type Helpline } from '../safety';

/**
 * Doctor consults: non-urgent questions answered asynchronously by verified women's health doctors,
 * with her clinical snapshot attached (only after she has seen it and agreed).
 */
export const CONSULT_CATEGORIES = ['LAB_REVIEW', 'MEDICATION_SIDE_EFFECTS', 'PERIOD_IRREGULARITY', 'GENERAL_SYMPTOMS'] as const;
export type ConsultCategory = (typeof CONSULT_CATEGORIES)[number];

export const CONSULT_CATEGORY_LABELS: Record<ConsultCategory, { label: string; emoji: string; hint: string }> = {
  LAB_REVIEW: { label: 'Lab report review', emoji: '', hint: 'Understand a recent blood test' },
  MEDICATION_SIDE_EFFECTS: { label: 'Medication side effects', emoji: '', hint: 'Something feels off since a new medicine' },
  PERIOD_IRREGULARITY: { label: 'Period delay or irregularity', emoji: '', hint: 'Late, missed or unpredictable periods' },
  GENERAL_SYMPTOMS: { label: 'General symptom advice', emoji: '', hint: 'Pain, discharge, fatigue, anything else' },
};

export const CONSULT_STATUSES = ['AWAITING_REVIEW', 'IN_CONSULTATION', 'RESOLVED'] as const;
export type ConsultStatus = (typeof CONSULT_STATUSES)[number];

export const CONSULT_STATUS_LABELS: Record<ConsultStatus, string> = {
  AWAITING_REVIEW: 'Awaiting review',
  IN_CONSULTATION: 'In consultation',
  RESOLVED: 'Resolved',
};

export const ROLES = ['PATIENT', 'DOCTOR'] as const;
export type Role = (typeof ROLES)[number];

export const DOCTOR_SPECIALTIES = ['GYNAECOLOGIST', 'OBSTETRICIAN', 'ENDOCRINOLOGIST'] as const;
export type DoctorSpecialty = (typeof DOCTOR_SPECIALTIES)[number];

export const SPECIALTY_LABELS: Record<DoctorSpecialty, string> = {
  GYNAECOLOGIST: 'Gynaecologist',
  OBSTETRICIAN: 'Obstetrician',
  ENDOCRINOLOGIST: 'Endocrinologist',
};

export const EXPECTED_REPLY_TIME = 'Doctors typically reply within 4 to 12 hours.';

export const SAFETY_GATE_TEXT =
  'I am not experiencing acute emergency symptoms (such as fainting, unbearable sudden pelvic pain, or heavy bleeding that won’t stop).';

export const IN_PERSON_ADVICE =
  'This needs a physical examination, such as a pelvic exam or an ultrasound. Please visit a nearby clinic or gynaecologist. You can share your Cherri doctor report there.';

/** Tests a doctor can recommend in one tap. */
export const RECOMMENDABLE_TESTS = [
  'Complete blood count (CBC)',
  'Serum ferritin',
  'TSH',
  'Pelvic ultrasound',
  'HbA1c',
  'LH, FSH and total testosterone',
  'Prolactin',
  'Urine pregnancy test',
  'Vitamin D and B12',
] as const;

const message = z.string().trim().min(1).max(2000);

export const createConsultSchema = z.object({
  category: z.enum(CONSULT_CATEGORIES),
  message,
  source: z.enum(['TEXT', 'VOICE']).default('TEXT'),
  /** She has seen the snapshot preview and agrees to share it. */
  consent: z.literal(true, { message: 'Please agree to share your clinical snapshot' }),
  /** She confirmed she isn't having emergency symptoms. */
  safetyConfirmed: z.literal(true, { message: 'Please confirm this is not an emergency' }),
});

export const consultMessageSchema = z.object({ body: message, source: z.enum(['TEXT', 'VOICE']).default('TEXT') });

export const doctorMessageSchema = z.object({
  body: z.string().trim().max(2000).default(''),
  tests: z.array(z.string().trim().min(1).max(80)).max(10).default([]),
}).refine((m) => m.body.length > 0 || m.tests.length > 0, { message: 'Write a reply or pick a test' });

export type CreateConsultInput = z.input<typeof createConsultSchema>;
export type ConsultMessageInput = z.input<typeof consultMessageSchema>;
export type DoctorMessageInput = z.input<typeof doctorMessageSchema>;

const EMERGENCY_PATTERNS: RegExp[] = [
  /\b(?:2|3|4|two|three|four|several|multiple)\s+pads?\b.{0,25}\b(?:an|per|in an?|every|each)\s+hours?\b/i,
  /\b(?:bleeding|soaking|soaked)\s+through\b.{0,30}\b(?:pads?|clothes|bed)\b/i,
  /\b(?:severe|sharp|stabbing|sudden)\b.{0,25}\bone[- ]sided\b|\bone[- ]sided\b.{0,25}\b(?:severe|sharp|stabbing)\b/i,
  /\bpassed out\b|\bblacked out\b|\bfainted\b|\bunconscious\b/i,
  /\b(?:can'?t|cannot|can not|couldn'?t)\s+bear\b.{0,20}\bpain\b|\bunbearable\b.{0,10}\bpain\b|\bpain\b.{0,10}\bunbearable\b/i,
  /\bbleeding\b.{0,20}\b(?:won'?t|will not|doesn'?t|does not)\s+stop\b/i,
];

export interface ConsultEmergency {
  kind: 'MEDICAL' | 'SELF_HARM';
  title: string;
  message: string;
  helplines: readonly Helpline[];
}

/**
 * The in-chat emergency trap: a message describing an emergency must not wait in a queue for hours.
 * Deterministic and run on both the phone and the server.
 */
export function detectConsultEmergency(text: string): ConsultEmergency | null {
  const safety = detectSafetyConcern(text);
  if (safety?.category === 'SELF_HARM') {
    return {
      kind: 'SELF_HARM',
      title: 'Please talk to someone right now',
      message: `${safety.message} A chat reply can take hours, so please don’t wait for one.`,
      helplines: safety.helplines,
    };
  }
  if (safety?.category === 'MEDICAL_EMERGENCY' || EMERGENCY_PATTERNS.some((p) => p.test(text))) {
    return {
      kind: 'MEDICAL',
      title: 'CRITICAL SYMPTOMS DETECTED',
      message:
        'This requires immediate physical emergency care. Do not wait for a chat reply. Call 112 / 108 or go to the nearest emergency room immediately.',
      helplines: INDIA_HELPLINES.filter((h) => ['112', '108', '102'].includes(h.number)),
    };
  }
  return null;
}

/** What a doctor sees before reading a single message. */
export interface ClinicalSnapshot {
  generatedAt: string;
  rangeDays: number;
  patient: DoctorReport['patient'];
  cycle: {
    averageCycleLength: number | null;
    shortestCycle: number | null;
    longestCycle: number | null;
    regularity: string;
    lastPeriodStart: string | null;
    periodsLogged: number;
    missedPeriods: number;
  } | null;
  symptoms: Array<{ label: string; clinicalTerm: string | null; days: number; avgSeverity: number }>;
  redFlags: DoctorReport['redFlags'];
  labs: DoctorReport['labs'];
  medications: NonNullable<DoctorReport['medications']>;
  screenings: Array<{ title: string; band: string; date: string }>;
  mindChecks: NonNullable<DoctorReport['mindChecks']>;
  pregnancy: DoctorReport['pregnancy'] | null;
  bloodLoss: DoctorReport['bloodLoss'] | null;
  latestBloodPressure: { date: string; systolic: number; diastolic: number } | null;
  allergies: string | null;
}

/** Condenses a 90-day doctor report into the consult snapshot (out-of-range labs first). */
export function clinicalSnapshotFromReport(report: DoctorReport): ClinicalSnapshot {
  const rangeDays = Math.round((Date.parse(report.rangeEnd) - Date.parse(report.rangeStart)) / 86_400_000) + 1;
  const cycle = report.cycle;
  const periodsLogged = cycle ? cycle.history.filter((h) => h.start >= report.rangeStart).length : 0;
  const expected = cycle?.averageCycleLength ? Math.floor(rangeDays / cycle.averageCycleLength) : 0;
  const flagOrder = { LOW: 0, HIGH: 0, UNKNOWN: 1, NORMAL: 2 } as const;
  return {
    generatedAt: report.generatedAt,
    rangeDays,
    patient: report.patient,
    cycle: cycle
      ? {
          averageCycleLength: cycle.averageCycleLength,
          shortestCycle: cycle.shortestCycle,
          longestCycle: cycle.longestCycle,
          regularity: cycle.regularity,
          lastPeriodStart: cycle.lastPeriodStart,
          periodsLogged,
          missedPeriods: Math.max(0, expected - periodsLogged),
        }
      : null,
    symptoms: report.symptoms.slice(0, 8).map(({ label, clinicalTerm, days, avgSeverity }) => ({ label, clinicalTerm, days, avgSeverity })),
    redFlags: report.redFlags,
    labs: [...report.labs].sort((a, b) => flagOrder[a.flag] - flagOrder[b.flag]),
    medications: report.medications ?? [],
    screenings: report.screenings.map(({ title, band, date }) => ({ title, band, date })),
    mindChecks: report.mindChecks ?? [],
    pregnancy: report.pregnancy ?? null,
    bloodLoss: report.bloodLoss ?? null,
    latestBloodPressure: report.vitals?.bloodPressure.at(-1) ?? null,
    allergies: report.background?.allergies ?? null,
  };
}

/** Short tags for the doctor's inbox, so the queue reads at a glance. */
export function clinicalTags(snapshot: ClinicalSnapshot, flagCodes: readonly string[], category: ConsultCategory): string[] {
  const flags = new Set(flagCodes);
  const tags: string[] = [];
  const band = (title: string) => snapshot.screenings.find((s) => s.title.startsWith(title))?.band;
  const concerning = (b: string | undefined) => b === 'HIGH' || b === 'MODERATE';
  const lowLab = (name: string) => snapshot.labs.some((l) => l.name.startsWith(name) && l.flag === 'LOW');

  if (snapshot.redFlags.some((f) => f.severity === 'URGENT')) tags.push('Urgent flag');
  if (snapshot.pregnancy?.stage === 'PREGNANCY') tags.push(`Pregnancy · ${snapshot.pregnancy.weeks} wk`);
  if (snapshot.pregnancy?.stage === 'POSTPARTUM') tags.push(`Postnatal · ${snapshot.pregnancy.weeksSinceBirth} wk`);
  if (['SEVERE_HYPERTENSION', 'PREECLAMPSIA_WARNING_SIGNS', 'HIGH_BP_MATERNAL', 'HIGH_BP', 'VERY_HIGH_BP'].some((c) => flags.has(c))) tags.push('High BP');
  if (concerning(band('PCOS')) || ['INFREQUENT_PERIODS', 'IRREGULAR_CYCLES', 'NO_PERIOD_90_DAYS'].some((c) => flags.has(c))) tags.push('PCOS · irregular cycles');
  if (lowLab('Ferritin') || lowLab('Haemoglobin') || ['LOW_HAEMOGLOBIN', 'SEVERE_ANAEMIA', 'PREGNANCY_ANAEMIA'].some((c) => flags.has(c))) {
    tags.push(lowLab('Ferritin') ? 'Low ferritin / anaemia' : 'Anaemia');
  }
  if (snapshot.bloodLoss?.heavy) tags.push(`Heavy bleeding · PBAC ${snapshot.bloodLoss.score}`);
  else if (flags.has('HEAVY_BLEEDING')) tags.push('Heavy periods');
  if (flags.has('SEVERE_PERIOD_PAIN') || concerning(band('Endometriosis'))) tags.push('Severe period pain');
  if (flags.has('ABNORMAL_TSH')) tags.push('Thyroid');
  const phq = snapshot.mindChecks.find((m) => m.type === 'PHQ9');
  if (phq && phq.score >= 10) tags.push(`Mood · PHQ-9 ${phq.score}`);
  if (category === 'LAB_REVIEW' && !snapshot.labs.some((l) => l.flag === 'LOW' || l.flag === 'HIGH')) tags.push('Routine lab check');
  if (tags.length === 0) tags.push(CONSULT_CATEGORY_LABELS[category].label);
  return tags.slice(0, 5);
}
