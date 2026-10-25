import { z } from 'zod';
import { isISODate, isValidTimeZone } from '../dates';

export const isoDateSchema = z.string().refine(isISODate, { message: 'Expected a date as YYYY-MM-DD' });

export const timeZoneSchema = z.string().max(64).refine(isValidTimeZone, { message: 'Unknown timezone' });

export const dateRangeQuerySchema = z
  .object({ from: isoDateSchema.optional(), to: isoDateSchema.optional() })
  .refine((q) => !q.from || !q.to || q.from <= q.to, { message: '`from` must be on or before `to`' });

export const idParamSchema = z.string().min(1).max(64);
