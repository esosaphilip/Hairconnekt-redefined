require('reflect-metadata');

const test = require('node:test');
const assert = require('node:assert/strict');

const { ForbiddenException, UnauthorizedException, NotFoundException } = require('@nestjs/common');
const { AccessService } = require('../src/authorization/access.service');
const { UserRole } = require('../src/entities/user.entity');
const { BookingStatus } = require('../src/entities/booking.entity');

function createAccessServiceMocks(overrides = {}) {
  const userRepo = {
    findOne: overrides.userFindOne ?? (async () => null),
  };

  const bookingRepo = {
    findOne: overrides.bookingFindOne ?? (async () => null),
  };

  const reviewRepo = {
    findOne: overrides.reviewFindOne ?? (async () => null),
  };

  const favouriteRepo = {
    findOne: overrides.favouriteFindOne ?? (async () => null),
  };

  const conversationRepo = {
    findOne: overrides.conversationFindOne ?? (async () => null),
  };

  const providerRepo = {
    findOne: overrides.providerFindOne ?? (async () => null),
  };

  const service = new AccessService(
    userRepo,
    bookingRepo,
    reviewRepo,
    favouriteRepo,
    conversationRepo,
    providerRepo,
  );

  return { service, userRepo, bookingRepo, reviewRepo, favouriteRepo, conversationRepo, providerRepo };
}

test('1. client actor can create booking for self → allow', async () => {
  const { service } = createAccessServiceMocks();
  const actor = { id: 'client-1', role: UserRole.CLIENT };
  await assert.doesNotReject(
    service.authorizeBooking(actor, 'booking:create', undefined, {
      clientId: 'client-1',
      providerId: 'provider-1',
    }),
  );
});

test('2. client actor trying to create booking with ANOTHER clientId → Forbidden (403)', async () => {
  const { service } = createAccessServiceMocks();
  const actor = { id: 'client-1', role: UserRole.CLIENT };
  await assert.rejects(
    service.authorizeBooking(actor, 'booking:create', undefined, {
      clientId: 'client-2',
      providerId: 'provider-1',
    }),
    (error) => {
      assert.ok(error instanceof ForbiddenException);
      return true;
    },
  );
});

test('3. provider trying to create booking → 403 (only clients can create)', async () => {
  const { service } = createAccessServiceMocks();
  const actor = { id: 'provider-user-1', role: UserRole.PROVIDER };
  await assert.rejects(
    service.authorizeBooking(actor, 'booking:create', undefined, {
      clientId: 'client-1',
      providerId: 'provider-1',
    }),
    (error) => {
      assert.ok(error instanceof ForbiddenException);
      return true;
    },
  );
});

test('4. client can cancel own booking → allow', async () => {
  const booking = { id: 'booking-1', clientId: 'client-1', providerId: 'provider-1' };
  const { service, bookingRepo, providerRepo } = createAccessServiceMocks({
    bookingFindOne: async () => booking,
    providerFindOne: async () => null,
  });

  const actor = { id: 'client-1', role: UserRole.CLIENT };
  const result = await service.authorizeBooking(actor, 'booking:cancel', 'booking-1');
  assert.deepEqual(result, booking);
});

test('5. provider can accept their own booking → allow', async () => {
  const booking = { id: 'booking-1', clientId: 'client-1', providerId: 'provider-1' };
  const provider = { id: 'provider-1', userId: 'provider-user-1' };
  const { service } = createAccessServiceMocks({
    bookingFindOne: async () => booking,
    providerFindOne: async () => provider,
  });

  const actor = { id: 'provider-user-1', role: UserRole.PROVIDER };
  const result = await service.authorizeBooking(actor, 'booking:accept', 'booking-1');
  assert.deepEqual(result, booking);
});

test('6. provider tries to accept another provider\'s booking → 403', async () => {
  const booking = { id: 'booking-1', clientId: 'client-1', providerId: 'provider-2' };
  const provider = { id: 'provider-1', userId: 'provider-user-1' };
  const { service } = createAccessServiceMocks({
    bookingFindOne: async () => booking,
    providerFindOne: async () => provider,
  });

  const actor = { id: 'provider-user-1', role: UserRole.PROVIDER };
  await assert.rejects(
    service.authorizeBooking(actor, 'booking:accept', 'booking-1'),
    (error) => {
      assert.ok(error instanceof ForbiddenException);
      return true;
    },
  );
});

