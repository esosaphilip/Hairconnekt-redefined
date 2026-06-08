require('reflect-metadata');

const test = require('node:test');
const assert = require('node:assert/strict');

const { ConflictException } = require('@nestjs/common');
const { BookingsService } = require('../src/bookings/bookings.service');
const { BookingStatus } = require('../src/entities/booking.entity');
const { UserRole } = require('../src/entities/user.entity');

function createQueryBuilder(getOneResult) {
  const calls = [];

  return {
    calls,
    where(sql, params) {
      calls.push({ method: 'where', sql, params });
      return this;
    },
    andWhere(sql, params) {
      calls.push({ method: 'andWhere', sql, params });
      return this;
    },
    async getOne() {
      return typeof getOneResult === 'function'
        ? getOneResult(calls)
        : getOneResult;
    },
  };
}

function createNotificationsMock() {
  const sent = [];

  return {
    sent,
    async sendToUser(payload) {
      sent.push(payload);
    },
  };
}

test('createBooking rejects an already-booked active slot', async () => {
  const dto = {
    providerId: 'provider-1',
    serviceIds: ['service-1'],
    scheduledDate: '2026-06-15',
    scheduledTime: '10:00',
    isMobile: false,
    clientNotes: 'Please be on time',
  };

  const allDayBlockQuery = createQueryBuilder(null);
  const slotConflictQuery = createQueryBuilder({
    id: 'booking-2',
    status: BookingStatus.CONFIRMED,
  });

  const service = new BookingsService(
    {
      createQueryBuilder: () => slotConflictQuery,
    },
    {
      findBy: async () => [],
    },
    {
      findOne: async () => ({
        id: dto.providerId,
        isOnline: true,
        status: 'approved',
      }),
    },
    {
      findOne: async () => ({
        providerId: dto.providerId,
        isOpen: true,
        openTime: '09:00',
        closeTime: '17:00',
      }),
    },
    {
      createQueryBuilder: () => allDayBlockQuery,
      find: async () => [],
    },
    createNotificationsMock(),
  );

  await assert.rejects(
    service.createBooking('client-1', dto),
    (error) => {
      assert.ok(error instanceof ConflictException);
      assert.match(error.message, /Zeitslot ist bereits vergeben/i);
      return true;
    },
  );
});

test('createBooking keeps cancelled slots reusable and creates a pending booking', async () => {
  const dto = {
    providerId: 'provider-1',
    serviceIds: ['service-1'],
    scheduledDate: '2026-06-15',
    scheduledTime: '10:00',
    isMobile: false,
    clientNotes: 'Fresh braids, please',
  };

  const serviceEntity = {
    id: 'service-1',
    providerId: dto.providerId,
    name: 'Knotless braids',
    price: 125,
  };

  const notifications = createNotificationsMock();
  const allDayBlockQuery = createQueryBuilder(null);
  const slotConflictQuery = createQueryBuilder(null);

  let createdBooking;

  const bookingRepo = {
    createQueryBuilder: () => slotConflictQuery,
    create(payload) {
      createdBooking = { ...payload };
      return createdBooking;
    },
    async save(payload) {
      return { ...payload, id: 'booking-1' };
    },
    async findOne({ where }) {
      if (where?.id !== 'booking-1') return null;

      return {
        id: 'booking-1',
        bookingNumber: createdBooking.bookingNumber,
        clientId: 'client-1',
        providerId: dto.providerId,
        status: BookingStatus.PENDING,
        scheduledDate: dto.scheduledDate,
        scheduledTime: dto.scheduledTime,
        totalPrice: 125,
        services: [serviceEntity],
        provider: {
          id: dto.providerId,
          userId: 'provider-user-1',
          businessName: 'Studio 24',
        },
        client: {
          id: 'client-1',
          firstName: 'Ada',
        },
      };
    },
  };

  const service = new BookingsService(
    bookingRepo,
    {
      findBy: async () => [serviceEntity],
    },
    {
      findOne: async () => ({
        id: dto.providerId,
        isOnline: true,
        status: 'approved',
      }),
    },
    {
      findOne: async () => ({
        providerId: dto.providerId,
        isOpen: true,
        openTime: '09:00',
        closeTime: '17:00',
      }),
    },
    {
      createQueryBuilder: () => allDayBlockQuery,
      find: async () => [],
    },
    notifications,
  );

  const result = await service.createBooking('client-1', dto);

  const inactiveStatusFilter = slotConflictQuery.calls.find(
    (call) => call.params?.inactiveStatuses,
  );

  assert.deepEqual(inactiveStatusFilter.params.inactiveStatuses, [
    BookingStatus.CANCELLED,
  ]);
  assert.equal(result.booking.id, 'booking-1');
  assert.equal(result.booking.status, BookingStatus.PENDING);
  assert.equal(result.booking.totalPrice, 125);
  assert.equal(createdBooking.status, BookingStatus.PENDING);
  assert.equal(notifications.sent.length, 1);
  assert.equal(notifications.sent[0].type, 'new_booking');
});

test('provider lifecycle endpoints move a booking through valid statuses', async () => {
  const bookingState = {
    id: 'booking-1',
    providerId: 'provider-1',
    clientId: 'client-1',
    status: BookingStatus.PENDING,
    scheduledDate: '2026-06-15',
    scheduledTime: '10:00',
    provider: {
      id: 'provider-1',
      businessName: 'Studio 24',
    },
    client: {
      id: 'client-1',
      firstName: 'Ada',
    },
    services: [],
  };

  const notifications = createNotificationsMock();
  const savedStatuses = [];

  const service = new BookingsService(
    {
      async findOne() {
        return bookingState;
      },
      async save(payload) {
        savedStatuses.push(payload.status);
        bookingState.status = payload.status;
        return bookingState;
      },
    },
    {},
    {
      async findOne({ where }) {
        if (where?.userId === 'provider-user-1') {
          return { id: 'provider-1', userId: 'provider-user-1' };
        }

        return null;
      },
    },
    {},
    {},
    notifications,
  );

  const providerUser = {
    id: 'provider-user-1',
    role: UserRole.PROVIDER,
  };

  const confirmedBooking = await service.acceptBooking('booking-1', providerUser);
  assert.equal(confirmedBooking.status, BookingStatus.CONFIRMED);

  const startedBooking = await service.startBooking('booking-1', providerUser);
  assert.equal(startedBooking.status, BookingStatus.IN_PROGRESS);

  const completedBooking = await service.completeBooking('booking-1', providerUser);
  assert.equal(completedBooking.status, BookingStatus.COMPLETED);
  assert.deepEqual(savedStatuses, [
    BookingStatus.CONFIRMED,
    BookingStatus.IN_PROGRESS,
    BookingStatus.COMPLETED,
  ]);
  assert.equal(notifications.sent.length, 2);
  assert.deepEqual(
    notifications.sent.map((payload) => payload.type),
    ['booking_confirmed', 'booking_completed'],
  );
});
