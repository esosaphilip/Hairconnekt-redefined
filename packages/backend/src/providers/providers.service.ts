import {
  Injectable, NotFoundException, ConflictException, ForbiddenException, BadRequestException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, In, Brackets } from 'typeorm';
import { Provider, ProviderStatus } from '../entities/provider.entity';
import { PortfolioImage } from '../entities/portfolio-image.entity';
import { User } from '../entities/user.entity';
import { Service } from '../entities/service.entity';
import { Favourite } from '../entities/favourite.entity';
import { TimeBlock } from '../entities/time-block.entity';
import { Booking, BookingStatus } from '../entities/booking.entity';
import { AvailabilitySchedule } from '../entities/availability-schedule.entity';
import { Review } from '../entities/review.entity';
import { RegisterProviderDto } from './dto/register-provider.dto';
import { GeocodingService } from '../common/geocoding/geocoding.service';

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
    @InjectRepository(Favourite)
    private favouriteRepo: Repository<Favourite>,
    @InjectRepository(TimeBlock)
    private timeBlockRepo: Repository<TimeBlock>,
    @InjectRepository(Booking)
    private bookingRepo: Repository<Booking>,
    @InjectRepository(AvailabilitySchedule)
    private availabilityRepo: Repository<AvailabilitySchedule>,
    @InjectRepository(Review)
    private reviewRepo: Repository<Review>,
    private geocodingService: GeocodingService,
  ) {}

  async findByUserId(userId: string) {
    return this.providerRepo.findOne({ where: { userId } });
  }

  private normalizeSearchSort(sort?: string) {
    if (sort === 'bewertung') return 'bewertung';
    if (sort === 'entfernung') return 'entfernung';
    return 'empfohlen';
  }

  private toOptionalNumber(value?: string): number | null {
    if (value === undefined || value === null || value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private calculateDistanceKm(
    fromLat: number,
    fromLng: number,
    toLat?: number | null,
    toLng?: number | null,
  ): number | null {
    if (toLat === null || toLat === undefined || toLng === null || toLng === undefined) {
      return null;
    }

    if (
      Number.isNaN(fromLat) ||
      Number.isNaN(fromLng) ||
      Number.isNaN(toLat) ||
      Number.isNaN(toLng) ||
      (toLat === 0 && toLng === 0)
    ) {
      return null;
    }

    const toRadians = (value: number) => (value * Math.PI) / 180;
    const earthRadiusKm = 6371;
    const dLat = toRadians(toLat - fromLat);
    const dLng = toRadians(toLng - fromLng);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRadians(fromLat)) *
        Math.cos(toRadians(toLat)) *
        Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Number((earthRadiusKm * c).toFixed(1));
  }

  private hasProviderAddress(provider: Pick<Provider, 'street' | 'houseNumber' | 'city' | 'postalCode'>) {
    return Boolean(
      provider.street?.trim() &&
        provider.houseNumber?.trim() &&
        provider.city?.trim() &&
        provider.postalCode?.trim(),
    );
  }

  private async syncProviderCoordinates(
    provider: Provider,
    clearWhenUnavailable = false,
  ): Promise<void> {
    if (!this.hasProviderAddress(provider)) {
      if (clearWhenUnavailable) {
        (provider as any).lat = null;
        (provider as any).lng = null;
      }
      return;
    }

    const result = await this.geocodingService.geocodeAddress({
      street: provider.street,
      houseNumber: provider.houseNumber,
      city: provider.city,
      postalCode: provider.postalCode,
    });

    if (result.status === 'success') {
      provider.lat = result.coordinates.lat as any;
      provider.lng = result.coordinates.lng as any;
      return;
    }

    if (result.status === 'not_found' && clearWhenUnavailable) {
      (provider as any).lat = null;
      (provider as any).lng = null;
    }
  }

  async findAll(query: Record<string, string>, user?: { id?: string; sub?: string; role?: string }) {
    const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
    const page = Math.max(Number(query.page) || 1, 1);
    const trimmedSearch = query.search?.trim();
    const search = trimmedSearch ? trimmedSearch.toLowerCase() : undefined;
    const categoryId = query.categoryId || query.services || query.category;
    const sort = this.normalizeSearchSort(query.sort);
    const lat = this.toOptionalNumber(query.lat);
    const lng = this.toOptionalNumber(query.lng);
    const hasLocation = lat !== null && lng !== null;

    const qb = this.providerRepo
      .createQueryBuilder('p')
      .where('p.status = :status', { status: ProviderStatus.APPROVED });

    if (categoryId) {
      qb.distinct(true);
      qb.leftJoin(
        Service,
        'service',
        'service.providerId = p.id AND service.isActive = true',
      );
    }

    if (query.availableToday === 'true') {
      qb.andWhere('p.isOnline = :online', { online: true });
    }

    if (categoryId) {
      qb.andWhere('service.categoryId = :categoryId', { categoryId });
    }

    if (search) {
      const searchTerm = `%${search}%`;
      qb.andWhere(
        new Brackets((subQb) => {
          subQb
            .where('LOWER(p.businessName) LIKE LOWER(:searchTerm)', { searchTerm })
            .orWhere('LOWER(p.city) LIKE LOWER(:searchTerm)', { searchTerm })
            .orWhere(
              'EXISTS (SELECT 1 FROM services s WHERE s."providerId" = p.id AND s."isActive" = true AND LOWER(s.name) LIKE LOWER(:searchTerm))',
              { searchTerm },
            )
            .orWhere(
              'EXISTS (SELECT 1 FROM services s WHERE s."providerId" = p.id AND s."isActive" = true AND LOWER(s.description) LIKE LOWER(:searchTerm))',
              { searchTerm },
            );
        }),
      );
    }

    if (sort === 'bewertung') {
      qb
        .orderBy('p.avgRating', 'DESC')
        .addOrderBy('p.totalReviews', 'DESC')
        .addOrderBy('p.isOnline', 'DESC')
        .addOrderBy('p.createdAt', 'DESC');
    } else if (sort === 'entfernung' && hasLocation) {
      const latExpr = `NULLIF(p.lat::text, '')`;
      const lngExpr = `NULLIF(p.lng::text, '')`;
      const distanceOrderExpression = `
        CASE
          WHEN p.lat IS NULL OR p.lng IS NULL THEN NULL
          WHEN ${latExpr} !~ '^-?\\d+(\\.\\d+)?$' OR ${lngExpr} !~ '^-?\\d+(\\.\\d+)?$' THEN NULL
          ELSE sqrt(
            power((${latExpr})::double precision - :lat, 2) +
            power((${lngExpr})::double precision - :lng, 2)
          )
        END
      `;
      qb
        .orderBy(distanceOrderExpression, 'ASC', 'NULLS LAST')
        .addOrderBy('p.avgRating', 'DESC')
        .addOrderBy('p.totalReviews', 'DESC')
        .setParameters({ lat, lng });
    } else {
      qb
        .orderBy('p.isOnline', 'DESC')
        .addOrderBy('p.avgRating', 'DESC')
        .addOrderBy('p.totalReviews', 'DESC')
        .addOrderBy('p.createdAt', 'DESC');
    }

    let providers: Provider[];
    let total: number;
    try {
      [providers, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
    } catch (e) {
      if (sort === 'entfernung') {
        qb
          .orderBy('p.isOnline', 'DESC')
          .addOrderBy('p.avgRating', 'DESC')
          .addOrderBy('p.totalReviews', 'DESC')
          .addOrderBy('p.createdAt', 'DESC');
        [providers, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
      } else {
        throw e;
      }
    }

    const ids = providers.map((p) => p.id);
    const priceMap = new Map<string, number>();
    const tagMap = new Map<string, string[]>();
    const favouriteIds = new Set<string>();
    if (ids.length) {
      const priceRows = await this.serviceRepo
        .createQueryBuilder('s')
        .select('s.providerId', 'providerId')
        .addSelect('MIN(s.price)', 'minPrice')
        .where('s.providerId IN (:...ids)', { ids })
        .andWhere('s.isActive = true')
        .groupBy('s.providerId')
        .getRawMany();
      for (const r of priceRows) {
        priceMap.set(r.providerId, Number(r.minPrice));
      }

      const activeServices = await this.serviceRepo.find({
        where: { providerId: In(ids), isActive: true },
        order: { sortOrder: 'ASC', name: 'ASC' },
      });

      for (const service of activeServices) {
        const tags = tagMap.get(service.providerId) ?? [];
        if (tags.length < 3 && !tags.includes(service.name)) {
          tags.push(service.name);
          tagMap.set(service.providerId, tags);
        }
      }

      const userId = user?.sub || user?.id;
      if (userId && user?.role === 'client') {
        const favourites = await this.favouriteRepo.find({
          where: { clientId: userId, providerId: In(ids) },
        });
        for (const favourite of favourites) {
          favouriteIds.add(favourite.providerId);
        }
      }
    }

    const data = providers.map((p) => {
      const distanceKm = hasLocation
        ? this.calculateDistanceKm(
            lat!,
            lng!,
            p.lat === null || p.lat === undefined ? null : Number(p.lat),
            p.lng === null || p.lng === undefined ? null : Number(p.lng),
          )
        : null;

      return {
        id: p.id,
        businessName: p.businessName,
        providerType: p.providerType,
        avatarUrl: p.avatarUrl,
        city: p.city,
        avgRating: Number(p.avgRating) || 0,
        totalReviews: p.totalReviews ?? 0,
        startingPrice: priceMap.get(p.id) ?? 0,
        isAvailableToday: p.isOnline,
        distanceKm,
        specialisationTags: tagMap.get(p.id) ?? [],
        isFavourited: favouriteIds.has(p.id),
      };
    });

    if (sort === 'entfernung' && hasLocation) {
      data.sort((a, b) => {
        if (a.distanceKm === null) return 1;
        if (b.distanceKm === null) return -1;
        if (a.distanceKm !== b.distanceKm) return a.distanceKm - b.distanceKm;
        if (b.avgRating !== a.avgRating) return b.avgRating - a.avgRating;
        return (b.totalReviews || 0) - (a.totalReviews || 0);
      });
    }

    const totalPages = total > 0 ? Math.ceil(total / limit) : 0;

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
        appliedSort: sort,
      },
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
    await this.syncProviderCoordinates(provider, true);
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
    const addressFields = new Set(['street', 'houseNumber', 'city', 'postalCode']);
    let addressChanged = false;
    for (const key of allowedFields) {
      if (data[key] !== undefined) {
        (provider as any)[key] = data[key];
        if (addressFields.has(key)) {
          addressChanged = true;
        }
      }
    }
    if (addressChanged) {
      await this.syncProviderCoordinates(provider, true);
    }
    return this.providerRepo.save(provider);
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
  async getTimeBlocks(userId: string, from?: string, to?: string) {
    const provider = await this.getMe(userId);

    const fromDate = from ?? new Date().toISOString().split('T')[0];
    const toDate =
      to ??
      (() => {
        const d = new Date();
        d.setDate(d.getDate() + 90);
        return d.toISOString().split('T')[0];
      })();

    return this.timeBlockRepo
      .createQueryBuilder('block')
      .where('block.providerId = :providerId', { providerId: provider.id })
      .andWhere('block.startDate <= :to', { to: toDate })
      .andWhere('block.endDate >= :from', { from: fromDate })
      .orderBy('block.startDate', 'ASC')
      .getMany();
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

  async getPublicProfile(providerId: string, queryLat?: string, queryLng?: string) {
    const provider = await this.providerRepo.findOne({ where: { id: providerId } });
    if (!provider) throw new NotFoundException('Anbieter nicht gefunden.');

    // Strip private fields per CLAUDE.md /me vs /:id contract
    const { status, idDocumentUrl, street, houseNumber, postalCode,
            bufferMinutes, lat: providerLat, lng: providerLng, ...publicData } = provider as any;

    // Derive startingPrice from cheapest active service
    const cheapestService = await this.serviceRepo
      .createQueryBuilder('s')
      .where('s.providerId = :pid AND s.isActive = true', { pid: providerId })
      .orderBy('s.price', 'ASC')
      .getOne();

    const distanceKm =
      queryLat !== undefined && queryLng !== undefined
        ? this.calculateDistanceKm(
            Number(queryLat),
            Number(queryLng),
            providerLat === null || providerLat === undefined ? null : Number(providerLat),
            providerLng === null || providerLng === undefined ? null : Number(providerLng),
          )
        : null;

    return {
      ...publicData,
      startingPrice: cheapestService ? Number(cheapestService.price) : null,
      distanceKm,
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

  async getPublicReviews(
    providerId: string,
    page = 1,
    limit = 20,
    rating?: number,
  ) {
    const provider = await this.providerRepo.findOne({ where: { id: providerId } });
    if (!provider) throw new NotFoundException('Anbieter nicht gefunden.');

    const safeLimit = Math.max(1, Math.min(50, limit));
    const safePage = Math.max(1, page);
    const skip = (safePage - 1) * safeLimit;

    const baseQb = this.reviewRepo
      .createQueryBuilder('r')
      .where('r.providerId = :providerId', { providerId });

    if (rating !== undefined) {
      baseQb.andWhere('r.rating = :rating', { rating });
    }

    const total = await baseQb.getCount();

    const pageIds = await baseQb
      .clone()
      .select(['r.id'])
      .orderBy('r.createdAt', 'DESC')
      .skip(skip)
      .take(safeLimit)
      .getMany();

    const ids = pageIds.map((r) => r.id);
    const detailed =
      ids.length === 0
        ? []
        : await this.reviewRepo.find({
            where: { id: In(ids) },
            relations: ['client', 'booking', 'booking.services'],
            order: { createdAt: 'DESC' },
          });

    const distributionRows = await this.reviewRepo
      .createQueryBuilder('r')
      .select('r.rating', 'rating')
      .addSelect('COUNT(*)', 'count')
      .where('r.providerId = :providerId', { providerId })
      .groupBy('r.rating')
      .getRawMany<{ rating: string; count: string }>();

    const ratingDistribution: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
    for (const row of distributionRows) {
      const key = String(row.rating);
      ratingDistribution[key] = Number(row.count);
    }

    const computedTotalReviews = Object.values(ratingDistribution).reduce(
      (sum, v) => sum + v,
      0,
    );
    const computedAvgRating =
      computedTotalReviews === 0
        ? 0
        : Number(
            (
              (ratingDistribution['1'] * 1 +
                ratingDistribution['2'] * 2 +
                ratingDistribution['3'] * 3 +
                ratingDistribution['4'] * 4 +
                ratingDistribution['5'] * 5) /
              computedTotalReviews
            ).toFixed(1),
          );

    const totalPages = Math.max(1, Math.ceil(total / safeLimit));
    const hasNext = safePage < totalPages;
    const hasPrev = safePage > 1;

    return {
      summary: {
        avgRating: computedAvgRating,
        totalReviews: computedTotalReviews,
        ratingDistribution,
      },
      data: detailed.map((r) => {
        const serviceName =
          r.booking?.services?.[0]?.name ??
          null;

        const clientFirstName = r.client?.firstName ?? 'Kunde';
        const clientLastInitial = r.client?.lastName ? `${r.client.lastName.charAt(0)}.` : '';

        return {
          id: r.id,
          rating: r.rating,
          comment: r.comment,
          createdAt: r.createdAt,
          serviceName,
          client: {
            firstName: r.client?.firstName ?? null,
            lastName: r.client?.lastName ?? null,
            name: `${clientFirstName}${clientLastInitial ? ` ${clientLastInitial}` : ''}`,
            avatarUrl: r.client?.avatarUrl ?? null,
          },
          providerResponse: r.providerResponse ?? null,
          response: r.providerResponse ?? null,
          respondedAt: r.respondedAt ?? null,
        };
      }),
      meta: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages,
        hasNext,
        hasPrev,
        hasNextPage: hasNext,
        hasPrevPage: hasPrev,
      },
    };
  }

  async getAvailableSlots(providerId: string, dateStr: string) {
    if (!dateStr) {
      throw new BadRequestException('date parameter is required (YYYY-MM-DD)');
    }

    const dateParam = dateStr;
    const provider = await this.providerRepo.findOne({
      where: { id: providerId }
    });
    if (!provider) throw new NotFoundException('Anbieter nicht gefunden.');

    // When a provider is offline, clients should not be able to pick bookable slots.
    if (!provider.isOnline) {
      return { date: dateStr, providerId, slots: [] };
    }

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

    const [openH, openM] = schedule.openTime.split(':').map(Number);
    const [closeH, closeM] = schedule.closeTime.split(':').map(Number);
    const bufferMin = provider.bufferMinutes ?? 0;
    const slotInterval = 30; // 30 minute slots

    const openMinutes = openH * 60 + openM;
    const closeMinutes = closeH * 60 + closeM;

    const allSlotMinutes: number[] = [];
    for (
      let m = openMinutes;
      m < closeMinutes;
      m += slotInterval + bufferMin
    ) {
      allSlotMinutes.push(m);
    }

    const occupiedRanges: Array<{ start: number; end: number }> = [];

    const existingBookings = await this.bookingRepo
      .createQueryBuilder('booking')
      .select(['booking.scheduledTime'])
      .where('booking.providerId = :providerId', { providerId })
      .andWhere('booking.scheduledDate = :date', { date: dateParam })
      .andWhere('booking.status != :cancelled', { cancelled: BookingStatus.CANCELLED })
      .getMany();

    for (const booking of existingBookings) {
      if (!booking.scheduledTime) continue;
      const [h, min] = booking.scheduledTime.split(':').map(Number);
      const start = h * 60 + min;
      occupiedRanges.push({ start, end: start + slotInterval + bufferMin });
    }

    const timeBlocks = await this.timeBlockRepo
      .createQueryBuilder('block')
      .where('block.providerId = :providerId', { providerId })
      .andWhere('block.startDate <= :date', { date: dateParam })
      .andWhere('block.endDate >= :date', { date: dateParam })
      .getMany();

    const hasAllDayBlock = timeBlocks.some((b) => b.isAllDay);
    if (hasAllDayBlock) {
      const slots = allSlotMinutes.map((slotMinute) => {
        const hours = Math.floor(slotMinute / 60)
          .toString()
          .padStart(2, '0');
        const mins = (slotMinute % 60).toString().padStart(2, '0');
        const timeStr = `${hours}:${mins}`;
        return {
          time: timeStr,
          startTime: timeStr,
          available: false,
          isAvailable: false,
        };
      });
      return { date: dateParam, providerId, slots };
    }

    for (const block of timeBlocks) {
      if (!block.isAllDay && block.startTime && block.endTime) {
        const [bStartHour, bStartMin] = block.startTime.split(':').map(Number);
        const [bEndHour, bEndMin] = block.endTime.split(':').map(Number);

        occupiedRanges.push({
          start: bStartHour * 60 + bStartMin,
          end: bEndHour * 60 + bEndMin,
        });
      }
    }

    const isSlotOccupied = (slotMinute: number) =>
      occupiedRanges.some((range) => slotMinute >= range.start && slotMinute < range.end);

    const slots = allSlotMinutes.map((slotMinute) => {
      const hours = Math.floor(slotMinute / 60).toString().padStart(2, '0');
      const mins = (slotMinute % 60).toString().padStart(2, '0');
      const timeStr = `${hours}:${mins}`;
      const available = !isSlotOccupied(slotMinute);
      return {
        time: timeStr,
        startTime: timeStr,
        available,
        isAvailable: available,
      };
    });

    return { date: dateParam, providerId, slots };
  }
}
