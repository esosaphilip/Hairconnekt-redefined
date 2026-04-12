import {
  Controller, Get, Post, Patch, Delete, Body, Param, ParseUUIDPipe,
  UseGuards, Request, UseInterceptors, UploadedFile, BadRequestException,
  HttpCode, HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';
import { memoryStorage } from 'multer';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { Provider } from '../entities/provider.entity';
import { R2Service } from '../common/storage/r2.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly r2Service: R2Service,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Provider) private readonly providerRepo: Repository<Provider>,
  ) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@Request() req) {
    const userId = req.user.sub || req.user.id;
    return this.usersService.getMe(userId);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  async updateMe(
    @CurrentUser() user: User,
    @Body() body: { firstName?: string; lastName?: string; phone?: string },
  ) {
    return this.usersService.updateMe(user.id, body);
  }

  @Delete('me')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async deleteAccount(
    @CurrentUser() user: User,
    @Body() body: { password: string },
  ) {
    if (!body?.password) {
      throw new BadRequestException(
        'Passwort ist erforderlich um das Konto zu löschen.',
      );
    }

    await this.usersService.deleteAccount(user.id, body.password);

    return {
      message: 'Dein Konto wurde erfolgreich gelöscht.',
      deletedAt: new Date().toISOString(),
    };
  }

  @Get('me/addresses')
  @UseGuards(JwtAuthGuard)
  async getAddresses(@CurrentUser() user: User) {
    return { data: await this.usersService.getAddresses(user.id) };
  }

  @Post('me/addresses')
  @UseGuards(JwtAuthGuard)
  async createAddress(@CurrentUser() user: User, @Body() body: Record<string, unknown>) {
    return this.usersService.createAddress(user.id, body as any);
  }

  @Patch('me/addresses/:id')
  @UseGuards(JwtAuthGuard)
  async updateAddress(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.usersService.updateAddress(user.id, id, body as any);
  }

  @Delete('me/addresses/:id')
  @UseGuards(JwtAuthGuard)
  async deleteAddress(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.usersService.deleteAddress(user.id, id);
  }

  @Post('me/avatar')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
          return cb(new BadRequestException('Nur Bilder erlaubt.'), false);
        }
        cb(null, true);
      },
    }),
  )
  async uploadClientAvatar(
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Kein Bild hochgeladen.');
    const url = await this.r2Service.uploadFile(
      file.buffer,
      file.mimetype,
      'avatars',
    );
    await this.userRepo.update(user.id, { avatarUrl: url });
    await this.providerRepo.update({ userId: user.id }, { avatarUrl: url });
    return { avatarUrl: url };
  }
}
