import { z } from 'zod';
import { isoDateSchema } from './common';

/** A 4-digit privacy PIN that locks Cherri after a quick exit. */
export const pinSchema = z.object({ pin: z.string().regex(/^\d{4}$/, 'Use exactly 4 digits') });

/** Unlock with the PIN, or with the account password when no PIN is set. */
export const unlockSchema = z
  .object({ pin: z.string().regex(/^\d{4}$/).optional(), password: z.string().min(1).max(200).optional() })
  .refine((u) => u.pin !== undefined || u.password !== undefined, { message: 'Enter your PIN or password' });

export const CAMOUFLAGES = ['WEATHER', 'ARTICLE', 'NOTES'] as const;
export type Camouflage = (typeof CAMOUFLAGES)[number];

export const reminderSchema = z.object({
  kind: z.literal('PREGNANCY_TEST'),
  dueOn: isoDateSchema,
});

export type PinInput = z.infer<typeof pinSchema>;
export type UnlockInput = z.infer<typeof unlockSchema>;
export type ReminderInput = z.infer<typeof reminderSchema>;
