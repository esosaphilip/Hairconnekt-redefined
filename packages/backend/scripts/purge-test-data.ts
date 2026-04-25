import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Provider } from '../src/entities/provider.entity';
import { User } from '../src/entities/user.entity';

const requireEnv = (key: string): string => {
  const v = process.env[key];
  if (!v) throw new Error(`${key} fehlt.`);
  return v;
};

const main = async () => {
  const databaseUrl = requireEnv('DATABASE_URL');
  const prodHost = requireEnv('PRODUCTION_DB_HOST');

  if (databaseUrl.includes(prodHost)) {
    throw new Error('Abbruch: PRODUCTION_DB_HOST erkannt. Dieses Script darf nicht auf Production laufen.');
  }

  if (process.env.CONFIRM_PURGE_TEST_DATA !== 'true') {
    throw new Error('Abbruch: Setze CONFIRM_PURGE_TEST_DATA=true um fortzufahren.');
  }

  const dataSource = new DataSource({
    type: 'postgres',
    url: databaseUrl,
    ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false },
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
