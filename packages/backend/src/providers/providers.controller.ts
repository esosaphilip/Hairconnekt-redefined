import {
  Controller, Post, Get, Body, UseGuards, Request, Put, Query,
  UseInterceptors, UploadedFile, BadRequestException, HttpCode, HttpStatus,
  NotFoundException, Patch, Delete, Param, ParseUUIDPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole as Role } from '../entities/user.entity';
import { ProvidersService } from './providers.service';
import { RegisterProviderDto } from './dto/register-provider.dto';
import { CreateServiceDto, UpdateServiceDto, CreateTimeBlockDto } from './dto/provider-endpoints.dto';
import { memoryStorage } from 'multer';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Provider } from '../entities/provider.entity';
import { PortfolioImage } from '../entities/portfolio-image.entity';
import { R2Service } from '../common/storage/r2.service';

@Controller('providers')
export class ProvidersController {
  constructor(
    private readonly providersService: ProvidersService,
    private readonly r2Service: R2Service,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Provider) private readonly providerRepo: Repository<Provider>,
    @InjectRepository(PortfolioImage) private readonly portfolioRepo: Repository<PortfolioImage>,
  ) {}

  @Post('register')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROVIDER)
  async register(
    @CurrentUser() user: User,
    @Body() dto: RegisterProviderDto,
  ) {
    return this.providersService.registerProvider(user.id, dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROVIDER)
  async getMyProfile(@CurrentUser() user: User) {
    const provider = await this.providersService.findByUserId(user.id);
    if (!provider) throw new NotFoundException('Kein Anbieterprofil gefunden.');
    return provider;
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROVIDER)
  async updateMyProfile(
    @CurrentUser() user: User,
    @Body() body: Record<string, any>,
  ) {
    return this.providersService.updateMyProfile(user.id, body);
  }



  /** PUT /providers/me/availability — set weekly schedule */
  @Put('me/availability')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROVIDER)
  async updateAvailabilitySchedule(
    @CurrentUser() user: User,
    @Body() body: { schedule: any[]; bufferMinutes?: number },
  ) {
    return this.providersService.updateAvailabilitySchedule(user.id, body);
  }

  /** GET /providers/me/availability — fetch weekly schedule */
  @Get('me/availability')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROVIDER)
  async getAvailabilitySchedule(@CurrentUser() user: User) {
    return this.providersService.getAvailabilitySchedule(user.id);
  }

  /** PATCH /providers/me/availability — toggle isOnline */
  @Patch('me/availability')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROVIDER)
  async setAvailability(
    @CurrentUser() user: User,
    @Body() body: { isOnline: boolean },
  ) {
    return this.providersService.setOnlineStatus(user.id, body.isOnline);
  }

  @Post('me/avatar')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROVIDER)
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
          return cb(new BadRequestException('Nur Bilder erlaubt.'), false);
        }
        cb(null, true);
      },
    }),
  )
  async uploadProviderAvatar(
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Kein Bild hochgeladen.');
    const url = await this.r2Service.uploadFile(
      file.buffer,
      file.mimetype,
      'provider-avatars',
    );
    const provider = await this.providersService.findByUserId(user.id);
    if (!provider) throw new NotFoundException();
    // Update the provider avatarUrl
    await this.providerRepo.update(provider.id, { avatarUrl: url });
    // Also update the user avatarUrl so it shows in client view
    await this.userRepo.update(user.id, { avatarUrl: url });
    return { avatarUrl: url };
  }

  @Post('me/id-document')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROVIDER)
  @UseInterceptors(
    FileInterceptor('idDocument', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB for ID docs
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
          return cb(new BadRequestException('Nur Bilder erlaubt.'), false);
        }
        cb(null, true);
      },
    }),
  )
  async uploadIdDocument(
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Kein Dokument hochgeladen.');
    const url = await this.r2Service.uploadFile(
      file.buffer,
      file.mimetype,
      'id-documents',
    );
    const provider = await this.providersService.findByUserId(user.id);
    if (!provider) throw new NotFoundException();
    await this.providerRepo.update(provider.id, { idDocumentUrl: url });
    return { idDocumentUrl: url };
  }



  // --- Services ---
  @Get('me/services')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROVIDER)
  async getMyServices(@CurrentUser() user: User) {
    return this.providersService.getServices(user.id);
  }

  @Post('me/services')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROVIDER)
  async createService(
    @CurrentUser() user: User,
    @Body() dto: CreateServiceDto,
  ) {
    return this.providersService.createService(user.id, dto);
  }

  @Patch('me/services/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROVIDER)
  async updateService(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) serviceId: string,
    @Body() dto: UpdateServiceDto,
  ) {
    return this.providersService.updateService(user.id, serviceId, dto);
  }

  @Delete('me/services/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROVIDER)
  async deleteService(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) serviceId: string,
  ) {
    return this.providersService.deleteService(user.id, serviceId);
  }

  // --- Stats ---
  @Get('me/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROVIDER)
  async getStats(@CurrentUser() user: User) {
    return this.providersService.getMyStats(user.id);
  }

  // --- Time Blocks ---
  @Get('me/blocks')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROVIDER)
  async getTimeBlocks(@CurrentUser() user: User) {
    return this.providersService.getTimeBlocks(user.id);
  }

  @Post('me/blocks')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROVIDER)
  async createTimeBlock(
    @CurrentUser() user: User,
    @Body() dto: CreateTimeBlockDto,
  ) {
    return this.providersService.createTimeBlock(user.id, dto);
  }

  @Delete('me/blocks/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROVIDER)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTimeBlock(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) blockId: string,
  ) {
    return this.providersService.deleteTimeBlock(user.id, blockId);
  }

  // ═══════════════════════════════════════════════════════
  //  LIST — must be before /:id
  // ═══════════════════════════════════════════════════════

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CLIENT, Role.PROVIDER)
  async findAll(
    @Query() query: Record<string, string>,
    @CurrentUser() user: User,
  ) {
    return this.providersService.findAll(query, user);
  }

  // ═══════════════════════════════════════════════════════
  //  PUBLIC /:id endpoints — MUST come AFTER all /me routes
  //  to prevent UUID shadowing (see routing architecture KI)
  // ═══════════════════════════════════════════════════════

  @Get(':id')
  async getPublicProfile(
    @Param('id', ParseUUIDPipe) providerId: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
  ) {
    return this.providersService.getPublicProfile(providerId, lat, lng);
  }

  @Get(':id/services')
  async getPublicServices(@Param('id', ParseUUIDPipe) providerId: string) {
    return this.providersService.getPublicServices(providerId);
  }



  @Get(':id/reviews')
  async getPublicReviews(
    @Param('id', ParseUUIDPipe) providerId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('rating') rating?: string,
  ) {
    const parsedPage = page ? Number(page) : 1;
    const parsedLimit = limit ? Number(limit) : 20;
    const parsedRating =
      rating !== undefined && rating !== null && rating !== ''
        ? Number(rating)
        : undefined;

    return this.providersService.getPublicReviews(
      providerId,
      Number.isFinite(parsedPage) ? parsedPage : 1,
      Number.isFinite(parsedLimit) ? parsedLimit : 20,
      parsedRating !== undefined && Number.isFinite(parsedRating)
        ? parsedRating
        : undefined,
    );
  }

  @Get(':id/slots')
  async getSlots(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('date') date: string,
  ) {
    return this.providersService.getAvailableSlots(id, date);
  }
}
