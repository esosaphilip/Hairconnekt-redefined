import request from 'supertest';
import { createTestApp, closeTestApp, truncateAllTables, isDatabaseAvailable, TestAppContext } from './test-bootstrap';
import { generateTestEmail, TEST_PASSWORD } from './test-factories';

describe('T01: Client Registration, Verification, Login', () => {
  let ctx: TestAppContext;
  let dbReady = false;

  beforeAll(async () => {
    dbReady = await isDatabaseAvailable();
    if (dbReady) {
      ctx = await createTestApp();
    }
  });

  afterAll(async () => {
    await closeTestApp();
  });

  beforeEach(async () => {
    if (dbReady && ctx) {
      await truncateAllTables(ctx.dataSource);
      ctx.fakeMailer.clear();
    }
  });

  const runTest = (testFn: () => Promise<void>) => {
    return async () => {
      if (!dbReady) {
        console.warn('Skipping test: Database not available locally (runs in CI container)');
        return;
      }
      await testFn();
    };
  };

  it('registers client, sends verification email, blocks login until verified, verifies and logs in', runTest(async () => {
    const email = generateTestEmail('client-t01');
    const password = TEST_PASSWORD;

    // 1. Register client
    const regRes = await request(ctx.app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        firstName: 'Ada',
        lastName: 'Lovelace',
        email,
        password,
        role: 'client',
        acceptedTerms: true,
      })
      .expect(201);

    expect(regRes.body).toHaveProperty('message');
    expect(regRes.body.user).toBeDefined();
    expect(regRes.body.user.email).toBe(email);
    expect(regRes.body.user.passwordHash).toBeUndefined();

    // 2. Verification email captured by FakeMailer
    const otp = ctx.fakeMailer.getLastVerificationCode(email);
    expect(otp).toBeTruthy();
    expect(otp).toMatch(/^\d{6}$/);

    // 3. Login with wrong password returns 401 generic message and DOES NOT leak unverified status
    const wrongPassRes = await request(ctx.app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        identifier: email,
        password: 'WrongPassword123!',
      })
      .expect(401);

    expect(wrongPassRes.body.errorCode).toBeUndefined();
    expect(wrongPassRes.body.message).toMatch(/E-Mail oder Passwort falsch/i);

    // 4. Login with correct password before verification is blocked with EMAIL_NOT_VERIFIED
    const unverifiedLoginRes = await request(ctx.app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        identifier: email,
        password,
      })
      .expect(401);

    expect(unverifiedLoginRes.body.errorCode).toBe('EMAIL_NOT_VERIFIED');

    // 5. Wrong verification code is rejected
    await request(ctx.app.getHttpServer())
      .post('/api/v1/auth/verify-email')
      .send({
        email,
        code: '999999',
      })
      .expect(400);

    // 6. Correct verification code succeeds
    const verifyRes = await request(ctx.app.getHttpServer())
      .post('/api/v1/auth/verify-email')
      .send({
        email,
        code: otp!,
      })
      .expect(200);

    expect(verifyRes.body.success).toBe(true);
    expect(verifyRes.body).toHaveProperty('accessToken');

    // 7. Login now succeeds
    const loginRes = await request(ctx.app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        identifier: email,
        password,
      })
      .expect(200);

    expect(loginRes.body.accessToken).toBeDefined();
    expect(loginRes.body.refreshToken).toBeDefined();
    expect(loginRes.body.user).toBeDefined();
    expect(loginRes.body.user.passwordHash).toBeUndefined();

    const token = loginRes.body.accessToken;

    // 8. GET /users/me returns user and NEVER returns password hash
    const meRes = await request(ctx.app.getHttpServer())
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(meRes.body.email).toBe(email);
    expect(meRes.body.passwordHash).toBeUndefined();
    expect(meRes.body.password).toBeUndefined();

    // 9. Duplicate verified email returns 409
    await request(ctx.app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        firstName: 'Duplicate',
        lastName: 'User',
        email,
        password,
        role: 'client',
        acceptedTerms: true,
      })
      .expect(409);
  }));

  it('duplicate UNVERIFIED email returns 409 with EMAIL_NOT_VERIFIED error code', runTest(async () => {
    const email = generateTestEmail('unverified-dupe');
    const password = TEST_PASSWORD;

    // Register first time
    await request(ctx.app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        firstName: 'First',
        lastName: 'User',
        email,
        password,
        role: 'client',
        acceptedTerms: true,
      })
      .expect(201);

    // Attempt second registration before verification
    const dupeRes = await request(ctx.app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        firstName: 'Second',
        lastName: 'User',
        email,
        password,
        role: 'client',
        acceptedTerms: true,
      })
      .expect(409);

    expect(dupeRes.body.errorCode).toBe('EMAIL_NOT_VERIFIED');
  }));
});
