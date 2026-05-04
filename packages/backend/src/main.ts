import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import * as express from 'express';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

async function bootstrap() {
  const requireEnv = (name: string) => {
    const value = process.env[name];
    if (value === undefined || value.trim() === '') {
      throw new Error(`Missing required env var: ${name}`);
    }
    return value;
  };

  if ((process.env.NODE_ENV ?? 'development') === 'production') {
    requireEnv('DATABASE_URL');
    requireEnv('JWT_SECRET');
    requireEnv('REFRESH_JWT_SECRET');
    requireEnv('CORS_ORIGIN');
    requireEnv('R2_PUBLIC_BASE_URL');
    requireEnv('R2_ACCOUNT_ID');
    requireEnv('R2_ACCESS_KEY_ID');
    requireEnv('R2_SECRET_ACCESS_KEY');
    requireEnv('R2_BUCKET');
    requireEnv('SENDGRID_API_KEY');
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

  app.enableCors({
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',').map(s => s.trim()).filter(Boolean)
      : true,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter());

  await app.listen(process.env.PORT ?? 3000);
  console.log(`Backend running on port ${process.env.PORT ?? 3000}`);
}

bootstrap();
