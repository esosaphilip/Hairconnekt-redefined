import request from 'supertest';
import {
  createTestApp,
  closeTestApp,
  isDatabaseAvailable,
  TestAppContext,
} from './test-bootstrap';
import {
  APP_STORE_URL,
  PLAY_STORE_URL,
  WEBSITE_URL,
} from '../src/app-redirect/app-store-target';

describe('T21: App Store redirect (QR code link)', () => {
  let ctx: TestAppContext;
  let dbReady = false;

  const IPHONE_UA =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
  const ANDROID_UA =
    'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
  const MACOS_UA =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';

  beforeAll(async () => {
    dbReady = await isDatabaseAvailable();
    if (dbReady) {
      ctx = await createTestApp();
    }
  });

  afterAll(async () => {
    await closeTestApp();
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

  it('GET /app with iPhone User-Agent returns 302 to the App Store URL', runTest(async () => {
    const res = await request(ctx.app.getHttpServer())
      .get('/app')
      .set('User-Agent', IPHONE_UA)
      .expect(302);

    expect(res.headers.location).toBe(APP_STORE_URL);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(String(res.headers['vary'])).toContain('User-Agent');
  }));

  it('GET /app with Android User-Agent returns 302 to the Google Play URL', runTest(async () => {
    const res = await request(ctx.app.getHttpServer())
      .get('/app')
      .set('User-Agent', ANDROID_UA)
      .expect(302);

    expect(res.headers.location).toBe(PLAY_STORE_URL);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(String(res.headers['vary'])).toContain('User-Agent');
  }));

  it('GET /app with macOS desktop User-Agent returns 302 to hairconnekt.de', runTest(async () => {
    const res = await request(ctx.app.getHttpServer())
      .get('/app')
      .set('User-Agent', MACOS_UA)
      .expect(302);

    expect(res.headers.location).toBe(WEBSITE_URL);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(String(res.headers['vary'])).toContain('User-Agent');
  }));

  it('GET /app without a User-Agent header returns 302 to hairconnekt.de', runTest(async () => {
    const res = await request(ctx.app.getHttpServer())
      .get('/app')
      .unset('User-Agent')
      .expect(302);

    expect(res.headers.location).toBe(WEBSITE_URL);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(String(res.headers['vary'])).toContain('User-Agent');
  }));

  it('GET /app?src=flyer-wuppertal with iPhone User-Agent returns 302 to the App Store URL (target unchanged)', runTest(async () => {
    const res = await request(ctx.app.getHttpServer())
      .get('/app')
      .query({ src: 'flyer-wuppertal' })
      .set('User-Agent', IPHONE_UA)
      .expect(302);

    expect(res.headers.location).toBe(APP_STORE_URL);
  }));

  it('GET /app?src=<script> with Android User-Agent still returns 302 to the Google Play URL', runTest(async () => {
    const res = await request(ctx.app.getHttpServer())
      .get('/app')
      .query({ src: '<script>' })
      .set('User-Agent', ANDROID_UA)
      .expect(302);

    expect(res.headers.location).toBe(PLAY_STORE_URL);
  }));

  it('HEAD /app with iPhone User-Agent returns 302 to the App Store URL', runTest(async () => {
    const res = await request(ctx.app.getHttpServer())
      .head('/app')
      .set('User-Agent', IPHONE_UA)
      .expect(302);

    expect(res.headers.location).toBe(APP_STORE_URL);
  }));

  it('GET /api/v1/app returns 404 (route lives only outside the prefix)', runTest(async () => {
    await request(ctx.app.getHttpServer())
      .get('/api/v1/app')
      .set('User-Agent', IPHONE_UA)
      .expect(404);
  }));

  it('GET /api/v1/services/categories still returns 200 (existing public route under the prefix)', runTest(async () => {
    await request(ctx.app.getHttpServer())
      .get('/api/v1/services/categories')
      .expect(200);
  }));
});
