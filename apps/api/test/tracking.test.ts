import { addDays } from '@cherri/shared';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp, signUp, today, type TestApp, type TestUser } from './helpers';

describe('onboarding, logs and periods', () => {
  let t: TestApp;
  let user: TestUser;
  const d = (offset: number) => addDays(today(), offset);

  beforeAll(async () => {
    t = await createTestApp();
    user = await signUp(t);
  });
  afterAll(() => t.close());

  it('requires explicit consent to onboard, then records the last period', async () => {
    const noConsent = await t.http().post('/api/me/onboarding').set(user.auth).send({ lifeStage: 'CYCLE', language: 'en' }).expect(400);
    expect(noConsent.body.error.code).toBe('VALIDATION_FAILED');

    const res = await t
      .http()
      .post('/api/me/onboarding')
      .set(user.auth)
      .send({ lifeStage: 'CYCLE', language: 'hinglish', avgCycleLength: 30, lastPeriodStart: d(-40), consent: true })
      .expect(200);
    expect(res.body).toMatchObject({ onboarded: true, language: 'hinglish', avgCycleLength: 30 });

    const periods = await t.http().get('/api/periods').set(user.auth).expect(200);
    expect(periods.body).toEqual([{ id: expect.any(String), startDate: d(-40), endDate: d(-36) }]);
  });

  it('starts, extends and ends periods automatically from logged flow', async () => {
    await t.http().put(`/api/logs/${d(-10)}`).set(user.auth).send({ flow: 'MEDIUM', painLevel: 6, symptoms: [{ code: 'cramps', severity: 3 }] }).expect(200);
    await t.http().put(`/api/logs/${d(-9)}`).set(user.auth).send({ flow: 'HEAVY' }).expect(200);
    await t.http().put(`/api/logs/${d(-8)}`).set(user.auth).send({ flow: 'LIGHT' }).expect(200);
    await t.http().put(`/api/logs/${d(-7)}`).set(user.auth).send({ flow: 'NONE' }).expect(200);

    const periods = await t.http().get('/api/periods').set(user.auth).expect(200);
    expect(periods.body[0]).toMatchObject({ startDate: d(-10), endDate: d(-8) });
    expect(periods.body).toHaveLength(2);
  });

  it('treats bleeding shortly after a period as spotting, not a new period', async () => {
    await t.http().put(`/api/logs/${d(-3)}`).set(user.auth).send({ flow: 'LIGHT' }).expect(200);
    const periods = await t.http().get('/api/periods').set(user.auth).expect(200);
    expect(periods.body).toHaveLength(2);
  });

  it('merges partial updates and encrypts notes at rest', async () => {
    await t.http().put(`/api/logs/${d(0)}`).set(user.auth).send({ mood: 2, notes: 'Felt dizzy in class' }).expect(200);
    const res = await t.http().put(`/api/logs/${d(0)}`).set(user.auth).send({ energy: 1 }).expect(200);
    expect(res.body).toMatchObject({ date: d(0), mood: 2, energy: 1, notes: 'Felt dizzy in class' });

    const row = await t.prisma.dailyLog.findFirstOrThrow({ where: { userId: user.id, date: new Date(`${d(0)}T00:00:00Z`) } });
    expect(row.notes).toMatch(/^v1\./);
    expect(row.notes).not.toContain('dizzy');
  });

  it('rejects future dates and unknown symptoms', async () => {
    expect((await t.http().put(`/api/logs/${d(2)}`).set(user.auth).send({ mood: 3 }).expect(400)).body.error.code).toBe('FUTURE_DATE');
    await t.http().put(`/api/logs/${d(0)}`).set(user.auth).send({ symptoms: [{ code: 'made_up' }] }).expect(400);
    await t.http().put('/api/logs/2026-13-45').set(user.auth).send({ mood: 3 }).expect(400);
  });

  it('lists logs by date range', async () => {
    const res = await t.http().get(`/api/logs?from=${d(-10)}&to=${d(-8)}`).set(user.auth).expect(200);
    expect(res.body.map((l: { date: string }) => l.date)).toEqual([d(-8), d(-9), d(-10)]);
    expect(res.body[2].symptoms).toEqual([{ code: 'cramps', severity: 3, bodyRegion: null }]);
  });

  it('keeps every user’s data private', async () => {
    const other = await signUp(t);
    expect((await t.http().get(`/api/logs/${d(0)}`).set(other.auth).expect(200)).body).toEqual({ log: null });

    const mine = await t.http().get('/api/periods').set(user.auth).expect(200);
    await t.http().delete(`/api/periods/${mine.body[0].id}`).set(other.auth).expect(404);
    await t.http().patch(`/api/periods/${mine.body[0].id}`).set(other.auth).send({ endDate: d(-5) }).expect(404);
  });

  it('serves the symptom catalog publicly', async () => {
    const res = await t.http().get('/api/symptoms').expect(200);
    expect(res.body.find((s: { code: string }) => s.code === 'cramps')).toMatchObject({ label: 'Cramps', clinicalTerm: 'Dysmenorrhoea' });
    expect(res.body[0]).not.toHaveProperty('keywords');
  });
});
