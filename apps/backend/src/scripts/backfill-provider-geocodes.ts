import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { GeocodingService } from '../common/geocoding/geocoding.service';
import { Provider } from '../entities/provider.entity';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';

type CliOptions = {
  dryRun: boolean;
  limit: number | null;
  all: boolean;
};

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    dryRun: false,
    limit: null,
    all: false,
  };

  for (const arg of argv) {
    if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--all') {
      options.all = true;
    } else if (arg.startsWith('--limit=')) {
      const value = Number(arg.split('=')[1]);
      if (Number.isFinite(value) && value > 0) {
        options.limit = Math.floor(value);
      }
    }
  }

  return options;
}

function hasAddress(provider: Provider): boolean {
  return Boolean(
    provider.street?.trim() &&
      provider.houseNumber?.trim() &&
      provider.city?.trim() &&
      provider.postalCode?.trim(),
  );
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const geocodingService = app.get(GeocodingService);
    const providerRepo = app.get<Repository<Provider>>(
      getRepositoryToken(Provider),
    );

    const qb = providerRepo.createQueryBuilder('provider');

    if (!options.all) {
      qb.where('provider.lat IS NULL OR provider.lng IS NULL');
    }

    qb.orderBy('provider.createdAt', 'ASC');

    if (options.limit) {
      qb.take(options.limit);
    }

    const providers = await qb.getMany();

    console.log(
      `[geocode-backfill] mode=${options.dryRun ? 'dry-run' : 'write'} providers=${providers.length} scope=${options.all ? 'all' : 'missing-only'}`,
    );

    let updated = 0;
    let skippedNoAddress = 0;
    let notFound = 0;
    let failed = 0;

    for (const provider of providers) {
      if (!hasAddress(provider)) {
        skippedNoAddress += 1;
        console.log(
          `[skip:no-address] ${provider.id} ${provider.businessName}`,
        );
        continue;
      }

      const result = await geocodingService.geocodeAddress({
        street: provider.street,
        houseNumber: provider.houseNumber,
        city: provider.city,
        postalCode: provider.postalCode,
      });

      if (result.status === 'success') {
        updated += 1;
        console.log(
          `[ok] ${provider.id} ${provider.businessName} -> ${result.coordinates.lat},${result.coordinates.lng}`,
        );

        if (!options.dryRun) {
          provider.lat = result.coordinates.lat as any;
          provider.lng = result.coordinates.lng as any;
          await providerRepo.save(provider);
        }
        continue;
      }

      if (result.status === 'not_found') {
        notFound += 1;
        console.log(`[not-found] ${provider.id} ${provider.businessName}`);
        continue;
      }

      failed += 1;
      console.log(`[error] ${provider.id} ${provider.businessName}`);
    }

    console.log(
      `[summary] updated=${updated} skippedNoAddress=${skippedNoAddress} notFound=${notFound} failed=${failed}`,
    );
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  console.error('[geocode-backfill] fatal', error);
  process.exit(1);
});
