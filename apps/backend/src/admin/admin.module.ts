import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminCategoriesController } from './admin-categories.controller';
import { AdminProvidersController } from './admin-providers.controller';
import { AdminStatsController } from './admin-stats.controller';
import { AdminUsersController } from './admin-users.controller';
import { Provider } from '../entities/provider.entity';
import { User } from '../entities/user.entity';
import { ServiceCategory } from '../entities/service-category.entity';
import { Service } from '../entities/service.entity';
import { PopularStyle } from '../entities/popular-style.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { RefreshToken } from '../auth/entities/refresh-token.entity';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ServiceCategory,
      Provider,
      User,
      Service,
      PopularStyle,
      RefreshToken,
    ]),
    NotificationsModule,
    AuditModule,
  ],
  controllers: [
    AdminCategoriesController,
    AdminProvidersController,
    AdminStatsController,
    AdminUsersController,
  ],
})
export class AdminModule {}
