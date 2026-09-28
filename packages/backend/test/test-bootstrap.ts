import './env-guard'; // MUST be first (R10, R11)
import 'reflect-metadata';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import helmet from 'helmet';
import * as express from 'express';
import * as cookieParser from 'cookie-parser';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { R2Service } from '../src/common/storage/r2.service';
import { GeocodingService } from '../src/common/geocoding/geocoding.service';
import { NotificationsService } from '../src/notifications/notifications.service';
import { GlobalExceptionFilter } from '../src/common/filters/global-exception.filter';
import { ErrorReporter } from '../src/common/error-reporting/error-reporter';
import {
  isAdminCsrfProtectedRequest,
  validateAdminCsrfRequest,
} from '../src/auth/admin-csrf';
import { FakeMailer, FakeR2Service, FakeGeocodingService, fakeMailer } from './fake-services';

export interface TestAppContext {
  app: INestApplication;
  module: TestingModule;
  dataSource: DataSource;
  fakeR2Service: FakeR2Service;
  fakeGeocodingService: FakeGeocodingService;
  fakeMailer: FakeMailer;
}

let cachedContext: TestAppContext | null = null;

export async function createTestApp(): Promise<TestAppContext> {
  if (cachedContext) {
    return cachedContext;
  }

  // Install fake mailer
  fakeMailer.install();

  const fakeR2Service = new FakeR2Service();
  const fakeGeocodingService = new FakeGeocodingService();

  const moduleBuilder = Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(R2Service)
    .useValue(fakeR2Service)
    .overrideProvider(GeocodingService)
    .useValue(fakeGeocodingService);

  const module = await moduleBuilder.compile();
  const app = module.createNestApplication();

  // Replicate main.ts configuration EXACTLY (copy, not a refactor, per Audit Q3)
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  app.use(helmet());
  app.use(cookieParser());

  app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!isAdminCsrfProtectedRequest(req as any)) {
      return next();
    }

    if (!validateAdminCsrfRequest(req as any)) {
      return res.status(403).json({
        message: 'CSRF validation failed.',
      });
    }

    return next();
  });

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const errorReporter = new ErrorReporter();
  app.useGlobalFilters(new GlobalExceptionFilter(errorReporter));

  // Stub expo push in notifications service to never attempt real HTTP calls
  try {
    const notifService = app.get(NotificationsService);
    if (notifService) {
      (notifService as any).getExpoClient = async () => ({
        chunkPushNotifications: (msgs: any[]) => [msgs],
        sendPushNotificationsAsync: async () => [{ status: 'ok' }],
      });
    }
  } catch (_) {
    // Ignore if not found
  }

  await app.init();

  const dataSource = app.get(DataSource);

  // Run migrations to ensure schema is fully up to date
  if (dataSource && typeof dataSource.runMigrations === 'function') {
    try {
      await dataSource.runMigrations({ transaction: 'each' });
    } catch (err) {
      console.warn('Migration run warning in test bootstrap:', err);
    }
  }

  cachedContext = {
    app,
    module,
    dataSource,
    fakeR2Service,
    fakeGeocodingService,
    fakeMailer,
  };

  return cachedContext;
}

export async function closeTestApp(): Promise<void> {
  if (cachedContext) {
    try {
      await cachedContext.app.close();
    } catch (_) {}
    fakeMailer.restore();
    cachedContext = null;
  }
}

/**
 * Truncates all tables except reference data (service_categories, popular_styles) and migrations table.
 */
export async function truncateAllTables(dataSource: DataSource): Promise<void> {
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  try {
    const tables: Array<{ tablename: string }> = await queryRunner.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
        AND tablename NOT IN ('service_categories', 'popular_styles', 'migrations')
    `);

    if (tables.length > 0) {
      const tableNames = tables.map((t) => `"${t.tablename}"`).join(', ');
      await queryRunner.query(`TRUNCATE TABLE ${tableNames} RESTART IDENTITY CASCADE`);
    }
  } finally {
    await queryRunner.release();
  }
}
