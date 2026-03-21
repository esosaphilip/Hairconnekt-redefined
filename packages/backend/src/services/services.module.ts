import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Service } from '../entities/service.entity';
import { ServiceCategory } from '../entities/service-category.entity';
import { CategoriesSeedService } from '../seeds/categories.seed';
import { ServicesController } from './services.controller';
import { CategoriesService } from './services.service';

@Module({
  imports: [TypeOrmModule.forFeature([Service, ServiceCategory])],
  controllers: [ServicesController],
  providers: [CategoriesSeedService, CategoriesService],
  exports: [CategoriesService],
})
export class ServicesModule {}
