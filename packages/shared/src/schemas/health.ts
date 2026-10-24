import { z } from 'zod';
import {
  BODY_REGIONS,
  COMPANION_TONES,
  CONDITIONS,
  FLOW_LEVELS,
  LANGUAGES,
  LIFE_STAGES,
  LOG_SOURCES,
} from '../constants';
import { SYMPTOM_CODES } from '../catalog/symptoms';
import { LAB_CODES } from '../catalog/labs';
import { isoDateSchema, timeZoneSchema } from './common';

const currentYear = new Date().getUTCFullYear();

const profileFields = {
  name: z.string().trim().min(1).max(60),
  birthYear: z.number().int().min(currentYear - 90).max(currentYear - 8),
  lifeStage: z.enum(LIFE_STAGES),
  language: z.enum(LANGUAGES),
  companionTone: z.enum(COMPANION_TONES),
  avgCycleLength: z.number().int().min(15).max(90),
  avgPeriodLength: z.number().int().min(1).max(15),
  conditions: z.array(z.enum(CONDITIONS)).max(CONDITIONS.length),
  timezone: timeZoneSchema,
  /** Pregnancy: the expected date of delivery. */
  dueDate: isoDateSchema.nullable(),
  /** Postpartum: the day her baby was born. */
  deliveryDate: isoDateSchema.nullable(),
};

export const updateProfileSchema = z.object(profileFields).partial().strict();

export const onboardingSchema = z
  .object({
    ...profileFields,
    lastPeriodStart: isoDateSchema.optional(),
    consent: z.literal(true, { message: 'Consent is required to store health data' }),
  })
  .partial({
    name: true,
    birthYear: true,
    companionTone: true,
    avgCycleLength: true,
    avgPeriodLength: true,
    conditions: true,
    timezone: true,
    dueDate: true,
    deliveryDate: true,
  })
  .strict();

export const symptomEntrySchema = z.object({
  code: z.enum(SYMPTOM_CODES),
  severity: z.number().int().min(1).max(3).default(2),
  bodyRegion: z.enum(BODY_REGIONS).optional(),
});

/** Partial update of one day's log. Omitted fields are left unchanged; `null` clears a field. */
export const upsertLogSchema = z
  .object({
    flow: z.enum(FLOW_LEVELS).nullable(),
    mood: z.number().int().min(1).max(5).nullable(),
    energy: z.number().int().min(1).max(5).nullable(),
    stress: z.number().int().min(1).max(5).nullable(),
    sleepHours: z.number().min(0).max(24).nullable(),
    painLevel: z.number().int().min(0).max(10).nullable(),
    bbt: z.number().min(34).max(39).nullable(),
    lhPositive: z.boolean().nullable(),
    /** Blood pressure in mmHg. */
    systolic: z.number().int().min(60).max(260).nullable(),
    diastolic: z.number().int().min(30).max(160).nullable(),
    weightKg: z.number().min(25).max(250).nullable(),
    notes: z.string().max(2000).nullable(),
    /** Replaces the day's symptom list. */
    symptoms: z.array(symptomEntrySchema).max(40),
    source: z.enum(LOG_SOURCES),
  })
  .partial()
  .strict()
  .refine((log) => log.systolic == null || log.diastolic == null || log.systolic > log.diastolic, {
    message: 'The top blood pressure number (systolic) must be higher than the bottom one (diastolic)',
    path: ['systolic'],
  });

export const createPeriodSchema = z
  .object({ startDate: isoDateSchema, endDate: isoDateSchema.nullable().optional() })
  .refine((p) => !p.endDate || p.endDate >= p.startDate, { message: 'endDate must be on or after startDate' });

export const updatePeriodSchema = z
  .object({ startDate: isoDateSchema, endDate: isoDateSchema.nullable() })
  .partial()
  .strict();

export const manualLabReportSchema = z.object({
  takenAt: isoDateSchema,
  labName: z.string().trim().max(120).optional(),
  results: z
    .array(
      z.object({
        code: z.enum(LAB_CODES),
        value: z.number(),
        unit: z.string().max(20).optional(),
        refLow: z.number().optional(),
        refHigh: z.number().optional(),
      }),
    )
    .min(1)
    .max(60),
});

export const screeningSubmitSchema = z.object({
  answers: z.record(z.string().max(40), z.boolean()),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type OnboardingInput = z.infer<typeof onboardingSchema>;
export type SymptomEntryInput = z.infer<typeof symptomEntrySchema>;
export type UpsertLogInput = z.infer<typeof upsertLogSchema>;
export type CreatePeriodInput = z.infer<typeof createPeriodSchema>;
export type UpdatePeriodInput = z.infer<typeof updatePeriodSchema>;
export type ManualLabReportInput = z.infer<typeof manualLabReportSchema>;
export type ScreeningSubmitInput = z.infer<typeof screeningSubmitSchema>;
