import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Post,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { RefreshToken } from '../auth/entities/refresh-token.entity';
import { Provider, ProviderStatus } from '../entities/provider.entity';
import { User, UserRole } from '../entities/user.entity';
import { AdminUsersBulkDeleteDto } from './dto/admin-users-bulk-delete.dto';

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

  private async softDeleteUserById(id: string): Promise<'deleted' | 'skipped_admin' | 'not_found' | 'already_deleted'> {
    const user = await this.userRepo.findOne({ where: { id }, withDeleted: true });
    if (!user) return 'not_found';
    if (user.role === UserRole.ADMIN) return 'skipped_admin';
    if (user.deletedAt) return 'already_deleted';

    const provider = await this.providerRepo.findOne({
      where: { userId: id },
      withDeleted: true,
    });
    if (provider && !provider.deletedAt) {
      await this.providerRepo.update(provider.id, {
        status: ProviderStatus.SUSPENDED,
        isOnline: false,
      });
      await this.providerRepo.softDelete(provider.id);
    }

    await this.refreshTokenRepo.delete({ userId: id } as any);
    await this.userRepo.update(id, { isActive: false });
    await this.userRepo.softDelete(id);

    return 'deleted';
  }

  @Get()
  async findAll(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const parsedLimit = Math.max(1, Math.min(100, Number(limit ?? 20) || 20));
    const parsedOffset = Math.max(0, Number(offset ?? 0) || 0);

    const [data, total] = await this.userRepo.findAndCount({
      where: { isActive: true },
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
      take: parsedLimit,
      skip: parsedOffset,
    });

    return {
      data,
      total,
      limit: parsedLimit,
      offset: parsedOffset,
    };
  }

  @Post('bulk-delete')
  async bulkDelete(@Body() body: AdminUsersBulkDeleteDto) {
    const results = await Promise.all(
      body.ids.map((id) => this.softDeleteUserById(id)),
    );
    const deleted = results.filter((r) => r === 'deleted').length;
    const skippedAdmin = results.filter((r) => r === 'skipped_admin').length;
    const notFound = results.filter((r) => r === 'not_found').length;
    const alreadyDeleted = results.filter((r) => r === 'already_deleted').length;

    return {
      deleted,
      skippedAdmin,
      notFound,
      alreadyDeleted,
    };
  }

  @Delete(':id')
  @HttpCode(204)
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    const res = await this.softDeleteUserById(id);
    if (res === 'not_found') throw new NotFoundException('Benutzer nicht gefunden.');
    if (res === 'skipped_admin') {
      throw new BadRequestException('Admin Benutzer können nicht gelöscht werden.');
    }
  }
}
