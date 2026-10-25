import { addDays } from '@cherri/shared';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp, FAKE_PNG, signUp, today, type TestApp, type TestUser } from './helpers';

const d = (offset: number) => addDays(today(), offset);

describe('pregnancy care', () => {
  let t: TestApp;
  let user: TestUser;

  beforeAll(async () => {
    t = await createTestApp();
    user = await signUp(t);
  });
  afterAll(() => t.close());

  it('tracks weeks from the due date and validates it', async () => {
    const bad = await t.http().post('/api/me/onboarding').set(user.auth).send({ lifeStage: 'PREGNANCY', language: 'kn', dueDate: d(400), consent: true }).expect(400);
    expect(bad.body.error.code).toBe('INVALID_DUE_DATE');

    const res = await t.http().post('/api/me/onboarding').set(user.auth).send({ lifeStage: 'PREGNANCY', language: 'kn', dueDate: d(70), consent: true }).expect(200);
    expect(res.body).toMatchObject({ lifeStage: 'PREGNANCY', language: 'kn', dueDate: d(70) });

    const dashboard = await t.http().get('/api/dashboard').set(user.auth).expect(200);
    expect(dashboard.body.motherhood).toMatchObject({ stage: 'PREGNANCY', age: { weeks: 30, days: 0, trimester: 3 }, baby: { name: expect.any(String) } });
    expect(dashboard.body.motherhood.steps.find((s: { id: string }) => s.id === 'kicks').status).toBe('NOW');
    expect(dashboard.body.suggestions.map((s: { type: string }) => s.type)).toContain('LOG_BP');
  });

  it('logs blood pressure and flags pre-eclampsia warning signs', async () => {
    await t.http().put(`/api/logs/${d(-1)}`).set(user.auth).send({ systolic: 90, diastolic: 120 }).expect(400);
    const saved = await t.http().put(`/api/logs/${d(-1)}`).set(user.auth).send({ systolic: 146, diastolic: 94, weightKg: 63.5, symptoms: [{ code: 'headache', severity: 2 }] }).expect(200);
    expect(saved.body).toMatchObject({ systolic: 146, diastolic: 94, weightKg: 63.5 });

    const dashboard = await t.http().get('/api/dashboard').set(user.auth).expect(200);
    expect(dashboard.body.redFlags[0]).toMatchObject({ code: 'PREECLAMPSIA_WARNING_SIGNS', severity: 'URGENT' });
    expect(dashboard.body.suggestions[0].type).toBe('DANGER_CHECK');

    const care = await t.http().get('/api/motherhood').set(user.auth).expect(200);
    expect(care.body.bloodPressure).toEqual([{ date: d(-1), systolic: 146, diastolic: 94, map: 111 }]);
    expect(care.body.schemes.map((s: { short: string }) => s.short)).toEqual(expect.arrayContaining(['JSSK', 'PMSMA', 'PMMVY']));
  });

  it('reads blood pressure out of a Kannada voice-style note', async () => {
    const res = await t.http().post('/api/ai/parse-log').set(user.auth).send({ text: 'ಇವತ್ತು ತುಂಬಾ ತಲೆನೋವು, BP 150/96', commit: true }).expect(200);
    expect(res.body.parser).toBe('offline');
    expect(res.body.draft).toMatchObject({ systolic: 150, diastolic: 96 });
    expect(res.body.draft.symptoms).toEqual([{ code: 'headache', severity: 3 }]);
    expect(res.body.log).toMatchObject({ systolic: 150, diastolic: 96 });
  });

  it('accepts Kannada voice notes', async () => {
    // No AI provider in tests: the language is accepted, then voice reports itself unavailable.
    const res = await t.http().post('/api/ai/transcribe?language=kn').set(user.auth).attach('audio', FAKE_PNG, { filename: 'note.webm', contentType: 'audio/webm' });
    expect(res.status).toBe(503);
  });
});

