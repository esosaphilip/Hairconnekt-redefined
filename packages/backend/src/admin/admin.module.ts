import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminCategoriesController } from './admin-categories.controller';
import { AdminProvidersController } from './admin-providers.controller';
import { Provider } from '../entities/provider.entity';
import { User } from '../entities/user.entity';
import { ServiceCategory } from '../entities/service-category.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ServiceCategory, Provider, User]),
  ],
  controllers: [AdminCategoriesController, AdminProvidersController],
})
export class AdminModule {}
