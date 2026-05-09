import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking, BookingStatus, CancelledBy } from '../entities/booking.entity';

@Injectable()
export class AppointmentSchedulerService {
  private readonly logger = new Logger(AppointmentSchedulerService.name);

  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async autoStartConfirmedAppointments(): Promise<void> {
    try {
      const now = new Date();
      const todayDate = now.toISOString().split('T')[0];
      const currentHour = now.getHours().toString().padStart(2, '0');
      const currentMinute = now.getMinutes().toString().padStart(2, '0');
      const currentTime = `${currentHour}:${currentMinute}`;

      const bookingsToStart = await this.bookingRepo
        .createQueryBuilder('booking')
        .where('booking.status = :status', { status: BookingStatus.CONFIRMED })
        .andWhere(
          '(booking.scheduledDate < :today OR (booking.scheduledDate = :today AND booking.scheduledTime <= :currentTime))',
          { today: todayDate, currentTime },
        )
        .getMany();

      if (bookingsToStart.length === 0) return;

      const ids = bookingsToStart.map((b) => b.id);
      this.logger.log(`Auto-starting ${ids.length} appointment(s)`);

      await this.bookingRepo
        .createQueryBuilder()
        .update(Booking)
        .set({ status: BookingStatus.IN_PROGRESS })
        .whereInIds(ids)
        .execute();

      this.logger.log(`Successfully auto-started appointments: ${ids.join(', ')}`);
    } catch (error) {
      this.logger.error('Error in autoStartConfirmedAppointments', error as any);
    }
  }

  @Cron('*/5 * * * *')
  async autoCancelOverduePendingAppointments(): Promise<void> {
    try {
      const now = new Date();
      const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
      const graceDateStr = thirtyMinutesAgo.toISOString().split('T')[0];
      const graceHour = thirtyMinutesAgo.getHours().toString().padStart(2, '0');
      const graceMin = thirtyMinutesAgo.getMinutes().toString().padStart(2, '0');
      const graceTime = `${graceHour}:${graceMin}`;

      const overduePending = await this.bookingRepo
        .createQueryBuilder('booking')
        .where('booking.status = :status', { status: BookingStatus.PENDING })
        .andWhere(
          '(booking.scheduledDate < :graceDate OR (booking.scheduledDate = :graceDate AND booking.scheduledTime <= :graceTime))',
          { graceDate: graceDateStr, graceTime },
        )
        .getMany();

      if (overduePending.length === 0) return;

      const ids = overduePending.map((b) => b.id);
      await this.bookingRepo
        .createQueryBuilder()
        .update(Booking)
        .set({
          status: BookingStatus.CANCELLED,
          cancelledBy: CancelledBy.SYSTEM,
          cancellationReason: 'Automatisch storniert: Anbieter hat nicht rechtzeitig bestätigt',
          cancelledAt: new Date(),
        })
        .whereInIds(ids)
        .execute();

      this.logger.log(`Auto-cancelled ${ids.length} overdue pending booking(s)`);
    } catch (error) {
      this.logger.error('Error in autoCancelOverduePendingAppointments', error as any);
    }
  }
}

