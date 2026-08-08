import { Controller, Get, Post, Delete, Param, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { type Request as ExpressRequest } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';
import { FavouritesService } from './favourites.service';

type AuthRequest = ExpressRequest & { user: { sub?: string; id?: string; role?: string } };

@Controller('favourites')
@UseGuards(JwtAuthGuard)
export class FavouritesController {
  constructor(private readonly favouritesService: FavouritesService) {}

  @Get()
  @Roles(UserRole.CLIENT)
  async getFavourites(@Request() req: AuthRequest) {
    const userId = (req.user.sub ?? req.user.id)!;
    return this.favouritesService.getFavourites(userId);
  }

  @Post(':providerId')
  @Roles(UserRole.CLIENT)
  @HttpCode(HttpStatus.CREATED)
  async addFavourite(@Request() req: AuthRequest, @Param('providerId') providerId: string) {
    const userId = (req.user.sub ?? req.user.id)!;
    await this.favouritesService.addFavourite(userId, providerId);
  }

  @Delete(':providerId')
  @Roles(UserRole.CLIENT)
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeFavourite(@Request() req: AuthRequest, @Param('providerId') providerId: string) {
    const userId = (req.user.sub ?? req.user.id)!;
    await this.favouritesService.removeFavourite(userId, providerId);
  }
}
