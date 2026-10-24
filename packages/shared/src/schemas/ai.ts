import { z } from 'zod';
import { EVIDENCE_LEVELS, FLOW_LEVELS, MYTH_VERDICTS } from '../constants';
import { SYMPTOM_CODES } from '../catalog/symptoms';
import { isoDateSchema } from './common';

export const chatRequestSchema = z.object({
  message: z.string().trim().min(1).max(2000),
  sessionId: z.string().min(1).max(64).optional(),
});

export const parseLogRequestSchema = z.object({
  text: z.string().trim().min(1).max(1000),
  /** The client's "today", so relative words like "yesterday" resolve correctly. */
  date: isoDateSchema.optional(),
  /** Save straight to the log instead of returning a draft for confirmation. */
  commit: z.boolean().optional(),
  /** VOICE when the text came from a transcribed voice note. */
  source: z.enum(['CHAT', 'VOICE']).optional(),
});

export const mythCheckRequestSchema = z.object({
  claim: z.string().trim().min(3).max(500),
});

/**
 * What the AI must return when turning free text into a log. Lenient on input
 * (models are imperfect) and strict on output: unknown symptom codes are dropped.
 */
export const logDraftSchema = z.object({
  dayOffset: z.number().int().min(-7).max(0).catch(0),
  flow: z.enum(FLOW_LEVELS).nullable().catch(null),
  periodStarted: z.boolean().catch(false),
  symptoms: z
    .array(z.object({ code: z.string(), severity: z.number().int().min(1).max(3).catch(2) }))
    .catch([])
    .transform((items) =>
      items.filter((s): s is { code: (typeof SYMPTOM_CODES)[number]; severity: number } =>
        (SYMPTOM_CODES as readonly string[]).includes(s.code),
      ),
    ),
  painLevel: z.number().int().min(0).max(10).nullable().catch(null),
  mood: z.number().int().min(1).max(5).nullable().catch(null),
  energy: z.number().int().min(1).max(5).nullable().catch(null),
  sleepHours: z.number().min(0).max(24).nullable().catch(null),
  systolic: z.number().int().min(60).max(260).nullable().catch(null),
  diastolic: z.number().int().min(30).max(160).nullable().catch(null),
  weightKg: z.number().min(25).max(250).nullable().catch(null),
  notes: z.string().max(500).nullable().catch(null),
});

export const mythCheckResultSchema = z.object({
  verdict: z.enum(MYTH_VERDICTS),
  evidence: z.enum(EVIDENCE_LEVELS),
  explanation: z.string().min(1).max(1500),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;
export type ParseLogRequest = z.infer<typeof parseLogRequestSchema>;
export type MythCheckRequest = z.infer<typeof mythCheckRequestSchema>;
export type MythCheckResult = z.infer<typeof mythCheckResultSchema>;

/** Server-sent events emitted by POST /api/ai/chat. */
export type ChatStreamEvent =
  | { type: 'session'; sessionId: string }
  | { type: 'safety'; category: string; message: string; helplines: Array<{ name: string; number: string }> }
  | { type: 'token'; text: string }
  | { type: 'action'; action: ChatAction }
  | { type: 'citations'; citations: Citation[] }
  | { type: 'done'; messageId: string; provider: string; offline: boolean }
  | { type: 'error'; message: string };

export type ChatAction =
  | { kind: 'LOGGED'; date: string; summary: string }
  | { kind: 'SUGGEST_SCREENING'; screening: string; reason: string }
  | { kind: 'SHOW_CYCLE' };

export interface Citation {
  index: number;
  articleId: string;
  title: string;
  source: string;
  url?: string;
}
