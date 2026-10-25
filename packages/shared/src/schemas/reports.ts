import { z } from 'zod';

export const createReportSchema = z.object({
  /** How long the share link stays valid. */
  expiresInHours: z.number().int().min(1).max(168).default(24),
  /** How many days of history to include. */
  rangeDays: z.number().int().min(30).max(365).default(180),
  includeNotes: z.boolean().default(false),
  maxViews: z.number().int().min(1).max(100).optional(),
});

export type CreateReportInput = z.infer<typeof createReportSchema>;
