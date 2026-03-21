import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PortfolioImage } from '../entities/portfolio-image.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PortfolioImage])],
  controllers: [],
  providers: [],
})
export class PortfolioModule {}
