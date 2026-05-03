import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminCategoriesController } from './admin-categories.controller';
import { AdminProvidersController } from './admin-providers.controller';
import { AdminStatsController } from './admin-stats.controller';
import { Provider } from '../entities/provider.entity';
import { User } from '../entities/user.entity';
import { ServiceCategory } from '../entities/service-category.entity';
import { Service } from '../entities/service.entity';
import { PopularStyle } from '../entities/popular-style.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ServiceCategory, Provider, User, Service, PopularStyle]),
  ],
  controllers: [AdminCategoriesController, AdminProvidersController, AdminStatsController],
})
export class AdminModule {}
