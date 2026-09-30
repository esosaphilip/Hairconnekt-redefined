import { Controller, Post, Body, UseGuards, Request, Get, Query, Param, Patch, HttpCode, HttpStatus } from '@nestjs/common';
import { parsePagination } from '../common/pagination';
import { type Request as ExpressRequest } from 'express';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../entities/user.entity';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { RescheduleBookingDto } from './dto/reschedule-booking.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { GetBookingsQueryDto } from './dto/get-bookings-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EmailVerifiedGuard } from '../auth/guards/email-verified.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';
import { UserThrottlerGuard } from '../auth/guards/user-throttler.guard';
import { SkipThrottle, Throttle } from '@nestjs/throttler';

type AuthRequest = ExpressRequest & { user: { sub?: string; id?: string; role?: string } };

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @SkipThrottle()
  @UseGuards(JwtAuthGuard, EmailVerifiedGuard, RolesGuard, UserThrottlerGuard)
  @Roles(UserRole.CLIENT)
  @Throttle({ default: { limit: 20, ttl: 60 } })
  async createBooking(@Request() req: AuthRequest, @Body() createBookingDto: CreateBookingDto) {
    const clientId = (req.user.sub ?? req.user.id)!;
    return this.bookingsService.createBooking(clientId, createBookingDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, EmailVerifiedGuard, RolesGuard)
  @Roles(UserRole.CLIENT, UserRole.PROVIDER)
  async getBookings(
    @Request() req: AuthRequest,
    @Query() query: GetBookingsQueryDto,
  ) {
    const { page, limit } = parsePagination(query.page, query.limit);
    return this.bookingsService.findAll(req.user, query.status ?? '', page, limit, query.today === 'true', query.month);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, EmailVerifiedGuard, RolesGuard)
  @Roles(UserRole.CLIENT, UserRole.PROVIDER)
  async getBookingById(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.bookingsService.findOne(id, req.user);
  }

  @Patch(':id/reschedule')
  @SkipThrottle()
  @UseGuards(JwtAuthGuard, EmailVerifiedGuard, RolesGuard, UserThrottlerGuard)
  @Roles(UserRole.CLIENT)
  @Throttle({ default: { limit: 10, ttl: 60 } })
  async rescheduleBooking(
    @Request() req: AuthRequest,
    @Param('id') id: string,
    @Body() dto: RescheduleBookingDto
  ) {
    return this.bookingsService.rescheduleBooking(id, req.user, dto);
  }

  @Patch(':id/cancel')
  @SkipThrottle()
  @UseGuards(JwtAuthGuard, EmailVerifiedGuard, RolesGuard, UserThrottlerGuard)
  @Roles(UserRole.CLIENT, UserRole.PROVIDER)
  @Throttle({ default: { limit: 10, ttl: 60 } })
  async cancelBooking(
    @Request() req: AuthRequest,
    @Param('id') id: string,
    @Body() dto: CancelBookingDto
  ) {
    return this.bookingsService.cancelBooking(id, req.user, dto);
  }

  @Patch(':id/accept')
  @SkipThrottle()
  @UseGuards(JwtAuthGuard, EmailVerifiedGuard, RolesGuard, UserThrottlerGuard)
  @Roles(UserRole.PROVIDER)
  @Throttle({ default: { limit: 30, ttl: 60 } })
  async acceptBooking(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.bookingsService.acceptBooking(id, req.user);
  }

  @Patch(':id/decline')
  @SkipThrottle()
  @UseGuards(JwtAuthGuard, EmailVerifiedGuard, RolesGuard, UserThrottlerGuard)
  @Roles(UserRole.PROVIDER)
  @Throttle({ default: { limit: 30, ttl: 60 } })
  async declineBooking(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.bookingsService.declineBooking(id, req.user);
  }

  @Patch(':id/start')
  @SkipThrottle()
  @UseGuards(JwtAuthGuard, EmailVerifiedGuard, RolesGuard, UserThrottlerGuard)
  @Roles(UserRole.PROVIDER)
  @Throttle({ default: { limit: 30, ttl: 60 } })
  async startBooking(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.bookingsService.startBooking(id, req.user);
  }

  @Patch(':id/complete')
  @SkipThrottle()
  @UseGuards(JwtAuthGuard, EmailVerifiedGuard, RolesGuard, UserThrottlerGuard)
  @Roles(UserRole.PROVIDER)
  @Throttle({ default: { limit: 30, ttl: 60 } })
  async completeBooking(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.bookingsService.completeBooking(id, req.user);
  }
}
