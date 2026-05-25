import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Raw } from 'typeorm';
import { Booking, BookingStatus, CancelledBy } from '../entities/booking.entity';
import { Service } from '../entities/service.entity';
import { Provider } from '../entities/provider.entity';
import { AvailabilitySchedule } from '../entities/availability-schedule.entity';
import { TimeBlock } from '../entities/time-block.entity';
import { UserRole } from '../entities/user.entity';
import { CreateBookingDto } from './dto/create-booking.dto';
import { RescheduleBookingDto } from './dto/reschedule-booking.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(Service)
    private readonly serviceRepo: Repository<Service>,
    @InjectRepository(Provider)
    private readonly providerRepo: Repository<Provider>,
    @InjectRepository(AvailabilitySchedule)
    private readonly availabilityScheduleRepo: Repository<AvailabilitySchedule>,
    @InjectRepository(TimeBlock)
    private readonly timeBlockRepo: Repository<TimeBlock>,
    private readonly notificationsService: NotificationsService,
  ) {}

  private async sendNotificationSafely(
    context: string,
    payload: Parameters<NotificationsService['sendToUser']>[0],
  ): Promise<void> {
    try {
      await this.notificationsService.sendToUser(payload);
    } catch (error) {
      this.logger.warn(
        `Notification failed during ${context} for user ${payload.userId}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }

  private generateBookingNumber(dateStr: string): string {
    const compactDate = dateStr.replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000).toString();
    return `HC-${compactDate}-${randomSuffix}`;
  }

  // Helper: convert HH:MM or HH:MM:SS into total minutes since midnight
  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * validateBookingSlot — called by createBooking() and rescheduleBooking()
   * Throws a specific exception for each failure reason.
   */
  private async validateBookingSlot(
    providerId: string,
    scheduledDate: string,
    scheduledTime: string,
    excludeBookingId?: string,
  ): Promise<void> {
    const provider = await this.providerRepo.findOne({
      where: { id: providerId },
      select: ['id', 'isOnline', 'status'],
    });

    if (!provider) {
      throw new NotFoundException('Anbieter nicht gefunden.');
    }

    if (!provider.isOnline) {
      throw new BadRequestException(
        'Der Anbieter nimmt derzeit keine Buchungen an.',
      );
    }

    if (provider.status?.toLowerCase() !== 'approved') {
      throw new BadRequestException(
        'Dieser Anbieter ist nicht freigeschaltet.',
      );
    }

    const dateObj = new Date(`${scheduledDate}T${scheduledTime}:00`);
    const dayOfWeek = dateObj.getDay();

    const schedule = await this.availabilityScheduleRepo.findOne({
      where: {
        providerId,
        dayOfWeek,
      },
    });

    if (!schedule || !schedule.isOpen) {
      throw new BadRequestException(
        'Der Anbieter ist an diesem Wochentag nicht verfuegbar.',
      );
    }

    if (!schedule.openTime || !schedule.closeTime) {
      throw new BadRequestException(
        'Für diesen Tag sind keine gueltigen Oeffnungszeiten hinterlegt.',
      );
    }

    const requestedMinutes = this.timeToMinutes(scheduledTime);
    const openMinutes = this.timeToMinutes(schedule.openTime);
    const closeMinutes = this.timeToMinutes(schedule.closeTime);

    if (requestedMinutes < openMinutes || requestedMinutes >= closeMinutes) {
      throw new BadRequestException(
        `Der Anbieter ist nur zwischen ${schedule.openTime.slice(0, 5)} und ${schedule.closeTime.slice(0, 5)} Uhr verfügbar.`,
      );
    }

    const activeBlocks = await this.timeBlockRepo.find({
      where: { providerId },
    });

    for (const block of activeBlocks) {
      if (scheduledDate >= block.startDate && scheduledDate <= block.endDate) {
        if (block.isAllDay) {
          throw new ConflictException(
            'Der Anbieter ist an diesem Tag nicht verfügbar (blockiert).',
          );
        }

        if (block.startTime && block.endTime) {
          const blockStartMin = this.timeToMinutes(block.startTime);
          const blockEndMin = this.timeToMinutes(block.endTime);

          if (
            requestedMinutes >= blockStartMin &&
            requestedMinutes < blockEndMin
          ) {
            throw new ConflictException(
              'Der Anbieter ist zu dieser Uhrzeit nicht verfügbar (blockiert).',
            );
          }
        }
      }
    }

    const conflictQuery = this.bookingRepo
      .createQueryBuilder('booking')
      .where('booking.providerId = :providerId', { providerId })
      .andWhere('booking.scheduledDate = :scheduledDate', { scheduledDate })
      .andWhere('booking.scheduledTime = :scheduledTime', { scheduledTime })
      .andWhere('booking.status NOT IN (:...inactiveStatuses)', {
        inactiveStatuses: [BookingStatus.CANCELLED],
      });

    if (excludeBookingId) {
      conflictQuery.andWhere('booking.id != :excludeBookingId', {
        excludeBookingId,
      });
    }

    const conflict = await conflictQuery.getOne();
    if (conflict) {
      throw new ConflictException(
        'Dieser Zeitslot ist bereits vergeben. Bitte wähle eine andere Zeit.',
      );
    }
  }

  async createBooking(clientId: string, dto: CreateBookingDto) {
    const { providerId, serviceIds, scheduledDate, scheduledTime, isMobile, clientNotes } = dto;
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const timeRegex = /^\d{2}:\d{2}$/;

    if (!dateRegex.test(scheduledDate)) {
      throw new BadRequestException('scheduledDate must be in YYYY-MM-DD format');
    }

    if (!timeRegex.test(scheduledTime)) {
      throw new BadRequestException('scheduledTime must be in HH:MM format');
    }

    const allDayBlockExists = await this.timeBlockRepo
      .createQueryBuilder('block')
      .where('block.providerId = :providerId', { providerId })
      .andWhere('block.startDate <= :date', { date: scheduledDate })
      .andWhere('block.endDate >= :date', { date: scheduledDate })
      .andWhere('block.isAllDay = true')
      .getOne();

    if (allDayBlockExists) {
      throw new ConflictException(
        'Dieser Tag ist vom Anbieter blockiert und steht nicht zur Verfügung.',
      );
    }

    await this.validateBookingSlot(providerId, scheduledDate, scheduledTime);

    const services = await this.serviceRepo.findBy({ id: In(serviceIds) });
    if (services.length !== serviceIds.length) {
      throw new BadRequestException('One or more services could not be resolved');
    }

    const totalPrice = services.reduce((sum, service) => sum + Number(service.price), 0);

    const booking = this.bookingRepo.create({
      bookingNumber: this.generateBookingNumber(scheduledDate),
      clientId,
      providerId,
      status: BookingStatus.PENDING,
      scheduledDate,
      scheduledTime,
      isMobile,
      clientNotes: clientNotes || '',
      services,
      totalPrice,
      paymentMethod: 'CASH', // Locked safely in Phase 1 constraints mapping explicitly
    });

    const savedBooking = await this.bookingRepo.save(booking);
    const fullBooking = await this.bookingRepo.findOne({
      where: { id: savedBooking.id },
      relations: ['services', 'provider', 'provider.user', 'client'],
    });

    if (fullBooking?.provider?.userId && fullBooking?.client) {
      await this.sendNotificationSafely('booking creation', {
        userId: fullBooking.provider.userId,
        type: 'new_booking',
        titleDe: 'Neue Buchungsanfrage',
        titleEn: 'New Booking Request',
        bodyDe: `${fullBooking.client.firstName} möchte einen Termin am ${fullBooking.scheduledDate} um ${fullBooking.scheduledTime} Uhr`,
        bodyEn: `${fullBooking.client.firstName} wants to book on ${fullBooking.scheduledDate} at ${fullBooking.scheduledTime}`,
        data: { screen: `/(provider)/booking-request/${fullBooking.id}`, bookingId: fullBooking.id },
      });
    }

    return {
      message: 'Booking created successfully',
      booking: fullBooking,
    };
  }

  async findOne(id: string, user: any) {
    const booking = await this.bookingRepo.findOne({
      where: { id },
      relations: ['provider', 'provider.user', 'services', 'client'],
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    const userId = user.sub || user.id;
    if (user.role === UserRole.CLIENT && booking.clientId !== userId) {
      throw new NotFoundException('Booking not found');
    }
    
    if (user.role === UserRole.PROVIDER) {
      const provider = await this.providerRepo.findOne({ where: { userId } });
      if (!provider || booking.providerId !== provider.id) {
        throw new NotFoundException('Booking not found');
      }
    }

    return booking;
  }

  async findAll(user: any, statusStr: string, page: number, limit: number, todayOnly = false, month?: string) {
    const userId = user.sub || user.id;
    const role = user.role;

    const where: any = {};
    if (role === UserRole.CLIENT) {
      where.clientId = userId;
    } else if (role === UserRole.PROVIDER) {
      const provider = await this.providerRepo.findOne({ where: { userId } });
      if (provider) {
        where.providerId = provider.id;
      } else {
        return { data: [], total: 0, page, limit };
      }
    }

    if (todayOnly) {
      where.scheduledDate = new Date().toISOString().split('T')[0];
    } else if (month) {
      // month format: YYYY-MM
      where.scheduledDate = Raw(alias => `${alias} >= '${month}-01' AND ${alias} < '${month}-01'::date + INTERVAL '1 month'`);
    } else if (statusStr) {
      const statuses = statusStr.split(',').map(s => s.trim());
      where.status = In(statuses);
    }

    const [data, total] = await this.bookingRepo.findAndCount({
      where,
      relations: ['provider', 'provider.user', 'services', 'client'],
      order: {
        scheduledDate: 'DESC',
        scheduledTime: 'DESC',
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total, page, limit };
  }

  async rescheduleBooking(id: string, user: any, dto: RescheduleBookingDto) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const timeRegex = /^\d{2}:\d{2}$/;

    if (!dateRegex.test(dto.scheduledDate)) {
      throw new BadRequestException('scheduledDate must be in YYYY-MM-DD format');
    }

    if (!timeRegex.test(dto.scheduledTime)) {
      throw new BadRequestException('scheduledTime must be in HH:MM format');
    }

    const booking = await this.bookingRepo.findOne({
      where: { id },
      relations: ['provider', 'provider.user', 'client'],
    });
    
    if (!booking) {
      throw new NotFoundException('Buchung nicht gefunden.');
    }

    const userId = user.sub || user.id;
    if (user.role === UserRole.CLIENT && booking.clientId !== userId) {
      throw new ForbiddenException('Keine Berechtigung.');
    }

    // Only PENDING and CONFIRMED bookings can be rescheduled
    const allowedStatuses = ['pending', 'confirmed', 'PENDING', 'CONFIRMED'];
    if (!allowedStatuses.includes(booking.status)) {
      throw new BadRequestException(
        'Dieser Termin kann nicht verschoben werden.'
      );
    }

    await this.validateBookingSlot(
      booking.providerId,
      dto.scheduledDate,
      dto.scheduledTime,
      id,
    );

    booking.scheduledDate = dto.scheduledDate;
    booking.scheduledTime = dto.scheduledTime;
    booking.status = BookingStatus.PENDING;

    if (dto.reason) {
      booking.clientNotes = booking.clientNotes
        ? `${booking.clientNotes}\n\n[Reschedule Reason]: ${dto.reason}`
        : `[Reschedule Reason]: ${dto.reason}`;
    }

    await this.bookingRepo.save(booking);

    if (booking?.provider?.userId && booking?.client) {
      await this.sendNotificationSafely('booking reschedule', {
        userId: booking.provider.userId,
        type: 'booking_rescheduled',
        titleDe: 'Terminverschiebung angefragt',
        titleEn: 'Reschedule Requested',
        bodyDe: `${booking.client.firstName} möchte den Termin auf ${dto.scheduledDate} um ${dto.scheduledTime} Uhr verschieben`,
        bodyEn: `${booking.client.firstName} wants to reschedule to ${dto.scheduledDate} at ${dto.scheduledTime}`,
        data: { screen: `/(provider)/booking-request/${booking.id}`, bookingId: booking.id },
      });
    }

    return this.findOne(id, user);
  }

  async cancelBooking(id: string, user: any, dto: CancelBookingDto) {
    const booking = await this.bookingRepo.findOne({
      where: { id },
      relations: ['provider', 'provider.user', 'client'],
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    const userId = user.sub || user.id;
    if (user.role === UserRole.CLIENT) {
      if (booking.clientId !== userId) {
        throw new NotFoundException('Booking not found');
      }
      booking.cancelledBy = CancelledBy.CLIENT;
    } else if (user.role === UserRole.PROVIDER) {
      const provider = await this.providerRepo.findOne({ where: { userId } });
      if (!provider || booking.providerId !== provider.id) {
        throw new NotFoundException('Booking not found');
      }
      booking.cancelledBy = CancelledBy.PROVIDER;
    } else {
      throw new ForbiddenException('Keine Berechtigung.');
    }

    if (booking.status !== BookingStatus.PENDING && booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException('Only PENDING or CONFIRMED bookings can be cancelled');
    }

    booking.status = BookingStatus.CANCELLED; 
    booking.cancelledAt = new Date();

    const cancelDetails = dto.notes 
      ? `[Cancel Reason]: ${dto.reason}\n${dto.notes}` 
      : `[Cancel Reason]: ${dto.reason}`;

    booking.clientNotes = booking.clientNotes 
        ? `${booking.clientNotes}\n\n${cancelDetails}` 
        : cancelDetails;

    await this.bookingRepo.save(booking);

    if (booking.cancelledBy === CancelledBy.CLIENT && booking?.provider?.userId && booking?.client) {
      await this.sendNotificationSafely('booking cancellation by client', {
        userId: booking.provider.userId,
        type: 'booking_cancelled_by_client',
        titleDe: 'Termin storniert',
        titleEn: 'Appointment Cancelled',
        bodyDe: `${booking.client.firstName} hat den Termin am ${booking.scheduledDate} um ${booking.scheduledTime} Uhr storniert`,
        bodyEn: `${booking.client.firstName} cancelled the appointment on ${booking.scheduledDate} at ${booking.scheduledTime}`,
        data: { screen: '/(provider)/calendar', bookingId: booking.id },
      });
    }

    if (booking.cancelledBy === CancelledBy.PROVIDER && booking?.provider) {
      await this.sendNotificationSafely('booking cancellation by provider', {
        userId: booking.clientId,
        type: 'booking_cancelled_by_provider',
        titleDe: 'Termin abgesagt',
        titleEn: 'Appointment Cancelled',
        bodyDe: `${booking.provider.businessName} hat deinen Termin am ${booking.scheduledDate} leider abgesagt`,
        bodyEn: `${booking.provider.businessName} has cancelled your appointment on ${booking.scheduledDate}`,
        data: { screen: `/(client)/appointments/${booking.id}`, bookingId: booking.id },
      });
    }

    return this.findOne(id, user);
  }

  // --- Provider booking lifecycle ---

  private async findBookingForProvider(bookingId: string, user: any) {
    const userId = user.sub || user.id;
    const booking = await this.bookingRepo.findOne({
      where: { id: bookingId },
      relations: ['provider', 'provider.user', 'services', 'client'],
    });
    if (!booking) throw new NotFoundException('Booking not found');

    const provider = await this.providerRepo.findOne({ where: { userId } });
    if (!provider || booking.providerId !== provider.id) {
      throw new ForbiddenException('Du hast keine Berechtigung für diese Buchung.');
    }
    return booking;
  }

  async acceptBooking(id: string, user: any) {
    const booking = await this.findBookingForProvider(id, user);
    if (booking.status === BookingStatus.CONFIRMED) {
      return this.findOne(id, user);
    }
    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException('Nur ausstehende Buchungen können bestätigt werden.');
    }
    booking.status = BookingStatus.CONFIRMED;
    await this.bookingRepo.save(booking);
    if (booking?.provider) {
      await this.sendNotificationSafely('booking acceptance', {
        userId: booking.clientId,
        type: 'booking_confirmed',
        titleDe: 'Buchung bestätigt ✓',
        titleEn: 'Booking Confirmed ✓',
        bodyDe: `Dein Termin mit ${booking.provider.businessName} am ${booking.scheduledDate} wurde bestätigt`,
        bodyEn: `Your appointment with ${booking.provider.businessName} on ${booking.scheduledDate} is confirmed`,
        data: { screen: `/(client)/appointments/${booking.id}`, bookingId: booking.id },
      });
    }
    return this.findOne(id, user);
  }

  async declineBooking(id: string, user: any) {
    const booking = await this.findBookingForProvider(id, user);
    if (booking.status === BookingStatus.CANCELLED) {
      return this.findOne(id, user);
    }
    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException('Nur ausstehende Buchungen können abgelehnt werden.');
    }
    booking.status = BookingStatus.CANCELLED;
    booking.cancelledBy = CancelledBy.PROVIDER;
    booking.cancelledAt = new Date();
    await this.bookingRepo.save(booking);
    if (booking?.provider) {
      await this.sendNotificationSafely('booking decline', {
        userId: booking.clientId,
        type: 'booking_declined',
        titleDe: 'Buchung abgelehnt',
        titleEn: 'Booking Declined',
        bodyDe: `${booking.provider.businessName} kann deinen Termin am ${booking.scheduledDate} leider nicht wahrnehmen`,
        bodyEn: `${booking.provider.businessName} cannot take your appointment on ${booking.scheduledDate}`,
        data: { screen: `/(client)/appointments/${booking.id}`, bookingId: booking.id },
      });
    }
    return this.findOne(id, user);
  }

  async startBooking(id: string, user: any) {
    const booking = await this.findBookingForProvider(id, user);
    if (booking.status === BookingStatus.IN_PROGRESS) {
      return this.findOne(id, user);
    }
    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException('Nur bestätigte Buchungen können gestartet werden.');
    }
    booking.status = BookingStatus.IN_PROGRESS;
    await this.bookingRepo.save(booking);
    return this.findOne(id, user);
  }

  async completeBooking(id: string, user: any) {
    const booking = await this.findBookingForProvider(id, user);
    if (booking.status === BookingStatus.COMPLETED) {
      return this.findOne(id, user);
    }
    if (booking.status !== BookingStatus.IN_PROGRESS) {
      throw new BadRequestException('Nur laufende Buchungen können abgeschlossen werden.');
    }
    booking.status = BookingStatus.COMPLETED;
    await this.bookingRepo.save(booking);
    if (booking?.provider) {
      await this.sendNotificationSafely('booking completion', {
        userId: booking.clientId,
        type: 'booking_completed',
        titleDe: 'Termin abgeschlossen — Bewertung abgeben?',
        titleEn: 'Appointment done — Leave a review?',
        bodyDe: `Wie war dein Termin mit ${booking.provider.businessName}? Jetzt bewerten!`,
        bodyEn: `How was your appointment with ${booking.provider.businessName}? Leave a review!`,
        data: { screen: `/(client)/review/${booking.id}`, bookingId: booking.id },
      });
    }
    return this.findOne(id, user);
  }
}
