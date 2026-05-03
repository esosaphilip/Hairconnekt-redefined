import {
  Controller, Get, Patch, Param,
  UseGuards, ParseUUIDPipe, Query, Body,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Provider, ProviderStatus } from '../entities/provider.entity';
import { User } from '../entities/user.entity';
import { Service } from '../entities/service.entity';
import { ProviderAdminDto } from './dto/provider-admin.dto';
import { ProviderStatusReasonDto } from './dto/provider-status-reason.dto';

@Controller('admin/providers')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminProvidersController {
  constructor(
    @InjectRepository(Provider)
    private readonly providerRepo: Repository<Provider>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Service)
    private readonly serviceRepo: Repository<Service>,
  ) {}

  private isProtectedAddress(provider: Provider) {
    const street = provider.street?.trim().toLowerCase();
    const city = provider.city?.trim().toLowerCase();
    const postalCode = provider.postalCode?.trim();

    return (
      street === 'mühlenweg' ||
      (city === 'wuppertal' && postalCode === '42275')
    );
  }

  // GET /admin/providers?status=pending
  @Get()
  async findAll(@Query('status') status?: string) {
    const parsedStatus = this.parseStatus(status);

    const qb = this.providerRepo
      .createQueryBuilder('provider')
      .leftJoin('provider.user', 'user')
      .leftJoin(Service, 'service', 'service.providerId = provider.id')
      .select('provider.id', 'id')
      .addSelect('provider.businessName', 'businessName')
      .addSelect('provider.providerType', 'providerType')
      .addSelect('provider.status', 'status')
      .addSelect('provider.city', 'city')
      .addSelect('provider.idDocumentUrl', 'idDocumentUrl')
      .addSelect('provider.avatarUrl', 'avatarUrl')
      .addSelect('provider.createdAt', 'createdAt')
      .addSelect('user.firstName', 'userFirstName')
      .addSelect('user.lastName', 'userLastName')
      .addSelect('user.email', 'userEmail')
      .addSelect('user.phone', 'userPhone')
      .addSelect('user.isEmailVerified', 'userIsEmailVerified')
      .addSelect('COUNT(service.id)', 'servicesCount')
      .groupBy('provider.id')
      .addGroupBy('user.id')
      .orderBy('provider.createdAt', 'DESC');

    if (parsedStatus) {
      qb.where('provider.status = :status', { status: parsedStatus });
    }

    const rows = await qb.getRawMany();
    return rows.map(ProviderAdminDto.fromRaw);
  }

  // GET /admin/providers/geocoding/report — provider geo data health
  @Get('geocoding/report')
  async getGeocodingReport() {
    const providers = await this.providerRepo.find({
      order: { createdAt: 'ASC' },
      select: {
        id: true,
        businessName: true,
        street: true,
        houseNumber: true,
        city: true,
        postalCode: true,
        lat: true,
        lng: true,
      },
    });

    const geocoded = providers.filter(
      (provider) => provider.lat !== null && provider.lng !== null,
    );
    const missing = providers.filter(
      (provider) => provider.lat === null || provider.lng === null,
    );
    const protectedMissing = missing.filter((provider) =>
      this.isProtectedAddress(provider),
    );
    const actionableMissing = missing.filter(
      (provider) => !this.isProtectedAddress(provider),
    );

    return {
      summary: {
        totalProviders: providers.length,
        geocodedProviders: geocoded.length,
        missingCoordinateProviders: missing.length,
        protectedSkippedProviders: protectedMissing.length,
        actionableMissingProviders: actionableMissing.length,
      },
      missingDetails: missing.map((provider) => ({
        id: provider.id,
        businessName: provider.businessName,
        street: provider.street,
        houseNumber: provider.houseNumber,
        city: provider.city,
        postalCode: provider.postalCode,
        protected: this.isProtectedAddress(provider),
      })),
    };
  }

  // GET /admin/providers/:id — full provider detail
  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const row = await this.providerRepo
      .createQueryBuilder('provider')
      .leftJoin('provider.user', 'user')
      .leftJoin(Service, 'service', 'service.providerId = provider.id')
      .select('provider.id', 'id')
      .addSelect('provider.businessName', 'businessName')
      .addSelect('provider.providerType', 'providerType')
      .addSelect('provider.status', 'status')
      .addSelect('provider.city', 'city')
      .addSelect('provider.idDocumentUrl', 'idDocumentUrl')
      .addSelect('provider.avatarUrl', 'avatarUrl')
      .addSelect('provider.createdAt', 'createdAt')
      .addSelect('user.firstName', 'userFirstName')
      .addSelect('user.lastName', 'userLastName')
      .addSelect('user.email', 'userEmail')
      .addSelect('user.phone', 'userPhone')
      .addSelect('user.isEmailVerified', 'userIsEmailVerified')
      .addSelect('COUNT(service.id)', 'servicesCount')
      .where('provider.id = :id', { id })
      .groupBy('provider.id')
      .addGroupBy('user.id')
      .getRawOne();

    if (!row) throw new NotFoundException('Provider not found');
    return ProviderAdminDto.fromRaw(row);
  }

  // PATCH /admin/providers/:id/approve — approve provider
  @Patch(':id/approve')
  async approve(@Param('id', ParseUUIDPipe) id: string) {
    const res = await this.providerRepo.update(id, { status: ProviderStatus.APPROVED });
    if (!res.affected) throw new NotFoundException('Provider not found');
    return { success: true };
  }

  // PATCH /admin/providers/:id/reject — reject provider
  @Patch(':id/reject')
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() _body: ProviderStatusReasonDto,
  ) {
    const res = await this.providerRepo.update(id, { status: ProviderStatus.REJECTED });
    if (!res.affected) throw new NotFoundException('Provider not found');
    return { success: true };
  }

  // PATCH /admin/providers/:id/suspend — suspend approved provider
  @Patch(':id/suspend')
  async suspend(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() _body: ProviderStatusReasonDto,
  ) {
    const res = await this.providerRepo.update(id, { status: ProviderStatus.SUSPENDED });
    if (!res.affected) throw new NotFoundException('Provider not found');
    return { success: true };
  }

  private parseStatus(status?: string): ProviderStatus | undefined {
    if (!status) return undefined;
    const allowed = Object.values(ProviderStatus);
    if (!allowed.includes(status as ProviderStatus)) {
      throw new BadRequestException('Invalid status');
    }
    return status as ProviderStatus;
  }
}