describe('visit prep and the doctor brief', () => {
  let t: TestApp;
  let user: TestUser;

  beforeAll(async () => {
    t = await createTestApp();
    user = await signUp(t);
    await t.http().post('/api/me/onboarding').set(user.auth).send({ lifeStage: 'CYCLE', language: 'en', lastPeriodStart: d(-20), consent: true }).expect(200);
  });
  afterAll(() => t.close());

  it('keeps medicines encrypted at rest', async () => {
    const created = await t.http().post('/api/medications').set(user.auth).send({ name: 'Metformin', dose: '500 mg', schedule: 'Twice a day', reason: 'PCOS' }).expect(201);
    expect(created.body).toMatchObject({ name: 'Metformin', dose: '500 mg', active: true });
    const row = await t.prisma.medication.findUniqueOrThrow({ where: { id: created.body.id } });
    expect(row.name).toMatch(/^v1\./);
    expect(row.reason).not.toContain('PCOS');

    await t.http().patch(`/api/medications/${created.body.id}`).set(user.auth).send({ active: false }).expect(200);
    expect((await t.http().get('/api/medications').set(user.auth).expect(200)).body[0].active).toBe(false);
    const other = await signUp(t);
    await t.http().delete(`/api/medications/${created.body.id}`).set(other.auth).expect(404);
  });

  it('structures a story offline, keeps it private and adds it to the report', async () => {
    const text = 'My periods have been painful since I was 14. The cramps are 9/10 and I miss work every month. A hot water bag helps. I want to know if this is endometriosis.';
    const structured = await t.http().post('/api/story/structure').set(user.auth).send({ text }).expect(200);
    expect(structured.body).toMatchObject({ parser: 'offline', safety: null, structured: { since: 'since I was 14', severity: '9/10' } });

    await t.http().put('/api/story').set(user.auth).send({ text, structured: { ...structured.body.structured, location: 'lower belly' } }).expect(200);
    const row = await t.prisma.symptomStory.findUniqueOrThrow({ where: { userId: user.id } });
    expect(row.text).not.toContain('cramps');

    await t.http().put('/api/me/background').set(user.auth).send({ menarcheAge: 12, familyHistory: ['ENDOMETRIOSIS'], allergies: 'Sulfa drugs' }).expect(200);
    expect((await t.prisma.user.findUniqueOrThrow({ where: { id: user.id } })).allergies).toMatch(/^v1\./);

    const report = (await t.http().get('/api/reports/preview').set(user.auth).expect(200)).body;
    expect(report.story).toMatchObject({ inHerWords: text, location: 'lower belly' });
    expect(report.background).toEqual({ menarcheAge: 12, familyHistory: ['Endometriosis'], allergies: 'Sulfa drugs', surgeries: null });
    expect(report.questionsToAsk[0]).toBe('I want to know if this is endometriosis.');
    expect(report.notYetOnRecord).toContain('Current medicines not listed');
    expect(report.summary).toMatch(/days logged/);
  });

  it('shows helplines when a story mentions self-harm', async () => {
    const res = await t.http().post('/api/story/structure').set(user.auth).send({ text: 'The pain is so bad that sometimes I want to die.' }).expect(200);
    expect(res.body.safety).toMatchObject({ category: 'SELF_HARM', helplines: expect.arrayContaining([expect.objectContaining({ number: '14416' })]) });
  });

  it('notices when mood dropped after starting a medicine', async () => {
    const started = d(-30);
    for (let i = -58; i <= -31; i += 2) await t.http().put(`/api/logs/${d(i)}`).set(user.auth).send({ mood: 4 }).expect(200);
    for (let i = -30; i <= 0; i += 2) await t.http().put(`/api/logs/${d(i)}`).set(user.auth).send({ mood: 2 }).expect(200);
    await t.http().post('/api/medications').set(user.auth).send({ name: 'Ovral-L', reason: 'Contraception', startedOn: started }).expect(201);

    const insights = await t.http().get('/api/insights').set(user.auth).expect(200);
    expect(insights.body.moodShifts).toEqual([expect.objectContaining({ medication: 'Ovral-L', before: 4, after: 2, startedOn: started })]);
    const report = (await t.http().get('/api/reports/preview').set(user.auth).expect(200)).body;
    expect(report.medications.find((m: { name: string }) => m.name === 'Ovral-L').moodChange).toEqual({ before: 4, after: 2 });
  });
});

