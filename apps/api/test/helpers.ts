// Must stay first: points the app at the test database before anything reads the environment.
import './env';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { PrismaClient } from '@prisma/client';
import { todayIn } from '@cherri/shared';
import request from 'supertest';
import { LLM_PROVIDERS, type LlmProvider, type LlmRequest, type LlmResult, type LlmTask } from '../src/ai/llm/llm.types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { CryptoService } from '../src/common/crypto.service';
import { PrismaService } from '../src/common/prisma.service';
import { ENV, type Env } from '../src/config/env';
import { seedDemoHistory } from '../src/demo/demo-seeder';

export interface TestApp {
  app: NestExpressApplication;
  prisma: PrismaService;
  http: () => ReturnType<typeof request>;
  close: () => Promise<void>;
}

export async function createTestApp(options: { providers?: LlmProvider[] } = {}): Promise<TestApp> {
  const builder = Test.createTestingModule({ imports: [AppModule] });
  if (options.providers) builder.overrideProvider(LLM_PROVIDERS).useValue(options.providers);
  const moduleRef = await builder.compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>({ logger: ['error'] });
  configureApp(app, app.get<Env>(ENV));
  await app.init();
  const prisma = app.get(PrismaService);
  await resetDatabase(prisma);
  return { app, prisma, http: () => request(app.getHttpServer()), close: () => app.close() };
}

export async function resetDatabase(prisma: PrismaClient): Promise<void> {
  const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  await prisma.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(', ')} CASCADE`);
}

export interface TestUser {
  id: string;
  token: string;
  refreshToken: string;
  auth: { Authorization: string };
}

let counter = 0;

export async function signUp(t: TestApp, overrides: { email?: string; password?: string } = {}): Promise<TestUser> {
  counter += 1;
  const res = await t
    .http()
    .post('/api/auth/register')
    .send({ email: overrides.email ?? `user${counter}-${Date.now()}@test.cherri`, password: overrides.password ?? 'supersecret1', name: 'Test User' })
    .expect(201);
  return {
    id: res.body.user.id,
    token: res.body.tokens.accessToken,
    refreshToken: res.body.tokens.refreshToken,
    auth: { Authorization: `Bearer ${res.body.tokens.accessToken}` },
  };
}

export function today(): string {
  return todayIn('Asia/Kolkata');
}

/** A signed-up user pre-filled with the "Ananya" demo history. */
export async function signUpDemoUser(t: TestApp): Promise<TestUser> {
  const user = await signUp(t);
  const crypto = t.app.get(CryptoService);
  await seedDemoHistory(t.prisma, (text) => crypto.encrypt(text), user.id, today());
  return user;
}

/** Deterministic stand-in for an AI provider: replays scripted results in order. */
export class ScriptedProvider implements LlmProvider {
  readonly calls: LlmRequest[] = [];
  readonly canTranscribe = true;

  private readonly script: Array<Partial<LlmResult> | Error> = [];

  constructor(
    readonly name: string,
    private readonly tasks: LlmTask[] = ['chat', 'fast', 'vision'],
  ) {}

  /** Queue the next results (or errors) this provider will return. */
  enqueue(...steps: Array<Partial<LlmResult> | Error>): this {
    this.script.push(...steps);
    return this;
  }

  modelFor(task: LlmTask): string | undefined {
    return this.tasks.includes(task) ? `${this.name}-model` : undefined;
  }

  private next(request: LlmRequest): LlmResult {
    this.calls.push(request);
    const step = this.script.shift();
    if (!step) throw new Error(`${this.name}: script exhausted`);
    if (step instanceof Error) throw step;
    return { provider: this.name, model: `${this.name}-model`, content: '', toolCalls: [], ...step };
  }

  async complete(request: LlmRequest): Promise<LlmResult> {
    return this.next(request);
  }

  async stream(request: LlmRequest, onText: (delta: string) => void): Promise<LlmResult> {
    const result = this.next(request);
    for (const piece of result.content.match(/[\s\S]{1,12}/g) ?? []) onText(piece);
    return result;
  }

  async transcribe(): Promise<string> {
    return 'cramps since morning, bahut thakaan';
  }

  async listModels(): Promise<string[]> {
    return [];
  }
}

export function httpError(status: number, message = `HTTP ${status}`): Error {
  return Object.assign(new Error(message), { status });
}

/** Parses a Server-Sent Events body into its JSON payloads. */
export function parseSse(body: string): Array<Record<string, unknown>> {
  return body
    .split('\n\n')
    .map((block) => block.split('\n').find((line) => line.startsWith('data: ')))
    .filter((line): line is string => Boolean(line))
    .map((line) => JSON.parse(line.slice(6)) as Record<string, unknown>);
}

/** A minimal, valid text-based PDF (one page, one text line per entry). */
export function makeTextPdf(lines: string[]): Buffer {
  const escape = (s: string) => s.replace(/[\\()]/g, (m) => `\\${m}`);
  const content = ['BT', '/F1 11 Tf', '16 TL', '50 780 Td', ...lines.map((l, i) => `${i ? 'T* ' : ''}(${escape(l)}) Tj`), 'ET'].join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(content, 'latin1')} >>\nstream\n${content}\nendstream`,
  ];
  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((obj, i) => {
    offsets.push(Buffer.byteLength(pdf, 'latin1'));
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf, 'latin1');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf, 'latin1');
}

/** Just enough bytes to pass PNG sniffing; the scripted vision provider never decodes it. */
export const FAKE_PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64)]);
