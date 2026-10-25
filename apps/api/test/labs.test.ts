import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp, FAKE_PNG, makeTextPdf, signUp, type TestApp, type TestUser } from './helpers';

describe('lab decoder (offline)', () => {
  let t: TestApp;
  let user: TestUser;

  beforeAll(async () => {
    t = await createTestApp();
    user = await signUp(t);
  });
  afterAll(() => t.close());

  it('reads a digital PDF report with the offline parser', async () => {
    const pdf = makeTextPdf([
      'CITY DIAGNOSTICS PUNE      Reported on: 12/10/2026',
      'Patient: Ananya S   Age: 21Y   Sex: F',
      'Haemoglobin 10.2 g/dL 12.0 - 15.5',
      'Mean Corpuscular Hemoglobin (MCH) 24.1 pg 27 - 32',
      'Serum Ferritin 9.0 ng/mL 15 - 150',
      'TSH (Ultrasensitive) 2.1 uIU/mL 0.4 - 4.5',
      'Vitamin D (25-OH) 14.2 ng/mL 30 - 100',
    ]);
    const res = await t.http().post('/api/labs/upload').set(user.auth).attach('file', pdf, 'report.pdf').expect(201);
    expect(res.body).toMatchObject({ source: 'UPLOAD_PDF', extractor: 'offline-parser', takenAt: '2026-10-12' });
    const codes = res.body.results.map((r: { code: string }) => r.code).sort();
    expect(codes).toEqual(['FERRITIN', 'HB', 'TSH', 'VITD']);
    expect(res.body.highlights.map((r: { code: string }) => r.code).sort()).toEqual(['FERRITIN', 'HB', 'VITD']);
    expect(res.body.summary).toMatch(/3 of 4 results need attention/);
  });

  it('accepts manual entry with catalog ranges and plain-language explanations', async () => {
    const res = await t
      .http()
      .post('/api/labs/manual')
      .set(user.auth)
      .send({ takenAt: '2026-08-01', results: [{ code: 'HB', value: 11.1 }, { code: 'TSH', value: 6.2 }] })
      .expect(201);
    const byCode = Object.fromEntries(res.body.results.map((r: { code: string }) => [r.code, r]));
    expect(byCode.HB).toMatchObject({ flag: 'LOW', rangeSource: 'CATALOG', unit: 'g/dL' });
    expect(byCode.TSH.flag).toBe('HIGH');
    expect(byCode.TSH.explanation).toMatch(/underactive thyroid/);
  });

  it('builds trends across reports', async () => {
    const res = await t.http().get('/api/labs/trends').set(user.auth).expect(200);
    const hb = res.body.find((s: { code: string }) => s.code === 'HB');
    expect(hb.points.map((p: { value: number }) => p.value)).toEqual([11.1, 10.2]);
  });

  it('feeds the latest lab results into red flags', async () => {
    const insights = await t.http().get('/api/insights').set(user.auth).expect(200);
    const codes = insights.body.redFlags.map((f: { code: string }) => f.code);
    expect(codes).toEqual(expect.arrayContaining(['LOW_HAEMOGLOBIN', 'LOW_VITAMIN_D']));
    // The high TSH from August was superseded by a normal result in October.
    expect(codes).not.toContain('ABNORMAL_TSH');
  });

  it('rejects files that are not reports, and photos when no vision AI is configured', async () => {
    const fake = await t.http().post('/api/labs/upload').set(user.auth).attach('file', Buffer.from('MZ-not-a-pdf'), 'report.pdf').expect(415);
    expect(fake.body.error.code).toBe('UNSUPPORTED_FILE');
    const photo = await t.http().post('/api/labs/upload').set(user.auth).attach('file', FAKE_PNG, 'report.png').expect(503);
    expect(photo.body.error.code).toBe('LAB_AI_UNAVAILABLE');
    await t.http().post('/api/labs/upload').set(user.auth).expect(400);
  });

  it('deletes reports owned by the user only', async () => {
    const [report] = (await t.http().get('/api/labs').set(user.auth).expect(200)).body;
    const other = await signUp(t);
    await t.http().delete(`/api/labs/${report.id}`).set(other.auth).expect(404);
    await t.http().delete(`/api/labs/${report.id}`).set(user.auth).expect(204);
  });
});
