import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { getDatabaseSslConfig } from './common/database/database-ssl';

const databaseUrl = process.env.DATABASE_URL;

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: databaseUrl,
  ssl: getDatabaseSslConfig(),
  entities: [`${__dirname}/**/*.entity{.ts,.js}`],
  migrations: [`${__dirname}/migrations/*{.ts,.js}`],
  logging:
    (process.env.NODE_ENV ?? 'development') === 'development'
      ? 'all'
      : ['error', 'warn'],
});
