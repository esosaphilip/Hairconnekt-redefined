import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PopularStyle } from '../entities/popular-style.entity';
import { PopularStylesSeedService } from '../database/seeds/popular-styles.seed';
import {
  AdminPopularStylesController,
  PopularStylesController,
} from './popular-styles.controller';
import { PopularStylesService } from './popular-styles.service';

@Module({
  imports: [TypeOrmModule.forFeature([PopularStyle])],
  controllers: [PopularStylesController, AdminPopularStylesController],
  providers: [PopularStylesService, PopularStylesSeedService],
  exports: [PopularStylesService],
})
export class PopularStylesModule {}
