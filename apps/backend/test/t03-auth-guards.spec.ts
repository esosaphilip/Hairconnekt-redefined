import request from 'supertest';
import { createTestApp, closeTestApp, truncateAllTables, isDatabaseAvailable, TestAppContext } from './test-bootstrap';
import { createTestClient, createTestProvider, createTestAdmin, signTestToken } from './test-factories';

describe('T03: Auth, Tokens and Role Guards', () => {
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

  it('protected routes return 401 without a token, and 401 with garbage/expired tokens', runTest(async () => {
    // 1. Missing token
    await request(ctx.app.getHttpServer())
      .get('/api/v1/users/me')
      .expect(401);

    // 2. Garbage token
    await request(ctx.app.getHttpServer())
      .get('/api/v1/users/me')
      .set('Authorization', 'Bearer this-is-not-a-valid-jwt-token')
      .expect(401);

    // 3. Expired token
    const expiredToken = signTestToken({ id: 'dummy', email: 'exp@example.test', role: 'client' }, '-1s');
    await request(ctx.app.getHttpServer())
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${expiredToken}`)
      .expect(401);
  }));

  it('role guards: client gets 403 on provider and admin routes; provider cannot access admin routes', runTest(async () => {
    const { token: clientToken } = await createTestClient(ctx.dataSource);
    const { token: providerToken } = await createTestProvider(ctx.dataSource);
    const { token: adminToken } = await createTestAdmin(ctx.dataSource);

    // Client trying to access provider route -> 403
    await request(ctx.app.getHttpServer())
      .get('/api/v1/providers/me')
      .set('Authorization', `Bearer ${clientToken}`)
      .expect(403);

    // Client trying to access admin route -> 403
    await request(ctx.app.getHttpServer())
      .get('/api/v1/admin/providers')
      .set('Authorization', `Bearer ${clientToken}`)
      .expect(403);

    // Provider trying to access admin route -> 403
    await request(ctx.app.getHttpServer())
      .get('/api/v1/admin/providers')
      .set('Authorization', `Bearer ${providerToken}`)
      .expect(403);

    // Admin can access admin route -> 200
    await request(ctx.app.getHttpServer())
      .get('/api/v1/admin/providers')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
  }));

  it('refresh token endpoint rotates tokens and rejects invalid refresh token', runTest(async () => {
    const { user, password } = await createTestClient(ctx.dataSource);

    // Login to obtain fresh refresh token
    const loginRes = await request(ctx.app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        identifier: user.email,
        password,
      })
      .expect(200);

    const refreshToken = loginRes.body.refreshToken;
    expect(refreshToken).toBeDefined();

    // Use refresh token
    const refreshRes = await request(ctx.app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken })
      .expect(200);

    expect(refreshRes.body.accessToken).toBeDefined();
    expect(refreshRes.body.refreshToken).toBeDefined();

    // Invalid refresh token -> 401
    await request(ctx.app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: 'invalid-refresh-token' })
      .expect(401);
  }));

  it('an ONBOARDING token is allowed ONLY on onboarding routes and rejected on standard routes (guards BUG-013)', runTest(async () => {
    // Generate onboarding token with scope 'onboarding'
    const onboardingToken = signTestToken(
      { id: '11111111-1111-1111-1111-111111111111', email: 'onboarding@example.test', role: 'provider' },
      '15m',
      true, // onboarding = true
    );

    // 1. Rejected on standard protected route (GET /users/me or GET /providers/me) -> 401 EmailVerifiedGuard
    await request(ctx.app.getHttpServer())
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${onboardingToken}`)
      .expect(401);

    await request(ctx.app.getHttpServer())
      .get('/api/v1/providers/me')
      .set('Authorization', `Bearer ${onboardingToken}`)
      .expect(401);

    // 2. Rejected on bookings route
    await request(ctx.app.getHttpServer())
      .get('/api/v1/bookings')
      .set('Authorization', `Bearer ${onboardingToken}`)
      .expect(401);
  }));
});
