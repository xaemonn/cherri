/**
 * Checks every configured AI provider: are the default models still on the free tier,
 * and does a real chat call work? Run with `pnpm --filter @cherri/api ai:check`.
 */
import { existsSync } from 'node:fs';
import { buildProviders } from '../src/ai/llm/providers';
import type { LlmTask } from '../src/ai/llm/llm.types';
import { loadEnv } from '../src/config/env';

const describeError = (error: unknown) => {
  const { status, message } = (error ?? {}) as { status?: number; message?: string };
  return `${status ?? ''} ${message ?? String(error)}`.trim();
};

async function main(): Promise<void> {
  if (existsSync('.env')) process.loadEnvFile('.env');
  const providers = buildProviders(loadEnv());
  if (providers.length === 0) {
    console.log('No AI providers configured. Add GROQ_API_KEY and/or GEMINI_API_KEY to apps/api/.env.');
    console.log('Until then Cherri runs in offline mode (heuristic logging + health library answers).');
    return;
  }

  for (const provider of providers) {
    console.log(`\n▶ ${provider.name}`);
    try {
      const models = await provider.listModels();
      for (const task of ['chat', 'fast', 'vision'] as LlmTask[]) {
        const model = provider.modelFor(task);
        if (!model) continue;
        const listed = models.includes(model) || models.includes(`models/${model}`);
        console.log(`  ${task.padEnd(7)} ${model}  ${listed ? '✓ listed' : '? not in model list (may still work via a router)'}`);
      }
    } catch (error) {
      console.log(`  ✗ could not list models: ${describeError(error)}`);
    }

    try {
      const started = Date.now();
      const result = await provider.complete({
        task: 'chat',
        messages: [{ role: 'user', content: 'Reply with exactly one word: ok' }],
        maxTokens: 200,
        temperature: 0,
      });
      console.log(`  chat    ✓ replied "${result.content.trim().slice(0, 30)}" in ${Date.now() - started} ms`);
    } catch (error) {
      console.log(`  chat    ✗ ${describeError(error)}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
