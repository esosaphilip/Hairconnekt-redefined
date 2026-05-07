import 'reflect-metadata';
import { DataSource } from 'typeorm';

const databaseUrl = process.env.DATABASE_URL;

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: databaseUrl,
  ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false },
  entities: [`${__dirname}/**/*.entity{.ts,.js}`],
  migrations: [`${__dirname}/migrations/*{.ts,.js}`],
  logging:
    (process.env.NODE_ENV ?? 'development') === 'development'
      ? 'all'
      : ['error', 'warn'],
});

