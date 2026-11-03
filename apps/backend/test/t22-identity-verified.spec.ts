import request from 'supertest';
import { createTestApp, closeTestApp, truncateAllTables, isDatabaseAvailable, TestAppContext } from './test-bootstrap';
import { createTestClient, createTestProvider, createTestAdmin, generateTestEmail, TEST_PASSWORD } from './test-factories';
import { ProviderStatus } from '../src/entities/provider.entity';
import { ServiceCategory } from '../src/entities/service-category.entity';

describe('T22: Identity verification, 18+ confirmation and home-visit gating (BUG-090, BUG-092)', () => {
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

  // The admin-only identity fields must never appear on public provider payloads.
  const ADMIN_IDENTITY_KEYS = ['identityVerifiedAt', 'identityVerificationMethod', 'ageConfirmedAt'];

  const getAdminProvider = async (providerId: string, adminToken: string) =>
    request(ctx.app.getHttpServer())
      .get(`/api/v1/admin/providers/${providerId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

  // Runs the real onboarding flow: register provider -> onboarding token -> POST /providers/register.
  const registerProviderViaOnboarding = async (payload: Record<string, unknown>) => {
    const regRes = await request(ctx.app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        firstName: 'Elena',
        lastName: 'Braids',
        email: generateTestEmail('identity-provider'),
        password: TEST_PASSWORD,
        role: 'provider',
        acceptedTerms: true,
      })
      .expect(201);

    const onboardingToken = regRes.body.onboardingToken;

    const catRepo = ctx.dataSource.getRepository(ServiceCategory);
    let category = await catRepo.findOne({ where: { isActive: true } });
    if (!category) {
      category = await catRepo.save(catRepo.create({ name: 'Braids', iconName: 'braids', isActive: true }));
    }

    return request(ctx.app.getHttpServer())
      .post('/api/v1/providers/register')
      .set('Authorization', `Bearer ${onboardingToken}`)
      .send({
        providerType: 'salon',
        businessName: 'Elena Identity Braids',
        street: 'Friedrichstraße',
        houseNumber: '100',
        city: 'Berlin',
        postalCode: '10117',
        serviceRadius: 25,
        serviceIds: [category.id],
        experienceYears: 4,
        languages: ['de', 'en'],
        cancellationPolicy: '24h',
        ...payload,
      });
  };

  describe('public badge is a boolean only', () => {
    it('approved unverified provider: GET /providers/:id returns isVerified false and no admin identity fields', runTest(async () => {
      const { provider } = await createTestProvider(ctx.dataSource, {
        providerOverrides: {
          status: ProviderStatus.APPROVED,
          identityVerifiedAt: null,
          identityVerificationMethod: null,
          ageConfirmedAt: null,
        },
      });

      const res = await request(ctx.app.getHttpServer())
        .get(`/api/v1/providers/${provider.id}`)
        .expect(200);

      expect(res.body.isVerified).toBe(false);
      for (const key of ADMIN_IDENTITY_KEYS) {
        expect(res.body).not.toHaveProperty(key);
      }
    }));

    it('approved unverified provider: list item from GET /providers returns isVerified false and no admin identity fields', runTest(async () => {
      const { provider } = await createTestProvider(ctx.dataSource, {
        providerOverrides: { status: ProviderStatus.APPROVED, identityVerifiedAt: null },
      });

      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/providers')
        .expect(200);

      const item = res.body.data.find((p: any) => p.id === provider.id);
      expect(item).toBeDefined();
      expect(item.isVerified).toBe(false);
      for (const key of ADMIN_IDENTITY_KEYS) {
        expect(item).not.toHaveProperty(key);
      }
    }));

    it('admin-verified provider: profile and list both report isVerified true', runTest(async () => {
      const { provider } = await createTestProvider(ctx.dataSource, {
        providerOverrides: {
          status: ProviderStatus.APPROVED,
          identityVerifiedAt: new Date(),
          identityVerificationMethod: 'video_call',
        },
      });

      const profileRes = await request(ctx.app.getHttpServer())
        .get(`/api/v1/providers/${provider.id}`)
        .expect(200);
      expect(profileRes.body.isVerified).toBe(true);

      const listRes = await request(ctx.app.getHttpServer())
        .get('/api/v1/providers')
        .expect(200);
      const item = listRes.body.data.find((p: any) => p.id === provider.id);
      expect(item).toBeDefined();
      expect(item.isVerified).toBe(true);
    }));
  });

  describe('admin identity verification endpoints', () => {
    it('admin PATCH identity-verification with video_call sets the badge and stores the method', runTest(async () => {
      const { provider } = await createTestProvider(ctx.dataSource, {
        providerOverrides: { status: ProviderStatus.APPROVED, identityVerifiedAt: null },
      });
      const { token: adminToken } = await createTestAdmin(ctx.dataSource);

      await request(ctx.app.getHttpServer())
        .patch(`/api/v1/admin/providers/${provider.id}/identity-verification`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ method: 'video_call' })
        .expect(200);

      const profileRes = await request(ctx.app.getHttpServer())
        .get(`/api/v1/providers/${provider.id}`)
        .expect(200);
      expect(profileRes.body.isVerified).toBe(true);

      const adminRes = await getAdminProvider(provider.id, adminToken);
      expect(adminRes.body.identityVerifiedAt).not.toBeNull();
      expect(adminRes.body.identityVerificationMethod).toBe('video_call');
    }));

    it('admin PATCH identity-verification rejects the unknown method passport_scan with 400', runTest(async () => {
      const { provider } = await createTestProvider(ctx.dataSource);
      const { token: adminToken } = await createTestAdmin(ctx.dataSource);

      await request(ctx.app.getHttpServer())
        .patch(`/api/v1/admin/providers/${provider.id}/identity-verification`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ method: 'passport_scan' })
        .expect(400);
    }));

    it('client token is rejected with 403 on the admin identity-verification endpoint', runTest(async () => {
      const { provider } = await createTestProvider(ctx.dataSource);
      const { token: clientToken } = await createTestClient(ctx.dataSource);

      await request(ctx.app.getHttpServer())
        .patch(`/api/v1/admin/providers/${provider.id}/identity-verification`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ method: 'video_call' })
        .expect(403);
    }));

    it('admin PATCH identity-verification returns 404 for an unknown provider id', runTest(async () => {
      const { token: adminToken } = await createTestAdmin(ctx.dataSource);

      await request(ctx.app.getHttpServer())
        .patch('/api/v1/admin/providers/00000000-0000-0000-0000-000000000000/identity-verification')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ method: 'video_call' })
        .expect(404);
    }));

    it('admin DELETE identity-verification revokes the badge to isVerified false', runTest(async () => {
      const { provider } = await createTestProvider(ctx.dataSource, {
        providerOverrides: {
          status: ProviderStatus.APPROVED,
          identityVerifiedAt: new Date(),
          identityVerificationMethod: 'video_call',
        },
      });
      const { token: adminToken } = await createTestAdmin(ctx.dataSource);

      await request(ctx.app.getHttpServer())
        .delete(`/api/v1/admin/providers/${provider.id}/identity-verification`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const profileRes = await request(ctx.app.getHttpServer())
        .get(`/api/v1/providers/${provider.id}`)
        .expect(200);
      expect(profileRes.body.isVerified).toBe(false);
    }));
  });

  describe('18+ confirmation at registration', () => {
    it('registration with ageConfirmed true stores a non-null ageConfirmedAt', runTest(async () => {
      const provRes = await registerProviderViaOnboarding({ ageConfirmed: true });
      expect(provRes.status).toBe(201);

      const { token: adminToken } = await createTestAdmin(ctx.dataSource);
      const adminRes = await getAdminProvider(provRes.body.id, adminToken);
      expect(adminRes.body.ageConfirmedAt).not.toBeNull();
    }));

    it('registration without ageConfirmed stores a null ageConfirmedAt', runTest(async () => {
      const provRes = await registerProviderViaOnboarding({});
      expect(provRes.status).toBe(201);

      const { token: adminToken } = await createTestAdmin(ctx.dataSource);
      const adminRes = await getAdminProvider(provRes.body.id, adminToken);
      expect(adminRes.body.ageConfirmedAt).toBeNull();
    }));
  });

  describe('home visits require an identity-verified provider (BUG-092)', () => {
    const FUTURE_DATE = '2026-12-15';

    const createClientAddress = async (clientToken: string): Promise<string> => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/users/me/addresses')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          street: 'Sonnenallee',
          houseNumber: '50',
          postalCode: '12045',
          city: 'Berlin',
        })
        .expect(201);
      return res.body.id as string;
    };

    it('mobile booking at an unverified provider is rejected with 400', runTest(async () => {
      const { token: clientToken } = await createTestClient(ctx.dataSource);
      const { provider, services } = await createTestProvider(ctx.dataSource, {
        serviceCount: 1,
        providerOverrides: { status: ProviderStatus.APPROVED, identityVerifiedAt: null },
      });
      const addressId = await createClientAddress(clientToken);

      await request(ctx.app.getHttpServer())
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          providerId: provider.id,
          serviceIds: [services[0].id],
          scheduledDate: FUTURE_DATE,
          scheduledTime: '10:00',
          isMobile: true,
          addressId,
        })
        .expect(400);
    }));

    it('mobile booking at an identity-verified provider succeeds with isMobile true', runTest(async () => {
      const { token: clientToken } = await createTestClient(ctx.dataSource);
      const { provider, services } = await createTestProvider(ctx.dataSource, {
        serviceCount: 1,
        providerOverrides: { status: ProviderStatus.APPROVED, identityVerifiedAt: new Date() },
      });
      const addressId = await createClientAddress(clientToken);

      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          providerId: provider.id,
          serviceIds: [services[0].id],
          scheduledDate: FUTURE_DATE,
          scheduledTime: '10:00',
          isMobile: true,
          addressId,
        })
        .expect(201);

      expect(res.body.booking.isMobile).toBe(true);
    }));

    it('studio booking at an unverified provider succeeds with isMobile false', runTest(async () => {
      const { token: clientToken } = await createTestClient(ctx.dataSource);
      const { provider, services } = await createTestProvider(ctx.dataSource, {
        serviceCount: 1,
        providerOverrides: { status: ProviderStatus.APPROVED, identityVerifiedAt: null },
      });

      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          providerId: provider.id,
          serviceIds: [services[0].id],
          scheduledDate: FUTURE_DATE,
          scheduledTime: '10:00',
          isMobile: false,
        })
        .expect(201);

      expect(res.body.booking.isMobile).toBe(false);
    }));
  });
});