describe('mood check-ins', () => {
  let t: TestApp;
  let user: TestUser;

  beforeAll(async () => {
    t = await createTestApp();
    user = await signUp(t);
  });
  afterAll(() => t.close());

  it('scores PHQ-9 on the server, flags item 9 and encrypts the answers', async () => {
    const answers = { interest: 2, down: 2, sleep: 2, tired: 3, appetite: 1, failure: 2, concentration: 1, movement: 0, self_harm: 1 };
    expect((await t.http().post('/api/mind-checks/PHQ9').set(user.auth).send({ answers: { interest: 2 } }).expect(400)).body.error.code).toBe('INCOMPLETE_CHECK');
    await t.http().post('/api/mind-checks/EPDS').set(user.auth).send({ answers }).expect(400);

    const res = await t.http().post('/api/mind-checks/PHQ9').set(user.auth).send({ answers }).expect(201);
    expect(res.body).toMatchObject({ type: 'PHQ9', score: 14, band: 'MODERATE', selfHarm: true, helplines: expect.arrayContaining([expect.objectContaining({ number: '14416' })]) });
    const row = await t.prisma.mindCheck.findFirstOrThrow({ where: { userId: user.id } });
    expect(row.answers).toMatch(/^v1\./);

    const list = await t.http().get('/api/mind-checks').set(user.auth).expect(200);
    expect(list.body.latest).toMatchObject({ PHQ9: { score: 14 }, GAD7: null });

    const report = (await t.http().get('/api/reports/preview').set(user.auth).expect(200)).body;
    expect(report.mindChecks).toEqual([expect.objectContaining({ type: 'PHQ9', score: 14, label: 'Moderate', selfHarm: true })]);
    expect(report.questionsToAsk.join(' ')).toMatch(/PHQ-9 score was 14/);
    const fhir = (await t.http().get('/api/reports/fhir').set(user.auth).expect(200)).body;
    expect(JSON.stringify(fhir)).toContain('44261-6');
  });
});

describe('demo pregnancy, FHIR export and safety contacts', () => {
  let t: TestApp;
  let user: TestUser;

  beforeAll(async () => {
    t = await createTestApp();
    user = await signUp(t);
  });
  afterAll(() => t.close());

  it('loads Meera and catches her pre-eclampsia warning signs', async () => {
    await t.http().post('/api/demo/load').set(user.auth).send({ persona: 'meera' }).expect(201);
    const dashboard = await t.http().get('/api/dashboard').set(user.auth).expect(200);
    expect(dashboard.body.motherhood).toMatchObject({ stage: 'PREGNANCY', age: { weeks: 30, days: 2 } });
    expect(dashboard.body.redFlags[0].code).toBe('PREECLAMPSIA_WARNING_SIGNS');

    const report = (await t.http().get('/api/reports/preview').set(user.auth).expect(200)).body;
    expect(report.pregnancy).toMatchObject({ stage: 'PREGNANCY', weeks: 30 });
    expect(report.vitals.bloodPressure.at(-1)).toEqual({ date: today(), systolic: 140, diastolic: 90 });
    expect(report.medications.map((m: { name: string }) => m.name).sort()).toEqual(['Calcium', 'Iron-folic acid (IFA)']);
    expect(report.background.allergies).toBe('Penicillin (skin rash)');
    expect(report.summary).toMatch(/30\+2 weeks pregnant/);
    expect(report.redFlags.map((f: { title: string }) => f.title)).toContain('Anaemia in pregnancy');
  });

  it('exports the report as a FHIR R4 bundle', async () => {
    const res = await t.http().get('/api/reports/fhir').set(user.auth).expect(200);
    expect(res.body).toMatchObject({ resourceType: 'Bundle', type: 'collection' });
    const codes = res.body.entry.flatMap((e: { resource: { code?: { coding?: Array<{ code: string }> } } }) => e.resource.code?.coding?.map((c) => c.code) ?? []);
    expect(codes).toEqual(expect.arrayContaining(['85354-9', '718-7', '11778-8', '49051-6']));
    expect(res.body.entry.some((e: { resource: { resourceType: string } }) => e.resource.resourceType === 'AllergyIntolerance')).toBe(true);
  });

  it('stores trusted contacts encrypted and only for their owner', async () => {
    const created = await t.http().post('/api/contacts').set(user.auth).send({ name: 'Amma', phone: '+91 98450 12345', relation: 'Mother' }).expect(201);
    expect(created.body).toMatchObject({ name: 'Amma', phone: '+919845012345', relation: 'Mother' });
    const row = await t.prisma.trustedContact.findUniqueOrThrow({ where: { id: created.body.id } });
    expect(row.phone).not.toContain('98450');
    await t.http().post('/api/contacts').set(user.auth).send({ name: 'X', phone: 'call me' }).expect(400);

    const other = await signUp(t);
    expect((await t.http().get('/api/contacts').set(other.auth).expect(200)).body).toEqual([]);
    await t.http().delete(`/api/contacts/${created.body.id}`).set(other.auth).expect(404);

    const exported = await t.http().get('/api/me/export').set(user.auth).expect(200);
    expect(exported.body.trustedContacts).toEqual([{ name: 'Amma', phone: '+919845012345', relation: 'Mother' }]);
    expect(exported.body.medications).toHaveLength(2);
    expect(exported.body.story.text).toMatch(/headache/);
    await t.http().delete(`/api/contacts/${created.body.id}`).set(user.auth).expect(204);
  });
});
