/**
 * Seeds ready-to-demo accounts (password cherri-demo-2026 for both):
 *   demo@cherri.app       Ananya, 21: irregular cycles, painful periods, low iron
 *   pregnancy@cherri.app  Meera, 27: 30 weeks pregnant with rising blood pressure
 * Run with `pnpm db:seed` (re-running replaces the demo accounts).
 */
import { PrismaClient } from '@prisma/client';
import { hash } from '@node-rs/argon2';
import { todayIn, type DemoPersona } from '@cherri/shared';
import { existsSync } from 'node:fs';
import { CryptoService } from '../src/common/crypto.service';
import { loadEnv } from '../src/config/env';
import { seedDemoHistory } from '../src/demo/demo-seeder';

const DEMO_PASSWORD = 'cherri-demo-2026';
const ACCOUNTS: Array<{ email: string; persona: DemoPersona; language: 'hinglish' | 'en' }> = [
  { email: 'demo@cherri.app', persona: 'ananya', language: 'hinglish' },
  { email: 'pregnancy@cherri.app', persona: 'meera', language: 'en' },
];

async function main(): Promise<void> {
  if (existsSync('.env')) process.loadEnvFile('.env');
  const env = loadEnv();
  const crypto = new CryptoService(env);
  const prisma = new PrismaClient();

  try {
    for (const account of ACCOUNTS) {
      await prisma.user.deleteMany({ where: { email: account.email } });
      const user = await prisma.user.create({
        data: { email: account.email, passwordHash: await hash(DEMO_PASSWORD), language: account.language, companionTone: 'BESTIE' },
      });
      const counts = await seedDemoHistory(prisma, (text) => crypto.encrypt(text), user.id, todayIn(user.timezone), account.persona);
      console.log(`Seeded ${account.email} / ${DEMO_PASSWORD}:`, counts);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
