import { Controller, Get, Post, UseGuards, Request, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';
import { memoryStorage } from 'multer';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { R2Service } from '../common/storage/r2.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly r2Service: R2Service,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@Request() req) {
    const userId = req.user.sub || req.user.id;
    return this.usersService.getMe(userId);
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
    return { avatarUrl: url };
  }
}
