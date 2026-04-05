import {
  Controller, Get, Patch, Param,
  UseGuards, ParseUUIDPipe, Query, Body,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Provider, ProviderStatus } from '../entities/provider.entity';
import { User } from '../entities/user.entity';

@Controller('admin/providers')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminProvidersController {
  constructor(
    @InjectRepository(Provider)
    private readonly providerRepo: Repository<Provider>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  // GET /admin/providers?status=pending
  @Get()
  async findAll(@Query('status') status?: string) {
    const where = status ? { status: status as ProviderStatus } : {};
    return this.providerRepo.find({
      where,
      relations: ['user'],
      order: { createdAt: 'DESC' },
      select: {
        id: true,
        businessName: true,
        status: true,
        providerType: true,
        city: true,
        createdAt: true,
        idDocumentUrl: true,
        avatarUrl: true,
        user: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      },
    });
  }

  // GET /admin/providers/:id — full provider detail
  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const provider = await this.providerRepo.findOne({
      where: { id },
      relations: ['user'],
    });
    if (!provider) throw new Error('Anbieter nicht gefunden.');
    return provider;
  }

  // PATCH /admin/providers/:id/approve — approve provider
  @Patch(':id/approve')
  async approve(@Param('id', ParseUUIDPipe) id: string) {
    const provider = await this.providerRepo.findOne({
      where: { id },
      relations: ['user'],
    });
    if (!provider) throw new Error('Anbieter nicht gefunden.');
    provider.status = ProviderStatus.APPROVED;
    await this.providerRepo.save(provider);
    // TODO Phase 2: send approval email via SMTP
    return { message: 'Anbieter wurde freigeschalten.', provider };
  }

  // PATCH /admin/providers/:id/reject — reject provider
  @Patch(':id/reject')
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { reason?: string },
  ) {
    const provider = await this.providerRepo.findOne({
      where: { id },
      relations: ['user'],
    });
    if (!provider) throw new Error('Anbieter nicht gefunden.');
    // Normally store reason in DB, for now just set status:
    provider.status = ProviderStatus.REJECTED;
    await this.providerRepo.save(provider);
    // TODO Phase 2: send rejection email with reason
    return { message: 'Anbieter wurde abgelehnt.' };
  }

  // PATCH /admin/providers/:id/suspend — suspend approved provider
  @Patch(':id/suspend')
  async suspend(@Param('id', ParseUUIDPipe) id: string) {
    await this.providerRepo.update(id, { status: ProviderStatus.SUSPENDED });
    return { message: 'Anbieter wurde gesperrt.' };
  }
}
