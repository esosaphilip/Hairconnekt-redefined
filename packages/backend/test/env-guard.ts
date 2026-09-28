/**
 * HARD PRODUCTION GUARD AND TEST ENVIRONMENT SETUP
 *
 * Enforces rule R10: Defines dummy values for EVERY environment variable the app reads,
 * preventing any real credentials from packages/backend/.env from ever leaking into tests.
 *
 * Enforces rule R11: Validates database host and URL before any connection can be attempted.
 * Throws immediately if host is not localhost, 127.0.0.1, or postgres (CI container),
 * or if the connection string contains 'neon'.
 */

export const ALLOWED_DB_HOSTS = ['localhost', '127.0.0.1', 'postgres'];

export function assertSafeDatabaseHost(databaseUrl?: string, databaseHost?: string): void {
  const url = (databaseUrl ?? process.env.DATABASE_URL ?? '').trim();
  const hostParam = (databaseHost ?? process.env.DATABASE_HOST ?? '').trim();

  // 1. Neon check (case-insensitive)
  if (/neon/i.test(url) || /neon/i.test(hostParam)) {
    throw new Error(
      `PRODUCTION GUARD TRIGGERED: Database URL or Host contains "neon". Connection blocked to protect production data. (URL: ${url})`,
    );
  }

  // 2. Extract host
  let host = hostParam;
  if (url) {
    try {
      const parsed = new URL(url);
      host = parsed.hostname;
    } catch {
      // In case of non-standard URL, extract host regex
      const match = url.match(/@([^:/]+)/);
      if (match) {
        host = match[1];
      }
    }
  }

  if (!host) {
    throw new Error('PRODUCTION GUARD TRIGGERED: No database host found in environment.');
  }

  // 3. Validate against allowlist
  if (!ALLOWED_DB_HOSTS.includes(host.toLowerCase())) {
    throw new Error(
      `PRODUCTION GUARD TRIGGERED: Database host "${host}" is not permitted. Only [${ALLOWED_DB_HOSTS.join(', ')}] are allowed in tests.`,
    );
  }
}

export function initializeTestEnvironment(): void {
  // Always run tests in UTC
  process.env.TZ = 'UTC';

  // Apply complete set of dummy environment variables (Rule R10)
  const dummyEnv: Record<string, string> = {
    NODE_ENV: 'test',
    PORT: '3000',
    DATABASE_HOST: '127.0.0.1',
    DATABASE_PORT: '5432',
    DATABASE_USER: 'testuser',
    DATABASE_PASSWORD: 'testpass',
    DATABASE_NAME: 'hairconnekt_test',
    DATABASE_URL: 'postgres://testuser:testpass@127.0.0.1:5432/hairconnekt_test',
    DATABASE_SSL: 'false',
    JWT_ACCESS_SECRET: 'test-access-secret-32-chars-long-minimum-safe-dummy',
    JWT_SECRET: 'test-access-secret-32-chars-long-minimum-safe-dummy',
    JWT_ACCESS_EXPIRES: '15m',
    JWT_EXPIRES_IN: '15m',
    JWT_REFRESH_SECRET: 'test-refresh-secret-32-chars-long-minimum-safe-dummy',
    REFRESH_JWT_SECRET: 'test-refresh-secret-32-chars-long-minimum-safe-dummy',
    JWT_REFRESH_EXPIRES: '30d',
    REFRESH_JWT_EXPIRES_IN: '30d',
    ADMIN_SESSION_SECRET: 'test-admin-session-secret-32-chars-safe-dummy',
    ADMIN_APP_URL: 'http://localhost:5173',
    CORS_ORIGIN: 'http://localhost:5173,http://localhost:3000',
    R2_BUCKET_NAME: 'test-bucket',
    R2_BUCKET: 'test-bucket',
    R2_PUBLIC_URL: 'https://r2-test.hairconnekt.de',
    R2_PUBLIC_BASE_URL: 'https://r2-test.hairconnekt.de',
    R2_ENDPOINT: 'https://dummy-account-id.r2.cloudflarestorage.com',
    R2_ACCOUNT_ID: 'dummy-account-id',
    R2_ACCESS_KEY_ID: 'test-dummy-access-key-id',
    R2_SECRET_ACCESS_KEY: 'test-dummy-secret-access-key',
    BREVO_API_KEY: 'test-dummy-brevo-api-key',
    SMTP_FROM: 'noreply@hairconnekt.de',
    EMAIL_FROM: 'noreply@hairconnekt.de',
    SENDGRID_FROM_EMAIL: 'noreply@hairconnekt.de',
    SMTP_FROM_NAME: 'HairConnekt Test',
    EMAIL_FROM_NAME: 'HairConnekt Test',
    OTP_DEV_MODE: 'false',
    OTP_EXPIRES_MINUTES: '15',
    BCRYPT_ROUNDS: '4', // fast rounds for fast test execution
    GEOCODING_BASE_URL: 'http://127.0.0.1:9999/search',
    GEOCODING_USER_AGENT: 'HairConnekt-Test/1.0',
    EXPO_ACCESS_TOKEN: 'test-dummy-expo-token',
  };

  for (const [key, value] of Object.entries(dummyEnv)) {
    // Override whatever is in process.env so .env file values cannot leak
    process.env[key] = value;
  }

  // Run the guard check
  assertSafeDatabaseHost();
}

// Auto-run on import
initializeTestEnvironment();
