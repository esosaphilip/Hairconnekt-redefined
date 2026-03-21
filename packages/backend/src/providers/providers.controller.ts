import {
  Controller, Post, Get, Body, UseGuards, Request, Put,
  UseInterceptors, UploadedFile, BadRequestException, HttpCode, HttpStatus,
  NotFoundException, Patch, Delete, Param, ParseUUIDPipe
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
import { diskStorage } from 'multer';
import { extname } from 'path';

const imageFileFilter = (req: any, file: any, callback: any) => {
  if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
    return callback(new BadRequestException('Only image files are allowed!'), false);
  }
  callback(null, true);
};

const makeFilename = (req: any, file: any, callback: any) => {
  const rand = Array(8).fill(null).map(() => Math.round(Math.random() * 16).toString(16)).join('');
  callback(null, `${rand}${extname(file.originalname)}`);
};

@Controller('providers')
export class ProvidersController {
  constructor(private readonly providersService: ProvidersService) {}

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

  /** GET /providers/me/portfolio */
  @Get('me/portfolio')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROVIDER)
  async getMyPortfolio(@CurrentUser() user: User) {
    return this.providersService.getMyPortfolio(user.id);
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
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: diskStorage({ destination: './uploads/avatars', filename: makeFilename }),
      fileFilter: imageFileFilter,
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async uploadAvatar(@Request() req: any, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file provided');
    const userId = req.user.sub || req.user.id;
    return this.providersService.updateAvatar(userId, file);
  }

  @Post('me/id-document')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('idDocument', {
      storage: diskStorage({ destination: './uploads/id-documents', filename: makeFilename }),
      fileFilter: imageFileFilter,
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async uploadIdDocument(@Request() req: any, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file provided');
    const userId = req.user.sub || req.user.id;
    return this.providersService.updateIdDocument(userId, file);
  }

  @Post('me/portfolio')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('portfolio', {
      storage: diskStorage({ destination: './uploads/portfolio', filename: makeFilename }),
      fileFilter: imageFileFilter,
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async uploadPortfolio(@Request() req: any, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file provided');
    const userId = req.user.sub || req.user.id;
    return this.providersService.addPortfolioImage(userId, file);
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
  //  PUBLIC /:id endpoints — MUST come AFTER all /me routes
  //  to prevent UUID shadowing (see routing architecture KI)
  // ═══════════════════════════════════════════════════════

  @Get(':id')
  async getPublicProfile(@Param('id', ParseUUIDPipe) providerId: string) {
    return this.providersService.getPublicProfile(providerId);
  }

  @Get(':id/services')
  async getPublicServices(@Param('id', ParseUUIDPipe) providerId: string) {
    return this.providersService.getPublicServices(providerId);
  }

  @Get(':id/portfolio')
  async getPublicPortfolio(@Param('id', ParseUUIDPipe) providerId: string) {
    return this.providersService.getPortfolio(providerId);
  }

  @Get(':id/reviews')
  async getPublicReviews(@Param('id', ParseUUIDPipe) providerId: string) {
    return this.providersService.getPublicReviews(providerId);
  }
}
