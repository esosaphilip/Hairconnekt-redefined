import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Provider } from '../src/entities/provider.entity';
import { User } from '../src/entities/user.entity';
import { getDatabaseSslConfig } from '../src/common/database/database-ssl';

const requireEnv = (key: string): string => {
  const v = process.env[key];
  if (!v) throw new Error(`${key} fehlt.`);
  return v;
};

const getDbHost = (databaseUrl: string): string => {
  try {
    const u = new URL(databaseUrl);
    return u.hostname;
  } catch {
    throw new Error('DATABASE_URL ist ungültig.');
  }
};

const main = async () => {
  const databaseUrl = requireEnv('DATABASE_URL');
  const prodHost = requireEnv('PRODUCTION_DB_HOST');

  const dbHost = getDbHost(databaseUrl);
  const isProd = dbHost === prodHost;

  if (process.env.CONFIRM_PURGE_TEST_DATA !== 'true') {
    throw new Error('Abbruch: Setze CONFIRM_PURGE_TEST_DATA=true um fortzufahren.');
  }

  if (isProd && process.env.ALLOW_PRODUCTION_PURGE !== 'true') {
    throw new Error(
      'Abbruch: Production erkannt. Setze zusätzlich ALLOW_PRODUCTION_PURGE=true um fortzufahren.',
    );
  }

  const dataSource = new DataSource({
    type: 'postgres',
    url: databaseUrl,
    ssl: getDatabaseSslConfig(),
    entities: [Provider, User],
  });

  await dataSource.initialize();
  try {
    const repo = dataSource.getRepository(Provider);

    const matches = await repo
      .createQueryBuilder('p')
      .select(['p.id', 'p.businessName'])
      .where('LOWER(p.businessName) LIKE :a OR LOWER(p.businessName) LIKE :b', {
        a: '%test%',
        b: '%accept%',
      })
      .andWhere('p.deletedAt IS NULL')
      .getMany();

    if (matches.length === 0) {
      console.log('Keine Test-Provider gefunden.');
      return;
    }

    console.log(`DB Host: ${dbHost}`);
    console.log(`Gefundene Test-Provider: ${matches.length}`);

    if (process.env.DRY_RUN === 'true') {
      console.log('DRY_RUN=true — keine Änderungen wurden durchgeführt.');
      return;
    }

    const ids = matches.map((m) => m.id);
    const result = await repo
      .createQueryBuilder()
      .softDelete()
      .whereInIds(ids)
      .execute();

    console.log(`Soft-deleted Providers: ${result.affected ?? 0}`);
  } finally {
    await dataSource.destroy();
  }
};

main().catch((err) => {
  console.error(err?.message ?? err);
  process.exit(1);
});
