import request from 'supertest';
import { createTestApp, closeTestApp, truncateAllTables, isDatabaseAvailable, TestAppContext } from './test-bootstrap';
import { createTestAdmin, createTestProvider, createTestClient, generateTestEmail, TEST_PASSWORD } from './test-factories';
import { ProviderStatus } from '../src/entities/provider.entity';
import { ADMIN_CSRF_COOKIE, ADMIN_CSRF_HEADER } from '../src/auth/admin-csrf';

describe('T06: Admin Approval and Admin Payload Contract', () => {
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

  const runTest = (testFn: () => Promise<void>, isFailing = false) => {
    return async () => {
      if (!dbReady) {
        console.warn('Skipping test: Database not available locally (runs in CI container)');
        if (isFailing) {
          throw new Error('Database not available locally');
        }
        return;
      }
      await testFn();
    };
  };

  async function loginAsAdmin(): Promise<{ adminToken: string; cookies: string[] }> {
    const { user, password } = await createTestAdmin(ctx.dataSource);

    // 1. Get CSRF token
    const csrfRes = await request(ctx.app.getHttpServer())
      .get('/api/v1/auth/admin-csrf')
      .expect(200);

    const csrfToken = csrfRes.body.csrfToken;
    const rawCookies = csrfRes.headers['set-cookie'];
    const cookies: string[] = Array.isArray(rawCookies) ? rawCookies : rawCookies ? [rawCookies] : [];
    const csrfCookie = cookies.find((c: string) => c.startsWith(`${ADMIN_CSRF_COOKIE}=`)) || `${ADMIN_CSRF_COOKIE}=${csrfToken}`;

    // 2. Perform admin login with CSRF cookie and header
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
    const loginCookies: string[] = Array.isArray(rawLoginCookies) ? rawLoginCookies : rawLoginCookies ? [rawLoginCookies] : [csrfCookie];
    const sessionCookie = loginCookies.find((c: string) => c.startsWith('hc_admin_session=')) || '';
    const adminToken = sessionCookie ? sessionCookie.split(';')[0].replace('hc_admin_session=', '') : (loginRes.body?.accessToken || '');

    return {
      adminToken,
      cookies: loginCookies,
    };
  }

  it('admin login flow with CSRF step and provider status transitions (approve/reject/suspend)', runTest(async () => {
    const { adminToken } = await loginAsAdmin();

    // Create a provider in pending status
    const { provider } = await createTestProvider(ctx.dataSource, {
      providerOverrides: { status: ProviderStatus.PENDING, isOnline: true },
    });

    // Pending provider must NOT appear in public provider search
    const publicSearch1 = await request(ctx.app.getHttpServer())
      .get('/api/v1/providers')
      .expect(200);
    const found1 = (publicSearch1.body.data || publicSearch1.body || []).find((p: any) => p.id === provider.id);
    expect(found1).toBeUndefined();

    // Approve provider
    await request(ctx.app.getHttpServer())
      .patch(`/api/v1/admin/providers/${provider.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'approved' })
      .expect(200);

    // Now provider MUST appear in public provider search
    const publicSearch2 = await request(ctx.app.getHttpServer())
      .get('/api/v1/providers')
      .expect(200);
    const found2 = (publicSearch2.body.data || publicSearch2.body || []).find((p: any) => p.id === provider.id);
    expect(found2).toBeDefined();

    // Reject provider (with reason)
    await request(ctx.app.getHttpServer())
      .patch(`/api/v1/admin/providers/${provider.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'rejected', reason: 'Incomplete business documents' })
      .expect(200);

    // Rejected provider hidden from public search
    const publicSearch3 = await request(ctx.app.getHttpServer())
      .get('/api/v1/providers')
      .expect(200);
    const found3 = (publicSearch3.body.data || publicSearch3.body || []).find((p: any) => p.id === provider.id);
    expect(found3).toBeUndefined();

    // Suspend provider (with reason)
    await request(ctx.app.getHttpServer())
      .patch(`/api/v1/admin/providers/${provider.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'suspended', reason: 'Terms violation' })
      .expect(200);

    // Suspended provider hidden from public search
    const publicSearch4 = await request(ctx.app.getHttpServer())
      .get('/api/v1/providers')
      .expect(200);
    const found4 = (publicSearch4.body.data || publicSearch4.body || []).find((p: any) => p.id === provider.id);
    expect(found4).toBeUndefined();
  }));

  it('admin payload contracts: categories, popular styles, invitations, bulk-delete', runTest(async () => {
    const { adminToken } = await loginAsAdmin();

    // 1. Categories create without isActive
    const catCreateRes = await request(ctx.app.getHttpServer())
      .post('/api/v1/admin/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `Cornrows ${Date.now()}`,
        description: 'Traditional cornrows and patterns',
        iconName: 'cornrows',
        sortOrder: 10,
      })
      .expect(201);

    const categoryId = catCreateRes.body.id;
    expect(categoryId).toBeDefined();

    // 2. Categories update and inline isActive toggle
    const catUpdateRes = await request(ctx.app.getHttpServer())
      .patch(`/api/v1/admin/categories/${categoryId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        isActive: false,
      })
      .expect(200);

    expect(catUpdateRes.body.isActive).toBe(false);

    // Inactive category must not appear in GET /services/categories
    const publicCatsRes = await request(ctx.app.getHttpServer())
      .get('/api/v1/services/categories')
      .expect(200);

    const activeCatList = Array.isArray(publicCatsRes.body) ? publicCatsRes.body : publicCatsRes.body.data || [];
    const inactiveFound = activeCatList.find((c: any) => c.id === categoryId);
    expect(inactiveFound).toBeUndefined();

    // 3. Popular styles create, update, and toggle
    const styleRes = await request(ctx.app.getHttpServer())
      .post('/api/v1/admin/popular-styles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `Goddess Locs ${Date.now()}`,
        emoji: '✨',
        colorHex: '#C5A059',
        sortOrder: 1,
      })
      .expect(201);

    const styleId = styleRes.body.id;
    expect(styleId).toBeDefined();

    // Update popular style: asserts HTTP 200 and updated fields
    const updatedStyleName = `Goddess Locs Updated ${Date.now()}`;
    const styleUpdateRes = await request(ctx.app.getHttpServer())
      .patch(`/api/v1/admin/popular-styles/${styleId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: updatedStyleName,
        sortOrder: 2,
      })
      .expect(200);

    expect(styleUpdateRes.body.name).toBe(updatedStyleName);
    expect(styleUpdateRes.body.sortOrder).toBe(2);

    // Toggle popular style isActive to false: asserts HTTP 200 and isActive is false
    const styleToggleRes = await request(ctx.app.getHttpServer())
      .patch(`/api/v1/admin/popular-styles/${styleId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        isActive: false,
      })
      .expect(200);

    expect(styleToggleRes.body.isActive).toBe(false);

    // Inactive popular style does not appear in public GET /popular-styles: asserts absence
    const publicStylesRes = await request(ctx.app.getHttpServer())
      .get('/api/v1/popular-styles')
      .expect(200);

    const publicStyles = Array.isArray(publicStylesRes.body) ? publicStylesRes.body : publicStylesRes.body.data || [];
    expect(publicStyles.some((s: any) => s.id === styleId)).toBe(false);

    // 4. Invitations create
    const inviteEmail = generateTestEmail('admin-invite');
    const inviteRes = await request(ctx.app.getHttpServer())
      .post('/api/v1/admin/invitations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: inviteEmail,
      })
      .expect(201);

    expect(inviteRes.body.id || inviteRes.body.invitation).toBeDefined();

    // 5. Users bulk-delete
    const client1 = await createTestClient(ctx.dataSource);
    const client2 = await createTestClient(ctx.dataSource);

    const bulkDeleteRes = await request(ctx.app.getHttpServer())
      .post('/api/v1/admin/users/bulk-delete')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        ids: [client1.user.id, client2.user.id],
      })
      .expect(201);

    expect(bulkDeleteRes.body).toBeDefined();
  }));

  // KNOWN BUG-019: category create rejected when sending isActive field
  it.failing('[KNOWN BUG-019] admin category create accepts isActive field without 400 rejection', runTest(async () => {
    const { adminToken } = await loginAsAdmin();

    // Admin form sends isActive: true or false upon creation
    const res = await request(ctx.app.getHttpServer())
      .post('/api/v1/admin/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `Protective Styles ${Date.now()}`,
        description: 'Twists and locs',
        iconName: 'twists',
        sortOrder: 20,
        isActive: true, // BUG-019: CreateCategoryDto does not declare isActive, triggering ValidationPipe forbidNonWhitelisted 400
      });

    expect(res.status).toBe(201);
    expect(res.body.isActive).toBe(true);
  }, true));

  // KNOWN BUG-019: category created with isActive: false must not appear in GET services/categories
  it.failing('[KNOWN BUG-019] category created with isActive false must not appear in GET services/categories', runTest(async () => {
    const { adminToken } = await loginAsAdmin();
    const uniqueCatName = `Hidden Inactive Cat ${Date.now()}`;

    // Admin attempts to create category directly with isActive: false
    // BUG-019: CreateCategoryDto rejects isActive with 400
    const catCreateRes = await request(ctx.app.getHttpServer())
      .post('/api/v1/admin/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: uniqueCatName,
        description: 'Hidden inactive category',
        iconName: 'hidden',
        sortOrder: 99,
        isActive: false,
      })
      .expect(201);

    expect(catCreateRes.body.id).toBeDefined();
    expect(catCreateRes.body.isActive).toBe(false);

    // Inactive category must NOT appear in public GET /services/categories
    const publicCatsRes = await request(ctx.app.getHttpServer())
      .get('/api/v1/services/categories')
      .expect(200);

    const catList = Array.isArray(publicCatsRes.body) ? publicCatsRes.body : publicCatsRes.body.data || [];
    expect(catList.some((c: any) => c.name === uniqueCatName)).toBe(false);
  }, true));
});
