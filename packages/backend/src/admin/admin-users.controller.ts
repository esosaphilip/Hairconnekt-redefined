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
  Req,
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
import { AuditService } from '../audit/audit.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { Request } from 'express';

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
    private readonly auditService: AuditService,
  ) {}

  private async softDeleteUserById(
    id: string,
    admin?: User,
    request?: Request,
  ): Promise<'deleted' | 'skipped_admin' | 'not_found' | 'already_deleted'> {
    const user = await this.userRepo.findOne({ where: { id }, withDeleted: true });
    if (!user) {
      await this.auditDelete(admin, request, id, 'not_found');
      return 'not_found';
    }
    if (user.role === UserRole.ADMIN) {
      await this.auditDelete(admin, request, user.id, 'skipped_admin', user);
      return 'skipped_admin';
    }
    if (user.deletedAt) {
      await this.auditDelete(admin, request, user.id, 'already_deleted', user);
      return 'already_deleted';
    }

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

    await this.auditDelete(admin, request, user.id, 'deleted', user, {
      providerId: provider?.id ?? null,
      providerSuspended: Boolean(provider && !provider.deletedAt),
    });

    return 'deleted';
  }

  private async auditDelete(
    admin: User | undefined,
    request: Request | undefined,
    targetId: string,
    outcome: 'deleted' | 'skipped_admin' | 'not_found' | 'already_deleted',
    user?: User,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.auditService.record({
      actorUserId: admin?.id ?? null,
      actorRole: admin?.role ?? null,
      action: 'user.soft_deleted',
      targetType: 'user',
      targetId,
      outcome: outcome === 'deleted' ? 'success' : 'failure',
      request,
      reason: outcome === 'deleted' ? null : outcome,
      beforeState: user
        ? {
            role: user.role,
            isActive: user.isActive,
            deletedAt: user.deletedAt ? user.deletedAt.toISOString() : null,
          }
        : null,
      afterState:
        outcome === 'deleted'
          ? {
              isActive: false,
              deletedAt: true,
            }
          : null,
      metadata: metadata ?? null,
    });
  }

  @Get()
  async findAll(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('includeDeleted') includeDeleted?: string,
  ) {
    const parsedLimit = Math.max(1, Math.min(100, Number(limit ?? 20) || 20));
    const parsedOffset = Math.max(0, Number(offset ?? 0) || 0);
    const parsedIncludeDeleted =
      String(includeDeleted ?? '')
        .trim()
        .toLowerCase() === 'true' || String(includeDeleted ?? '').trim() === '1';

    const [data, total] = await this.userRepo.findAndCount({
      where: parsedIncludeDeleted ? {} : { isActive: true },
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
      withDeleted: parsedIncludeDeleted,
    });

    return {
      data,
      total,
      limit: parsedLimit,
      offset: parsedOffset,
    };
  }

  @Post('bulk-delete')
  async bulkDelete(
    @CurrentUser() admin: User,
    @Req() req: Request,
    @Body() body: AdminUsersBulkDeleteDto,
  ) {
    const results = await Promise.all(
      body.ids.map((id) => this.softDeleteUserById(id, admin, req)),
    );
    const deleted = results.filter((r) => r === 'deleted').length;
    const skippedAdmin = results.filter((r) => r === 'skipped_admin').length;
    const notFound = results.filter((r) => r === 'not_found').length;
    const alreadyDeleted = results.filter((r) => r === 'already_deleted').length;

    await this.auditService.record({
      actorUserId: admin.id,
      actorRole: admin.role,
      action: 'user.bulk_delete.executed',
      targetType: 'user',
      request: req,
      metadata: {
        ids: body.ids,
        deleted,
        skippedAdmin,
        notFound,
        alreadyDeleted,
      },
    });

    return {
      deleted,
      skippedAdmin,
      notFound,
      alreadyDeleted,
    };
  }

  @Delete(':id')
  @HttpCode(204)
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() admin: User,
    @Req() req: Request,
  ) {
    const res = await this.softDeleteUserById(id, admin, req);
    if (res === 'not_found') throw new NotFoundException('Benutzer nicht gefunden.');
    if (res === 'skipped_admin') {
      throw new BadRequestException('Admin Benutzer können nicht gelöscht werden.');
    }
  }
}
