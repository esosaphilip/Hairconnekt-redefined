import request from 'supertest';
import {
  createTestApp,
  closeTestApp,
  truncateAllTables,
  isDatabaseAvailable,
  TestAppContext,
} from './test-bootstrap';
import { createTestProvider } from './test-factories';
import { ProviderStatus } from '../src/entities/provider.entity';
import {
  isPublicProviderStatus,
  toPublicProviderProfile,
  PUBLIC_PROVIDER_PROFILE_KEYS,
} from '../src/providers/public-provider';

describe('T20: Public provider visibility (BUG-058, BUG-059 phase 1)', () => {
  describe('isPublicProviderStatus', () => {
    it('returns true for APPROVED', () => {
      expect(isPublicProviderStatus(ProviderStatus.APPROVED)).toBe(true);
    });

    it('returns false for PENDING', () => {
      expect(isPublicProviderStatus(ProviderStatus.PENDING)).toBe(false);
    });

    it('returns false for REJECTED', () => {
      expect(isPublicProviderStatus(ProviderStatus.REJECTED)).toBe(false);
    });

    it('returns false for SUSPENDED', () => {
      expect(isPublicProviderStatus(ProviderStatus.SUSPENDED)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isPublicProviderStatus(undefined)).toBe(false);
    });

    it('returns false for null', () => {
      expect(isPublicProviderStatus(null)).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(isPublicProviderStatus('')).toBe(false);
    });
  });

  describe('toPublicProviderProfile', () => {
    const fullProvider = {
      id: 'provider-id-123',
      userId: 'user-id-123',
      providerType: 'salon',
      businessName: 'Braids Studio',
      bio: 'Best braids in town',
      city: 'Berlin',
      serviceRadius: 25,
      languages: ['de', 'en'],
      cancellationPolicy: 'H24',
      avgRating: 4.8,
      totalReviews: 12,
      isOnline: true,
      experienceYears: 7,
      avatarUrl: 'https://example.com/avatar.jpg',
      status: ProviderStatus.APPROVED,
      idDocumentUrl: 'id-documents/secret.jpg',
      street: 'Friedrichstraße',
      houseNumber: '100',
      postalCode: '10117',
      bufferMinutes: 15,
      lat: 52.5186,
      lng: 13.3895,
      portfolioMarketingConsent: true,
      portfolioMarketingConsentAt: new Date('2026-01-01'),
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-02-01'),
      deletedAt: null,
    } as any;

    const computed = { startingPrice: 40, distanceKm: 2.3 };

    it('returns exactly the whitelist keys', () => {
      const result = toPublicProviderProfile(fullProvider, computed);
      expect(Object.keys(result).sort()).toEqual(
        [...PUBLIC_PROVIDER_PROFILE_KEYS].sort(),
      );
    });

    it('copies id', () => {
      const result = toPublicProviderProfile(fullProvider, computed);
      expect(result.id).toBe('provider-id-123');
    });

    it('keeps userId (temporary for chat)', () => {
      const result = toPublicProviderProfile(fullProvider, computed);
      expect(result.userId).toBe('user-id-123');
    });

    it('copies businessName', () => {
      const result = toPublicProviderProfile(fullProvider, computed);
      expect(result.businessName).toBe('Braids Studio');
    });

    it('copies startingPrice from computed', () => {
      const result = toPublicProviderProfile(fullProvider, computed);
      expect(result.startingPrice).toBe(40);
    });

    it('copies distanceKm from computed', () => {
      const result = toPublicProviderProfile(fullProvider, computed);
      expect(result.distanceKm).toBe(2.3);
    });

    it('does not contain forbidden fields', () => {
      const result = toPublicProviderProfile(fullProvider, computed) as Record<string, unknown>;
      const forbidden = [
        'portfolioMarketingConsent',
        'portfolioMarketingConsentAt',
        'createdAt',
        'updatedAt',
        'deletedAt',
        'status',
        'idDocumentUrl',
        'street',
        'houseNumber',
        'postalCode',
        'bufferMinutes',
        'lat',
        'lng',
      ];
      for (const key of forbidden) {
        expect(result).not.toHaveProperty(key);
      }
    });
  });

  describe('public profile and slots endpoints', () => {
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

    const FUTURE_DATE = '2026-12-01';

    describe('GET /providers/:id', () => {
      it('returns 200 for an approved provider', runTest(async () => {
        const { provider } = await createTestProvider(ctx.dataSource, {
          providerOverrides: { status: ProviderStatus.APPROVED },
        });

        const res = await request(ctx.app.getHttpServer())
          .get(`/api/v1/providers/${provider.id}`)
          .expect(200);

        expect(res.body.id).toBe(provider.id);
      }));

      it('returns 404 for a pending provider', runTest(async () => {
        const { provider } = await createTestProvider(ctx.dataSource, {
          providerOverrides: { status: ProviderStatus.PENDING },
        });

        await request(ctx.app.getHttpServer())
          .get(`/api/v1/providers/${provider.id}`)
          .expect(404);
      }));

      it('returns 404 for a rejected provider', runTest(async () => {
        const { provider } = await createTestProvider(ctx.dataSource, {
          providerOverrides: { status: ProviderStatus.REJECTED },
        });

        await request(ctx.app.getHttpServer())
          .get(`/api/v1/providers/${provider.id}`)
          .expect(404);
      }));

      it('returns 404 for a suspended provider', runTest(async () => {
        const { provider } = await createTestProvider(ctx.dataSource, {
          providerOverrides: { status: ProviderStatus.SUSPENDED },
        });

        await request(ctx.app.getHttpServer())
          .get(`/api/v1/providers/${provider.id}`)
          .expect(404);
      }));

      it('returns 404 for an unknown UUID', runTest(async () => {
        await request(ctx.app.getHttpServer())
          .get('/api/v1/providers/00000000-0000-0000-0000-000000000000')
          .expect(404);
      }));

      it('returns 400 for a non-UUID id', runTest(async () => {
        await request(ctx.app.getHttpServer())
          .get('/api/v1/providers/not-a-uuid')
          .expect(400);
      }));

      it('approved provider profile returns exactly the whitelist keys and userId', runTest(async () => {
        const { provider } = await createTestProvider(ctx.dataSource, {
          providerOverrides: { status: ProviderStatus.APPROVED },
        });

        const res = await request(ctx.app.getHttpServer())
          .get(`/api/v1/providers/${provider.id}`)
          .expect(200);

        expect(Object.keys(res.body).sort()).toEqual(
          [...PUBLIC_PROVIDER_PROFILE_KEYS].sort(),
        );
        expect(res.body.userId).toBe(provider.userId);

        const forbidden = [
          'portfolioMarketingConsent',
          'portfolioMarketingConsentAt',
          'createdAt',
          'updatedAt',
          'deletedAt',
          'status',
          'street',
          'postalCode',
          'lat',
          'lng',
          'idDocumentUrl',
        ];
        for (const key of forbidden) {
          expect(res.body).not.toHaveProperty(key);
        }
      }));
    });

    describe('GET /providers/:id/slots', () => {
      it('returns 200 for an approved provider', runTest(async () => {
        const { provider } = await createTestProvider(ctx.dataSource, {
          providerOverrides: { status: ProviderStatus.APPROVED },
        });

        const res = await request(ctx.app.getHttpServer())
          .get(`/api/v1/providers/${provider.id}/slots?date=${FUTURE_DATE}`)
          .expect(200);

        expect(res.body.providerId).toBe(provider.id);
        expect(Array.isArray(res.body.slots)).toBe(true);
      }));

      it('returns 404 for a pending provider', runTest(async () => {
        const { provider } = await createTestProvider(ctx.dataSource, {
          providerOverrides: { status: ProviderStatus.PENDING },
        });

        await request(ctx.app.getHttpServer())
          .get(`/api/v1/providers/${provider.id}/slots?date=${FUTURE_DATE}`)
          .expect(404);
      }));

      it('returns 404 for a rejected provider', runTest(async () => {
        const { provider } = await createTestProvider(ctx.dataSource, {
          providerOverrides: { status: ProviderStatus.REJECTED },
        });

        await request(ctx.app.getHttpServer())
          .get(`/api/v1/providers/${provider.id}/slots?date=${FUTURE_DATE}`)
          .expect(404);
      }));

      it('returns 404 for a suspended provider', runTest(async () => {
        const { provider } = await createTestProvider(ctx.dataSource, {
          providerOverrides: { status: ProviderStatus.SUSPENDED },
        });

        await request(ctx.app.getHttpServer())
          .get(`/api/v1/providers/${provider.id}/slots?date=${FUTURE_DATE}`)
          .expect(404);
      }));
    });

    describe('phase 2 guard: services / portfolio / reviews stay readable for pending braiders', () => {
      it('pending provider services stay readable until BUG-058 phase 2 (braider preview depends on it)', runTest(async () => {
        const { provider } = await createTestProvider(ctx.dataSource, {
          providerOverrides: { status: ProviderStatus.PENDING },
        });

        const res = await request(ctx.app.getHttpServer())
          .get(`/api/v1/providers/${provider.id}/services`)
          .expect(200);

        expect(Array.isArray(res.body)).toBe(true);
      }));

      it('pending provider portfolio stays readable until BUG-058 phase 2 (braider preview depends on it)', runTest(async () => {
        const { provider } = await createTestProvider(ctx.dataSource, {
          providerOverrides: { status: ProviderStatus.PENDING },
        });

        const res = await request(ctx.app.getHttpServer())
          .get(`/api/v1/providers/${provider.id}/portfolio`)
          .expect(200);

        expect(Array.isArray(res.body)).toBe(true);
      }));

      it('pending provider reviews stay readable until BUG-058 phase 2 (braider preview depends on it)', runTest(async () => {
        const { provider } = await createTestProvider(ctx.dataSource, {
          providerOverrides: { status: ProviderStatus.PENDING },
        });

        const res = await request(ctx.app.getHttpServer())
          .get(`/api/v1/providers/${provider.id}/reviews`)
          .expect(200);

        expect(res.body).toHaveProperty('data');
      }));
    });
  });
});