test('7a. provider can start only their own booking → allow', async () => {
  const booking = { id: 'booking-1', clientId: 'client-1', providerId: 'provider-1' };
  const provider = { id: 'provider-1', userId: 'provider-user-1' };
  const { service } = createAccessServiceMocks({
    bookingFindOne: async () => booking,
    providerFindOne: async () => provider,
  });

  const actor = { id: 'provider-user-1', role: UserRole.PROVIDER };
  const result = await service.authorizeBooking(actor, 'booking:start', 'booking-1');
  assert.deepEqual(result, booking);
});

test('7b. provider tries to start another provider\'s booking → 403', async () => {
  const booking = { id: 'booking-1', clientId: 'client-1', providerId: 'provider-2' };
  const provider = { id: 'provider-1', userId: 'provider-user-1' };
  const { service } = createAccessServiceMocks({
    bookingFindOne: async () => booking,
    providerFindOne: async () => provider,
  });

  const actor = { id: 'provider-user-1', role: UserRole.PROVIDER };
  await assert.rejects(
    service.authorizeBooking(actor, 'booking:start', 'booking-1'),
    (error) => {
      assert.ok(error instanceof ForbiddenException);
      return true;
    },
  );
});

test('7c. provider can complete only their own booking → allow', async () => {
  const booking = { id: 'booking-1', clientId: 'client-1', providerId: 'provider-1' };
  const provider = { id: 'provider-1', userId: 'provider-user-1' };
  const { service } = createAccessServiceMocks({
    bookingFindOne: async () => booking,
    providerFindOne: async () => provider,
  });

  const actor = { id: 'provider-user-1', role: UserRole.PROVIDER };
  const result = await service.authorizeBooking(actor, 'booking:complete', 'booking-1');
  assert.deepEqual(result, booking);
});

test('7d. provider tries to complete another provider\'s booking → 403', async () => {
  const booking = { id: 'booking-1', clientId: 'client-1', providerId: 'provider-2' };
  const provider = { id: 'provider-1', userId: 'provider-user-1' };
  const { service } = createAccessServiceMocks({
    bookingFindOne: async () => booking,
    providerFindOne: async () => provider,
  });

  const actor = { id: 'provider-user-1', role: UserRole.PROVIDER };
  await assert.rejects(
    service.authorizeBooking(actor, 'booking:complete', 'booking-1'),
    (error) => {
      assert.ok(error instanceof ForbiddenException);
      return true;
    },
  );
});

test('8a. admin can accept any booking', async () => {
  const booking = { id: 'booking-1', clientId: 'client-1', providerId: 'provider-1' };
  const { service } = createAccessServiceMocks({
    bookingFindOne: async () => booking,
  });

  const actor = { id: 'admin-1', role: UserRole.ADMIN };
  const result = await service.authorizeBooking(actor, 'booking:accept', 'booking-1');
  assert.deepEqual(result, booking);
});

test('8b. admin can decline any booking', async () => {
  const booking = { id: 'booking-2', clientId: 'client-2', providerId: 'provider-3' };
  const { service } = createAccessServiceMocks({
    bookingFindOne: async () => booking,
  });

  const actor = { id: 'admin-1', role: UserRole.ADMIN };
  const result = await service.authorizeBooking(actor, 'booking:decline', 'booking-2');
  assert.deepEqual(result, booking);
});

test('8c. admin can start any booking', async () => {
  const booking = { id: 'booking-3', clientId: 'client-3', providerId: 'provider-3' };
  const { service } = createAccessServiceMocks({
    bookingFindOne: async () => booking,
  });

  const actor = { id: 'admin-1', role: UserRole.ADMIN };
  const result = await service.authorizeBooking(actor, 'booking:start', 'booking-3');
  assert.deepEqual(result, booking);
});

test('8d. admin can complete any booking', async () => {
  const booking = { id: 'booking-4', clientId: 'client-4', providerId: 'provider-4' };
  const { service } = createAccessServiceMocks({
    bookingFindOne: async () => booking,
  });

  const actor = { id: 'admin-1', role: UserRole.ADMIN };
  const result = await service.authorizeBooking(actor, 'booking:complete', 'booking-4');
  assert.deepEqual(result, booking);
});

