import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp, signUp, today, type TestApp } from './helpers';

describe('auth', () => {
  let t: TestApp;
  beforeAll(async () => (t = await createTestApp()));
  afterAll(() => t.close());

  it('registers, rejects duplicates and logs in', async () => {
    const email = 'ananya@test.cherri';
    await signUp(t, { email, password: 'supersecret1' });

    const dup = await t.http().post('/api/auth/register').send({ email: 'Ananya@Test.Cherri', password: 'supersecret1' }).expect(409);
    expect(dup.body.error.code).toBe('EMAIL_TAKEN');

    const bad = await t.http().post('/api/auth/login').send({ email, password: 'wrong-password' }).expect(401);
    expect(bad.body.error).toMatchObject({ status: 401, code: 'INVALID_CREDENTIALS' });

    const ok = await t.http().post('/api/auth/login').send({ email, password: 'supersecret1' }).expect(200);
    expect(ok.body.tokens.accessToken).toBeTruthy();
    expect(ok.body.user).toMatchObject({ email, isGuest: false });
    expect(ok.body.user).not.toHaveProperty('passwordHash');
  });

  it('validates input with clear field errors', async () => {
    const res = await t.http().post('/api/auth/register').send({ email: 'not-an-email', password: 'short' }).expect(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
    expect(res.body.error.details.map((d: { path: string }) => d.path).sort()).toEqual(['email', 'password']);
  });

  it('protects routes by default', async () => {
    expect((await t.http().get('/api/me').expect(401)).body.error.code).toBe('AUTH_REQUIRED');
    expect((await t.http().get('/api/me').set('Authorization', 'Bearer nope').expect(401)).body.error.code).toBe('TOKEN_INVALID');
    await t.http().get('/api/health').expect(200);
  });

  it('rotates refresh tokens and revokes the family when one is replayed', async () => {
    const user = await signUp(t);
    const first = await t.http().post('/api/auth/refresh').send({ refreshToken: user.refreshToken }).expect(200);
    const rotated = first.body.tokens.refreshToken as string;
    expect(rotated).not.toBe(user.refreshToken);

    // Replaying the old token looks like theft: everything in the family dies.
    const replay = await t.http().post('/api/auth/refresh').send({ refreshToken: user.refreshToken }).expect(401);
    expect(replay.body.error.code).toBe('REFRESH_REUSED');
    await t.http().post('/api/auth/refresh').send({ refreshToken: rotated }).expect(401);

    const audit = await t.prisma.auditLog.findFirst({ where: { userId: user.id, action: 'REFRESH_REUSE_DETECTED' } });
    expect(audit).not.toBeNull();
  });

  it('logs out by revoking the refresh token', async () => {
    const user = await signUp(t);
    await t.http().post('/api/auth/logout').send({ refreshToken: user.refreshToken }).expect(204);
    await t.http().post('/api/auth/refresh').send({ refreshToken: user.refreshToken }).expect(401);
  });

  it('lets a guest start instantly and upgrade later without losing data', async () => {
    const guest = await t.http().post('/api/auth/guest').send({ name: 'Riya' }).expect(201);
    expect(guest.body.user).toMatchObject({ isGuest: true, email: null, name: 'Riya' });
    const auth = { Authorization: `Bearer ${guest.body.tokens.accessToken}` };

    const day = today();
    await t.http().put(`/api/logs/${day}`).set(auth).send({ mood: 4 }).expect(200);
    const upgraded = await t.http().post('/api/auth/upgrade').set(auth).send({ email: 'riya@test.cherri', password: 'supersecret1' }).expect(201);
    expect(upgraded.body.user).toMatchObject({ id: guest.body.user.id, isGuest: false, email: 'riya@test.cherri' });

    const login = await t.http().post('/api/auth/login').send({ email: 'riya@test.cherri', password: 'supersecret1' }).expect(200);
    const kept = await t.http().get(`/api/logs/${day}`).set('Authorization', `Bearer ${login.body.tokens.accessToken}`).expect(200);
    expect(kept.body.log.mood).toBe(4);
    // The old guest refresh token was revoked on upgrade.
    await t.http().post('/api/auth/refresh').send({ refreshToken: guest.body.tokens.refreshToken }).expect(401);
  });
});
