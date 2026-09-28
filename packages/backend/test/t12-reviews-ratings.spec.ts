import request from 'supertest';
import { createTestApp, truncateAllTables, isDatabaseAvailable, TestAppContext } from './test-bootstrap';
import { createTestClient, createTestProvider, createTestBooking } from './test-factories';
import { BookingStatus } from '../src/entities/booking.entity';
import { Provider } from '../src/entities/provider.entity';

describe('T12: Reviews and Ratings', () => {
  let ctx: TestAppContext;
  let dbReady = false;

  beforeAll(async () => {
    dbReady = await isDatabaseAvailable();
    if (dbReady) {
      ctx = await createTestApp();
    }
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

  it('allows only the booking client to review a COMPLETED booking, validates rating bounds, updates provider stats and allows provider response', runTest(async () => {
    const { user: client, token: clientToken } = await createTestClient(ctx.dataSource);
    const { user: otherClient, token: otherClientToken } = await createTestClient(ctx.dataSource);
    const { provider, services, token: providerToken } = await createTestProvider(ctx.dataSource);

    // 1. Pending booking cannot be reviewed
    const pendingBooking = await createTestBooking(ctx.dataSource, {
      client,
      provider,
      services,
      status: BookingStatus.PENDING,
    });

    await request(ctx.app.getHttpServer())
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        bookingId: pendingBooking.id,
        rating: 5,
        comment: 'Great service and styling!',
      })
      .expect(403);

    // 2. Completed booking
    const completedBooking = await createTestBooking(ctx.dataSource, {
      client,
      provider,
      services,
      status: BookingStatus.COMPLETED,
    });

    // 3. Other client cannot review someone else's booking
    await request(ctx.app.getHttpServer())
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${otherClientToken}`)
      .send({
        bookingId: completedBooking.id,
        rating: 5,
        comment: 'I did not book this appointment',
      })
      .expect(403);

    // 4. Rating outside 1-5 rejected
    await request(ctx.app.getHttpServer())
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        bookingId: completedBooking.id,
        rating: 6,
        comment: 'This rating is above 5 stars',
      })
      .expect(400);

    await request(ctx.app.getHttpServer())
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        bookingId: completedBooking.id,
        rating: 0,
        comment: 'This rating is below 1 star',
      })
      .expect(400);

    // 5. Valid review succeeds
    const reviewRes = await request(ctx.app.getHttpServer())
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        bookingId: completedBooking.id,
        rating: 5,
        comment: 'Exceptional braiding experience, highly recommend!',
      })
      .expect(201);

    expect(reviewRes.body.id).toBeDefined();
    expect(reviewRes.body.rating).toBe(5);
    const reviewId = reviewRes.body.id;

    // 6. Second review for same booking is rejected
    await request(ctx.app.getHttpServer())
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        bookingId: completedBooking.id,
        rating: 4,
        comment: 'Trying to review the same booking again',
      })
      .expect(400);

    // 7. Provider stats updated
    const provRepo = ctx.dataSource.getRepository(Provider);
    const updatedProv = await provRepo.findOne({ where: { id: provider.id } });
    expect(Number(updatedProv!.totalReviews)).toBe(1);
    expect(Number(updatedProv!.avgRating)).toBe(5);

    // 8. Provider can reply to the review
    const responseRes = await request(ctx.app.getHttpServer())
      .post(`/api/v1/reviews/${reviewId}/response`)
      .set('Authorization', `Bearer ${providerToken}`)
      .send({
        response: 'Vielen Dank für deine tolle Bewertung! Bis zum nächsten Mal.',
      })
      .expect(201);

    expect(responseRes.body.response).toBeDefined();
  }));
});
