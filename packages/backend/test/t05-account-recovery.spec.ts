import request from 'supertest';
import { createTestApp, truncateAllTables, isDatabaseAvailable, TestAppContext } from './test-bootstrap';
import { createTestProvider, generateTestEmail, hashPassword, TEST_PASSWORD } from './test-factories';
import { User, UserRole } from '../src/entities/user.entity';

describe('T05: Stuck-Account Recovery (BUG-013)', () => {
  let ctx: TestAppContext;
  let dbReady = false;

  beforeAll(async () => {
    dbReady = await isDatabaseAvailable();
    if (dbReady) {
      ctx = await createTestApp();
    }
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

  it('allows verified provider without provider profile to resume registration with correct password', runTest(async () => {
    const userRepo = ctx.dataSource.getRepository(User);
    const email = generateTestEmail('stuck-provider');
    const password = TEST_PASSWORD;
    const passwordHash = await hashPassword(password);

    // Create verified provider user without any provider profile row
    const user = await userRepo.save(
      userRepo.create({
        firstName: 'Stuck',
        lastName: 'Provider',
        email,
        passwordHash,
        role: UserRole.PROVIDER,
        isEmailVerified: true,
        isActive: true,
      }),
    );

    // 1. Wrong password is rejected with 409
    await request(ctx.app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        firstName: 'Stuck',
        lastName: 'Provider',
        email,
        password: 'WrongPassword!',
        role: 'provider',
        acceptedTerms: true,
      })
      .expect(409);

    // 2. Correct password returns fresh tokens and onboarding token to finish onboarding
    const recoveryRes = await request(ctx.app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        firstName: 'Stuck',
        lastName: 'Provider',
        email,
        password,
        role: 'provider',
        acceptedTerms: true,
      })
      .expect(201);

    expect(recoveryRes.body.onboardingToken).toBeDefined();
    expect(recoveryRes.body.accessToken).toBeDefined();
    expect(recoveryRes.body.user.id).toBe(user.id);
  }));

  it('rejects with conflict if provider account ALREADY has a provider profile', runTest(async () => {
    const { user, password } = await createTestProvider(ctx.dataSource);

    // Attempting to register again when profile already exists -> 409 Conflict
    const res = await request(ctx.app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        password,
        role: 'provider',
        acceptedTerms: true,
      })
      .expect(409);

    expect(res.body.message).toMatch(/bereits registriert/i);
  }));
});
