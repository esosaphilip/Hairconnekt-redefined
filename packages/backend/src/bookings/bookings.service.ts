import { Injectable, NotFoundException, BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, In, Raw } from 'typeorm';
import { Booking, BookingStatus, CancelledBy } from '../entities/booking.entity';
import { Service } from '../entities/service.entity';
import { Provider } from '../entities/provider.entity';
import { UserRole } from '../entities/user.entity';
import { CreateBookingDto } from './dto/create-booking.dto';
import { RescheduleBookingDto } from './dto/reschedule-booking.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(Service)
    private readonly serviceRepository: Repository<Service>,
    @InjectRepository(Provider)
    private readonly providerRepository: Repository<Provider>,
  ) {}

  private generateBookingNumber(dateStr: string): string {
    const compactDate = dateStr.replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000).toString();
    return `HC-${compactDate}-${randomSuffix}`;
  }

  async createBooking(clientId: string, dto: CreateBookingDto) {
    const { providerId, serviceIds, scheduledDate, scheduledTime, isMobile, clientNotes } = dto;

    const provider = await this.providerRepository.findOne({ where: { id: providerId } });
    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    const services = await this.serviceRepository.findBy({ id: In(serviceIds) });
    if (services.length !== serviceIds.length) {
      throw new BadRequestException('One or more services could not be resolved');
    }

    const totalPrice = services.reduce((sum, service) => sum + Number(service.price), 0);

    const booking = this.bookingRepository.create({
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

    const savedBooking = await this.bookingRepository.save(booking);

    return {
      message: 'Booking created successfully',
      booking: await this.bookingRepository.findOne({
        where: { id: savedBooking.id },
        relations: ['services', 'provider', 'provider.user'],
      }),
    };
  }

  async findOne(id: string, user: any) {
    const booking = await this.bookingRepository.findOne({
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
      const provider = await this.providerRepository.findOne({ where: { userId } });
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
      const provider = await this.providerRepository.findOne({ where: { userId } });
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

    const [data, total] = await this.bookingRepository.findAndCount({
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
    // Find booking and verify ownership
    const booking = await this.bookingRepository.findOne({
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

    // Check new slot is available
    const conflict = await this.bookingRepository.findOne({
      where: {
        providerId: booking.providerId,
        scheduledDate: dto.scheduledDate,
        scheduledTime: dto.scheduledTime,
        status: Not(In(['cancelled', 'CANCELLED'])),
      },
    });
    
    if (conflict && conflict.id !== id) {
      throw new ConflictException(
        'Dieser Zeitslot ist bereits vergeben. Bitte wähle eine andere Zeit.'
      );
    }

    // Update the booking
    booking.scheduledDate = dto.scheduledDate;
    booking.scheduledTime = dto.scheduledTime;
    booking.status = BookingStatus.PENDING; // Reset to pending when rescheduled
    
    if (dto.reason) {
      booking.clientNotes = booking.clientNotes 
        ? `${booking.clientNotes}\n\n[Reschedule Reason]: ${dto.reason}` 
        : `[Reschedule Reason]: ${dto.reason}`;
    }

    await this.bookingRepository.save(booking);
    return this.findOne(id, user);
  }

  async cancelBooking(id: string, user: any, dto: CancelBookingDto) {
    const booking = await this.bookingRepository.findOne({
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

    await this.bookingRepository.save(booking);
    return this.findOne(id, user);
  }

  // --- Provider booking lifecycle ---

  private async findBookingForProvider(bookingId: string, user: any) {
    const userId = user.sub || user.id;
    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
      relations: ['provider', 'provider.user', 'services', 'client'],
    });
    if (!booking) throw new NotFoundException('Booking not found');

    const provider = await this.providerRepository.findOne({ where: { userId } });
    if (!provider || booking.providerId !== provider.id) {
      throw new ForbiddenException('Not your booking');
    }
    return booking;
  }

  async acceptBooking(id: string, user: any) {
    const booking = await this.findBookingForProvider(id, user);
    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException('Only PENDING bookings can be accepted');
    }
    booking.status = BookingStatus.CONFIRMED;
    await this.bookingRepository.save(booking);
    return this.findOne(id, user);
  }

  async declineBooking(id: string, user: any) {
    const booking = await this.findBookingForProvider(id, user);
    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException('Only PENDING bookings can be declined');
    }
    booking.status = BookingStatus.CANCELLED;
    booking.cancelledBy = CancelledBy.PROVIDER;
    booking.cancelledAt = new Date();
    await this.bookingRepository.save(booking);
    return this.findOne(id, user);
  }

  async startBooking(id: string, user: any) {
    const booking = await this.findBookingForProvider(id, user);
    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException('Only CONFIRMED bookings can be started');
    }
    booking.status = BookingStatus.IN_PROGRESS;
    await this.bookingRepository.save(booking);
    return this.findOne(id, user);
  }

  async completeBooking(id: string, user: any) {
    const booking = await this.findBookingForProvider(id, user);
    if (booking.status !== BookingStatus.IN_PROGRESS) {
      throw new BadRequestException('Only IN_PROGRESS bookings can be completed');
    }
    booking.status = BookingStatus.COMPLETED;
    await this.bookingRepository.save(booking);
    return this.findOne(id, user);
  }
}
