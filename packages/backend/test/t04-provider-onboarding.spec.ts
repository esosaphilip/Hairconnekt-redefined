import request from 'supertest';
import { createTestApp, closeTestApp, truncateAllTables, isDatabaseAvailable, TestAppContext } from './test-bootstrap';
import { generateTestEmail, TEST_PASSWORD } from './test-factories';
import { ServiceCategory } from '../src/entities/service-category.entity';
import { Service } from '../src/entities/service.entity';
import { Provider } from '../src/entities/provider.entity';

describe('T04: Provider Registration and Onboarding', () => {
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
      ctx.fakeMailer.clear();
      ctx.fakeR2Service.clear();
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

  // Valid 1x1 image buffer that passes magic number inspection
  const validJpegBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64',
  );

  it('completes provider onboarding flow with onboarding token and fake storage', runTest(async () => {
    const email = generateTestEmail('provider-onboard');

    // 1. Register as provider
    const regRes = await request(ctx.app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        firstName: 'Elena',
        lastName: 'Braids',
        email,
        password: TEST_PASSWORD,
        role: 'provider',
        acceptedTerms: true,
      })
      .expect(201);

    expect(regRes.body).toHaveProperty('onboardingToken');
    const onboardingToken = regRes.body.onboardingToken;
    const userId = regRes.body.user.id;

    // 2. Avatar upload with onboarding token
    const avatarRes = await request(ctx.app.getHttpServer())
      .post('/api/v1/users/me/avatar')
      .set('Authorization', `Bearer ${onboardingToken}`)
      .attach('avatar', validJpegBuffer, 'avatar.png')
      .expect(201);

    expect(avatarRes.body.avatarUrl).toMatch(/^https:\/\/r2-test\.hairconnekt\.de/);

    // 3. Create a reference service first
    const catRepo = ctx.dataSource.getRepository(ServiceCategory);
    let category = await catRepo.findOne({ where: { isActive: true } });
    if (!category) {
      category = await catRepo.save(catRepo.create({ name: 'Braids', iconName: 'braids', isActive: true }));
    }

    // 4. Provider registration (POST /api/v1/providers/register)
    const provRegRes = await request(ctx.app.getHttpServer())
      .post('/api/v1/providers/register')
      .set('Authorization', `Bearer ${onboardingToken}`)
      .send({
        providerType: 'salon',
        businessName: 'Elena Luxury Braids',
        street: 'Friedrichstraße',
        houseNumber: '100',
        city: 'Berlin',
        postalCode: '10117',
        serviceRadius: 25,
        serviceIds: [category.id],
        experienceYears: 4,
        languages: ['de', 'en'],
        cancellationPolicy: '24h',
        bio: 'Expert braider in Berlin Mitte',
      })
      .expect(201);

    expect(provRegRes.body).toBeDefined();
    expect(provRegRes.body.status).toBe('pending');

    // 5. ID document upload with onboarding token
    const idDocRes = await request(ctx.app.getHttpServer())
      .post('/api/v1/providers/me/id-document')
      .set('Authorization', `Bearer ${onboardingToken}`)
      .attach('idDocument', validJpegBuffer, 'id_doc.png')
      .expect(201);

    expect(idDocRes.body.uploaded).toBe(true);

    // 6. Portfolio upload with onboarding token
    const portfolioRes = await request(ctx.app.getHttpServer())
      .post('/api/v1/providers/me/portfolio')
      .set('Authorization', `Bearer ${onboardingToken}`)
      .field('caption', 'Fresh box braids')
      .attach('portfolio', validJpegBuffer, 'portfolio1.png');

    expect(portfolioRes.status).toBe(201);

    expect(portfolioRes.body).toBeDefined();

    // 7. Verify provider record in DB is pending
    const provRepo = ctx.dataSource.getRepository(Provider);
    const savedProvider = await provRepo.findOne({ where: { userId } });
    expect(savedProvider).toBeDefined();
    expect(savedProvider!.status).toBe('pending');
  }));

  it('rejects wrong file type (non-image) and oversize uploads', runTest(async () => {
    const email = generateTestEmail('upload-guard');
    const regRes = await request(ctx.app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        firstName: 'Test',
        lastName: 'Upload',
        email,
        password: TEST_PASSWORD,
        role: 'provider',
        acceptedTerms: true,
      })
      .expect(201);

    const onboardingToken = regRes.body.onboardingToken;

    // Wrong MIME type / non-image (txt file)
    await request(ctx.app.getHttpServer())
      .post('/api/v1/users/me/avatar')
      .set('Authorization', `Bearer ${onboardingToken}`)
      .attach('avatar', Buffer.from('Plain text file content'), 'bad.txt')
      .expect(400);

    // Oversize file (> 5MB for avatar)
    const oversizeBuffer = Buffer.alloc(6 * 1024 * 1024, 0xff);
    await request(ctx.app.getHttpServer())
      .post('/api/v1/users/me/avatar')
      .set('Authorization', `Bearer ${onboardingToken}`)
      .attach('avatar', oversizeBuffer, 'huge.jpg')
      .expect(413);
  }));

  // BUG-008: Provider registration rule requiring at least one service exists only on mobile client, not yet enforced on backend
  it.todo('server rule: at least one service');
});
