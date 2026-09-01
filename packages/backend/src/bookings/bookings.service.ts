import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Raw, Repository } from 'typeorm';
import { Booking, BookingStatus, CancelledBy } from '../entities/booking.entity';
import { BookingDailyCounter } from '../entities/booking-daily-counter.entity';
import { Service } from '../entities/service.entity';
import { Provider } from '../entities/provider.entity';
import { AvailabilitySchedule } from '../entities/availability-schedule.entity';
import { TimeBlock } from '../entities/time-block.entity';
import { UserRole } from '../entities/user.entity';
import { CreateBookingDto } from './dto/create-booking.dto';
import { RescheduleBookingDto } from './dto/reschedule-booking.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { AccessService } from '../authorization/access.service';

type NotificationPayload = Parameters<NotificationsService['sendToUser']>[0];

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
    private readonly access: AccessService,
    @InjectDataSource() private readonly dataSource?: DataSource,
  ) {}

  private async sendNotificationSafely(
    context: string,
    payload: NotificationPayload,
  ): Promise<void> {
    try {
      await this.notificationsService.sendToUser(payload);
    } catch (error) {
      this.logger.warn(
        `Notification failed during ${context} for user ${payload.userId}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
      throw error;
    }
  }

  private async fireNotificationsAndUpdateFlags(
    bookingId: string,
    notificationTasks: Array<{ context: string; payload: NotificationPayload }>,
  ): Promise<void> {
    if (notificationTasks.length === 0) return;

    let notificationsPending = false;
    let notificationsError: string | null = null;
    const errors: string[] = [];

    for (const task of notificationTasks) {
      try {
        await this.sendNotificationSafely(task.context, task.payload);
      } catch (error) {
        notificationsPending = true;
        const errStr =
          error instanceof Error
            ? `${error.message}${error.stack ? '\n' + error.stack.slice(0, 1500) : ''}`
            : String(error);
        errors.push(`[${task.context}] ${errStr.slice(0, 400)}`);
      }
    }

    if (errors.length > 0) {
      notificationsError = errors.join('; ').slice(0, 2000);
    }

    try {
      await this.bookingRepo
        .createQueryBuilder()
        .update(Booking)
        .set({ notificationsPending, notificationsError })
        .where('id = :id', { id: bookingId })
        .execute();
    } catch (updateErr) {
      this.logger.error(
        `Failed to update notification flags for booking ${bookingId}: ${
          updateErr instanceof Error ? updateErr.message : String(updateErr)
        }`,
      );
    }
  }

  private async generateBookingNumber(
    scheduledDate: string,
    manager: EntityManager,
  ): Promise<string> {
    const compactDate = scheduledDate.replace(/-/g, '');
    const counterDate = scheduledDate;

    if (!manager) {
      const fallbackSuffix = Math.floor(1000 + Math.random() * 9000).toString();
      return `HC-${compactDate}-${fallbackSuffix}`;
    }

    const repo = manager.getRepository(BookingDailyCounter);

    const row = await repo
      .createQueryBuilder('c')
      .where('c.date = :date', { date: counterDate })
      .setLock('pessimistic_write')
      .getOne();

    let counter: number;
    if (!row) {
      counter = 1;
      await repo.insert({ date: counterDate, counter: 1 });
    } else {
      counter = row.counter + 1;
      await repo.update({ id: row.id }, { counter });
    }

    const suffix = counter.toString().padStart(4, '0');
    return `HC-${compactDate}-${suffix}`;
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private intervalsOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
    return aStart < bEnd && bStart < aEnd;
  }

  private sumServiceDurationMin(services: Array<{ durationMin?: number | string | null }>): number {
    const total = services.reduce<number>((sum, s) => {
      const n = Number(s?.durationMin ?? 0);
      return sum + (Number.isFinite(n) ? n : 0);
    }, 0);
    return Math.max(total, 30);
  }

  private async acquireProviderDayXactLock(
    manager: EntityManager,
    providerId: string,
    scheduledDate: string,
  ): Promise<void> {
    const lockKey = `${providerId}|${scheduledDate}`;
    await manager.query(
      'SELECT pg_advisory_xact_lock(hashtext($1::text))',
      [lockKey],
    );
  }

  private async validateBookingSlot(
    providerId: string,
    scheduledDate: string,
    scheduledTime: string,
    serviceDurationMin: number,
    bufferMin: number,
  ): Promise<void> {
    const provider = await this.providerRepo.findOne({
      where: { id: providerId },
      select: ['id', 'isOnline', 'status', 'bufferMinutes'],
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

    const effectiveBuffer = bufferMin >= 0 ? bufferMin : (provider.bufferMinutes ?? 0);

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

    const startMinutes = this.timeToMinutes(scheduledTime);
    const endMinutes = startMinutes + serviceDurationMin + effectiveBuffer;
    const openMinutes = this.timeToMinutes(schedule.openTime);
    const closeMinutes = this.timeToMinutes(schedule.closeTime);

    if (startMinutes < openMinutes || startMinutes >= closeMinutes) {
      throw new BadRequestException(
        `Der Anbieter ist nur zwischen ${schedule.openTime.slice(0, 5)} und ${schedule.closeTime.slice(0, 5)} Uhr verfügbar.`,
      );
    }
    if (endMinutes > closeMinutes) {
      const hours = Math.floor((closeMinutes - startMinutes - effectiveBuffer) / 60);
      const mins = (closeMinutes - startMinutes - effectiveBuffer) % 60;
      const maxStr = `${hours * 60 + mins} Min`;
      throw new BadRequestException(
        `Die gewählte Dienstleistung überschreitet die Öffnungszeiten. Maximal verfügbare Dauer ab ${scheduledTime}: ${maxStr}.`,
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

          if (this.intervalsOverlap(startMinutes, endMinutes, blockStartMin, blockEndMin)) {
            throw new ConflictException(
              'Der Anbieter ist zu dieser Uhrzeit nicht verfügbar (blockiert).',
            );
          }
        }
      }
    }
  }

  private async assertNoBookingConflict(
    repo: Repository<Booking>,
    providerId: string,
    scheduledDate: string,
    newStartMinutes: number,
    newEndMinutes: number,
    bufferMinutes: number,
    excludeBookingId?: string,
  ): Promise<void> {
    const sameDayBookings = repo
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.services', 'service')
      .select(['booking.id', 'booking.scheduledTime', 'service.durationMin'])
      .where('booking.providerId = :providerId', { providerId })
      .andWhere('booking.scheduledDate = :scheduledDate', { scheduledDate })
      .andWhere('booking.status NOT IN (:...inactiveStatuses)', {
        inactiveStatuses: [BookingStatus.CANCELLED],
      });

    if (excludeBookingId) {
      sameDayBookings.andWhere('booking.id != :excludeBookingId', {
        excludeBookingId,
      });
    }

    const bookings = await sameDayBookings.getMany();
    for (const booking of bookings) {
      if (!booking.scheduledTime) continue;
      const existingStart = this.timeToMinutes(booking.scheduledTime);
      const existingDuration = this.sumServiceDurationMin(booking.services ?? []);
      const existingEnd = existingStart + existingDuration + bufferMinutes;
      if (this.intervalsOverlap(newStartMinutes, newEndMinutes, existingStart, existingEnd)) {
        throw new ConflictException(
          'Dieser Zeitslot überschneidet sich mit einer bestehenden Buchung. Bitte wähle eine andere Zeit.',
        );
      }
    }
  }

  private async findIdempotentPendingBooking(
    repo: Repository<Booking>,
    clientId: string,
    providerId: string,
    scheduledDate: string,
    scheduledTime: string,
    serviceIds: string[],
  ): Promise<Booking | null> {
    const existing = await repo
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.services', 'service')
      .where('booking.clientId = :clientId', { clientId })
      .andWhere('booking.providerId = :providerId', { providerId })
      .andWhere('booking.scheduledDate = :scheduledDate', { scheduledDate })
      .andWhere('booking.scheduledTime = :scheduledTime', { scheduledTime })
      .andWhere('booking.status = :status', { status: BookingStatus.PENDING })
      .getOne();

    if (!existing) return null;

    const existingIds = existing.services.map((s) => s.id).sort();
    const requestedIds = [...serviceIds].sort();
    if (existingIds.length !== requestedIds.length) return null;
    for (let i = 0; i < existingIds.length; i++) {
      if (existingIds[i] !== requestedIds[i]) return null;
    }

    return existing;
  }

  private async loadFullBooking(id: string): Promise<Booking | null> {
    return this.bookingRepo.findOne({
      where: { id },
      relations: ['services', 'provider', 'provider.user', 'client'],
    });
  }

  async createBooking(clientId: string, dto: CreateBookingDto) {
    const actor = { id: clientId, role: UserRole.CLIENT };
    await this.access.authorizeBooking(actor, 'booking:create', undefined, {
      clientId: actor.id,
      providerId: dto.providerId,
    });

    const { providerId, serviceIds, scheduledDate, scheduledTime, isMobile, clientNotes } = dto;
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const timeRegex = /^\d{2}:\d{2}$/;

    if (!dateRegex.test(scheduledDate)) {
      throw new BadRequestException('scheduledDate must be in YYYY-MM-DD format');
    }

    if (!timeRegex.test(scheduledTime)) {
      throw new BadRequestException('scheduledTime must be in HH:MM format');
    }

    const services = await this.serviceRepo.findBy({ id: In(serviceIds) });
    if (services.length !== serviceIds.length) {
      throw new BadRequestException('One or more services could not be resolved');
    }

    const providerData = await this.providerRepo.findOne({
      where: { id: providerId },
      select: ['id', 'bufferMinutes'],
    });
    if (!providerData) {
      throw new NotFoundException('Anbieter nicht gefunden.');
    }
    const bufferMin = providerData.bufferMinutes ?? 0;
    const serviceDurationMin = this.sumServiceDurationMin(services);
    const newStartMinutes = this.timeToMinutes(scheduledTime);
    const newEndMinutes = newStartMinutes + serviceDurationMin + bufferMin;

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

    await this.validateBookingSlot(providerId, scheduledDate, scheduledTime, serviceDurationMin, bufferMin);

    const totalPrice = services.reduce((sum, service) => sum + Number(service.price), 0);

    const useTransaction = !!this.dataSource;
    let savedBookingId: string;
    let notificationTasks: Array<{ context: string; payload: NotificationPayload }> = [];

    if (useTransaction && this.dataSource) {
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
      try {
        const manager = queryRunner.manager;

        await manager.query('SET LOCAL statement_timeout = \'10s\'');

        await this.acquireProviderDayXactLock(manager, providerId, scheduledDate);

        const idempotentBooking = await this.findIdempotentPendingBooking(
          manager.getRepository(Booking),
          clientId,
          providerId,
          scheduledDate,
          scheduledTime,
          serviceIds,
        );
        if (idempotentBooking) {
          await queryRunner.commitTransaction();
          const full = await this.loadFullBooking(idempotentBooking.id);
          return {
            message: 'Booking created successfully',
            booking: full ?? idempotentBooking,
          };
        }

        await this.assertNoBookingConflict(
          manager.getRepository(Booking),
          providerId,
          scheduledDate,
          newStartMinutes,
          newEndMinutes,
          bufferMin,
        );

        const bookingNumber = await this.generateBookingNumber(scheduledDate, manager);

        const booking = manager.getRepository(Booking).create({
          bookingNumber,
          clientId,
          providerId,
          status: BookingStatus.PENDING,
          scheduledDate,
          scheduledTime,
          isMobile,
          clientNotes: clientNotes || '',
          services,
          totalPrice,
          paymentMethod: 'CASH',
          notificationsPending: false,
          notificationsError: null,
        });

        const saved = await manager.getRepository(Booking).save(booking);
        savedBookingId = saved.id;

        await queryRunner.commitTransaction();
      } catch (err) {
        await queryRunner.rollbackTransaction();
        throw err;
      } finally {
        await queryRunner.release();
      }
    } else {
      const nonTxDs = this.bookingRepo.manager.connection;
      const nonTxQr = nonTxDs.createQueryRunner();
      await nonTxQr.connect();
      await nonTxQr.startTransaction();
      try {
        const nonTxManager = nonTxQr.manager;

        await nonTxManager.query('SET LOCAL statement_timeout = \'10s\'');

        await this.acquireProviderDayXactLock(nonTxManager, providerId, scheduledDate);

        const idempotentBooking = await this.findIdempotentPendingBooking(
          nonTxManager.getRepository(Booking),
          clientId,
          providerId,
          scheduledDate,
          scheduledTime,
          serviceIds,
        );
        if (idempotentBooking) {
          await nonTxQr.commitTransaction();
          const full = await this.loadFullBooking(idempotentBooking.id);
          return {
            message: 'Booking created successfully',
            booking: full ?? idempotentBooking,
          };
        }

        await this.assertNoBookingConflict(
          nonTxManager.getRepository(Booking),
          providerId,
          scheduledDate,
          newStartMinutes,
          newEndMinutes,
          bufferMin,
        );

        const bookingNumber = await this.generateBookingNumber(scheduledDate, nonTxManager);

        const booking = nonTxManager.getRepository(Booking).create({
          bookingNumber,
          clientId,
          providerId,
          status: BookingStatus.PENDING,
          scheduledDate,
          scheduledTime,
          isMobile,
          clientNotes: clientNotes || '',
          services,
          totalPrice,
          paymentMethod: 'CASH',
          notificationsPending: false,
          notificationsError: null,
        });

        const saved = await nonTxManager.getRepository(Booking).save(booking);
        savedBookingId = saved.id;
        await nonTxQr.commitTransaction();
      } catch (err) {
        await nonTxQr.rollbackTransaction();
        throw err;
      } finally {
        await nonTxQr.release();
      }
    }

    const fullBooking = await this.loadFullBooking(savedBookingId);

    if (fullBooking?.provider?.userId && fullBooking?.client) {
      notificationTasks.push({
        context: 'booking creation',
        payload: {
          userId: fullBooking.provider.userId,
          type: 'new_booking',
          titleDe: 'Neue Buchungsanfrage',
          titleEn: 'New Booking Request',
          bodyDe: `${fullBooking.client.firstName} möchte einen Termin am ${fullBooking.scheduledDate} um ${fullBooking.scheduledTime} Uhr`,
          bodyEn: `${fullBooking.client.firstName} wants to book on ${fullBooking.scheduledDate} at ${fullBooking.scheduledTime}`,
          data: { screen: `/(provider)/booking-request/${fullBooking.id}`, bookingId: fullBooking.id },
        },
      });
    }

    if (notificationTasks.length > 0) {
      void this.fireNotificationsAndUpdateFlags(savedBookingId, notificationTasks);
    }

    return {
      message: 'Booking created successfully',
      booking: fullBooking,
    };
  }

  async findOne(id: string, user: any) {
    const actor = this.access.ensureAuthenticatedActor(user);
    await this.access.authorizeBooking(actor, 'booking:read', id);

    const booking = await this.bookingRepo.findOne({
      where: { id },
      relations: ['provider', 'provider.user', 'services', 'client'],
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    return booking;
  }

  async findAll(user: any, statusStr: string, page: number, limit: number, todayOnly = false, month?: string) {
    const actor = this.access.ensureAuthenticatedActor(user);
    const userId = actor.id;
    const role = actor.role;

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
      where.scheduledDate = Raw(alias => `${alias} >= '${month}-01' AND ${alias} < '${month}-01'::date + INTERVAL '1 month'`);
    } else if (statusStr) {
      const rawStatuses = statusStr
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const allowed = new Set<string>(Object.values(BookingStatus));
      const normalized = rawStatuses
        .map((s) => s.toUpperCase())
        .filter((s) => allowed.has(s));

      if (normalized.length === 0) {
        throw new BadRequestException('Invalid booking status filter');
      }

      where.status = In(normalized as BookingStatus[]);
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
    const actor = this.access.ensureAuthenticatedActor(user);
    await this.access.authorizeBooking(actor, 'booking:update', id);

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const timeRegex = /^\d{2}:\d{2}$/;

    if (!dateRegex.test(dto.scheduledDate)) {
      throw new BadRequestException('scheduledDate must be in YYYY-MM-DD format');
    }

    if (!timeRegex.test(dto.scheduledTime)) {
      throw new BadRequestException('scheduledTime must be in HH:MM format');
    }

    const initialBooking = await this.bookingRepo.findOne({
      where: { id },
      relations: ['provider', 'provider.user', 'client', 'services'],
    });

    if (!initialBooking) {
      throw new NotFoundException('Buchung nicht gefunden.');
    }

    const allowedStatuses: BookingStatus[] = [BookingStatus.PENDING, BookingStatus.CONFIRMED];
    if (!allowedStatuses.includes(initialBooking.status)) {
      throw new BadRequestException(
        'Dieser Termin kann nicht verschoben werden.'
      );
    }

    const bufferMin = initialBooking.provider?.bufferMinutes ?? 0;
    const serviceDurationMin = this.sumServiceDurationMin(initialBooking.services ?? []);
    const newStartMinutes = this.timeToMinutes(dto.scheduledTime);
    const newEndMinutes = newStartMinutes + serviceDurationMin + bufferMin;

    await this.validateBookingSlot(
      initialBooking.providerId,
      dto.scheduledDate,
      dto.scheduledTime,
      serviceDurationMin,
      bufferMin,
    );

    const useTransaction = !!this.dataSource;
    let notificationTasks: Array<{ context: string; payload: NotificationPayload }> = [];

    if (useTransaction && this.dataSource) {
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
      try {
        const manager = queryRunner.manager;
        const repo = manager.getRepository(Booking);

        await this.acquireProviderDayXactLock(
          manager,
          initialBooking.providerId,
          dto.scheduledDate,
        );

        await this.assertNoBookingConflict(
          repo,
          initialBooking.providerId,
          dto.scheduledDate,
          newStartMinutes,
          newEndMinutes,
          bufferMin,
          id,
        );

        const booking = await repo.findOne({ where: { id } });
        if (!booking) throw new NotFoundException('Buchung nicht gefunden.');

        booking.scheduledDate = dto.scheduledDate;
        booking.scheduledTime = dto.scheduledTime;
        booking.status = BookingStatus.PENDING;

        if (dto.reason) {
          booking.clientNotes = booking.clientNotes
            ? `${booking.clientNotes}\n\n[Reschedule Reason]: ${dto.reason}`
            : `[Reschedule Reason]: ${dto.reason}`;
        }

        await repo.save(booking);
        await queryRunner.commitTransaction();
      } catch (err) {
        await queryRunner.rollbackTransaction();
        throw err;
      } finally {
        await queryRunner.release();
      }
    } else {
      const nonTxLockDs = this.bookingRepo.manager.connection;
      const nonTxQr = nonTxLockDs.createQueryRunner();
      await nonTxQr.connect();
      await nonTxQr.startTransaction();
      try {
        const nonTxManager = nonTxQr.manager;
        const nonTxRepo = nonTxManager.getRepository(Booking);

        await this.acquireProviderDayXactLock(
          nonTxManager,
          initialBooking.providerId,
          dto.scheduledDate,
        );

        await this.assertNoBookingConflict(
          nonTxRepo,
          initialBooking.providerId,
          dto.scheduledDate,
          newStartMinutes,
          newEndMinutes,
          bufferMin,
          id,
        );

        const booking = await nonTxRepo.findOne({ where: { id } });
        if (!booking) throw new NotFoundException('Buchung nicht gefunden.');

        booking.scheduledDate = dto.scheduledDate;
        booking.scheduledTime = dto.scheduledTime;
        booking.status = BookingStatus.PENDING;

        if (dto.reason) {
          booking.clientNotes = booking.clientNotes
            ? `${booking.clientNotes}\n\n[Reschedule Reason]: ${dto.reason}`
            : `[Reschedule Reason]: ${dto.reason}`;
        }

        await nonTxRepo.save(booking);
        await nonTxQr.commitTransaction();
      } catch (err) {
        await nonTxQr.rollbackTransaction();
        throw err;
      } finally {
        await nonTxQr.release();
      }
    }

    const bookingAfter = await this.loadFullBooking(id);
    if (bookingAfter?.provider?.userId && bookingAfter?.client) {
      notificationTasks.push({
        context: 'booking reschedule',
        payload: {
          userId: bookingAfter.provider.userId,
          type: 'booking_rescheduled',
          titleDe: 'Terminverschiebung angefragt',
          titleEn: 'Reschedule Requested',
          bodyDe: `${bookingAfter.client.firstName} möchte den Termin auf ${dto.scheduledDate} um ${dto.scheduledTime} Uhr verschieben`,
          bodyEn: `${bookingAfter.client.firstName} wants to reschedule to ${dto.scheduledDate} at ${dto.scheduledTime}`,
          data: { screen: `/(provider)/booking-request/${bookingAfter.id}`, bookingId: bookingAfter.id },
        },
      });
    }

    if (notificationTasks.length > 0 && bookingAfter) {
      void this.fireNotificationsAndUpdateFlags(bookingAfter.id, notificationTasks);
    }

    return this.findOne(id, user);
  }

  async cancelBooking(id: string, user: any, dto: CancelBookingDto) {
    const actor = this.access.ensureAuthenticatedActor(user);
    const loadedBooking = await this.access.authorizeBooking(actor, 'booking:cancel', id) as Booking;

    const initialBooking = await this.bookingRepo.findOne({
      where: { id },
      relations: ['provider', 'provider.user', 'client'],
    });

    if (!initialBooking) {
      throw new NotFoundException('Booking not found');
    }

    let cancelledBy: CancelledBy;

    if (actor.role === UserRole.CLIENT) {
      cancelledBy = CancelledBy.CLIENT;
    } else if (actor.role === UserRole.PROVIDER) {
      cancelledBy = CancelledBy.PROVIDER;
    } else {
      cancelledBy = loadedBooking.cancelledBy ?? CancelledBy.CLIENT;
    }

    if (initialBooking.status !== BookingStatus.PENDING && initialBooking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException('Only PENDING or CONFIRMED bookings can be cancelled');
    }

    const useTransaction = !!this.dataSource;
    let notificationTasks: Array<{ context: string; payload: NotificationPayload }> = [];

    if (useTransaction && this.dataSource) {
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
      try {
        const manager = queryRunner.manager;
        const repo = manager.getRepository(Booking);

        const booking = await repo.findOne({ where: { id } });
        if (!booking) throw new NotFoundException('Booking not found');

        booking.cancelledBy = cancelledBy;
        booking.status = BookingStatus.CANCELLED;
        booking.cancelledAt = new Date();

        const cancelDetails = dto.notes
          ? `[Cancel Reason]: ${dto.reason}\n${dto.notes}`
          : `[Cancel Reason]: ${dto.reason}`;

        booking.clientNotes = booking.clientNotes
          ? `${booking.clientNotes}\n\n${cancelDetails}`
          : cancelDetails;

        await repo.save(booking);
        await queryRunner.commitTransaction();
      } catch (err) {
        await queryRunner.rollbackTransaction();
        throw err;
      } finally {
        await queryRunner.release();
      }
    } else {
      const booking = await this.bookingRepo.findOne({ where: { id } });
      if (!booking) throw new NotFoundException('Booking not found');

      booking.cancelledBy = cancelledBy;
      booking.status = BookingStatus.CANCELLED;
      booking.cancelledAt = new Date();

      const cancelDetails = dto.notes
        ? `[Cancel Reason]: ${dto.reason}\n${dto.notes}`
        : `[Cancel Reason]: ${dto.reason}`;

      booking.clientNotes = booking.clientNotes
        ? `${booking.clientNotes}\n\n${cancelDetails}`
        : cancelDetails;

      await this.bookingRepo.save(booking);
    }

    const bookingAfter = await this.loadFullBooking(id);
    if (bookingAfter) {
      if (cancelledBy === CancelledBy.CLIENT && bookingAfter.provider?.userId && bookingAfter.client) {
        notificationTasks.push({
          context: 'booking cancellation by client',
          payload: {
            userId: bookingAfter.provider.userId,
            type: 'booking_cancelled_by_client',
            titleDe: 'Termin storniert',
            titleEn: 'Appointment Cancelled',
            bodyDe: `${bookingAfter.client.firstName} hat den Termin am ${bookingAfter.scheduledDate} um ${bookingAfter.scheduledTime} Uhr storniert`,
            bodyEn: `${bookingAfter.client.firstName} cancelled the appointment on ${bookingAfter.scheduledDate} at ${bookingAfter.scheduledTime}`,
            data: { screen: '/(provider)/calendar', bookingId: bookingAfter.id },
          },
        });
      }

      if (cancelledBy === CancelledBy.PROVIDER && bookingAfter.provider) {
        notificationTasks.push({
          context: 'booking cancellation by provider',
          payload: {
            userId: bookingAfter.clientId,
            type: 'booking_cancelled_by_provider',
            titleDe: 'Termin abgesagt',
            titleEn: 'Appointment Cancelled',
            bodyDe: `${bookingAfter.provider.businessName} hat deinen Termin am ${bookingAfter.scheduledDate} leider abgesagt`,
            bodyEn: `${bookingAfter.provider.businessName} has cancelled your appointment on ${bookingAfter.scheduledDate}`,
            data: { screen: `/(client)/appointments/${bookingAfter.id}`, bookingId: bookingAfter.id },
          },
        });
      }

      if (notificationTasks.length > 0) {
        void this.fireNotificationsAndUpdateFlags(bookingAfter.id, notificationTasks);
      }
    }

    return this.findOne(id, user);
  }

  private async findBookingForProvider(bookingId: string, user: any) {
    const actor = this.access.ensureAuthenticatedActor(user);
    await this.access.authorizeBooking(actor, 'booking:accept', bookingId);

    const booking = await this.bookingRepo.findOne({
      where: { id: bookingId },
      relations: ['provider', 'provider.user', 'services', 'client'],
    });
    if (!booking) throw new NotFoundException('Booking not found');

    return booking;
  }

  private async transitionStatusWithTx(
    bookingId: string,
    allowedFrom: BookingStatus[],
    targetStatus: BookingStatus,
    apply: (booking: Booking) => void,
  ): Promise<void> {
    const useTransaction = !!this.dataSource;

    if (useTransaction && this.dataSource) {
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
      try {
        const manager = queryRunner.manager;
        const repo = manager.getRepository(Booking);

        const booking = await repo.findOne({ where: { id: bookingId } });
        if (!booking) throw new NotFoundException('Booking not found');

        if (!allowedFrom.includes(booking.status)) {
          throw new BadRequestException(`Invalid status transition from ${booking.status}`);
        }

        apply(booking);
        await repo.save(booking);
        await queryRunner.commitTransaction();
      } catch (err) {
        await queryRunner.rollbackTransaction();
        throw err;
      } finally {
        await queryRunner.release();
      }
    } else {
      const booking = await this.bookingRepo.findOne({ where: { id: bookingId } });
      if (!booking) throw new NotFoundException('Booking not found');

      if (!allowedFrom.includes(booking.status)) {
        throw new BadRequestException(`Invalid status transition from ${booking.status}`);
      }

      apply(booking);
      await this.bookingRepo.save(booking);
    }
  }

  async acceptBooking(id: string, user: any) {
    const preCheck = await this.findBookingForProvider(id, user);
    if (preCheck.status === BookingStatus.CONFIRMED) {
      return this.findOne(id, user);
    }

    let notificationTasks: Array<{ context: string; payload: NotificationPayload }> = [];

    try {
      await this.transitionStatusWithTx(
        id,
        [BookingStatus.PENDING],
        BookingStatus.CONFIRMED,
        (b) => {
          b.status = BookingStatus.CONFIRMED;
        },
      );
    } catch (e) {
      if (e instanceof BadRequestException) {
        throw new BadRequestException('Nur ausstehende Buchungen können bestätigt werden.');
      }
      throw e;
    }

    const bookingAfter = await this.loadFullBooking(id);
    if (bookingAfter?.provider) {
      notificationTasks.push({
        context: 'booking acceptance',
        payload: {
          userId: bookingAfter.clientId,
          type: 'booking_confirmed',
          titleDe: 'Buchung bestätigt ✓',
          titleEn: 'Booking Confirmed ✓',
          bodyDe: `Dein Termin mit ${bookingAfter.provider.businessName} am ${bookingAfter.scheduledDate} wurde bestätigt`,
          bodyEn: `Your appointment with ${bookingAfter.provider.businessName} on ${bookingAfter.scheduledDate} is confirmed`,
          data: { screen: `/(client)/appointments/${bookingAfter.id}`, bookingId: bookingAfter.id },
        },
      });
    }

    if (notificationTasks.length > 0 && bookingAfter) {
      void this.fireNotificationsAndUpdateFlags(bookingAfter.id, notificationTasks);
    }

    return this.findOne(id, user);
  }

  async declineBooking(id: string, user: any) {
    const preCheck = await this.findBookingForProvider(id, user);
    if (preCheck.status === BookingStatus.CANCELLED) {
      return this.findOne(id, user);
    }

    try {
      await this.transitionStatusWithTx(
        id,
        [BookingStatus.PENDING],
        BookingStatus.CANCELLED,
        (b) => {
          b.status = BookingStatus.CANCELLED;
          b.cancelledBy = CancelledBy.PROVIDER;
          b.cancelledAt = new Date();
        },
      );
    } catch (e) {
      if (e instanceof BadRequestException) {
        throw new BadRequestException('Nur ausstehende Buchungen können abgelehnt werden.');
      }
      throw e;
    }

    const bookingAfter = await this.loadFullBooking(id);
    if (bookingAfter?.provider) {
      void this.fireNotificationsAndUpdateFlags(bookingAfter.id, [
        {
          context: 'booking decline',
          payload: {
            userId: bookingAfter.clientId,
            type: 'booking_declined',
            titleDe: 'Buchung abgelehnt',
            titleEn: 'Booking Declined',
            bodyDe: `${bookingAfter.provider.businessName} kann deinen Termin am ${bookingAfter.scheduledDate} leider nicht wahrnehmen`,
            bodyEn: `${bookingAfter.provider.businessName} cannot take your appointment on ${bookingAfter.scheduledDate}`,
            data: { screen: `/(client)/appointments/${bookingAfter.id}`, bookingId: bookingAfter.id },
          },
        },
      ]);
    }

    return this.findOne(id, user);
  }

  async startBooking(id: string, user: any) {
    const preCheck = await this.findBookingForProvider(id, user);
    if (preCheck.status === BookingStatus.IN_PROGRESS) {
      return this.findOne(id, user);
    }

    if (preCheck.scheduledDate && preCheck.scheduledTime) {
      const [yearStr, monthStr, dayStr] = preCheck.scheduledDate.split('-');
      const [hourStr, minuteStr] = preCheck.scheduledTime.split(':');
      const scheduledDateObj = new Date(
        Number(yearStr),
        Number(monthStr) - 1,
        Number(dayStr),
        Number(hourStr),
        Number(minuteStr),
      );
      const now = new Date();
      const earliestStartMs = scheduledDateObj.getTime() - 30 * 60 * 1000;
      if (now.getTime() < earliestStartMs) {
        throw new BadRequestException(
          'Der Termin kann erst 30 Minuten vor der geplanten Zeit gestartet werden.',
        );
      }
    }

    try {
      await this.transitionStatusWithTx(
        id,
        [BookingStatus.CONFIRMED],
        BookingStatus.IN_PROGRESS,
        (b) => {
          b.status = BookingStatus.IN_PROGRESS;
        },
      );
    } catch (e) {
      if (
        e instanceof BadRequestException &&
        typeof (e as any).message === 'string' &&
        (e as any).message.startsWith('Invalid status transition')
      ) {
        throw new BadRequestException('Nur bestätigte Buchungen können gestartet werden.');
      }
      throw e;
    }

    return this.findOne(id, user);
  }

  async completeBooking(id: string, user: any) {
    const preCheck = await this.findBookingForProvider(id, user);
    if (preCheck.status === BookingStatus.COMPLETED) {
      return this.findOne(id, user);
    }

    let notificationTasks: Array<{ context: string; payload: NotificationPayload }> = [];

    try {
      await this.transitionStatusWithTx(
        id,
        [BookingStatus.IN_PROGRESS],
        BookingStatus.COMPLETED,
        (b) => {
          b.status = BookingStatus.COMPLETED;
        },
      );
    } catch (e) {
      if (e instanceof BadRequestException) {
        throw new BadRequestException('Nur laufende Buchungen können abgeschlossen werden.');
      }
      throw e;
    }

    const bookingAfter = await this.loadFullBooking(id);
    if (bookingAfter?.provider) {
      notificationTasks.push({
        context: 'booking completion',
        payload: {
          userId: bookingAfter.clientId,
          type: 'booking_completed',
          titleDe: 'Termin abgeschlossen — Bewertung abgeben?',
          titleEn: 'Appointment done — Leave a review?',
          bodyDe: `Wie war dein Termin mit ${bookingAfter.provider.businessName}? Jetzt bewerten!`,
          bodyEn: `How was your appointment with ${bookingAfter.provider.businessName}? Leave a review!`,
          data: { screen: `/(client)/review/${bookingAfter.id}`, bookingId: bookingAfter.id },
        },
      });
    }

    if (notificationTasks.length > 0 && bookingAfter) {
      void this.fireNotificationsAndUpdateFlags(bookingAfter.id, notificationTasks);
    }

    return this.findOne(id, user);
  }
}
