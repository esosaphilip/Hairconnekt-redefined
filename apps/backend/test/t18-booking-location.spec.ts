import request from 'supertest';
import { createTestApp, closeTestApp, truncateAllTables, isDatabaseAvailable, TestAppContext } from './test-bootstrap';
import { createTestClient, createTestProvider, createTestBooking } from './test-factories';
import { BookingStatus } from '../src/entities/booking.entity';
import { Address } from '../src/entities/address.entity';
import { freezeClock, unfreezeClock } from './test-time';

describe('T18: Booking Location Privacy & Default Address Rules (BUG-041 & BUG-042)', () => {
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
   * Asserts that none of the four raw snapshot columns are present in the response object
   */
  function assertNoRawAddressColumns(obj: any, path = ''): void {
    if (obj === null || obj === undefined || typeof obj !== 'object') {
      return;
    }
    const forbiddenRawKeys = [
      'addressStreet',
      'addressHouseNumber',
      'addressCity',
      'addressPostalCode',
    ];
    if (Array.isArray(obj)) {
      obj.forEach((item, index) => assertNoRawAddressColumns(item, `${path}[${index}]`));
      return;
    }
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;
      if (forbiddenRawKeys.includes(key)) {
        throw new Error(`Raw address column leak detected: "${currentPath}" is present in response!`);
      }
      assertNoRawAddressColumns(value, currentPath);
    }
  }

  // ─── 1. Provider reading PENDING mobile booking ─────────────────────────────
  it('provider reading a PENDING mobile booking gets postalCode and city with street and houseNumber as null, and no raw address columns', runTest(async () => {
    const { user: client, token: clientToken } = await createTestClient(ctx.dataSource);
    const { provider, services, token: providerToken } = await createTestProvider(ctx.dataSource, { serviceCount: 1 });

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

    // Create mobile booking as client
    const createRes = await request(ctx.app.getHttpServer())
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        providerId: provider.id,
        serviceIds: [services[0].id],
        scheduledDate: '2026-11-10',
        scheduledTime: '10:00',
        isMobile: true,
        addressId: savedAddress.id,
      })
      .expect(201);

    const bookingId = createRes.body.booking.id;

    // Provider reads GET /api/v1/bookings/:id
    const providerGetRes = await request(ctx.app.getHttpServer())
      .get(`/api/v1/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${providerToken}`)
      .expect(200);

    const b = providerGetRes.body;
    expect(b.status).toBe('PENDING');
    expect(b.isMobile).toBe(true);
    expect(b.address).toEqual({
      street: null,
      houseNumber: null,
      postalCode: '12045',
      city: 'Berlin',
    });
    assertNoRawAddressColumns(b);

    // Provider reads GET /api/v1/bookings list
    const providerListRes = await request(ctx.app.getHttpServer())
      .get('/api/v1/bookings')
      .set('Authorization', `Bearer ${providerToken}`)
      .expect(200);

    expect(providerListRes.body.data.length).toBeGreaterThan(0);
    const listBooking = providerListRes.body.data.find((item: any) => item.id === bookingId);
    expect(listBooking).toBeDefined();
    expect(listBooking.address).toEqual({
      street: null,
      houseNumber: null,
      postalCode: '12045',
      city: 'Berlin',
    });
    assertNoRawAddressColumns(providerListRes.body);
  }));

  // ─── 2. Provider address reveal on CONFIRMED, hide on CANCELLED ─────────────
  it('reveals full address to provider when CONFIRMED, and hides street/houseNumber again after cancellation', runTest(async () => {
    const { user: client, token: clientToken } = await createTestClient(ctx.dataSource);
    const { provider, services, token: providerToken } = await createTestProvider(ctx.dataSource, { serviceCount: 1 });

    const addressRepo = ctx.dataSource.getRepository(Address);
    const savedAddress = await addressRepo.save(
      addressRepo.create({
        userId: client.id,
        street: 'Friedrichstraße',
        houseNumber: '100',
        postalCode: '10117',
        city: 'Berlin',
        isDefault: true,
      }),
    );

    const createRes = await request(ctx.app.getHttpServer())
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        providerId: provider.id,
        serviceIds: [services[0].id],
        scheduledDate: '2026-11-12',
        scheduledTime: '11:00',
        isMobile: true,
        addressId: savedAddress.id,
      })
      .expect(201);

    const bookingId = createRes.body.booking.id;

    // Provider accepts -> status becomes CONFIRMED
    const acceptRes = await request(ctx.app.getHttpServer())
      .patch(`/api/v1/bookings/${bookingId}/accept`)
      .set('Authorization', `Bearer ${providerToken}`)
      .expect(200);

    expect(acceptRes.body.status).toBe('CONFIRMED');
    expect(acceptRes.body.address).toEqual({
      street: 'Friedrichstraße',
      houseNumber: '100',
      postalCode: '10117',
      city: 'Berlin',
    });
    assertNoRawAddressColumns(acceptRes.body);

    // Provider GETs confirmed booking
    const providerConfirmedGet = await request(ctx.app.getHttpServer())
      .get(`/api/v1/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${providerToken}`)
      .expect(200);

    expect(providerConfirmedGet.body.address).toEqual({
      street: 'Friedrichstraße',
      houseNumber: '100',
      postalCode: '10117',
      city: 'Berlin',
    });

    // Client cancels the booking
    const cancelRes = await request(ctx.app.getHttpServer())
      .patch(`/api/v1/bookings/${bookingId}/cancel`)
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ reason: 'Andere Pläne', notes: 'Change of schedule' })
      .expect(200);

    expect(cancelRes.body.status).toBe('CANCELLED');

    // Provider GETs cancelled booking: street & houseNumber are masked as null
    const providerCancelledGet = await request(ctx.app.getHttpServer())
      .get(`/api/v1/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${providerToken}`)
      .expect(200);

    expect(providerCancelledGet.body.status).toBe('CANCELLED');
    expect(providerCancelledGet.body.address).toEqual({
      street: null,
      houseNumber: null,
      postalCode: '10117',
      city: 'Berlin',
    });
    assertNoRawAddressColumns(providerCancelledGet.body);
  }));

  // ─── 3. Client always gets their own full address ──────────────────────────
  it('client always gets their own full address at PENDING, CONFIRMED and CANCELLED', runTest(async () => {
    const { user: client, token: clientToken } = await createTestClient(ctx.dataSource);
    const { provider, services, token: providerToken } = await createTestProvider(ctx.dataSource, { serviceCount: 1 });

    const addressRepo = ctx.dataSource.getRepository(Address);
    const savedAddress = await addressRepo.save(
      addressRepo.create({
        userId: client.id,
        street: 'Kantstraße',
        houseNumber: '25',
        postalCode: '10623',
        city: 'Berlin',
        isDefault: true,
      }),
    );

    // PENDING state
    const createRes = await request(ctx.app.getHttpServer())
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        providerId: provider.id,
        serviceIds: [services[0].id],
        scheduledDate: '2026-11-15',
        scheduledTime: '14:00',
        isMobile: true,
        addressId: savedAddress.id,
      })
      .expect(201);

    const bookingId = createRes.body.booking.id;
    expect(createRes.body.booking.address).toEqual({
      street: 'Kantstraße',
      houseNumber: '25',
      postalCode: '10623',
      city: 'Berlin',
    });

    const clientGetPending = await request(ctx.app.getHttpServer())
      .get(`/api/v1/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${clientToken}`)
      .expect(200);

    expect(clientGetPending.body.address).toEqual({
      street: 'Kantstraße',
      houseNumber: '25',
      postalCode: '10623',
      city: 'Berlin',
    });
    assertNoRawAddressColumns(clientGetPending.body);

    // CONFIRMED state
    await request(ctx.app.getHttpServer())
      .patch(`/api/v1/bookings/${bookingId}/accept`)
      .set('Authorization', `Bearer ${providerToken}`)
      .expect(200);

    const clientGetConfirmed = await request(ctx.app.getHttpServer())
      .get(`/api/v1/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${clientToken}`)
      .expect(200);

    expect(clientGetConfirmed.body.address).toEqual({
      street: 'Kantstraße',
      houseNumber: '25',
      postalCode: '10623',
      city: 'Berlin',
    });

    // CANCELLED state
    await request(ctx.app.getHttpServer())
      .patch(`/api/v1/bookings/${bookingId}/cancel`)
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ reason: 'Andere Pläne' })
      .expect(200);

    const clientGetCancelled = await request(ctx.app.getHttpServer())
      .get(`/api/v1/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${clientToken}`)
      .expect(200);

    expect(clientGetCancelled.body.address).toEqual({
      street: 'Kantstraße',
      houseNumber: '25',
      postalCode: '10623',
      city: 'Berlin',
    });
    assertNoRawAddressColumns(clientGetCancelled.body);
  }));

  // ─── 4. Studio booking has address: null for both roles ─────────────────────
  it('studio booking has address: null for both client and provider', runTest(async () => {
    const { token: clientToken } = await createTestClient(ctx.dataSource);
    const { provider, services, token: providerToken } = await createTestProvider(ctx.dataSource, { serviceCount: 1 });

    const createRes = await request(ctx.app.getHttpServer())
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        providerId: provider.id,
        serviceIds: [services[0].id],
        scheduledDate: '2026-11-18',
        scheduledTime: '15:00',
        isMobile: false,
      })
      .expect(201);

    const bookingId = createRes.body.booking.id;
    expect(createRes.body.booking.isMobile).toBe(false);
    expect(createRes.body.booking.address).toBeNull();
    assertNoRawAddressColumns(createRes.body.booking);

    const clientGet = await request(ctx.app.getHttpServer())
      .get(`/api/v1/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${clientToken}`)
      .expect(200);

    expect(clientGet.body.address).toBeNull();
    assertNoRawAddressColumns(clientGet.body);

    const providerGet = await request(ctx.app.getHttpServer())
      .get(`/api/v1/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${providerToken}`)
      .expect(200);

    expect(providerGet.body.address).toBeNull();
    assertNoRawAddressColumns(providerGet.body);
  }));

  // ─── 5. Default address creation rules ──────────────────────────────────────
  it('first address created with isDefault: false comes back as default; a second one does not steal default unless requested', runTest(async () => {
    const { token: clientToken } = await createTestClient(ctx.dataSource);

    // 1. Create first address with isDefault: false explicitly
    const firstRes = await request(ctx.app.getHttpServer())
      .post('/api/v1/users/me/addresses')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        street: 'Hauptstraße',
        houseNumber: '1',
        postalCode: '10115',
        city: 'Berlin',
        isDefault: false,
      })
      .expect(201);

    expect(firstRes.body.isDefault).toBe(true);

    // 2. Create second address with isDefault: false
    const secondRes = await request(ctx.app.getHttpServer())
      .post('/api/v1/users/me/addresses')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        street: 'Nebenstraße',
        houseNumber: '2',
        postalCode: '10115',
        city: 'Berlin',
        isDefault: false,
      })
      .expect(201);

    expect(secondRes.body.isDefault).toBe(false);

    // Verify first address is still default
    const listRes = await request(ctx.app.getHttpServer())
      .get('/api/v1/users/me/addresses')
      .set('Authorization', `Bearer ${clientToken}`)
      .expect(200);

    const addresses = listRes.body.data;
    expect(addresses.length).toBe(2);
    const addr1 = addresses.find((a: any) => a.id === firstRes.body.id);
    const addr2 = addresses.find((a: any) => a.id === secondRes.body.id);
    expect(addr1.isDefault).toBe(true);
    expect(addr2.isDefault).toBe(false);

    // 3. Create third address with isDefault: true explicitly
    const thirdRes = await request(ctx.app.getHttpServer())
      .post('/api/v1/users/me/addresses')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        street: 'Dritterweg',
        houseNumber: '3',
        postalCode: '10115',
        city: 'Berlin',
        isDefault: true,
      })
      .expect(201);

    expect(thirdRes.body.isDefault).toBe(true);

    const listResAfterThird = await request(ctx.app.getHttpServer())
      .get('/api/v1/users/me/addresses')
      .set('Authorization', `Bearer ${clientToken}`)
      .expect(200);

    const updatedList = listResAfterThird.body.data;
    const oldDefault = updatedList.find((a: any) => a.id === firstRes.body.id);
    const newDefault = updatedList.find((a: any) => a.id === thirdRes.body.id);
    expect(oldDefault.isDefault).toBe(false);
    expect(newDefault.isDefault).toBe(true);
  }));

  // ─── 6. Deleting and updating default address rules ─────────────────────────
  it('deleting default promotes oldest remaining address; deleting only address leaves none; deleting non-default leaves default intact; setting only default to false is ignored', runTest(async () => {
    const { token: clientToken } = await createTestClient(ctx.dataSource);

    // Create Addr A (created first, becomes default)
    freezeClock(new Date('2026-01-01T10:00:00Z'));
    const resA = await request(ctx.app.getHttpServer())
      .post('/api/v1/users/me/addresses')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        street: 'Alpha Straße',
        houseNumber: '1',
        postalCode: '10001',
        city: 'Berlin',
      })
      .expect(201);

    // Create Addr B (created second, explicitly set as default)
    freezeClock(new Date('2026-01-02T10:00:00Z'));
    const resB = await request(ctx.app.getHttpServer())
      .post('/api/v1/users/me/addresses')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        street: 'Beta Straße',
        houseNumber: '2',
        postalCode: '10002',
        city: 'Berlin',
        isDefault: true,
      })
      .expect(201);

    // Create Addr C (created third, non-default)
    freezeClock(new Date('2026-01-03T10:00:00Z'));
    const resC = await request(ctx.app.getHttpServer())
      .post('/api/v1/users/me/addresses')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        street: 'Gamma Straße',
        houseNumber: '3',
        postalCode: '10003',
        city: 'Berlin',
        isDefault: false,
      })
      .expect(201);

    unfreezeClock();

    // Verify current state: B is default, A and C are not
    let list = (await request(ctx.app.getHttpServer())
      .get('/api/v1/users/me/addresses')
      .set('Authorization', `Bearer ${clientToken}`)
      .expect(200)).body.data;

    expect(list.find((a: any) => a.id === resB.body.id).isDefault).toBe(true);
    expect(list.find((a: any) => a.id === resA.body.id).isDefault).toBe(false);
    expect(list.find((a: any) => a.id === resC.body.id).isDefault).toBe(false);

    // Test updateAddress: setting current default B to isDefault: false is ignored
    const patchRes = await request(ctx.app.getHttpServer())
      .patch(`/api/v1/users/me/addresses/${resB.body.id}`)
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ isDefault: false })
      .expect(200);

    expect(patchRes.body.isDefault).toBe(true);

    // 1. Delete non-default Addr C: changes nothing about defaults
    await request(ctx.app.getHttpServer())
      .delete(`/api/v1/users/me/addresses/${resC.body.id}`)
      .set('Authorization', `Bearer ${clientToken}`)
      .expect(200);

    list = (await request(ctx.app.getHttpServer())
      .get('/api/v1/users/me/addresses')
      .set('Authorization', `Bearer ${clientToken}`)
      .expect(200)).body.data;

    expect(list.length).toBe(2);
    expect(list.find((a: any) => a.id === resB.body.id).isDefault).toBe(true);
    expect(list.find((a: any) => a.id === resA.body.id).isDefault).toBe(false);

    // 2. Delete default Addr B: oldest remaining address (A) is promoted to default
    await request(ctx.app.getHttpServer())
      .delete(`/api/v1/users/me/addresses/${resB.body.id}`)
      .set('Authorization', `Bearer ${clientToken}`)
      .expect(200);

    list = (await request(ctx.app.getHttpServer())
      .get('/api/v1/users/me/addresses')
      .set('Authorization', `Bearer ${clientToken}`)
      .expect(200)).body.data;

    expect(list.length).toBe(1);
    expect(list[0].id).toBe(resA.body.id);
    expect(list[0].isDefault).toBe(true);

    // 3. Delete the only remaining address A: leaves none
    await request(ctx.app.getHttpServer())
      .delete(`/api/v1/users/me/addresses/${resA.body.id}`)
      .set('Authorization', `Bearer ${clientToken}`)
      .expect(200);

    list = (await request(ctx.app.getHttpServer())
      .get('/api/v1/users/me/addresses')
      .set('Authorization', `Bearer ${clientToken}`)
      .expect(200)).body.data;

    expect(list.length).toBe(0);
  }));

  // ─── 7. Section 3 / Branch A flow ──────────────────────────────────────────
  it('Branch A flow: typing a new address creates saved address, flags it as default if first, and links it to booking', runTest(async () => {
    const { token: clientToken } = await createTestClient(ctx.dataSource);
    const { provider, services } = await createTestProvider(ctx.dataSource, { serviceCount: 1 });

    // Client has no saved addresses, types new address in booking screen
    // Mobile client sends POST /api/v1/users/me/addresses
    const addressRes = await request(ctx.app.getHttpServer())
      .post('/api/v1/users/me/addresses')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        street: 'Kastanienallee',
        houseNumber: '42',
        postalCode: '10435',
        city: 'Berlin',
        isDefault: false, // User didn't check "save as default", but it is their first address
      })
      .expect(201);

    expect(addressRes.body.id).toBeDefined();
    expect(addressRes.body.isDefault).toBe(true);

    // Client sends POST /api/v1/bookings with the new addressId
    const bookingRes = await request(ctx.app.getHttpServer())
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        providerId: provider.id,
        serviceIds: [services[0].id],
        scheduledDate: '2026-11-25',
        scheduledTime: '16:00',
        isMobile: true,
        addressId: addressRes.body.id,
      })
      .expect(201);

    const b = bookingRes.body.booking;
    expect(b.isMobile).toBe(true);
    expect(b.address).toEqual({
      street: 'Kastanienallee',
      houseNumber: '42',
      postalCode: '10435',
      city: 'Berlin',
    });
    assertNoRawAddressColumns(b);
  }));
});
