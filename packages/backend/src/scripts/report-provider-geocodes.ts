import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Provider } from '../entities/provider.entity';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';

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
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const providerRepo = app.get<Repository<Provider>>(
      getRepositoryToken(Provider),
    );

    const providers = await providerRepo.find({
      order: { createdAt: 'ASC' },
    });

    const geocoded = providers.filter(
      (provider) => provider.lat !== null && provider.lng !== null,
    );
    const missing = providers.filter(
      (provider) => provider.lat === null || provider.lng === null,
    );
    const protectedMissing = missing.filter(isProtectedAddress);
    const actionableMissing = missing.filter(
      (provider) => !isProtectedAddress(provider),
    );

    const summary = {
      totalProviders: providers.length,
      geocodedProviders: geocoded.length,
      missingCoordinateProviders: missing.length,
      protectedSkippedProviders: protectedMissing.length,
      actionableMissingProviders: actionableMissing.length,
    };

    const missingDetails = missing.map((provider) => ({
      id: provider.id,
      businessName: provider.businessName,
      street: provider.street,
      houseNumber: provider.houseNumber,
      city: provider.city,
      postalCode: provider.postalCode,
      protected: isProtectedAddress(provider),
    }));

    console.log(JSON.stringify({ summary, missingDetails }, null, 2));
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  console.error('[report-provider-geocodes] fatal', error);
  process.exit(1);
});
