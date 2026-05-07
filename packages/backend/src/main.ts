import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import * as express from 'express';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { ErrorReporter } from './common/error-reporting/error-reporter';

async function bootstrap() {
  const setEnvAlias = (target: string, sources: string[]) => {
    const existing = process.env[target];
    if (existing !== undefined && existing.trim() !== '') return;
    for (const src of sources) {
      const value = process.env[src];
      if (value !== undefined && value.trim() !== '') {
        process.env[target] = value;
        return;
      }
    }
  };

  setEnvAlias('JWT_ACCESS_SECRET', ['JWT_SECRET']);
  setEnvAlias('JWT_ACCESS_EXPIRES', ['JWT_EXPIRES_IN']);
  setEnvAlias('JWT_REFRESH_SECRET', ['REFRESH_JWT_SECRET']);
  setEnvAlias('JWT_REFRESH_EXPIRES', ['REFRESH_JWT_EXPIRES_IN']);

  setEnvAlias('R2_BUCKET_NAME', ['R2_BUCKET']);
  setEnvAlias('R2_PUBLIC_URL', ['R2_PUBLIC_BASE_URL']);
  if (
    (process.env.R2_ENDPOINT === undefined || process.env.R2_ENDPOINT.trim() === '') &&
    process.env.R2_ACCOUNT_ID !== undefined &&
    process.env.R2_ACCOUNT_ID.trim() !== ''
  ) {
    process.env.R2_ENDPOINT = `https://${process.env.R2_ACCOUNT_ID.trim()}.r2.cloudflarestorage.com`;
  }

  const requireEnv = (name: string) => {
    const value = process.env[name];
    if (value === undefined || value.trim() === '') {
      throw new Error(`Missing required env var: ${name}`);
    }
    return value;
  };

  if ((process.env.NODE_ENV ?? 'development') === 'production') {
    requireEnv('DATABASE_URL');
    requireEnv('JWT_ACCESS_SECRET');
    requireEnv('JWT_REFRESH_SECRET');
    requireEnv('CORS_ORIGIN');
    requireEnv('R2_PUBLIC_URL');
    requireEnv('R2_ACCESS_KEY_ID');
    requireEnv('R2_SECRET_ACCESS_KEY');
    requireEnv('R2_BUCKET_NAME');
    requireEnv('R2_ENDPOINT');
    requireEnv('SENDGRID_API_KEY');
    requireEnv('SENDGRID_FROM_EMAIL');
  }

  if (
    (process.env.NODE_ENV ?? 'development') === 'production' &&
    process.env.OTP_DEV_MODE === 'true'
  ) {
    throw new Error('OTP_DEV_MODE must be disabled in production');
  }

  const app = await NestFactory.create(AppModule);
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  app.use(helmet());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  app.setGlobalPrefix('api/v1');

  app.use((req, res, next) => {
    const existingRequestId = req.header('x-request-id');
    const requestId =
      existingRequestId && existingRequestId.trim() !== ''
        ? existingRequestId
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    (req as any).requestId = requestId;
    res.setHeader('x-request-id', requestId);

    if ((process.env.NODE_ENV ?? 'development') === 'production') {
      const startMs = Date.now();
      res.on('finish', () => {
        const ms = Date.now() - startMs;
        const status = res.statusCode;
        const path = (req.originalUrl ?? req.url ?? '').toString();
        if (path.startsWith('/api/v1/health')) return;

        const entry = {
          requestId,
          method: req.method,
          path,
          status,
          ms,
          ip: (req.headers['x-forwarded-for'] as string | undefined) ?? req.ip,
          ua: req.headers['user-agent'],
        };
        console.log(JSON.stringify(entry));
      });
    }

    next();
  });

  const rawCorsOrigin = process.env.CORS_ORIGIN?.trim();
  const defaultCorsOrigins = [
    'https://hairconnekt.de',
    'https://www.hairconnekt.de',
    'https://admin.hairconnekt.de',
  ];

  if (!rawCorsOrigin) {
    app.enableCors({ origin: true, credentials: true });
  } else {
    const configured = rawCorsOrigin
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    const allowAll = configured.includes('*');

    if (allowAll) {
      app.enableCors({ origin: true, credentials: true });
    } else {
      const allowed = new Set([...configured, ...defaultCorsOrigins]);
      app.enableCors({
        origin: (origin, callback) => {
          if (!origin) return callback(null, true);
          return callback(null, allowed.has(origin));
        },
        credentials: true,
      });
    }
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const errorReporter = new ErrorReporter();
  process.on('unhandledRejection', (reason) => {
    void errorReporter.report({
      status: 500,
      method: 'process',
      path: 'unhandledRejection',
      message: reason instanceof Error ? reason.message : String(reason),
      stack: reason instanceof Error ? reason.stack : String(reason),
    });
  });
  process.on('uncaughtException', (err) => {
    void errorReporter.report({
      status: 500,
      method: 'process',
      path: 'uncaughtException',
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : String(err),
    });
  });

  app.useGlobalFilters(new GlobalExceptionFilter(errorReporter));

  await app.listen(process.env.PORT ?? 3000);
  console.log(`Backend running on port ${process.env.PORT ?? 3000}`);
}

bootstrap();
