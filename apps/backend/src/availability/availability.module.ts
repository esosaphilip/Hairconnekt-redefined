import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AvailabilitySchedule } from '../entities/availability-schedule.entity';
import { TimeBlock } from '../entities/time-block.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AvailabilitySchedule, TimeBlock])],
  controllers: [],
  providers: [],
})
export class AvailabilityModule {}
