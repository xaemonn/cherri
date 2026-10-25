import { z } from 'zod';
import { FAMILY_CONDITIONS } from '../constants';
import { isoDateSchema } from './common';

const optionalText = (max: number) => z.string().trim().max(max).nullable().optional();

/** A medicine or supplement she takes, for the "current medicines" part of her doctor report. */
export const medicationInputSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    dose: optionalText(60),
    schedule: optionalText(60),
    reason: optionalText(120),
    startedOn: isoDateSchema.nullable().optional(),
    active: z.boolean().optional(),
  })
  .strict();

export const medicationUpdateSchema = medicationInputSchema.partial().strict();

/** The background a doctor asks about at a first visit. */
export const healthBackgroundSchema = z
  .object({
    menarcheAge: z.number().int().min(8).max(20).nullable(),
    familyHistory: z.array(z.enum(FAMILY_CONDITIONS)).max(FAMILY_CONDITIONS.length),
    allergies: z.string().trim().max(500).nullable(),
    surgeries: z.string().trim().max(500).nullable(),
  })
  .partial()
  .strict();

/** Someone she trusts, who gets her SOS message. */
export const trustedContactSchema = z
  .object({
    name: z.string().trim().min(1).max(60),
    phone: z
      .string()
      .trim()
      .regex(/^\+?[0-9][0-9 ()-]{5,19}$/, 'Enter a phone number with digits only, like +91 98765 43210'),
    relation: z.string().trim().max(40).nullable().optional(),
  })
  .strict();

export type MedicationInput = z.infer<typeof medicationInputSchema>;
export type MedicationUpdate = z.infer<typeof medicationUpdateSchema>;
export type HealthBackgroundInput = z.infer<typeof healthBackgroundSchema>;
export type TrustedContactInput = z.infer<typeof trustedContactSchema>;
