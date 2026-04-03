import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PortfolioImage } from '../entities/portfolio-image.entity';
import { Provider } from '../entities/provider.entity';
import { PortfolioController } from './portfolio.controller';
import { PortfolioService } from './portfolio.service';


@Module({
  imports: [TypeOrmModule.forFeature([PortfolioImage, Provider])],
  controllers: [PortfolioController],
  providers: [PortfolioService],
  exports: [PortfolioService],
})
export class PortfolioModule {}
