import {
  Injectable, NotFoundException, ConflictException, ForbiddenException, BadRequestException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, In } from 'typeorm';
import { Provider, ProviderStatus } from '../entities/provider.entity';
import { PortfolioImage } from '../entities/portfolio-image.entity';
import { User } from '../entities/user.entity';
import { Service } from '../entities/service.entity';
import { TimeBlock } from '../entities/time-block.entity';
import { Booking } from '../entities/booking.entity';
import { AvailabilitySchedule } from '../entities/availability-schedule.entity';
import { Review } from '../entities/review.entity';
import { RegisterProviderDto } from './dto/register-provider.dto';

@Injectable()
export class ProvidersService {
  constructor(
    @InjectRepository(Provider)
    private providerRepo: Repository<Provider>,
    @InjectRepository(PortfolioImage)
    private portfolioRepository: Repository<PortfolioImage>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Service)
    private serviceRepo: Repository<Service>,
    @InjectRepository(TimeBlock)
    private timeBlockRepo: Repository<TimeBlock>,
    @InjectRepository(Booking)
    private bookingRepo: Repository<Booking>,
    @InjectRepository(AvailabilitySchedule)
    private availabilityRepo: Repository<AvailabilitySchedule>,
    @InjectRepository(Review)
    private reviewRepo: Repository<Review>,
  ) {}

  async findByUserId(userId: string) {
    return this.providerRepo.findOne({ where: { userId } });
  }

  async findAll(query: Record<string, string>) {
    const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
    const page = Math.max(Number(query.page) || 1, 1);
    const qb = this.providerRepo
      .createQueryBuilder('p')
      .where('p.status = :status', { status: ProviderStatus.APPROVED });
    if (query.availableToday === 'true') {
      qb.andWhere('p.isOnline = :online', { online: true });
    }
    const [providers, total] = await qb
      .orderBy('p.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const ids = providers.map((p) => p.id);
    const priceMap = new Map<string, number>();
    if (ids.length) {
      const rows = await this.serviceRepo
        .createQueryBuilder('s')
        .select('s.providerId', 'providerId')
        .addSelect('MIN(s.price)', 'minPrice')
        .where('s.providerId IN (:...ids)', { ids })
        .andWhere('s.isActive = true')
        .groupBy('s.providerId')
        .getRawMany();
      for (const r of rows) {
        priceMap.set(r.providerId, Number(r.minPrice));
      }
    }

    return {
      data: providers.map((p) => ({
        id: p.id,
        businessName: p.businessName,
        providerType: p.providerType,
        avatarUrl: p.avatarUrl,
        city: p.city,
        avgRating: Number(p.avgRating) || 0,
        totalReviews: p.totalReviews ?? 0,
        startingPrice: priceMap.get(p.id) ?? 0,
        isAvailableToday: p.isOnline,
        distanceKm: null as number | null,
      })),
      meta: { total, page, limit },
    };
  }

  async registerProvider(userId: string, dto: RegisterProviderDto) {
    const existing = await this.providerRepo.findOne({ where: { userId } });
    if (existing) {
      throw new ConflictException('Ein Anbieterprofil für diesen Account existiert bereits.');
    }
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Benutzer nicht gefunden.');
    if (user.role !== 'provider') {
      throw new ForbiddenException('Nur Anbieter können ein Profil erstellen.');
    }
    const provider = this.providerRepo.create({
      userId,
      providerType: dto.providerType,
      businessName: dto.businessName,
      street: dto.street,
      houseNumber: dto.houseNumber,
      city: dto.city,
      postalCode: dto.postalCode,
      serviceRadius: dto.serviceRadius,
      experienceYears: dto.experienceYears,
      languages: dto.languages,
      cancellationPolicy: dto.cancellationPolicy,
      bio: dto.bio ?? '',
      status: 'pending' as any,
      isOnline: false,
    });
    return this.providerRepo.save(provider);
  }

  async getMe(userId: string): Promise<Provider> {
    const provider = await this.providerRepo.findOne({ where: { userId } });
    if (!provider) throw new NotFoundException('Provider profile not found');
    return provider;
  }

  async updateMyProfile(userId: string, data: Record<string, any>): Promise<Provider> {
    const provider = await this.getMe(userId);
    const allowedFields = ['businessName', 'bio', 'street', 'houseNumber', 'city', 'postalCode',
      'serviceRadius', 'languages', 'cancellationPolicy', 'bufferMinutes'];
    for (const key of allowedFields) {
      if (data[key] !== undefined) {
        (provider as any)[key] = data[key];
      }
    }
    return this.providerRepo.save(provider);
  }

  async updateAvatar(userId: string, file: Express.Multer.File): Promise<{ avatarUrl: string }> {
    await this.getMe(userId);
    return { avatarUrl: `/uploads/avatars/${file.filename}` };
  }

  async updateIdDocument(userId: string, file: Express.Multer.File): Promise<{ idDocumentUrl: string }> {
    const provider = await this.getMe(userId);
    const idDocumentUrl = `/uploads/id-documents/${file.filename}`;
    provider.idDocumentUrl = idDocumentUrl;
    await this.providerRepo.save(provider);
    return { idDocumentUrl };
  }

  async addPortfolioImage(userId: string, file: Express.Multer.File): Promise<PortfolioImage> {
    const provider = await this.getMe(userId);
    const imageUrl = `/uploads/portfolio/${file.filename}`;
    const image = this.portfolioRepository.create({ providerId: provider.id, imageUrl });
    return this.portfolioRepository.save(image);
  }

  async getMyPortfolio(userId: string): Promise<PortfolioImage[]> {
    const provider = await this.getMe(userId);
    return this.portfolioRepository.find({ where: { providerId: provider.id }, order: { sortOrder: 'ASC' } });
  }

  async getPortfolio(providerId: string): Promise<PortfolioImage[]> {
    return this.portfolioRepository.find({ where: { providerId }, order: { sortOrder: 'ASC' } });
  }

  // --- Availability (weekly schedule) ---
  async updateAvailabilitySchedule(userId: string, body: { schedule: any[]; bufferMinutes?: number }) {
    const provider = await this.getMe(userId);
    for (const day of body.schedule) {
      let schedule = await this.availabilityRepo.findOne({
        where: { providerId: provider.id, dayOfWeek: day.dayOfWeek }
      });
      if (!schedule) {
        schedule = this.availabilityRepo.create({
          providerId: provider.id,
          dayOfWeek: day.dayOfWeek,
        });
      }
      schedule.isOpen = day.isOpen;
      schedule.openTime = day.openTime;
      schedule.closeTime = day.closeTime;
      await this.availabilityRepo.save(schedule);
    }
    if (body.bufferMinutes !== undefined) {
      provider.bufferMinutes = body.bufferMinutes;
      await this.providerRepo.save(provider);
    }
    return this.getAvailabilitySchedule(userId);
  }

  async getAvailabilitySchedule(userId: string) {
    const provider = await this.getMe(userId);
    const schedule = await this.availabilityRepo.find({
      where: { providerId: provider.id },
      order: { dayOfWeek: 'ASC' },
    });
    return { schedule, bufferMinutes: provider.bufferMinutes };
  }

  // --- Services ---
  async getServices(userId: string) {
    const provider = await this.getMe(userId);
    return this.serviceRepo.find({ where: { providerId: provider.id }, order: { sortOrder: 'ASC' } });
  }

  async createService(userId: string, data: any) {
    const provider = await this.getMe(userId);
    const service = this.serviceRepo.create({ ...data, providerId: provider.id });
    return this.serviceRepo.save(service);
  }

  async updateService(userId: string, serviceId: string, data: any) {
    const provider = await this.getMe(userId);
    const service = await this.serviceRepo.findOne({ where: { id: serviceId, providerId: provider.id } });
    if (!service) throw new NotFoundException('Service not found for this provider');
    Object.assign(service, data);
    return this.serviceRepo.save(service);
  }

  async deleteService(userId: string, serviceId: string) {
    const provider = await this.getMe(userId);
    const service = await this.serviceRepo.findOne({ where: { id: serviceId, providerId: provider.id } });
    if (!service) throw new NotFoundException('Service not found');
    await this.serviceRepo.remove(service);
    return { deleted: true };
  }

  // --- Online Status ---
  async setOnlineStatus(userId: string, isOnline: boolean) {
    const provider = await this.getMe(userId);
    provider.isOnline = isOnline;
    return this.providerRepo.save(provider);
  }

  // --- Stats ---
  async getMyStats(userId: string) {
    const provider = await this.getMe(userId);
    const today = new Date().toISOString().split('T')[0];
    const todayBookings = await this.bookingRepo.count({
      where: { providerId: provider.id, scheduledDate: today }
    });
    return {
      todayAppointments: todayBookings,
      nextAppointmentTime: null,
      weeklyNewBookings: 0,
      avgRating: provider.avgRating ?? 0,
    };
  }

  // --- Time Blocks ---
  async getTimeBlocks(userId: string) {
    const provider = await this.getMe(userId);
    return this.timeBlockRepo.find({
      where: { providerId: provider.id },
      order: { startDate: 'ASC' },
    });
  }

  async createTimeBlock(userId: string, data: any) {
    const provider = await this.getMe(userId);
    const block = this.timeBlockRepo.create({ ...data, providerId: provider.id });
    return this.timeBlockRepo.save(block);
  }

  async deleteTimeBlock(userId: string, blockId: string) {
    const provider = await this.getMe(userId);
    const block = await this.timeBlockRepo.findOne({
      where: { id: blockId, providerId: provider.id },
    });
    if (!block) throw new NotFoundException('Time block not found');
    await this.timeBlockRepo.remove(block);
  }

  // ═════ Public /:id endpoints ═════

  async getPublicProfile(providerId: string) {
    const provider = await this.providerRepo.findOne({ where: { id: providerId } });
    if (!provider) throw new NotFoundException('Anbieter nicht gefunden.');

    // Strip private fields per CLAUDE.md /me vs /:id contract
    const { status, idDocumentUrl, street, houseNumber, postalCode,
            bufferMinutes, lat, lng, ...publicData } = provider as any;

    // Derive startingPrice from cheapest active service
    const cheapestService = await this.serviceRepo
      .createQueryBuilder('s')
      .where('s.providerId = :pid AND s.isActive = true', { pid: providerId })
      .orderBy('s.price', 'ASC')
      .getOne();

    return {
      ...publicData,
      startingPrice: cheapestService ? Number(cheapestService.price) : null,
    };
  }

  async getPublicServices(providerId: string) {
    const provider = await this.providerRepo.findOne({ where: { id: providerId } });
    if (!provider) throw new NotFoundException('Anbieter nicht gefunden.');
    return this.serviceRepo.find({
      where: { providerId, isActive: true },
      order: { sortOrder: 'ASC' },
    });
  }

  async getPublicReviews(providerId: string) {
    const provider = await this.providerRepo.findOne({ where: { id: providerId } });
    if (!provider) throw new NotFoundException('Anbieter nicht gefunden.');
    const reviews = await this.reviewRepo.find({
      where: { providerId },
      relations: ['client'],
      order: { createdAt: 'DESC' },
      take: 50,
    });
    return reviews.map(r => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      clientName: r.client ? `${r.client.firstName} ${r.client.lastName?.charAt(0)}.` : 'Kunde',
      providerResponse: r.providerResponse,
      createdAt: r.createdAt,
    }));
  }

  async getAvailableSlots(providerId: string, dateStr: string) {
    if (!dateStr) {
      throw new BadRequestException('date parameter is required (YYYY-MM-DD)');
    }

    const provider = await this.providerRepo.findOne({
      where: { id: providerId }
    });
    if (!provider) throw new NotFoundException('Anbieter nicht gefunden.');

    // Get day of week (0=Sunday, 1=Monday ... 6=Saturday)
    const date = new Date(dateStr);
    const dayOfWeek = date.getDay();

    // Get availability for this day
    const schedule = await this.availabilityRepo.findOne({
      where: { providerId, dayOfWeek },
    });

    // If no schedule OR day is closed → return empty slots
    if (!schedule || !schedule.isOpen) {
      return { date: dateStr, providerId, slots: [] };
    }

    // Generate 30-min slots between openTime and closeTime
    const slots = [];
    const [openH, openM] = schedule.openTime.split(':').map(Number);
    const [closeH, closeM] = schedule.closeTime.split(':').map(Number);
    const bufferMin = provider.bufferMinutes ?? 0;
    const slotInterval = 30; // 30 minute slots

    let currentH = openH;
    let currentM = openM;

    while (
      currentH < closeH ||
      (currentH === closeH && currentM < closeM)
    ) {
      const timeStr = `${String(currentH).padStart(2, '0')}:${String(currentM).padStart(2, '0')}`;

      // Check if this slot is booked
      const existingBooking = await this.bookingRepo.findOne({
        where: {
          providerId,
          scheduledDate: dateStr,
          scheduledTime: timeStr,
          status: Not('CANCELLED' as any),
        },
      });

      slots.push({
        time: timeStr,
        startTime: timeStr,
        available: !existingBooking,
        isAvailable: !existingBooking,
      });

      // Advance by slot interval + buffer
      const totalMinutes = currentH * 60 + currentM + slotInterval + bufferMin;
      currentH = Math.floor(totalMinutes / 60);
      currentM = totalMinutes % 60;
    }

    return { date: dateStr, providerId, slots };
  }
}
