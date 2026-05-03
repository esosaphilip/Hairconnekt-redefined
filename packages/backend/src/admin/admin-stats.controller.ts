import { Controller, Get, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { Provider, ProviderStatus } from '../entities/provider.entity';
import { ServiceCategory } from '../entities/service-category.entity';
import { PopularStyle } from '../entities/popular-style.entity';

@Controller('admin/stats')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminStatsController {
  constructor(
    @InjectRepository(Provider)
    private readonly providerRepo: Repository<Provider>,
    @InjectRepository(ServiceCategory)
    private readonly categoryRepo: Repository<ServiceCategory>,
    @InjectRepository(PopularStyle)
    private readonly popularStyleRepo: Repository<PopularStyle>,
  ) {}

  @Get()
  async getStats() {
    const [
      pendingProviders,
      approvedProviders,
      activeCategories,
      activePopularStyles,
    ] = await Promise.all([
      this.providerRepo.count({ where: { status: ProviderStatus.PENDING } }),
      this.providerRepo.count({ where: { status: ProviderStatus.APPROVED } }),
      this.categoryRepo.count({ where: { isActive: true } }),
      this.popularStyleRepo.count({ where: { isActive: true } }),
    ]);

    return {
      pendingProviders,
      approvedProviders,
      activeCategories,
      activePopularStyles,
    };
  }
}

