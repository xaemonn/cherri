import { existsSync } from 'node:fs';
import { join } from 'node:path';

const envFile = join(__dirname, '..', '.env');
if (existsSync(envFile)) process.loadEnvFile(envFile);

/** Same server as development, separate `cherri_test` database. */
export function testDatabaseUrl(): string {
  const url = new URL(process.env.DATABASE_URL ?? 'postgresql://cherri:cherri@localhost:5433/cherri?schema=public');
  url.pathname = '/cherri_test';
  return url.toString();
}

export function applyTestEnv(): void {
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = testDatabaseUrl();
  // No real AI in tests: suites either exercise the offline fallbacks or inject scripted providers.
  process.env.AI_PROVIDERS = '';
  process.env.WEB_URL = 'http://localhost:3100';
  process.env.DEMO_MODE = 'true';
  process.env.JWT_ACCESS_SECRET ??= 'test-only-secret-that-is-long-enough-1234567890';
  process.env.ENCRYPTION_KEY ??= Buffer.alloc(32, 7).toString('base64');
}

applyTestEnv();
