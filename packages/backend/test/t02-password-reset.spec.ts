import request from 'supertest';
import { createTestApp, truncateAllTables, isDatabaseAvailable, TestAppContext } from './test-bootstrap';
import { createTestClient, generateTestEmail, TEST_PASSWORD } from './test-factories';

describe('T02: Password Reset', () => {
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

  it('completes full password reset journey and verifies old password fails while new one works', runTest(async () => {
    // 1. Create client
    const { user, password: oldPassword } = await createTestClient(ctx.dataSource);
    const newPassword = 'NewSecretPassword2026!';

    // 2. Request forgot password
    const forgotRes = await request(ctx.app.getHttpServer())
      .post('/api/v1/auth/forgot-password')
      .send({ email: user.email })
      .expect(200);

    expect(forgotRes.body).toHaveProperty('message');

    // 3. Fake mailer captured OTP
    const resetOtp = ctx.fakeMailer.getLastResetCode(user.email);
    expect(resetOtp).toBeTruthy();
    expect(resetOtp).toMatch(/^\d{6}$/);

    // 4. Verify OTP to obtain reset token
    const verifyOtpRes = await request(ctx.app.getHttpServer())
      .post('/api/v1/auth/verify-otp')
      .send({
        email: user.email,
        code: resetOtp!,
      })
      .expect(200);

    expect(verifyOtpRes.body).toHaveProperty('resetToken');
    const resetToken = verifyOtpRes.body.resetToken;

    // 5. Reset password with resetToken
    const resetRes = await request(ctx.app.getHttpServer())
      .post('/api/v1/auth/reset-password')
      .send({
        resetToken,
        password: newPassword,
      })
      .expect(200);

    expect(resetRes.body).toHaveProperty('message');

    // 6. Old password now fails
    await request(ctx.app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        identifier: user.email,
        password: oldPassword,
      })
      .expect(401);

    // 7. New password works
    const newLoginRes = await request(ctx.app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        identifier: user.email,
        password: newPassword,
      })
      .expect(200);

    expect(newLoginRes.body.accessToken).toBeDefined();
    expect(newLoginRes.body.user.email).toBe(user.email);
  }));

  it('an unknown email receives the same generic response as a known email (no email enumeration)', runTest(async () => {
    const unknownEmail = generateTestEmail('unknown-user');

    const res = await request(ctx.app.getHttpServer())
      .post('/api/v1/auth/forgot-password')
      .send({ email: unknownEmail })
      .expect(200);

    expect(res.body).toHaveProperty('message');
    // Ensure no email was dispatched
    expect(ctx.fakeMailer.getLastEmail(unknownEmail)).toBeUndefined();
  }));
});
