import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
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

@Injectable()
export class BookingsService {
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
  ) {}

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

    return {
      message: 'Booking created successfully',
      booking: await this.bookingRepo.findOne({
        where: { id: savedBooking.id },
        relations: ['services', 'provider', 'provider.user'],
      }),
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
      relations: ['provider'],
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
    return this.findOne(id, user);
  }

  async cancelBooking(id: string, user: any, dto: CancelBookingDto) {
    const booking = await this.bookingRepo.findOne({
      where: { id },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    const userId = user.sub || user.id;
    if (user.role === UserRole.CLIENT && booking.clientId !== userId) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.status !== BookingStatus.PENDING && booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException('Only PENDING or CONFIRMED bookings can be cancelled');
    }

    booking.status = BookingStatus.CANCELLED; 

    const cancelDetails = dto.notes 
      ? `[Cancel Reason]: ${dto.reason}\n${dto.notes}` 
      : `[Cancel Reason]: ${dto.reason}`;

    booking.clientNotes = booking.clientNotes 
        ? `${booking.clientNotes}\n\n${cancelDetails}` 
        : cancelDetails;

    await this.bookingRepo.save(booking);
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
    return this.findOne(id, user);
  }
}
