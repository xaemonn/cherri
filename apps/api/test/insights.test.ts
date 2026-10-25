import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp, signUp, signUpDemoUser, type TestApp, type TestUser } from './helpers';

describe('dashboard, insights and screenings', () => {
  let t: TestApp;
  let demo: TestUser;

  beforeAll(async () => {
    t = await createTestApp();
    demo = await signUpDemoUser(t);
  });
  afterAll(() => t.close());

  it('builds the dashboard from the demo history', async () => {
    const res = await t.http().get('/api/dashboard').set(demo.auth).expect(200);
    expect(res.body.cycle).toMatchObject({ day: 20, phase: expect.any(String), guide: { vibe: expect.any(String) } });
    expect(res.body.cycle.nextPeriod.confidence).toBeGreaterThan(0);
    expect(res.body.cycle.confidenceNote).toMatch(/learned from 5 of your cycles/);
    expect(res.body.patternsReady).toBe(true);
    expect(res.body.redFlags.length).toBeGreaterThan(0);
    expect(res.body.streak).toBeGreaterThan(0);
    expect(res.body.suggestions.some((s: { type: string }) => s.type === 'SCREENING')).toBe(true);
  });

  it('exposes Pattern Radar, red flags and symptom summaries', async () => {
    const res = await t.http().get('/api/insights').set(demo.auth).expect(200);
    const features = res.body.patterns.patterns.map((p: { feature: string }) => p.feature);
    expect(features).toContain('headache');
    expect(res.body.redFlags.map((f: { code: string }) => f.code)).toEqual(expect.arrayContaining(['INFREQUENT_PERIODS', 'LOW_HAEMOGLOBIN']));
    expect(res.body.symptoms[0]).toMatchObject({ code: expect.any(String), days: expect.any(Number) });
    expect(res.body.stats.regularity).toBe('IRREGULAR');
  });

  it('returns cycle details and a Wrapped recap', async () => {
    const cycle = await t.http().get('/api/cycle').set(demo.auth).expect(200);
    expect(cycle.body.periods).toHaveLength(6);
    expect(cycle.body.prediction.upcoming).toHaveLength(3);

    const wrapped = await t.http().get('/api/wrapped?days=90').set(demo.auth).expect(200);
    expect(wrapped.body).toMatchObject({ labsDecoded: 1, toughPhase: 'MENSTRUAL', headline: expect.stringMatching(/days logged/) });
    await t.http().get('/api/wrapped?days=5').set(demo.auth).expect(400);
  });

  it('handles a brand-new user gracefully', async () => {
    const fresh = await signUp(t);
    const res = await t.http().get('/api/dashboard').set(fresh.auth).expect(200);
    expect(res.body).toMatchObject({ cycle: null, todayLog: null, streak: 0, patternsReady: false, redFlags: [] });
    expect(res.body.suggestions[0].type).toBe('LOG_TODAY');
  });

  it('prefills screenings from logged data and scores them with lab evidence', async () => {
    const detail = await t.http().get('/api/screenings/PCOS').set(demo.auth).expect(200);
    expect(detail.body.prefill.irregular).toMatchObject({ value: true, reason: expect.stringMatching(/average/) });
    expect(detail.body.questions.length).toBe(9);

    const incomplete = await t.http().post('/api/screenings/PCOS').set(demo.auth).send({ answers: { irregular: true } }).expect(400);
    expect(incomplete.body.error.code).toBe('INCOMPLETE_SCREENING');

    const answers = Object.fromEntries(detail.body.questions.map((q: { id: string }) => [q.id, q.id === 'irregular']));
    const result = await t.http().post('/api/screenings/PCOS').set(demo.auth).send({ answers }).expect(201);
    // Irregular cycles + high testosterone on her lab report = 2 Rotterdam criteria.
    expect(result.body.band).toBe('HIGH');
    expect(result.body.result.reasons.join(' ')).toMatch(/testosterone/i);

    const overview = await t.http().get('/api/screenings').set(demo.auth).expect(200);
    expect(overview.body.find((s: { type: string }) => s.type === 'PCOS').latest.band).toBe('HIGH');
    await t.http().get('/api/screenings/NOT_A_TYPE').set(demo.auth).expect(400);
  });

  it('loads demo data into an empty account only', async () => {
    const fresh = await signUp(t);
    const loaded = await t.http().post('/api/demo/load').set(fresh.auth).expect(201);
    expect(loaded.body.periods).toBe(6);
    expect((await t.http().post('/api/demo/load').set(fresh.auth).expect(409)).body.error.code).toBe('ACCOUNT_NOT_EMPTY');
  });
});
