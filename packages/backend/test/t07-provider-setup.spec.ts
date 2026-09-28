import request from 'supertest';
import { createTestApp, truncateAllTables, isDatabaseAvailable, TestAppContext } from './test-bootstrap';
import { createTestProvider } from './test-factories';
import { ServiceCategory } from '../src/entities/service-category.entity';

describe('T07: Provider Setup', () => {
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

  it('manages services, availability schedule, online toggle and time blocks', runTest(async () => {
    const { provider, token: providerToken } = await createTestProvider(ctx.dataSource);

    // 1. Get reference category
    const catRepo = ctx.dataSource.getRepository(ServiceCategory);
    let category = await catRepo.findOne({ where: { isActive: true } });
    if (!category) {
      category = await catRepo.save(catRepo.create({ name: 'Braids', iconName: 'braids', isActive: true }));
    }

    // 2. Create service via POST /api/v1/providers/me/services
    const serviceCreateRes = await request(ctx.app.getHttpServer())
      .post('/api/v1/providers/me/services')
      .set('Authorization', `Bearer ${providerToken}`)
      .send({
        categoryId: category.id,
        name: 'Knotless Braids Medium',
        description: 'Mid-back length knotless braids',
        price: 120,
        durationMin: 180,
      })
      .expect(201);

    expect(serviceCreateRes.body.id).toBeDefined();
    expect(serviceCreateRes.body.name).toBe('Knotless Braids Medium');

    // 3. List services via GET /api/v1/providers/me/services
    const servicesListRes = await request(ctx.app.getHttpServer())
      .get('/api/v1/providers/me/services')
      .set('Authorization', `Bearer ${providerToken}`)
      .expect(200);

    const services = Array.isArray(servicesListRes.body) ? servicesListRes.body : servicesListRes.body.data;
    expect(services.length).toBeGreaterThanOrEqual(1);

    // 4. Availability schedule has seven days
    const availRes = await request(ctx.app.getHttpServer())
      .get('/api/v1/providers/me/availability')
      .set('Authorization', `Bearer ${providerToken}`)
      .expect(200);

    const schedule = Array.isArray(availRes.body) ? availRes.body : availRes.body.data;
    expect(schedule).toHaveLength(7);

    // 5. Update availability schedule via PUT /api/v1/providers/me/availability
    const newSchedule = schedule.map((day: any) => ({
      dayOfWeek: day.dayOfWeek,
      isOpen: day.dayOfWeek !== 0, // Closed on Sundays
      openTime: '09:00',
      closeTime: '18:00',
    }));

    await request(ctx.app.getHttpServer())
      .put('/api/v1/providers/me/availability')
      .set('Authorization', `Bearer ${providerToken}`)
      .send({ schedule: newSchedule })
      .expect(200);

    // 6. Toggle isOnline via PATCH /api/v1/providers/me/availability
    const toggleRes = await request(ctx.app.getHttpServer())
      .patch('/api/v1/providers/me/availability')
      .set('Authorization', `Bearer ${providerToken}`)
      .send({ isOnline: false })
      .expect(200);

    expect(toggleRes.body.isOnline).toBe(false);

    // 7. Create a time block and DELETE it via DELETE /api/v1/providers/me/blocks/:id (backend half of BUG-020)
    const blockCreateRes = await request(ctx.app.getHttpServer())
      .post('/api/v1/providers/me/blocks')
      .set('Authorization', `Bearer ${providerToken}`)
      .send({
        startDate: '2026-10-20',
        endDate: '2026-10-20',
        isAllDay: true,
        reason: 'Dentist appointment',
      })
      .expect(201);

    const blockId = blockCreateRes.body.id;
    expect(blockId).toBeDefined();

    // Verify block appears in list
    const blocksRes = await request(ctx.app.getHttpServer())
      .get('/api/v1/providers/me/blocks')
      .set('Authorization', `Bearer ${providerToken}`)
      .expect(200);

    const blocksList = Array.isArray(blocksRes.body) ? blocksRes.body : blocksRes.body.data || [];
    expect(blocksList.some((b: any) => b.id === blockId)).toBe(true);

    // Delete block
    await request(ctx.app.getHttpServer())
      .delete(`/api/v1/providers/me/blocks/${blockId}`)
      .set('Authorization', `Bearer ${providerToken}`)
      .expect(204);

    // Verify block is gone afterwards
    const blocksAfterRes = await request(ctx.app.getHttpServer())
      .get('/api/v1/providers/me/blocks')
      .set('Authorization', `Bearer ${providerToken}`)
      .expect(200);

    const blocksListAfter = Array.isArray(blocksAfterRes.body) ? blocksAfterRes.body : blocksAfterRes.body.data || [];
    expect(blocksListAfter.some((b: any) => b.id === blockId)).toBe(false);
  }));
});
