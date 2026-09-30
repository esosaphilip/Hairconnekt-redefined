import request from 'supertest';
import { createTestApp, closeTestApp, truncateAllTables, isDatabaseAvailable, TestAppContext } from './test-bootstrap';
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
        priceType: 'fixed',
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

    const schedule = Array.isArray(availRes.body) ? availRes.body : (availRes.body.schedule || availRes.body.data);
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

  it('an inactive category is not offered in GET services/categories', runTest(async () => {
    const catRepo = ctx.dataSource.getRepository(ServiceCategory);

    const activeCat = await catRepo.save(
      catRepo.create({
        name: `Active Cat ${Date.now()}`,
        iconName: 'active',
        isActive: true,
        sortOrder: 1,
      }),
    );

    const inactiveCat = await catRepo.save(
      catRepo.create({
        name: `Inactive Cat ${Date.now()}`,
        iconName: 'inactive',
        isActive: false,
        sortOrder: 2,
      }),
    );

    // Query GET /api/v1/services/categories (used in provider onboarding / setup to offer categories)
    const res = await request(ctx.app.getHttpServer())
      .get('/api/v1/services/categories')
      .expect(200);

    const categories = Array.isArray(res.body) ? res.body : res.body.data || [];
    const catIds = categories.map((c: any) => c.id);

    // Asserts active category is offered
    expect(catIds).toContain(activeCat.id);
    // Asserts inactive category is not offered
    expect(catIds).not.toContain(inactiveCat.id);
  }));

  // BUG-036 (FIXED): editing service accepts categoryId without 400 rejection
  it('[KNOWN BUG-036] provider can edit an existing service including its category', runTest(async () => {
    const { provider, token: providerToken } = await createTestProvider(ctx.dataSource);

    const catRepo = ctx.dataSource.getRepository(ServiceCategory);
    let category1 = await catRepo.findOne({ where: { isActive: true } });
    if (!category1) {
      category1 = await catRepo.save(catRepo.create({ name: `Braids ${Date.now()}`, iconName: 'braids', isActive: true }));
    }

    const category2 = await catRepo.save(
      catRepo.create({ name: `Category Edit ${Date.now()}`, iconName: 'locs', isActive: true }),
    );

    // 1. Create initial service
    const createRes = await request(ctx.app.getHttpServer())
      .post('/api/v1/providers/me/services')
      .set('Authorization', `Bearer ${providerToken}`)
      .send({
        categoryId: category1.id,
        name: 'Initial Service',
        description: 'Initial description',
        price: 80,
        priceType: 'fixed',
        durationMin: 60,
      })
      .expect(201);

    const serviceId = createRes.body.id;
    expect(serviceId).toBeDefined();

    // 2. Edit service using mobile Edit Service screen payload (which includes categoryId)
    // BUG-036: UpdateServiceDto does not declare categoryId, so ValidationPipe rejects with 400 "property categoryId should not exist"
    const editPayload = {
      name: 'Updated Service Name',
      categoryId: category2.id,
      description: 'Updated description',
      durationMin: 90,
      priceType: 'fixed',
      price: 110,
      isActive: true,
    };

    const editRes = await request(ctx.app.getHttpServer())
      .patch(`/api/v1/providers/me/services/${serviceId}`)
      .set('Authorization', `Bearer ${providerToken}`)
      .send(editPayload)
      .expect(200);

    expect(editRes.body.name).toBe('Updated Service Name');
    expect(editRes.body.categoryId).toBe(category2.id);
    expect(editRes.body.durationMin).toBe(90);
    expect(Number(editRes.body.price)).toBe(110);
  }));
});
