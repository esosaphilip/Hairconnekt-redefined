import {
  Controller, Get, Patch, Param,
  UseGuards, ParseUUIDPipe, Query, Body,
  BadRequestException,
  NotFoundException,
  Res,
  Req,
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
import { NotificationsService } from '../notifications/notifications.service';
import type { Request, Response } from 'express';
import { R2Service } from '../common/storage/r2.service';
import { AuditService } from '../audit/audit.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('admin/providers')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminProvidersController {
  constructor(
    @InjectRepository(Provider)
    private readonly providerRepo: Repository<Provider>,
    private readonly notificationsService: NotificationsService,
    private readonly r2Service: R2Service,
    private readonly auditService: AuditService,
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

  @Get(':id/id-document')
  async getIdDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() admin: User,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const provider = await this.providerRepo.findOne({
      where: { id },
      select: ['id', 'idDocumentUrl'],
    });
    if (!provider?.idDocumentUrl) {
      throw new NotFoundException('ID document not found');
    }

    const signedUrl = await this.r2Service.createSignedReadUrl(
      provider.idDocumentUrl,
      60,
    );
    await this.auditService.record({
      actorUserId: admin.id,
      actorRole: admin.role,
      action: 'provider.id_document.accessed',
      targetType: 'provider',
      targetId: provider.id,
      request: req,
      metadata: {
        documentKey: provider.idDocumentUrl,
        expiresInSeconds: 60,
      },
    });
    return res.redirect(signedUrl);
  }

  // PATCH /admin/providers/:id/approve — approve provider
  @Patch(':id/approve')
  async approve(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() admin: User,
    @Req() req: Request,
  ) {
    const provider = await this.providerRepo.findOne({
      where: { id },
      select: ['id', 'userId', 'status'],
    });
    if (!provider) throw new NotFoundException('Provider not found');

    const res = await this.providerRepo.update(id, { status: ProviderStatus.APPROVED });
    if (!res.affected) throw new NotFoundException('Provider not found');

    try {
      await this.notificationsService.sendToUser({
        userId: provider.userId,
        type: 'provider_approved',
        titleDe: 'Profil freigeschaltet! 🎉',
        titleEn: 'Profile Approved! 🎉',
        bodyDe: 'Dein HairConnekt-Profil wurde genehmigt. Du kannst jetzt Buchungen empfangen!',
        bodyEn: 'Your HairConnekt profile has been approved. You can now receive bookings!',
        data: { screen: '/(provider)/' },
      });
    } catch {}

    await this.auditService.record({
      actorUserId: admin.id,
      actorRole: admin.role,
      action: 'provider.status.changed',
      targetType: 'provider',
      targetId: provider.id,
      request: req,
      beforeState: {
        status: provider.status,
      },
      afterState: {
        status: ProviderStatus.APPROVED,
      },
      metadata: {
        notificationType: 'provider_approved',
      },
    });

    return { success: true };
  }

  // PATCH /admin/providers/:id/reject — reject provider
  @Patch(':id/reject')
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() admin: User,
    @Req() req: Request,
    @Body() body: ProviderStatusReasonDto,
  ) {
    const provider = await this.providerRepo.findOne({
      where: { id },
      select: ['id', 'status'],
    });
    if (!provider) throw new NotFoundException('Provider not found');

    const res = await this.providerRepo.update(id, { status: ProviderStatus.REJECTED });
    if (!res.affected) throw new NotFoundException('Provider not found');
    await this.auditService.record({
      actorUserId: admin.id,
      actorRole: admin.role,
      action: 'provider.status.changed',
      targetType: 'provider',
      targetId: provider.id,
      request: req,
      reason: body.reason ?? null,
      beforeState: {
        status: provider.status,
      },
      afterState: {
        status: ProviderStatus.REJECTED,
      },
    });
    return { success: true };
  }

  // PATCH /admin/providers/:id/suspend — suspend approved provider
  @Patch(':id/suspend')
  async suspend(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() admin: User,
    @Req() req: Request,
    @Body() body: ProviderStatusReasonDto,
  ) {
    const provider = await this.providerRepo.findOne({
      where: { id },
      select: ['id', 'status'],
    });
    if (!provider) throw new NotFoundException('Provider not found');

    const res = await this.providerRepo.update(id, { status: ProviderStatus.SUSPENDED });
    if (!res.affected) throw new NotFoundException('Provider not found');
    await this.auditService.record({
      actorUserId: admin.id,
      actorRole: admin.role,
      action: 'provider.status.changed',
      targetType: 'provider',
      targetId: provider.id,
      request: req,
      reason: body.reason ?? null,
      beforeState: {
        status: provider.status,
      },
      afterState: {
        status: ProviderStatus.SUSPENDED,
      },
    });
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
