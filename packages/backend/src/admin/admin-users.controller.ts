import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { RefreshToken } from '../auth/entities/refresh-token.entity';
import { Provider, ProviderStatus } from '../entities/provider.entity';
import { User, UserRole } from '../entities/user.entity';

@Controller('admin/users')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminUsersController {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Provider)
    private readonly providerRepo: Repository<Provider>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,
  ) {}

  @Get()
  async findAll() {
    return this.userRepo.find({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        isEmailVerified: true,
        isActive: true,
        createdAt: true,
        deletedAt: true,
      },
      order: { createdAt: 'DESC' },
    });
  }

  @Delete(':id')
  @HttpCode(204)
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    const user = await this.userRepo.findOne({ where: { id }, withDeleted: true });
    if (!user) throw new NotFoundException('Benutzer nicht gefunden.');
    if (user.role === UserRole.ADMIN) {
      throw new BadRequestException('Admin Benutzer können nicht gelöscht werden.');
    }

    const provider = await this.providerRepo.findOne({ where: { userId: id }, withDeleted: true });
    if (provider && !provider.deletedAt) {
      await this.providerRepo.update(provider.id, {
        status: ProviderStatus.SUSPENDED,
        isOnline: false,
      });
      await this.providerRepo.softDelete(provider.id);
    }

    await this.refreshTokenRepo.delete({ userId: id } as any);

    if (!user.deletedAt) {
      await this.userRepo.update(id, { isActive: false });
      await this.userRepo.softDelete(id);
    }
  }
}

