import { addDays } from '@cherri/shared';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DEMO_DOCTOR_EMAIL, DEMO_DOCTOR_PASSWORD, ensureDemoDoctor } from '../src/consult/demo-doctor';
import { createTestApp, signUp, signUpDemoUser, today, type TestApp, type TestUser } from './helpers';

const consent = { consent: true, safetyConfirmed: true };

async function loginDoctor(t: TestApp) {
  await ensureDemoDoctor(t.prisma);
  const res = await t.http().post('/api/auth/login').send({ email: DEMO_DOCTOR_EMAIL, password: DEMO_DOCTOR_PASSWORD }).expect(200);
  expect(res.body.user.role).toBe('DOCTOR');
  return { Authorization: `Bearer ${res.body.tokens.accessToken}` };
}

describe('async doctor consultations', () => {
  let t: TestApp;
  let patient: TestUser;
  let doctor: { Authorization: string };
  let consultId: string;

  beforeAll(async () => {
    t = await createTestApp();
    patient = await signUpDemoUser(t);
    doctor = await loginDoctor(t);
  });
  afterAll(() => t.close());

  it('previews the 90-day clinical snapshot before she shares anything', async () => {
    const res = await t.http().get('/api/consultations/preview').set(patient.auth).expect(200);
    expect(res.body.cycle.periodsLogged).toBeGreaterThan(0);
    expect(res.body.labs[0]).toMatchObject({ flag: expect.stringMatching(/LOW|HIGH/) });
    expect(res.body.bloodLoss).toMatchObject({ heavy: true });
    expect(await t.prisma.consultation.count()).toBe(0);
  });

  it('requires consent and the safety confirmation', async () => {
    const res = await t.http().post('/api/consultations').set(patient.auth).send({ category: 'LAB_REVIEW', message: 'Is my ferritin low?', consent: true }).expect(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
  });

  it('refuses to queue an emergency as a routine question', async () => {
    const res = await t
      .http()
      .post('/api/consultations')
      .set(patient.auth)
      .send({ category: 'GENERAL_SYMPTOMS', message: 'I am soaking 2 pads an hour and feel dizzy', ...consent })
      .expect(422);
    expect(res.body.error).toMatchObject({ code: 'EMERGENCY_SYMPTOMS', details: { emergency: { title: 'CRITICAL SYMPTOMS DETECTED' } } });
  });

  it('opens a consult with an encrypted snapshot and clinical tags', async () => {
    const res = await t
      .http()
      .post('/api/consultations')
      .set(patient.auth)
      .send({ category: 'LAB_REVIEW', message: 'My ferritin is 9, should I take iron?', ...consent })
      .expect(201);
    consultId = res.body.id;
    expect(res.body).toMatchObject({ status: 'AWAITING_REVIEW', frozen: false, messages: [{ sender: 'PATIENT', body: 'My ferritin is 9, should I take iron?' }] });
    expect(res.body.tags).toEqual(expect.arrayContaining([expect.stringMatching(/PBAC|anaemia/i)]));
    const row = await t.prisma.consultation.findUniqueOrThrow({ where: { id: consultId } });
    expect(row.snapshot).not.toContain('erritin');
  });

  it('keeps the doctor portal for verified doctors', async () => {
    await t.http().get('/api/doctor/consultations').set(patient.auth).expect(403);
    const other = await signUp(t);
    await t.http().get(`/api/consultations/${consultId}`).set(other.auth).expect(404);
  });

  it('lets the doctor triage, reply with tests, recommend a visit and resolve', async () => {
    const inbox = await t.http().get('/api/doctor/consultations?status=AWAITING_REVIEW').set(doctor).expect(200);
    expect(inbox.body[0]).toMatchObject({ id: consultId, category: 'LAB_REVIEW', patient: { firstName: 'Ananya' } });

    const reply = await t.http().post(`/api/doctor/consultations/${consultId}/messages`).set(doctor).send({ body: 'Yes, start iron.', tests: ['CBC', 'Ferritin'] }).expect(201);
    expect(reply.body).toMatchObject({ sender: 'DOCTOR', kind: 'TESTS', tests: ['CBC', 'Ferritin'] });

    const visit = await t.http().post(`/api/doctor/consultations/${consultId}/in-person`).set(doctor).expect(200);
    expect(visit.body).toMatchObject({ status: 'IN_CONSULTATION', doctor: { name: expect.stringContaining('Dr.'), verified: true } });
    expect(visit.body.inPersonAdvisedAt).toBeTruthy();

    const mine = await t.http().get(`/api/consultations/${consultId}`).set(patient.auth).expect(200);
    expect(mine.body.messages.map((m: { kind: string }) => m.kind)).toEqual(['TEXT', 'TESTS', 'IN_PERSON']);

    const resolved = await t.http().post(`/api/doctor/consultations/${consultId}/resolve`).set(doctor).expect(200);
    expect(resolved.body.status).toBe('RESOLVED');
    const closed = await t.http().post(`/api/consultations/${consultId}/messages`).set(patient.auth).send({ body: 'Thanks!' }).expect(409);
    expect(closed.body.error.code).toBe('CONSULT_RESOLVED');
  });

  it('freezes the chat when emergency symptoms appear mid-conversation', async () => {
    const open = await t
      .http()
      .post('/api/consultations')
      .set(patient.auth)
      .send({ category: 'PERIOD_IRREGULARITY', message: 'My period is 10 days late', ...consent })
      .expect(201);
    const id = open.body.id;
    const res = await t.http().post(`/api/consultations/${id}/messages`).set(patient.auth).send({ body: 'now I have sharp one-sided pain and nearly fainted' }).expect(422);
    expect(res.body.error.code).toBe('EMERGENCY_SYMPTOMS');

    const paused = await t.http().post(`/api/consultations/${id}/messages`).set(patient.auth).send({ body: 'hello?' }).expect(423);
    expect(paused.body.error.code).toBe('CHAT_PAUSED');

    const inbox = await t.http().get('/api/doctor/consultations').set(doctor).expect(200);
    expect(inbox.body[0]).toMatchObject({ id, emergencyAt: expect.any(String) });

    const resumed = await t.http().post(`/api/consultations/${id}/emergency-ack`).set(patient.auth).expect(200);
    expect(resumed.body.frozen).toBe(false);
    expect(resumed.body.messages.map((m: { kind: string }) => m.kind)).toEqual(['TEXT', 'EMERGENCY', 'TEXT']);
    await t.http().post(`/api/consultations/${id}/messages`).set(patient.auth).send({ body: 'I went to the ER, they said it was a cyst' }).expect(201);
  });
});

describe('privacy PIN, reminders and PBAC', () => {
  let t: TestApp;
  let user: TestUser;

  beforeAll(async () => {
    t = await createTestApp();
    user = await signUp(t, { password: 'supersecret1' });
  });
  afterAll(() => t.close());

  it('unlocks with the password until a PIN is set, then only with the PIN', async () => {
    await t.http().post('/api/me/unlock').set(user.auth).send({ password: 'supersecret1' }).expect(200);
    await t.http().put('/api/me/pin').set(user.auth).send({ pin: '12a4' }).expect(400);
    const set = await t.http().put('/api/me/pin').set(user.auth).send({ pin: '2580' }).expect(200);
    expect(set.body.hasPin).toBe(true);
    expect((await t.prisma.user.findUniqueOrThrow({ where: { id: user.id } })).pinHash).not.toContain('2580');

    const wrong = await t.http().post('/api/me/unlock').set(user.auth).send({ pin: '1111' }).expect(403);
    expect(wrong.body.error.code).toBe('UNLOCK_FAILED');
    await t.http().post('/api/me/unlock').set(user.auth).send({ pin: '2580' }).expect(200);

    const removed = await t.http().delete('/api/me/pin').set(user.auth).expect(200);
    expect(removed.body.hasPin).toBe(false);
  });

  it('schedules one pregnancy-test reminder 21 days out', async () => {
    const due = addDays(today(), 21);
    await t.http().post('/api/reminders').set(user.auth).send({ kind: 'PREGNANCY_TEST', dueOn: addDays(today(), 200) }).expect(400);
    await t.http().post('/api/reminders').set(user.auth).send({ kind: 'PREGNANCY_TEST', dueOn: addDays(today(), 10) }).expect(201);
    const res = await t.http().post('/api/reminders').set(user.auth).send({ kind: 'PREGNANCY_TEST', dueOn: due }).expect(201);
    expect(res.body).toMatchObject({ kind: 'PREGNANCY_TEST', dueOn: due, due: false, title: expect.stringContaining('pregnancy test') });

    const list = await t.http().get('/api/reminders').set(user.auth).expect(200);
    expect(list.body).toHaveLength(1);
    await t.http().delete(`/api/reminders/${res.body.id}`).set(user.auth).expect(204);
    expect((await t.http().get('/api/reminders').set(user.auth).expect(200)).body).toEqual([]);
  });

  it('measures blood loss with PBAC and puts it at the top of the report', async () => {
    const start = addDays(today(), -3);
    await t.http().post('/api/periods').set(user.auth).send({ startDate: start }).expect(201);
    for (let i = 0; i < 3; i += 1) {
      const saved = await t
        .http()
        .put(`/api/logs/${addDays(start, i)}`)
        .set(user.auth)
        .send({ flow: 'HEAVY', pbac: { padsSoaked: 2, clotsLarge: 1, flooding: i === 0 ? 1 : 0 } })
        .expect(200);
      expect(saved.body.pbac).toMatchObject({ padsSoaked: 2 });
    }
    const dashboard = await t.http().get('/api/dashboard').set(user.auth).expect(200);
    expect(dashboard.body.redFlags.map((f: { code: string }) => f.code)).toContain('PBAC_HEAVY');

    const report = await t.http().get('/api/reports/preview?rangeDays=90').set(user.auth).expect(200);
    // 3 days × (2 soaked pads × 20 + 1 large clot × 5) + 1 flooding × 5
    expect(report.body.bloodLoss).toMatchObject({ score: 140, heavy: true, clotsLarge: 3, flooding: 1 });

    const cleared = await t.http().put(`/api/logs/${addDays(start, 2)}`).set(user.auth).send({ pbac: {} }).expect(200);
    expect(cleared.body.pbac).toBeNull();
  });
});
