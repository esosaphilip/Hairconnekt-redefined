import request from 'supertest';
import { createTestApp, closeTestApp, truncateAllTables, isDatabaseAvailable, TestAppContext } from './test-bootstrap';
import { createTestClient, createTestProvider, createTestBooking, createTestAdmin } from './test-factories';
import { BookingStatus } from '../src/entities/booking.entity';
import { ProviderStatus } from '../src/entities/provider.entity';
import { Gender } from '../src/entities/user.entity';
import { Address } from '../src/entities/address.entity';
import { freezeClock, unfreezeClock } from './test-time';

describe('T16: Booking Response Privacy & Allowed Field Serialization (BUG-045)', () => {
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

  afterEach(() => {
    unfreezeClock();
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

  /**
   * Deep key scanner that recursively walks the entire JSON response
   * and throws if any forbidden/sensitive key is found anywhere.
   */
  function assertNoPrivateFields(obj: any, path = ''): void {
    if (obj === null || obj === undefined || typeof obj !== 'object') {
      return;
    }

    const forbiddenKeys = [
      'idDocumentUrl',
      'lat',
      'lng',
      'email',
      'birthDate',
      'gender',
      'googleId',
      'expoPushToken',
      'passwordHash',
      'emailVerificationCode',
      'emailVerificationExpires',
      'bufferMinutes',
      'portfolioMarketingConsent',
      'portfolioMarketingConsentAt',
    ];

    if (Array.isArray(obj)) {
      obj.forEach((item, index) => assertNoPrivateFields(item, `${path}[${index}]`));
      return;
    }

    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;

      if (forbiddenKeys.includes(key)) {
        throw new Error(`Private field leak detected: "${currentPath}" is present in response!`);
      }

      // 'status' is strictly forbidden under provider object
      if (key === 'status' && (path.endsWith('provider') || path.includes('.provider'))) {
        throw new Error(`Private provider field leak detected: "${currentPath}" is present under provider!`);
      }

      assertNoPrivateFields(value, currentPath);
    }
  }

  function assertProviderAddressPresent(provider: any, expectedStreet: string, expectedHouseNumber: string, expectedPostalCode: string): void {
    expect(provider).toBeDefined();
    expect(provider.street).toBe(expectedStreet);
    expect(provider.houseNumber).toBe(expectedHouseNumber);
    expect(provider.postalCode).toBe(expectedPostalCode);
  }

  function assertProviderAddressAbsent(provider: any): void {
    expect(provider).toBeDefined();
    expect(provider.street).toBeUndefined();
    expect(provider.houseNumber).toBeUndefined();
    expect(provider.postalCode).toBeUndefined();
  }

  it('deep scan verifies no private fields leak across all booking endpoints (POST, GET, PATCH)', runTest(async () => {
    // Freeze clock for appointment start window:
    // Berlin is CEST (UTC+2) in October, so 10:00 Berlin = 08:00 UTC.
    // 07:45 UTC is 15 minutes before 08:00 UTC (valid for creation & within 30m start window).
    freezeClock('2026-10-20T07:45:00Z');

    // 1. Create client and provider with rich sensitive data populated
    const clientUserOverrides = {
      phone: '+491701112233',
      birthDate: new Date('1992-04-10'),
      gender: Gender.FEMALE,
      googleId: 'google-sub-client-12345',
      expoPushToken: 'ExponentPushToken[client-push-token-test]',
    };
    const { user: client, token: clientToken } = await createTestClient(ctx.dataSource, clientUserOverrides);

    const providerUserOverrides = {
      phone: '+491704445566',
      birthDate: new Date('1988-08-20'),
      gender: Gender.FEMALE,
      googleId: 'google-sub-provider-67890',
      expoPushToken: 'ExponentPushToken[provider-push-token-test]',
    };
    const providerOverrides = {
      businessName: 'Braids Palace Berlin',
      street: 'Friedrichstraße',
      houseNumber: '100',
      postalCode: '10117',
      city: 'Berlin',
      lat: 52.5186,
      lng: 13.3895,
      idDocumentUrl: 'id-documents/super-secret-passport-photo.jpg',
      bufferMinutes: 20,
      portfolioMarketingConsent: true,
      portfolioMarketingConsentAt: new Date('2026-01-01T00:00:00Z'),
      status: ProviderStatus.APPROVED,
    };
    const { provider, services, token: providerToken } = await createTestProvider(ctx.dataSource, {
      userOverrides: providerUserOverrides,
      providerOverrides,
      serviceCount: 2,
    });

    // Save a client address for mobile booking
    const addressRepo = ctx.dataSource.getRepository(Address);
    const savedAddress = await addressRepo.save(
      addressRepo.create({
        userId: client.id,
        street: 'Sonnenallee',
        houseNumber: '50',
        postalCode: '12045',
        city: 'Berlin',
        isDefault: true,
      }),
    );

    const scheduledDate = '2026-10-20';
    const scheduledTime = '10:00';

    // ─── 1. POST /api/v1/bookings (as client) ──────────────────────────────
    const createRes = await request(ctx.app.getHttpServer())
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        providerId: provider.id,
        serviceIds: [services[0].id],
        scheduledDate,
        scheduledTime,
        isMobile: true,
        addressId: savedAddress.id,
        clientNotes: 'Privacy verification booking',
      })
      .expect(201);

    assertNoPrivateFields(createRes.body);
    const createdBooking = createRes.body.booking;
    expect(createdBooking.status).toBe('PENDING');
    assertProviderAddressAbsent(createdBooking.provider);

    // ─── 2. GET /api/v1/bookings (as client) ────────────────────────────────
    const clientListRes = await request(ctx.app.getHttpServer())
      .get('/api/v1/bookings')
      .set('Authorization', `Bearer ${clientToken}`)
      .expect(200);

    assertNoPrivateFields(clientListRes.body);
    expect(clientListRes.body.data.length).toBeGreaterThan(0);
    assertProviderAddressAbsent(clientListRes.body.data[0].provider);

    // ─── 3. GET /api/v1/bookings/:id (as client, PENDING) ───────────────────
    const clientGetPendingRes = await request(ctx.app.getHttpServer())
      .get(`/api/v1/bookings/${createdBooking.id}`)
      .set('Authorization', `Bearer ${clientToken}`)
      .expect(200);

    assertNoPrivateFields(clientGetPendingRes.body);
    assertProviderAddressAbsent(clientGetPendingRes.body.provider);

    // ─── 4. GET /api/v1/bookings (as provider) ──────────────────────────────
    const providerListRes = await request(ctx.app.getHttpServer())
      .get('/api/v1/bookings')
      .set('Authorization', `Bearer ${providerToken}`)
      .expect(200);

    assertNoPrivateFields(providerListRes.body);
    expect(providerListRes.body.data.length).toBeGreaterThan(0);
    assertProviderAddressAbsent(providerListRes.body.data[0].provider);

    // ─── 5. GET /api/v1/bookings/:id (as provider) ──────────────────────────
    const providerGetRes = await request(ctx.app.getHttpServer())
      .get(`/api/v1/bookings/${createdBooking.id}`)
      .set('Authorization', `Bearer ${providerToken}`)
      .expect(200);

    assertNoPrivateFields(providerGetRes.body);
    assertProviderAddressAbsent(providerGetRes.body.provider);

    // ─── 6. PATCH /api/v1/bookings/:id/accept (as provider) ─────────────────
    const acceptRes = await request(ctx.app.getHttpServer())
      .patch(`/api/v1/bookings/${createdBooking.id}/accept`)
      .set('Authorization', `Bearer ${providerToken}`)
      .expect(200);

    assertNoPrivateFields(acceptRes.body);
    expect(acceptRes.body.status).toBe('CONFIRMED');
    // Provider caller never receives provider street/houseNumber/postalCode
    assertProviderAddressAbsent(acceptRes.body.provider);

    // Client GET /bookings/:id on CONFIRMED booking receives provider address
    const clientGetConfirmedRes = await request(ctx.app.getHttpServer())
      .get(`/api/v1/bookings/${createdBooking.id}`)
      .set('Authorization', `Bearer ${clientToken}`)
      .expect(200);

    assertNoPrivateFields(clientGetConfirmedRes.body);
    assertProviderAddressPresent(clientGetConfirmedRes.body.provider, 'Friedrichstraße', '100', '10117');

    // ─── 7. PATCH /api/v1/bookings/:id/start (as provider) ──────────────────
    // Clock is 07:45 UTC (09:45 Berlin), which is within 30m of 10:00 Berlin (08:00 UTC)
    const startRes = await request(ctx.app.getHttpServer())
      .patch(`/api/v1/bookings/${createdBooking.id}/start`)
      .set('Authorization', `Bearer ${providerToken}`)
      .expect(200);

    assertNoPrivateFields(startRes.body);
    expect(startRes.body.status).toBe('IN_PROGRESS');

    // ─── 8. PATCH /api/v1/bookings/:id/complete (as provider) ───────────────
    const completeRes = await request(ctx.app.getHttpServer())
      .patch(`/api/v1/bookings/${createdBooking.id}/complete`)
      .set('Authorization', `Bearer ${providerToken}`)
      .expect(200);

    assertNoPrivateFields(completeRes.body);
    expect(completeRes.body.status).toBe('COMPLETED');

    // ─── 9. PATCH /api/v1/bookings/:id/reschedule (as client) ───────────────
    const confirmedBookingForReschedule = await createTestBooking(ctx.dataSource, {
      client,
      provider,
      services: [services[0]],
      status: BookingStatus.CONFIRMED,
      scheduledDate: '2026-10-21',
      scheduledTime: '11:00',
    });

    const rescheduleRes = await request(ctx.app.getHttpServer())
      .patch(`/api/v1/bookings/${confirmedBookingForReschedule.id}/reschedule`)
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        scheduledDate: '2026-10-21',
        scheduledTime: '14:00',
      })
      .expect(200);

    assertNoPrivateFields(rescheduleRes.body);

    // ─── 10. PATCH /api/v1/bookings/:id/decline on a new booking ────────────
    const pendingBookingForDecline = await createTestBooking(ctx.dataSource, {
      client,
      provider,
      services: [services[0]],
      status: BookingStatus.PENDING,
      scheduledDate: '2026-10-21',
      scheduledTime: '16:00',
    });

    const declineRes = await request(ctx.app.getHttpServer())
      .patch(`/api/v1/bookings/${pendingBookingForDecline.id}/decline`)
      .set('Authorization', `Bearer ${providerToken}`)
      .expect(200);

    assertNoPrivateFields(declineRes.body);
    expect(declineRes.body.status).toBe('CANCELLED');

    // ─── 11. PATCH /api/v1/bookings/:id/cancel on another booking ───────────
    const confirmedBookingForCancel = await createTestBooking(ctx.dataSource, {
      client,
      provider,
      services: [services[0]],
      status: BookingStatus.CONFIRMED,
      scheduledDate: '2026-10-22',
      scheduledTime: '15:00',
    });

    const cancelRes = await request(ctx.app.getHttpServer())
      .patch(`/api/v1/bookings/${confirmedBookingForCancel.id}/cancel`)
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ reason: 'Andere Pläne', notes: 'Change of plans' })
      .expect(200);

    assertNoPrivateFields(cancelRes.body);
    expect(cancelRes.body.status).toBe('CANCELLED');
    // Once cancelled, provider address must be absent even for client
    assertProviderAddressAbsent(cancelRes.body.provider);
  }));

  it('enforces provider address rule: absent when PENDING or CANCELLED, present when CONFIRMED for client, absent for provider', runTest(async () => {
    const { user: client, token: clientToken } = await createTestClient(ctx.dataSource);
    const { provider, services, token: providerToken } = await createTestProvider(ctx.dataSource, {
      providerOverrides: {
        street: 'Kurfürstendamm',
        houseNumber: '25',
        postalCode: '10719',
        city: 'Berlin',
      },
    });

    // 1. PENDING booking as client: provider address is ABSENT
    const booking = await createTestBooking(ctx.dataSource, {
      client,
      provider,
      services,
      status: BookingStatus.PENDING,
      scheduledDate: '2026-10-25',
      scheduledTime: '12:00',
    });

    const pendingClientRes = await request(ctx.app.getHttpServer())
      .get(`/api/v1/bookings/${booking.id}`)
      .set('Authorization', `Bearer ${clientToken}`)
      .expect(200);

    assertProviderAddressAbsent(pendingClientRes.body.provider);
    expect(pendingClientRes.body.provider.city).toBe('Berlin');

    // 2. Accept booking -> CONFIRMED
    await request(ctx.app.getHttpServer())
      .patch(`/api/v1/bookings/${booking.id}/accept`)
      .set('Authorization', `Bearer ${providerToken}`)
      .expect(200);

    // CONFIRMED booking as client: provider address is PRESENT and exact
    const confirmedClientRes = await request(ctx.app.getHttpServer())
      .get(`/api/v1/bookings/${booking.id}`)
      .set('Authorization', `Bearer ${clientToken}`)
      .expect(200);

    assertProviderAddressPresent(confirmedClientRes.body.provider, 'Kurfürstendamm', '25', '10719');
    expect(confirmedClientRes.body.provider.city).toBe('Berlin');

    // CONFIRMED booking as provider: provider address is ABSENT
    const confirmedProviderRes = await request(ctx.app.getHttpServer())
      .get(`/api/v1/bookings/${booking.id}`)
      .set('Authorization', `Bearer ${providerToken}`)
      .expect(200);

    assertProviderAddressAbsent(confirmedProviderRes.body.provider);
    expect(confirmedProviderRes.body.provider.city).toBe('Berlin');

    // 3. Cancel booking -> CANCELLED
    await request(ctx.app.getHttpServer())
      .patch(`/api/v1/bookings/${booking.id}/cancel`)
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ reason: 'Sonstiges', notes: 'Need to cancel' })
      .expect(200);

    // CANCELLED booking as client: provider address is ABSENT again
    const cancelledClientRes = await request(ctx.app.getHttpServer())
      .get(`/api/v1/bookings/${booking.id}`)
      .set('Authorization', `Bearer ${clientToken}`)
      .expect(200);

    assertProviderAddressAbsent(cancelledClientRes.body.provider);
    expect(cancelledClientRes.body.provider.city).toBe('Berlin');
  }));

  it('preserves still-needed fields: provider.user.phone, client.phone, provider.businessName, provider.city, and top-level isMobile/address', runTest(async () => {
    const { user: client, token: clientToken } = await createTestClient(ctx.dataSource, {
      phone: '+491510000001',
      firstName: 'Alice',
      lastName: 'Client',
    });
    const { provider, services, token: providerToken } = await createTestProvider(ctx.dataSource, {
      userOverrides: {
        phone: '+491520000002',
        firstName: 'Bob',
        lastName: 'Braider',
      },
      providerOverrides: {
        businessName: 'Braids by Bob',
        city: 'Hamburg',
      },
    });

    const addressRepo = ctx.dataSource.getRepository(Address);
    const mobileAddress = await addressRepo.save(
      addressRepo.create({
        userId: client.id,
        street: 'Mönckebergstraße',
        houseNumber: '7',
        postalCode: '20095',
        city: 'Hamburg',
        isDefault: true,
      }),
    );

    const bookingRes = await request(ctx.app.getHttpServer())
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        providerId: provider.id,
        serviceIds: [services[0].id],
        scheduledDate: '2026-10-28',
        scheduledTime: '13:00',
        isMobile: true,
        addressId: mobileAddress.id,
      })
      .expect(201);

    const b = bookingRes.body.booking;

    // Verify still-needed fields on provider
    expect(b.provider.businessName).toBe('Braids by Bob');
    expect(b.provider.city).toBe('Hamburg');
    expect(b.provider.user.phone).toBe('+491520000002');
    expect(b.provider.user.firstName).toBe('Bob');
    expect(b.provider.user.lastName).toBe('Braider');

    // Verify still-needed fields on client
    expect(b.client.phone).toBe('+491510000001');
    expect(b.client.firstName).toBe('Alice');
    expect(b.client.lastName).toBe('Client');

    // Verify top-level mobile booking address snapshot
    expect(b.isMobile).toBe(true);
    expect(b.address).toEqual({
      street: 'Mönckebergstraße',
      houseNumber: '7',
      postalCode: '20095',
      city: 'Hamburg',
    });
  }));
});
