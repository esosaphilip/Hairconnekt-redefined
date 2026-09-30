import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Provider } from '../entities/provider.entity';
import { PortfolioImage } from '../entities/portfolio-image.entity';
import { User } from '../entities/user.entity';
import { Service } from '../entities/service.entity';
import { Favourite } from '../entities/favourite.entity';
import { TimeBlock } from '../entities/time-block.entity';
import { Booking } from '../entities/booking.entity';
import { AvailabilitySchedule } from '../entities/availability-schedule.entity';
import { Review } from '../entities/review.entity';
import { ProvidersController } from './providers.controller';
import { ProvidersService } from './providers.service';
import { GeocodingModule } from '../common/geocoding/geocoding.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Provider,
      PortfolioImage,
      User,
      Service,
      Favourite,
      TimeBlock,
      Booking,
      AvailabilitySchedule,
      Review,
    ]),
    GeocodingModule,
  ],
  controllers: [ProvidersController],
  providers: [ProvidersService],
  exports: [ProvidersService],
})
export class ProvidersModule {}
