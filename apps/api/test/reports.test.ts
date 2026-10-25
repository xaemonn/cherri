import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp, signUpDemoUser, type TestApp, type TestUser } from './helpers';

describe('doctor report and QR sharing', () => {
  let t: TestApp;
  let demo: TestUser;

  beforeAll(async () => {
    t = await createTestApp();
    demo = await signUpDemoUser(t);
  });
  afterAll(() => t.close());

  it('previews a clinician-ready report', async () => {
    const res = await t.http().get('/api/reports/preview?rangeDays=180&includeNotes=true').set(demo.auth).expect(200);
    const report = res.body;
    expect(report.patient).toMatchObject({ firstName: 'Ananya', age: 21 });
    expect(report.cycle).toMatchObject({ regularity: 'IRREGULAR', averageCycleLength: expect.any(Number) });
    expect(report.symptoms.find((s: { label: string }) => s.label === 'Cramps').clinicalTerm).toBe('Dysmenorrhoea');
    expect(report.labs.find((l: { name: string }) => l.name === 'Haemoglobin')).toMatchObject({ value: 10.2, flag: 'LOW' });
    expect(report.questionsToAsk.join(' ')).toMatch(/PCOS/);
    expect(report.questionsToAsk.join(' ')).toMatch(/haemoglobin was 10.2/);
    expect(report.notes[0].text).toMatch(/Meftal/);
    expect(report.disclaimer).toMatch(/not diagnoses/);
  });

  it('shares via an expiring link and QR code, and logs every view', async () => {
    const created = await t.http().post('/api/reports').set(demo.auth).send({ expiresInHours: 24 }).expect(201);
    expect(created.body.url).toMatch(/^http:\/\/localhost:3100\/share\/[A-Za-z0-9_-]+$/);
    expect(created.body.qrCode).toMatch(/^data:image\/png;base64,/);

    const stored = await t.prisma.shareLink.findUniqueOrThrow({ where: { id: created.body.id } });
    expect(stored.tokenHash).not.toBe(created.body.token);
    expect(stored.snapshot).toMatch(/^v1\./);

    const view = await t.http().get(`/api/share/${created.body.token}`).set('User-Agent', 'DoctorPhone/1.0').expect(200);
    expect(view.body.report.patient.firstName).toBe('Ananya');

    const accesses = await t.http().get(`/api/reports/${created.body.id}/accesses`).set(demo.auth).expect(200);
    expect(accesses.body).toEqual([expect.objectContaining({ userAgent: 'DoctorPhone/1.0' })]);
    const list = await t.http().get('/api/reports').set(demo.auth).expect(200);
    expect(list.body[0]).toMatchObject({ id: created.body.id, viewCount: 1, active: true });
  });

  it('enforces view limits and revocation', async () => {
    const once = await t.http().post('/api/reports').set(demo.auth).send({ expiresInHours: 1, maxViews: 1 }).expect(201);
    await t.http().get(`/api/share/${once.body.token}`).expect(200);
    expect((await t.http().get(`/api/share/${once.body.token}`).expect(410)).body.error.code).toBe('SHARE_EXPIRED');

    const revocable = await t.http().post('/api/reports').set(demo.auth).send({}).expect(201);
    await t.http().delete(`/api/reports/${revocable.body.id}`).set(demo.auth).expect(204);
    await t.http().get(`/api/share/${revocable.body.token}`).expect(410);
  });

  it('expires links and rejects unknown tokens', async () => {
    const link = await t.http().post('/api/reports').set(demo.auth).send({}).expect(201);
    await t.prisma.shareLink.update({ where: { id: link.body.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    await t.http().get(`/api/share/${link.body.token}`).expect(410);
    await t.http().get('/api/share/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa').expect(404);
    await t.http().get('/api/share/bad!token').expect(400);
  });
});