test('9a. client can add favourite on own client row → allow', async () => {
  const { service } = createAccessServiceMocks();
  const actor = { id: 'client-1', role: UserRole.CLIENT };
  await assert.doesNotReject(
    service.authorizeFavourite(actor, 'favourite:add', { clientId: 'client-1', providerId: 'provider-1' }),
  );
});

test('9b. client can remove favourite on own client row → allow', async () => {
  const { service } = createAccessServiceMocks();
  const actor = { id: 'client-1', role: UserRole.CLIENT };
  await assert.doesNotReject(
    service.authorizeFavourite(actor, 'favourite:remove', { clientId: 'client-1', providerId: 'provider-1' }),
  );
});

test('9c. client can read favourites on own client row → allow', async () => {
  const { service } = createAccessServiceMocks();
  const actor = { id: 'client-1', role: UserRole.CLIENT };
  await assert.doesNotReject(
    service.authorizeFavourite(actor, 'favourite:read', { clientId: 'client-1' }),
  );
});

test('9d. client trying to read another client\'s favourites → forbidden', async () => {
  const { service } = createAccessServiceMocks();
  const actor = { id: 'client-1', role: UserRole.CLIENT };
  await assert.rejects(
    service.authorizeFavourite(actor, 'favourite:read', { clientId: 'client-2' }),
    (error) => {
      assert.ok(error instanceof ForbiddenException);
      return true;
    },
  );
});

test('10a. provider tries to add favourite → forbidden (non-client can\'t favourite)', async () => {
  const { service } = createAccessServiceMocks();
  const actor = { id: 'provider-user-1', role: UserRole.PROVIDER };
  await assert.rejects(
    service.authorizeFavourite(actor, 'favourite:add', { clientId: 'client-1', providerId: 'provider-1' }),
    (error) => {
      assert.ok(error instanceof ForbiddenException);
      return true;
    },
  );
});

test('10b. admin can add favourite for anyone → allow', async () => {
  const { service } = createAccessServiceMocks();
  const actor = { id: 'admin-1', role: UserRole.ADMIN };
  await assert.doesNotReject(
    service.authorizeFavourite(actor, 'favourite:add', { clientId: 'client-1', providerId: 'provider-1' }),
  );
});

test('11a. review:create allowed on completed booking for the client who booked it → allow', async () => {
  const booking = {
    id: 'booking-1',
    clientId: 'client-1',
    providerId: 'provider-1',
    status: BookingStatus.COMPLETED,
  };
  const { service } = createAccessServiceMocks({
    bookingFindOne: async () => booking,
  });

  const actor = { id: 'client-1', role: UserRole.CLIENT };
  await assert.doesNotReject(
    service.authorizeReview(actor, 'review:create', undefined, { bookingId: 'booking-1' }),
  );
});

test('11b. review:create forbidden on PENDING booking → 403', async () => {
  const booking = {
    id: 'booking-1',
    clientId: 'client-1',
    providerId: 'provider-1',
    status: BookingStatus.PENDING,
  };
  const { service } = createAccessServiceMocks({
    bookingFindOne: async () => booking,
  });

  const actor = { id: 'client-1', role: UserRole.CLIENT };
  await assert.rejects(
    service.authorizeReview(actor, 'review:create', undefined, { bookingId: 'booking-1' }),
    (error) => {
      assert.ok(error instanceof ForbiddenException);
      return true;
    },
  );
});

test('11c. review:create forbidden if another client owns booking → 403', async () => {
  const booking = {
    id: 'booking-1',
    clientId: 'client-2',
    providerId: 'provider-1',
    status: BookingStatus.COMPLETED,
  };
  const { service } = createAccessServiceMocks({
    bookingFindOne: async () => booking,
  });

  const actor = { id: 'client-1', role: UserRole.CLIENT };
  await assert.rejects(
    service.authorizeReview(actor, 'review:create', undefined, { bookingId: 'booking-1' }),
    (error) => {
      assert.ok(error instanceof ForbiddenException);
      return true;
    },
  );
});

test('11d. review:respond allowed for matching provider → allow', async () => {
  const review = { id: 'review-1', providerId: 'provider-1' };
  const provider = { id: 'provider-1', userId: 'provider-user-1' };
  const { service } = createAccessServiceMocks({
    reviewFindOne: async () => review,
    providerFindOne: async () => provider,
  });

  const actor = { id: 'provider-user-1', role: UserRole.PROVIDER };
  await assert.doesNotReject(
    service.authorizeReview(actor, 'review:respond', 'review-1'),
  );
});

