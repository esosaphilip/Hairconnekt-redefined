import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import {
  createTestApp,
  closeTestApp,
  truncateAllTables,
  isDatabaseAvailable,
  TestAppContext,
} from './test-bootstrap';
import {
  createTestAdmin,
  createTestProvider,
  createTestClient,
} from './test-factories';
import { ADMIN_CSRF_COOKIE, ADMIN_CSRF_HEADER } from '../src/auth/admin-csrf';
import { UserRole } from '../src/entities/user.entity';

describe('T19: Admin provider ID document Cross-Origin-Resource-Policy', () => {
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
      ctx.fakeR2Service.clear();
    }
  });

  const runTest = (testFn: () => Promise<void>) => {
    return async () => {
      if (!dbReady) {
        console.warn(
          'Skipping test: Database not available locally (runs in CI container)',
        );
        return;
      }
      await testFn();
    };
  };

  async function loginAsAdmin(): Promise<{ adminToken: string; cookies: string[] }> {
    const { user, password } = await createTestAdmin(ctx.dataSource);

    const csrfRes = await request(ctx.app.getHttpServer())
      .get('/api/v1/auth/admin-csrf')
      .expect(200);

    const csrfToken = csrfRes.body.csrfToken;
    const rawCookies = csrfRes.headers['set-cookie'];
    const cookies: string[] = Array.isArray(rawCookies)
      ? rawCookies
      : rawCookies
        ? [rawCookies]
        : [];
    const csrfCookie =
      cookies.find((c: string) => c.startsWith(`${ADMIN_CSRF_COOKIE}=`)) ||
      `${ADMIN_CSRF_COOKIE}=${csrfToken}`;

    const loginRes = await request(ctx.app.getHttpServer())
      .post('/api/v1/auth/admin-login')
      .set('Cookie', [csrfCookie])
      .set(ADMIN_CSRF_HEADER, csrfToken)
      .set('Origin', 'http://localhost:5173')
      .send({
        identifier: user.email,
        password,
      })
      .expect(200);

    const rawLoginCookies = loginRes.headers['set-cookie'];
    const loginCookies: string[] = Array.isArray(rawLoginCookies)
      ? rawLoginCookies
      : rawLoginCookies
        ? [rawLoginCookies]
        : [csrfCookie];
    const sessionCookie =
      loginCookies.find((c: string) => c.startsWith('hc_admin_session=')) || '';
    const adminToken = sessionCookie
      ? sessionCookie.split(';')[0].replace('hc_admin_session=', '')
      : (loginRes.body?.accessToken || '');

    return { adminToken, cookies: loginCookies };
  }

  it('returns 302 with Cross-Origin-Resource-Policy same-site and a non-empty Location when an admin requests the ID document of a provider that has one', runTest(async () => {
    const { cookies } = await loginAsAdmin();

    const idDocumentUrl = `id-documents/${uuidv4()}.jpg`;
    const { provider } = await createTestProvider(ctx.dataSource, {
      providerOverrides: { idDocumentUrl },
    });

    const response = await request(ctx.app.getHttpServer())
      .get(`/api/v1/admin/providers/${provider.id}/id-document`)
      .set('Cookie', cookies)
      .redirects(0)
      .expect(302);

    expect(response.headers['cross-origin-resource-policy']).toEqual('same-site');
    expect(typeof response.headers['location']).toBe('string');
    expect(response.headers['location'].length).toBeGreaterThan(0);
  }));

  it('keeps Cross-Origin-Resource-Policy at helmet default same-origin on the provider details endpoint', runTest(async () => {
    const { cookies } = await loginAsAdmin();

    const idDocumentUrl = `id-documents/${uuidv4()}.jpg`;
    const { provider } = await createTestProvider(ctx.dataSource, {
      providerOverrides: { idDocumentUrl },
    });

    const response = await request(ctx.app.getHttpServer())
      .get(`/api/v1/admin/providers/${provider.id}`)
      .set('Cookie', cookies)
      .expect(200);

    expect(response.headers['cross-origin-resource-policy']).toEqual('same-origin');
  }));

  it('returns 401 with Cross-Origin-Resource-Policy same-origin and no Location header when the ID document endpoint is called without a login', runTest(async () => {
    const idDocumentUrl = `id-documents/${uuidv4()}.jpg`;
    const { provider } = await createTestProvider(ctx.dataSource, {
      providerOverrides: { idDocumentUrl },
    });

    const response = await request(ctx.app.getHttpServer())
      .get(`/api/v1/admin/providers/${provider.id}/id-document`)
      .redirects(0)
      .expect(401);

    expect(response.headers['cross-origin-resource-policy']).toEqual('same-origin');
    expect(response.headers['location']).toBeUndefined();
  }));

  it('returns 404 with Cross-Origin-Resource-Policy same-origin and no Location header when an admin requests the ID document of a provider that has none', runTest(async () => {
    const { cookies } = await loginAsAdmin();

    const { provider } = await createTestProvider(ctx.dataSource);

    const response = await request(ctx.app.getHttpServer())
      .get(`/api/v1/admin/providers/${provider.id}/id-document`)
      .set('Cookie', cookies)
      .redirects(0)
      .expect(404);

    expect(response.headers['cross-origin-resource-policy']).toEqual('same-origin');
    expect(response.headers['location']).toBeUndefined();
  }));

  it('rejects a non-admin authenticated user (client role) on the ID document endpoint with no Location header', runTest(async () => {
    const { user: clientUser, token: clientToken } = await createTestClient(ctx.dataSource);
    expect(clientUser.role).toEqual(UserRole.CLIENT);

    const idDocumentUrl = `id-documents/${uuidv4()}.jpg`;
    const { provider } = await createTestProvider(ctx.dataSource, {
      providerOverrides: { idDocumentUrl },
    });

    const response = await request(ctx.app.getHttpServer())
      .get(`/api/v1/admin/providers/${provider.id}/id-document`)
      .set('Authorization', `Bearer ${clientToken}`)
      .redirects(0)
      .expect(403);

    expect(response.headers['location']).toBeUndefined();
  }));
});
