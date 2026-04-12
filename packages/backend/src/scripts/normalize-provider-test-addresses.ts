import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Provider } from '../entities/provider.entity';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { GeocodingService } from '../common/geocoding/geocoding.service';

type CliOptions = {
  dryRun: boolean;
};

type ReplacementAddress = {
  street: string;
  houseNumber: string;
  city: string;
  postalCode: string;
};

const REPLACEMENT_ADDRESSES: ReplacementAddress[] = [
  { street: 'Pariser Platz', houseNumber: '1', city: 'Berlin', postalCode: '10117' },
  { street: 'Domkloster', houseNumber: '4', city: 'Köln', postalCode: '50667' },
  { street: 'Kettwiger Straße', houseNumber: '12', city: 'Essen', postalCode: '45127' },
  { street: 'Burgplatz', houseNumber: '2', city: 'Düsseldorf', postalCode: '40213' },
  { street: 'Marktstraße', houseNumber: '10', city: 'Wuppertal', postalCode: '42103' },
  { street: 'Königstraße', houseNumber: '1A', city: 'Stuttgart', postalCode: '70173' },
  { street: 'Schildergasse', houseNumber: '84', city: 'Köln', postalCode: '50667' },
  { street: 'Spitalerstraße', houseNumber: '22', city: 'Hamburg', postalCode: '20095' },
];

function parseArgs(argv: string[]): CliOptions {
  return {
    dryRun: argv.includes('--dry-run'),
  };
}

function isProtectedAddress(provider: Provider): boolean {
  const street = provider.street?.trim().toLowerCase();
  const city = provider.city?.trim().toLowerCase();
  const postalCode = provider.postalCode?.trim();

  return (
    street === 'mühlenweg' ||
    (city === 'wuppertal' && postalCode === '42275')
  );
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const providerRepo = app.get<Repository<Provider>>(
      getRepositoryToken(Provider),
    );
    const geocodingService = app.get(GeocodingService);
    const providers = await providerRepo.find({
      order: { createdAt: 'ASC' },
    });

    const targets = providers.filter(
      (provider) =>
        !isProtectedAddress(provider) &&
        (provider.lat === null || provider.lng === null),
    );

    console.log(
      `[normalize-provider-test-addresses] mode=${options.dryRun ? 'dry-run' : 'write'} targets=${targets.length}`,
    );

    let updated = 0;
    let geocoded = 0;
    let notFound = 0;
    let failed = 0;

    for (const [index, provider] of targets.entries()) {
      const replacement = REPLACEMENT_ADDRESSES[index % REPLACEMENT_ADDRESSES.length];
      console.log(
        `[target] ${provider.id} ${provider.businessName} -> ${replacement.street} ${replacement.houseNumber}, ${replacement.postalCode} ${replacement.city}`,
      );

      if (options.dryRun) {
        updated += 1;
        continue;
      }

      provider.street = replacement.street;
      provider.houseNumber = replacement.houseNumber;
      provider.city = replacement.city;
      provider.postalCode = replacement.postalCode;

      const result = await geocodingService.geocodeAddress(replacement);

      if (result.status === 'success') {
        provider.lat = result.coordinates.lat as any;
        provider.lng = result.coordinates.lng as any;
        geocoded += 1;
      } else if (result.status === 'not_found') {
        provider.lat = null as any;
        provider.lng = null as any;
        notFound += 1;
      } else {
        failed += 1;
      }

      await providerRepo.save(provider);
      updated += 1;
    }

    console.log(
      `[summary] updated=${updated} geocoded=${geocoded} notFound=${notFound} failed=${failed}`,
    );
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  console.error('[normalize-provider-test-addresses] fatal', error);
  process.exit(1);
});
