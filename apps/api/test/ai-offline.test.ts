import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp, parseSse, signUp, today, type TestApp, type TestUser } from './helpers';

/** With no AI keys configured, every AI feature must still work through its offline fallback. */
describe('AI features in offline mode', () => {
  let t: TestApp;
  let user: TestUser;

  beforeAll(async () => {
    t = await createTestApp();
    user = await signUp(t);
  });
  afterAll(() => t.close());

  it('reports offline AI in the health check', async () => {
    const res = await t.http().get('/api/health').expect(200);
    expect(res.body.ai).toEqual({ providers: [], chat: false, vision: false, offlineFallback: true });
  });

  it('logs Hinglish symptoms from chat', async () => {
    const res = await t.http().post('/api/ai/chat?stream=false').set(user.auth).send({ message: 'Cramps 7/10 since morning, bahut thakaan' }).expect(201);
    expect(res.body).toMatchObject({ provider: 'offline', offline: true });
    expect(res.body.actions).toEqual([{ kind: 'LOGGED', date: today(), summary: expect.stringContaining('pain 7/10') }]);

    const log = await t.http().get(`/api/logs/${today()}`).set(user.auth).expect(200);
    expect(log.body.log).toMatchObject({ painLevel: 7, source: 'CHAT' });
    expect(log.body.log.symptoms.map((s: { code: string }) => s.code).sort()).toEqual(['cramps', 'fatigue']);
  });

  it('answers questions from the health library with citations, over SSE', async () => {
    const res = await t.http().post('/api/ai/chat').set(user.auth).send({ message: 'What is PCOS?' }).expect(200);
    expect(res.headers['content-type']).toMatch(/text\/event-stream/);
    const events = parseSse(res.text);
    expect(events.map((e) => e.type)).toEqual(['session', 'token', 'citations', 'done']);
    expect(events.find((e) => e.type === 'citations')).toMatchObject({ citations: [{ articleId: 'pcos', source: 'WHO' }] });
  });

  it('does not mistake a question for a log', async () => {
    const res = await t.http().post('/api/ai/chat?stream=false').set(user.auth).send({ message: 'Why do I get cramps?' }).expect(201);
    expect(res.body.actions).toEqual([]);
  });

  it('shows crisis help immediately, before any AI is involved', async () => {
    const res = await t.http().post('/api/ai/chat?stream=false').set(user.auth).send({ message: 'I feel like I want to die' }).expect(201);
    expect(res.body.safety).toMatchObject({ category: 'SELF_HARM', helplines: expect.arrayContaining([expect.objectContaining({ number: '14416' })]) });
    expect(res.body.reply).toMatch(/14416/);
  });

  it('keeps chat history encrypted and scoped to the owner', async () => {
    const sessions = await t.http().get('/api/ai/sessions').set(user.auth).expect(200);
    expect(sessions.body.length).toBeGreaterThanOrEqual(4);
    const messages = await t.http().get(`/api/ai/sessions/${sessions.body[0].id}`).set(user.auth).expect(200);
    expect(messages.body[0]).toMatchObject({ role: 'USER', content: expect.any(String) });

    const stored = await t.prisma.chatMessage.findFirstOrThrow({ where: { session: { userId: user.id } } });
    expect(stored.content).toMatch(/^v1\./);

    const other = await signUp(t);
    await t.http().get(`/api/ai/sessions/${sessions.body[0].id}`).set(other.auth).expect(404);
    await t.http().post('/api/ai/chat?stream=false').set(other.auth).send({ message: 'hi', sessionId: sessions.body[0].id }).expect(404);
  });

  it('parses a log without saving it unless asked', async () => {
    const draft = await t.http().post('/api/ai/parse-log').set(user.auth).send({ text: 'kal raat neend nahi aayi, slept 4 hours' }).expect(200);
    expect(draft.body).toMatchObject({ parser: 'offline', log: null, draft: { dayOffset: -1, sleepHours: 4 } });

    const saved = await t.http().post('/api/ai/parse-log').set(user.auth).send({ text: 'headache since morning', commit: true, source: 'VOICE' }).expect(200);
    expect(saved.body.log).toMatchObject({ source: 'VOICE' });
  });

  it('fact-checks myths from the curated list', async () => {
    const res = await t.http().post('/api/ai/myth-check').set(user.auth).send({ claim: 'You should not wash your hair during your period' }).expect(200);
    expect(res.body).toMatchObject({ verdict: 'MYTH', evidence: 'STRONG', source: 'curated' });
  });

  it('explains that voice notes need an AI provider', async () => {
    const res = await t
      .http()
      .post('/api/ai/transcribe')
      .set(user.auth)
      .attach('audio', Buffer.from('fake-audio'), { filename: 'note.webm', contentType: 'audio/webm' })
      .expect(503);
    expect(res.body.error.code).toBe('VOICE_UNAVAILABLE');
  });

  it('serves public learning content', async () => {
    const articles = await t.http().get('/api/content/articles').expect(200);
    expect(articles.body.length).toBeGreaterThanOrEqual(15);
    const pcos = await t.http().get('/api/content/articles/pcos').expect(200);
    expect(pcos.body.body).toMatch(/Rotterdam/);
    await t.http().get('/api/content/articles/nope').expect(404);
    expect((await t.http().get('/api/content/myths').expect(200)).body.length).toBeGreaterThan(10);
    expect((await t.http().get('/api/care/resources').expect(200)).body.helplines[0].number).toBe('112');
  });
});
