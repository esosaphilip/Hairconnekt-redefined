import { Controller, Post, Body, UseGuards, Request, Get, Query, Param, Patch, HttpCode, HttpStatus } from '@nestjs/common';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../entities/user.entity';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { RescheduleBookingDto } from './dto/reschedule-booking.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CLIENT)
  async createBooking(@Request() req, @Body() createBookingDto: CreateBookingDto) {
    const clientId = req.user.sub || req.user.id;
    return this.bookingsService.createBooking(clientId, createBookingDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CLIENT, UserRole.PROVIDER)
  async getBookings(
    @Request() req, 
    @Query('status') status: string,
    @Query('today') today: string,
    @Query('month') month: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20'
  ) {
    return this.bookingsService.findAll(req.user, status, Number(page), Number(limit), today === 'true', month);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CLIENT, UserRole.PROVIDER)
  async getBookingById(@Request() req, @Param('id') id: string) {
    return this.bookingsService.findOne(id, req.user);
  }

  @Patch(':id/reschedule')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.CLIENT)
  async rescheduleBooking(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: RescheduleBookingDto
  ) {
    return this.bookingsService.rescheduleBooking(id, req.user, dto);
  }

  @Patch(':id/cancel')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.CLIENT)
  async cancelBooking(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: CancelBookingDto
  ) {
    return this.bookingsService.cancelBooking(id, req.user, dto);
  }

  @Patch(':id/accept')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER)
  async acceptBooking(@Request() req, @Param('id') id: string) {
    return this.bookingsService.acceptBooking(id, req.user);
  }

  @Patch(':id/decline')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER)
  async declineBooking(@Request() req, @Param('id') id: string) {
    return this.bookingsService.declineBooking(id, req.user);
  }

  @Patch(':id/start')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER)
  async startBooking(@Request() req, @Param('id') id: string) {
    return this.bookingsService.startBooking(id, req.user);
  }

  @Patch(':id/complete')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER)
  async completeBooking(@Request() req, @Param('id') id: string) {
    return this.bookingsService.completeBooking(id, req.user);
  }
}
