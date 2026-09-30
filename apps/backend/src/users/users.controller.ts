import {
  Controller, Get, Post, Patch, Delete, Body, Param, ParseUUIDPipe,
  UseGuards, Request, UseInterceptors, UploadedFile, BadRequestException,
  HttpCode, HttpStatus,
} from '@nestjs/common';
import { type Request as ExpressRequest } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EmailVerifiedGuard } from '../auth/guards/email-verified.guard';
import { AllowOnboarding } from '../auth/decorators/allow-onboarding.decorator';
import { UsersService } from './users.service';
import { memoryStorage } from 'multer';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { Provider } from '../entities/provider.entity';
import { R2Service } from '../common/storage/r2.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ensureAllowedImageUpload } from '../common/files/file-validation';
import {
  CreateAddressDto,
  DeleteAccountDto,
  UpdateAddressDto,
  UpdateUserProfileDto,
} from './dto/user-endpoints.dto';

type AuthRequest = ExpressRequest & { user: { sub?: string; id?: string; role?: string } };

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly r2Service: R2Service,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Provider) private readonly providerRepo: Repository<Provider>,
  ) {}

  @Get('me')
  @UseGuards(JwtAuthGuard, EmailVerifiedGuard)
  async getMe(@Request() req: AuthRequest) {
    const userId = (req.user.sub ?? req.user.id)!;
    return this.usersService.getMe(userId);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard, EmailVerifiedGuard)
  async updateMe(
    @CurrentUser() user: User,
    @Body() body: UpdateUserProfileDto,
  ) {
    return this.usersService.updateMe(user.id, body);
  }

  @Delete('me')
  @UseGuards(JwtAuthGuard, EmailVerifiedGuard)
  @HttpCode(HttpStatus.OK)
  async deleteAccount(
    @CurrentUser() user: User,
    @Body() body: DeleteAccountDto,
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
  @UseGuards(JwtAuthGuard, EmailVerifiedGuard)
  async getAddresses(@CurrentUser() user: User) {
    return { data: await this.usersService.getAddresses(user.id) };
  }

  @Post('me/addresses')
  @UseGuards(JwtAuthGuard, EmailVerifiedGuard)
  async createAddress(@CurrentUser() user: User, @Body() body: CreateAddressDto) {
    return this.usersService.createAddress(user.id, body);
  }

  @Patch('me/addresses/:id')
  @UseGuards(JwtAuthGuard, EmailVerifiedGuard)
  async updateAddress(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateAddressDto,
  ) {
    return this.usersService.updateAddress(user.id, id, body);
  }

  @Delete('me/addresses/:id')
  @UseGuards(JwtAuthGuard, EmailVerifiedGuard)
  async deleteAddress(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.usersService.deleteAddress(user.id, id);
  }

  @AllowOnboarding()
  @Post('me/avatar')
  @UseGuards(JwtAuthGuard, EmailVerifiedGuard)
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
      fileFilter: (req, file, cb) => {
        if (!/^(image\/jpeg|image\/png|image\/webp)$/.test(file.mimetype)) {
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
    ensureAllowedImageUpload(file);
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
