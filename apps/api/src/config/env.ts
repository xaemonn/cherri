import { z } from 'zod';

const optionalString = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined));

const csv = (fallback: string) =>
  z
    .string()
    .default(fallback)
    .transform((v) =>
      v
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    );

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().default(4100),
  DATABASE_URL: z.string().min(1),
  WEB_URL: z.url().default('http://localhost:3100'),
  CORS_ORIGINS: csv('http://localhost:3100,http://localhost:8081'),
  TRUST_PROXY: z.stringbool().default(false),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().min(60).default(900),
  REFRESH_TTL_DAYS: z.coerce.number().int().min(1).max(365).default(30),
  ENCRYPTION_KEY: z
    .string()
    .refine((v) => Buffer.from(v, 'base64').length === 32, 'ENCRYPTION_KEY must be 32 random bytes, base64-encoded'),

  AI_PROVIDERS: csv('groq,gemini,openrouter,ollama'),
  GROQ_API_KEY: optionalString,
  GROQ_CHAT_MODEL: optionalString,
  GROQ_FAST_MODEL: optionalString,
  GROQ_VISION_MODEL: optionalString,
  GROQ_TRANSCRIBE_MODEL: optionalString,
  GEMINI_API_KEY: optionalString,
  GEMINI_CHAT_MODEL: optionalString,
  GEMINI_FAST_MODEL: optionalString,
  GEMINI_VISION_MODEL: optionalString,
  OPENROUTER_API_KEY: optionalString,
  OPENROUTER_CHAT_MODEL: optionalString,
  OLLAMA_BASE_URL: optionalString,
  OLLAMA_MODEL: optionalString,
  AI_TIMEOUT_MS: z.coerce.number().int().min(1000).default(30_000),
  AI_DAILY_MESSAGE_LIMIT: z.coerce.number().int().min(1).default(150),

  OVERPASS_URL: z.url().default('https://overpass-api.de/api/interpreter'),
  /** Allows POST /api/demo/load to fill an empty account with demo data. */
  DEMO_MODE: z.stringbool().default(true),
});

export type Env = z.infer<typeof envSchema>;

/** Injection token for the validated environment. */
export const ENV = Symbol('ENV');

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid environment configuration:\n${problems}\nSee apps/api/.env.example.`);
  }
  return parsed.data;
}
