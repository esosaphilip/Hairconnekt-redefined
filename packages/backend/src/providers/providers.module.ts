import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Provider } from '../entities/provider.entity';
import { PortfolioImage } from '../entities/portfolio-image.entity';
import { User } from '../entities/user.entity';
import { Service } from '../entities/service.entity';
import { TimeBlock } from '../entities/time-block.entity';
import { Booking } from '../entities/booking.entity';
import { AvailabilitySchedule } from '../entities/availability-schedule.entity';
import { Review } from '../entities/review.entity';
import { ProvidersController } from './providers.controller';
import { ProvidersService } from './providers.service';

@Module({
  imports: [TypeOrmModule.forFeature([Provider, PortfolioImage, User, Service, TimeBlock, Booking, AvailabilitySchedule, Review])],
  controllers: [ProvidersController],
  providers: [ProvidersService],
  exports: [ProvidersService],
})
export class ProvidersModule {}