test('11e. review:respond forbidden for non-matching provider → 403', async () => {
  const review = { id: 'review-1', providerId: 'provider-2' };
  const provider = { id: 'provider-1', userId: 'provider-user-1' };
  const { service } = createAccessServiceMocks({
    reviewFindOne: async () => review,
    providerFindOne: async () => provider,
  });

  const actor = { id: 'provider-user-1', role: UserRole.PROVIDER };
  await assert.rejects(
    service.authorizeReview(actor, 'review:respond', 'review-1'),
    (error) => {
      assert.ok(error instanceof ForbiddenException);
      return true;
    },
  );
});

test('12a. conversation:read allowed for participant → allow', async () => {
  const convo = { id: 'convo-1', participant1Id: 'user-1', participant2Id: 'user-2' };
  const { service } = createAccessServiceMocks({
    conversationFindOne: async () => convo,
  });

  const actor = { id: 'user-1', role: UserRole.CLIENT };
  const result = await service.authorizeConversation(actor, 'conversation:read', 'convo-1');
  assert.deepEqual(result, convo);
});

test('12b. conversation:read forbidden for non-participant userId → 403', async () => {
  const convo = { id: 'convo-1', participant1Id: 'user-1', participant2Id: 'user-2' };
  const { service } = createAccessServiceMocks({
    conversationFindOne: async () => convo,
  });

  const actor = { id: 'user-3', role: UserRole.CLIENT };
  await assert.rejects(
    service.authorizeConversation(actor, 'conversation:read', 'convo-1'),
    (error) => {
      assert.ok(error instanceof ForbiddenException);
      return true;
    },
  );
});

test('12c. conversation:message allowed for participant2 → allow', async () => {
  const convo = { id: 'convo-1', participant1Id: 'user-1', participant2Id: 'user-2' };
  const { service } = createAccessServiceMocks({
    conversationFindOne: async () => convo,
  });

  const actor = { id: 'user-2', role: UserRole.PROVIDER };
  const result = await service.authorizeConversation(actor, 'conversation:message', 'convo-1');
  assert.deepEqual(result, convo);
});

test('12d. conversation:message forbidden for non-participant → 403', async () => {
  const convo = { id: 'convo-1', participant1Id: 'user-1', participant2Id: 'user-2' };
  const { service } = createAccessServiceMocks({
    conversationFindOne: async () => convo,
  });

  const actor = { id: 'provider-user-99', role: UserRole.PROVIDER };
  await assert.rejects(
    service.authorizeConversation(actor, 'conversation:message', 'convo-1'),
    (error) => {
      assert.ok(error instanceof ForbiddenException);
      return true;
    },
  );
});

test('12e. conversation:read for admin (non-participant) → allow', async () => {
  const convo = { id: 'convo-1', participant1Id: 'user-1', participant2Id: 'user-2' };
  const { service } = createAccessServiceMocks({
    conversationFindOne: async () => convo,
  });

  const actor = { id: 'admin-1', role: UserRole.ADMIN };
  const result = await service.authorizeConversation(actor, 'conversation:read', 'convo-1');
  assert.deepEqual(result, convo);
});

test('13. booking:read allows client who owns it', async () => {
  const booking = { id: 'booking-1', clientId: 'client-1', providerId: 'provider-1' };
  const { service } = createAccessServiceMocks({
    bookingFindOne: async () => booking,
  });

  const actor = { id: 'client-1', role: UserRole.CLIENT };
  const result = await service.authorizeBooking(actor, 'booking:read', 'booking-1');
  assert.deepEqual(result, booking);
});

test('14. booking:read allows provider who owns it (via userId->provider lookup)', async () => {
  const booking = { id: 'booking-1', clientId: 'client-1', providerId: 'provider-1' };
  const provider = { id: 'provider-1', userId: 'provider-user-1' };
  const { service } = createAccessServiceMocks({
    bookingFindOne: async () => booking,
    providerFindOne: async () => provider,
  });

  const actor = { id: 'provider-user-1', role: UserRole.PROVIDER };
  const result = await service.authorizeBooking(actor, 'booking:read', 'booking-1');
  assert.deepEqual(result, booking);
});

