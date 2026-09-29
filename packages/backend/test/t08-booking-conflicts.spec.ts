import request from 'supertest';
import { createTestApp, closeTestApp, truncateAllTables, isDatabaseAvailable, TestAppContext } from './test-bootstrap';
import { createTestClient, createTestProvider } from './test-factories';

describe('T08: Booking Creation and Conflicts', () => {
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

  it('creates booking with HC-YYYYMMDD-NNNN number, calculates total price, and rejects conflicts and invalid date formats', runTest(async () => {
    const { token: clientToken } = await createTestClient(ctx.dataSource);
    const { provider, services, token: providerToken } = await createTestProvider(ctx.dataSource, { serviceCount: 2 });

    const scheduledDate = '2026-11-18'; // Wednesday
    const scheduledTime = '11:00';
    const expectedPrice = services.reduce((sum, s) => sum + Number(s.price), 0);

    // 1. Create first booking: asserts HTTP 201 Created, status PENDING, format HC-YYYYMMDD-NNNN, and correct totalPrice
    const bookingRes1 = await request(ctx.app.getHttpServer())
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        providerId: provider.id,
        serviceIds: services.map((s) => s.id),
        scheduledDate,
        scheduledTime,
        isMobile: false,
        clientNotes: 'First booking',
      })
      .expect(201);

    const booking1 = bookingRes1.body.booking || bookingRes1.body;
    expect(booking1.status).toBe('PENDING');
    expect(booking1.bookingNumber).toMatch(/^HC-\d{8}-\d{4}$/);
    expect(Number(booking1.totalPrice)).toBe(expectedPrice);

    // 2. Attempting to book the SAME slot twice: asserts HTTP 409 Conflict
    const { token: otherClientToken } = await createTestClient(ctx.dataSource);
    await request(ctx.app.getHttpServer())
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${otherClientToken}`)
      .send({
        providerId: provider.id,
        serviceIds: [services[0].id],
        scheduledDate,
        scheduledTime,
        isMobile: false,
      })
      .expect(409);

    // 3. Malformed date string rejected: asserts HTTP 400 Bad Request
    await request(ctx.app.getHttpServer())
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        providerId: provider.id,
        serviceIds: [services[0].id],
        scheduledDate: 'invalid-date',
        scheduledTime: '10:00',
        isMobile: false,
      })
      .expect(400);

    // 4. Booking on a blocked time is rejected: asserts HTTP 409 Conflict
    const blockDate = '2026-11-20';
    await request(ctx.app.getHttpServer())
      .post('/api/v1/providers/me/blocks')
      .set('Authorization', `Bearer ${providerToken}`)
      .send({
        startDate: blockDate,
        endDate: blockDate,
        isAllDay: true,
        reason: 'Vacation',
      })
      .expect(201);

    await request(ctx.app.getHttpServer())
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        providerId: provider.id,
        serviceIds: [services[0].id],
        scheduledDate: blockDate,
        scheduledTime: '10:00',
        isMobile: false,
      })
      .expect(409);
  }));

  it('rejects booking with yesterday date', runTest(async () => {
    const { token: clientToken } = await createTestClient(ctx.dataSource);
    const { provider, services } = await createTestProvider(ctx.dataSource);

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Attempt to book with yesterday's date: expected to fail with HTTP 400 Bad Request
    await request(ctx.app.getHttpServer())
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        providerId: provider.id,
        serviceIds: [services[0].id],
        scheduledDate: yesterday,
        scheduledTime: '10:00',
        isMobile: false,
      })
      .expect(400);
  }));

  it('rejects booking outside provider opening hours and on a closed day', runTest(async () => {
    const { token: clientToken } = await createTestClient(ctx.dataSource);
    const { provider, services, token: providerToken } = await createTestProvider(ctx.dataSource);

    // 1. Outside opening hours: provider is open 08:00 - 20:00; booking at 22:00: asserts HTTP 400 Bad Request
    const outOfHoursRes = await request(ctx.app.getHttpServer())
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        providerId: provider.id,
        serviceIds: [services[0].id],
        scheduledDate: '2026-11-18', // Wednesday (open day)
        scheduledTime: '22:00',
        isMobile: false,
      })
      .expect(400);

    expect(outOfHoursRes.body.message).toMatch(/nur zwischen .* und .* verfügbar/i);

    // 2. Closed day: set Sunday (dayOfWeek = 0) to closed
    await request(ctx.app.getHttpServer())
      .put('/api/v1/providers/me/availability')
      .set('Authorization', `Bearer ${providerToken}`)
      .send({
        schedule: [
          { dayOfWeek: 0, isOpen: false, openTime: '08:00', closeTime: '20:00' },
          { dayOfWeek: 1, isOpen: true, openTime: '08:00', closeTime: '20:00' },
          { dayOfWeek: 2, isOpen: true, openTime: '08:00', closeTime: '20:00' },
          { dayOfWeek: 3, isOpen: true, openTime: '08:00', closeTime: '20:00' },
          { dayOfWeek: 4, isOpen: true, openTime: '08:00', closeTime: '20:00' },
          { dayOfWeek: 5, isOpen: true, openTime: '08:00', closeTime: '20:00' },
          { dayOfWeek: 6, isOpen: true, openTime: '08:00', closeTime: '20:00' },
        ],
      })
      .expect(200);

    // Attempt booking on Sunday (2026-11-22): asserts HTTP 400 Bad Request
    const closedDayRes = await request(ctx.app.getHttpServer())
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        providerId: provider.id,
        serviceIds: [services[0].id],
        scheduledDate: '2026-11-22', // Sunday
        scheduledTime: '12:00',
        isMobile: false,
      })
      .expect(400);

    expect(closedDayRes.body.message).toMatch(/an diesem Wochentag nicht verfuegbar/i);
  }));

  it('increments daily counter when two bookings are created on the same day (second number is +1)', runTest(async () => {
    const { token: clientToken } = await createTestClient(ctx.dataSource);
    const { provider, services } = await createTestProvider(ctx.dataSource);

    const testDate = '2026-11-19';

    // 1. First booking on testDate at 10:00
    const res1 = await request(ctx.app.getHttpServer())
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        providerId: provider.id,
        serviceIds: [services[0].id],
        scheduledDate: testDate,
        scheduledTime: '10:00',
        isMobile: false,
      })
      .expect(201);

    const bookingNum1 = (res1.body.booking || res1.body).bookingNumber;
    expect(bookingNum1).toMatch(/^HC-20261119-\d{4}$/);

    // 2. Second booking on same day at 14:00 (non-overlapping slot)
    const { token: client2Token } = await createTestClient(ctx.dataSource);
    const res2 = await request(ctx.app.getHttpServer())
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${client2Token}`)
      .send({
        providerId: provider.id,
        serviceIds: [services[0].id],
        scheduledDate: testDate,
        scheduledTime: '14:00',
        isMobile: false,
      })
      .expect(201);

    const bookingNum2 = (res2.body.booking || res2.body).bookingNumber;
    expect(bookingNum2).toMatch(/^HC-20261119-\d{4}$/);

    // 3. Counter assertion: second booking counter is exactly first booking counter + 1
    const counter1 = parseInt(bookingNum1.split('-')[2], 10);
    const counter2 = parseInt(bookingNum2.split('-')[2], 10);
    expect(counter2).toBe(counter1 + 1);
  }));

  it('provider search returns only approved providers, hiding pending or suspended providers', runTest(async () => {
    // 1. Create an approved provider
    const { provider: approvedProvider } = await createTestProvider(ctx.dataSource);

    // 2. Create a pending provider and a suspended provider
    const { provider: pendingProvider } = await createTestProvider(ctx.dataSource, {
      providerOverrides: { status: 'pending' as any },
    });
    const { provider: suspendedProvider } = await createTestProvider(ctx.dataSource, {
      providerOverrides: { status: 'suspended' as any },
    });

    // 3. Query public search GET /api/v1/providers
    const searchRes = await request(ctx.app.getHttpServer())
      .get('/api/v1/providers')
      .expect(200);

    const providersList = searchRes.body.data || searchRes.body || [];
    const ids = providersList.map((p: any) => p.id);

    // Asserts approved provider is present
    expect(ids).toContain(approvedProvider.id);
    // Asserts non-approved providers are excluded
    expect(ids).not.toContain(pendingProvider.id);
    expect(ids).not.toContain(suspendedProvider.id);
  }));
});
