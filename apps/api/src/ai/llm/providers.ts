import type { Env } from '../../config/env';
import type { LlmProvider } from './llm.types';
import { OpenAICompatibleProvider } from './openai-compatible.provider';

/**
 * Free-tier defaults, verified against live keys on 2026-10-24 (gemini-2.5-* is closed
 * to new users). Free model line-ups change often, so every model is overridable from
 * .env. Run `pnpm --filter @cherri/api ai:check` to see what your keys can reach.
 */
export const DEFAULT_MODELS = {
  groq: { chat: 'openai/gpt-oss-120b', fast: 'openai/gpt-oss-20b', transcribe: 'whisper-large-v3' },
  gemini: { chat: 'gemini-3.5-flash', fast: 'gemini-3.5-flash-lite', vision: 'gemini-3.5-flash' },
  openrouter: { chat: 'openrouter/free' },
  ollama: { chat: 'llama3.2' },
} as const;

export function buildProviders(env: Env): LlmProvider[] {
  const timeoutMs = env.AI_TIMEOUT_MS;
  const factories: Record<string, () => LlmProvider | null> = {
    groq: () =>
      env.GROQ_API_KEY
        ? new OpenAICompatibleProvider({
            name: 'groq',
            baseURL: 'https://api.groq.com/openai/v1',
            apiKey: env.GROQ_API_KEY,
            models: {
              chat: env.GROQ_CHAT_MODEL ?? DEFAULT_MODELS.groq.chat,
              fast: env.GROQ_FAST_MODEL ?? DEFAULT_MODELS.groq.fast,
              vision: env.GROQ_VISION_MODEL,
            },
            transcribeModel: env.GROQ_TRANSCRIBE_MODEL ?? DEFAULT_MODELS.groq.transcribe,
            timeoutMs,
            // gpt-oss is a reasoning model; low effort keeps chat replies snappy.
            extraBody: (model) => (model.startsWith('openai/gpt-oss') ? { reasoning_effort: 'low' } : undefined),
          })
        : null,
    gemini: () =>
      env.GEMINI_API_KEY
        ? new OpenAICompatibleProvider({
            name: 'gemini',
            baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
            apiKey: env.GEMINI_API_KEY,
            models: {
              chat: env.GEMINI_CHAT_MODEL ?? DEFAULT_MODELS.gemini.chat,
              fast: env.GEMINI_FAST_MODEL ?? DEFAULT_MODELS.gemini.fast,
              vision: env.GEMINI_VISION_MODEL ?? DEFAULT_MODELS.gemini.vision,
            },
            timeoutMs,
            // Gemini 3 Flash thinks by default; low effort cut lab extraction from ~8 s to ~3 s.
            extraBody: (model) => (/^gemini-3[.\d]*-flash$/.test(model) ? { reasoning_effort: 'low' } : undefined),
          })
        : null,
    openrouter: () =>
      env.OPENROUTER_API_KEY
        ? new OpenAICompatibleProvider({
            name: 'openrouter',
            baseURL: 'https://openrouter.ai/api/v1',
            apiKey: env.OPENROUTER_API_KEY,
            models: {
              chat: env.OPENROUTER_CHAT_MODEL ?? DEFAULT_MODELS.openrouter.chat,
              fast: env.OPENROUTER_CHAT_MODEL ?? DEFAULT_MODELS.openrouter.chat,
            },
            timeoutMs,
            headers: { 'HTTP-Referer': env.WEB_URL, 'X-Title': 'Cherri' },
          })
        : null,
    ollama: () =>
      env.OLLAMA_BASE_URL
        ? new OpenAICompatibleProvider({
            name: 'ollama',
            baseURL: env.OLLAMA_BASE_URL,
            apiKey: 'ollama',
            models: { chat: env.OLLAMA_MODEL ?? DEFAULT_MODELS.ollama.chat, fast: env.OLLAMA_MODEL ?? DEFAULT_MODELS.ollama.chat },
            timeoutMs: timeoutMs * 2,
          })
        : null,
  };

  return env.AI_PROVIDERS.map((name) => factories[name]?.() ?? null).filter((p): p is LlmProvider => p !== null);
}
