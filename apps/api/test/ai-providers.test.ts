import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp, FAKE_PNG, httpError, ScriptedProvider, signUp, today, type TestApp, type TestUser } from './helpers';

/** The real AI path, driven by scripted providers: tool calling, fallback and vision. */
describe('AI with providers', () => {
  let t: TestApp;
  let user: TestUser;
  const primary = new ScriptedProvider('primary');
  const backup = new ScriptedProvider('backup');

  beforeAll(async () => {
    t = await createTestApp({ providers: [primary, backup] });
    user = await signUp(t);
  });
  afterAll(() => t.close());

  it('lets Cherri call tools to log symptoms, then answer with a citation', async () => {
    primary.enqueue({
        toolCalls: [
          {
            id: 'call_1',
            name: 'log_symptoms',
            arguments: JSON.stringify({ symptoms: [{ code: 'headache', severity: 3 }, { code: 'not_real', severity: 2 }], painLevel: 6 }),
          },
        ],
      },
      { content: 'Logged your headache 💗 Headaches around your period can be hormonal [1].' },
    );

    const res = await t.http().post('/api/ai/chat?stream=false').set(user.auth).send({ message: 'Terrible headache today, pain 6/10' }).expect(201);
    expect(res.body).toMatchObject({ provider: 'primary', offline: false });
    expect(res.body.reply).toBe('Logged your headache 💗 Headaches around your period can be hormonal [1].');
    expect(res.body.actions).toEqual([{ kind: 'LOGGED', date: today(), summary: 'strong headache, pain 6/10' }]);
    expect(res.body.citations).toHaveLength(1);

    // The tool result was fed back to the model before it answered.
    const followUp = primary.calls.at(-1)!;
    expect(followUp.messages.some((m) => m.role === 'tool')).toBe(true);
    expect(followUp.messages[0]!.content).toMatch(/You are Cherri/);

    const log = await t.http().get(`/api/logs/${today()}`).set(user.auth).expect(200);
    expect(log.body.log.symptoms).toEqual([{ code: 'headache', severity: 3, bodyRegion: null }]);
  });

  it('drops values the model invented in a tool call', async () => {
    primary.enqueue(
      {
        toolCalls: [
          {
            id: 'call_2',
            name: 'log_symptoms',
            arguments: JSON.stringify({ dayOffset: -1, symptoms: [{ code: 'bloating', severity: 2 }], painLevel: 2, mood: 5, flow: 'NONE' }),
          },
        ],
      },
      { content: 'Logged your bloating for yesterday.' },
    );
    const res = await t.http().post('/api/ai/chat?stream=false').set(user.auth).send({ message: 'kal bahut bloating thi' }).expect(201);
    expect(res.body.actions[0]).toMatchObject({ kind: 'LOGGED', summary: 'bloating' });
    const yesterday = new Date(Date.parse(`${today()}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
    const log = await t.http().get(`/api/logs/${yesterday}`).set(user.auth).expect(200);
    expect(log.body.log).toMatchObject({ painLevel: null, mood: null, flow: null });
  });

  it('never sends phone numbers or emails to the AI provider', async () => {
    primary.enqueue({ content: 'Noted!' });
    await t.http().post('/api/ai/chat?stream=false').set(user.auth).send({ message: 'Call me on 9876543210 or mail me at me@x.com' }).expect(201);
    const sent = JSON.stringify(primary.calls.at(-1)!.messages);
    expect(sent).not.toContain('9876543210');
    expect(sent).not.toContain('me@x.com');
  });

  it('falls back to the next provider on a rate limit and benches the failing one', async () => {
    primary.enqueue(httpError(429, 'rate limited'));
    backup.enqueue({ content: 'Hi from the backup provider' }, { content: 'Still backup' });

    const first = await t.http().post('/api/ai/chat?stream=false').set(user.auth).send({ message: 'hello' }).expect(201);
    expect(first.body).toMatchObject({ provider: 'backup', reply: 'Hi from the backup provider' });

    const callsBefore = primary.calls.length;
    const second = await t.http().post('/api/ai/chat?stream=false').set(user.auth).send({ message: 'hello again' }).expect(201);
    expect(second.body.provider).toBe('backup');
    expect(primary.calls.length).toBe(callsBefore); // benched: not even tried
  });

  it('decodes a lab report photo with the vision model', async () => {
    backup.enqueue({
      content: JSON.stringify({
        labName: 'Metro Labs',
        reportDate: '2026-09-15',
        results: [
          { name: 'Haemoglobin', value: '9.8', unit: 'g/dL', refLow: 12, refHigh: 15.5 },
          { name: 'TSH', value: 2.2, unit: 'µIU/mL', refLow: 0.4, refHigh: 4.5 },
          { name: 'Patient name', value: 'Ananya' },
        ],
      }),
    });
    const res = await t.http().post('/api/labs/upload').set(user.auth).attach('file', FAKE_PNG, 'report.png').expect(201);
    expect(res.body).toMatchObject({ labName: 'Metro Labs', takenAt: '2026-09-15', source: 'UPLOAD_IMAGE', extractor: 'backup' });
    expect(res.body.results).toHaveLength(2);
    expect(res.body.highlights).toEqual([expect.objectContaining({ code: 'HB', flag: 'LOW', value: 9.8 })]);
  });

  it('uses the AI to parse a log, with structured output validation', async () => {
    backup.enqueue({ content: '```json\n{"dayOffset": 0, "flow": "HEAVY", "periodStarted": true, "symptoms": [{"code": "cramps", "severity": 3}], "painLevel": 8, "mood": null, "energy": 2, "sleepHours": null}\n```' });
    const res = await t.http().post('/api/ai/parse-log').set(user.auth).send({ text: 'periods aa gaye, dard 8/10, energy bilkul low', commit: true }).expect(200);
    expect(res.body).toMatchObject({ parser: 'backup', summary: 'period started, strong cramps, pain 8/10, energy 2/5' });
    expect(res.body.log).toMatchObject({ flow: 'HEAVY', painLevel: 8 });
  });
});