test('15. booking:read forbidden for random user', async () => {
  const booking = { id: 'booking-1', clientId: 'client-1', providerId: 'provider-1' };
  const { service, providerRepo } = createAccessServiceMocks({
    bookingFindOne: async () => booking,
  });
  providerRepo.findOne = async () => null;

  const actor = { id: 'client-999', role: UserRole.CLIENT };
  await assert.rejects(
    service.authorizeBooking(actor, 'booking:read', 'booking-1'),
    (error) => {
      assert.ok(error instanceof ForbiddenException);
      return true;
    },
  );
});

test('16. ensureAuthenticatedActor returns valid Actor for valid user with sub', () => {
  const { service } = createAccessServiceMocks();
  const rawUser = { sub: 'user-1', role: UserRole.CLIENT };
  const actor = service.ensureAuthenticatedActor(rawUser);
  assert.deepEqual(actor, { id: 'user-1', role: UserRole.CLIENT });
});

test('17. ensureAuthenticatedActor returns valid Actor for valid user with id', () => {
  const { service } = createAccessServiceMocks();
  const rawUser = { id: 'user-2', role: UserRole.PROVIDER };
  const actor = service.ensureAuthenticatedActor(rawUser);
  assert.deepEqual(actor, { id: 'user-2', role: UserRole.PROVIDER });
});

test('18. ensureAuthenticatedActor throws Unauthorized for missing id/sub', () => {
  const { service } = createAccessServiceMocks();
  assert.throws(
    () => service.ensureAuthenticatedActor({ role: UserRole.CLIENT }),
    (error) => {
      assert.ok(error instanceof UnauthorizedException);
      return true;
    },
  );
});

test('19. ensureAuthenticatedActor throws Unauthorized for missing role', () => {
  const { service } = createAccessServiceMocks();
  assert.throws(
    () => service.ensureAuthenticatedActor({ id: 'user-1' }),
    (error) => {
      assert.ok(error instanceof UnauthorizedException);
      return true;
    },
  );
});

test('20. ensureAuthenticatedActor throws Unauthorized for invalid role', () => {
  const { service } = createAccessServiceMocks();
  assert.throws(
    () => service.ensureAuthenticatedActor({ id: 'user-1', role: 'superadmin' }),
    (error) => {
      assert.ok(error instanceof UnauthorizedException);
      return true;
    },
  );
});

test('21. booking:update for reschedule allows own provider', async () => {
  const booking = { id: 'booking-1', clientId: 'client-1', providerId: 'provider-1' };
  const provider = { id: 'provider-1', userId: 'provider-user-1' };
  const { service } = createAccessServiceMocks({
    bookingFindOne: async () => booking,
    providerFindOne: async () => provider,
  });

  const actor = { id: 'provider-user-1', role: UserRole.PROVIDER };
  const result = await service.authorizeBooking(actor, 'booking:update', 'booking-1');
  assert.deepEqual(result, booking);
});

test('21b. booking:update for reschedule allows owning client', async () => {
  const booking = { id: 'booking-1', clientId: 'client-1', providerId: 'provider-1' };
  const { service } = createAccessServiceMocks({
    bookingFindOne: async () => booking,
  });

  const actor = { id: 'client-1', role: UserRole.CLIENT };
  const result = await service.authorizeBooking(actor, 'booking:update', 'booking-1');
  assert.deepEqual(result, booking);
});

test('21c. booking:update rejects unrelated client', async () => {
  const booking = { id: 'booking-1', clientId: 'client-1', providerId: 'provider-1' };
  const { service } = createAccessServiceMocks({
    bookingFindOne: async () => booking,
  });

  const actor = { id: 'client-999', role: UserRole.CLIENT };
  await assert.rejects(
    service.authorizeBooking(actor, 'booking:update', 'booking-1'),
    (error) => {
      assert.ok(error instanceof ForbiddenException);
      assert.strictEqual(error.message, 'Nicht autorisiert.');
      return true;
    },
  );
});

test('22. booking:not-found throws NotFound for missing booking id', async () => {
  const { service } = createAccessServiceMocks({
    bookingFindOne: async () => null,
  });

  const actor = { id: 'client-1', role: UserRole.CLIENT };
  await assert.rejects(
    service.authorizeBooking(actor, 'booking:read', 'does-not-exist'),
    (error) => {
      assert.ok(error instanceof NotFoundException);
      return true;
    },
  );
});
