import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp, signUpDemoUser, type TestApp, type TestUser } from './helpers';

describe('data rights (DPDP Act)', () => {
  let t: TestApp;
  let demo: TestUser;

  beforeAll(async () => {
    t = await createTestApp();
    demo = await signUpDemoUser(t);
  });
  afterAll(() => t.close());

  it('exports everything, decrypted', async () => {
    const res = await t.http().get('/api/me/export').set(demo.auth).expect(200);
    expect(res.body.profile.id).toBe(demo.id);
    expect(res.body.periods).toHaveLength(6);
    expect(res.body.logs.length).toBeGreaterThan(150);
    expect(res.body.logs.find((l: { notes: string | null }) => l.notes)?.notes).toMatch(/Meftal/);
    expect(res.body.labReports[0].results.length).toBe(10);
    expect(await t.prisma.auditLog.count({ where: { userId: demo.id, action: 'DATA_EXPORTED' } })).toBe(1);
  });

  it('updates the profile with validation', async () => {
    const ok = await t.http().patch('/api/me').set(demo.auth).send({ companionTone: 'CLINICAL', timezone: 'Asia/Kolkata' }).expect(200);
    expect(ok.body.companionTone).toBe('CLINICAL');
    await t.http().patch('/api/me').set(demo.auth).send({ timezone: 'Mars/Olympus' }).expect(400);
    await t.http().patch('/api/me').set(demo.auth).send({ isGuest: true }).expect(400);
  });

  it('permanently erases the account and every health record', async () => {
    await t.http().delete('/api/me').set(demo.auth).send({}).expect(400);
    await t.http().delete('/api/me').set(demo.auth).send({ confirm: 'DELETE' }).expect(204);

    expect(await t.prisma.user.count({ where: { id: demo.id } })).toBe(0);
    expect(await t.prisma.dailyLog.count({ where: { userId: demo.id } })).toBe(0);
    expect(await t.prisma.labResult.count({ where: { userId: demo.id } })).toBe(0);
    expect(await t.prisma.auditLog.count({ where: { userId: demo.id } })).toBe(0);
    await t.http().get('/api/me').set(demo.auth).expect(404);
  });
});
