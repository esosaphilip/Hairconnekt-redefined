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
import { MAX_PAGE_SIZE } from '../common/pagination';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EmailVerifiedGuard } from '../auth/guards/email-verified.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { RefreshToken } from '../auth/entities/refresh-token.entity';
import { Provider, ProviderStatus } from '../entities/provider.entity';
import { User, UserRole } from '../entities/user.entity';
import { AdminUsersBulkDeleteDto } from './dto/admin-users-bulk-delete.dto';
import { AuditService } from '../audit/audit.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { Request } from 'express';

type AuthRequest = Request & { user: { sub?: string; id?: string; role?: string } };

@Controller('admin/users')
@UseGuards(JwtAuthGuard, EmailVerifiedGuard, AdminGuard)
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
  ): Promise<'deleted' | 'skipped_admin' | 'not_found' | 'already_deleted'> {
    const user = await this.userRepo.findOne({ where: { id }, withDeleted: true });
    if (!user) {
      return 'not_found';
    }
    if (user.role === UserRole.ADMIN) {
      return 'skipped_admin';
    }
    if (user.deletedAt) {
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

    return 'deleted';
  }

  @Get()
  async findAll(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('includeDeleted') includeDeleted?: string,
  ) {
    const hasExplicitLimit = typeof limit === 'string' && limit.trim() !== '';
    const rawLimit = Number(limit ?? 20);
    const parsedLimitUncapped = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.floor(rawLimit) : 20;
    if (hasExplicitLimit && parsedLimitUncapped > MAX_PAGE_SIZE) {
      throw new BadRequestException(`\`limit\` darf maximal ${MAX_PAGE_SIZE} betragen.`);
    }
    const parsedLimit = Math.max(1, Math.min(MAX_PAGE_SIZE, parsedLimitUncapped));
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
    @Req() req: AuthRequest,
    @Body() body: AdminUsersBulkDeleteDto,
  ) {
    const ids = body.ids;
    const results: Array<{ id: string; result: 'deleted' | 'skipped_admin' | 'not_found' | 'already_deleted'; user?: User }> = [];

    for (const id of ids) {
      const user = await this.userRepo.findOne({ where: { id }, withDeleted: true });
      const result = await this.softDeleteUserById(id);
      results.push({ id, result, user: user ?? undefined });
    }

    const deleted = results.filter((r) => r.result === 'deleted').length;
    const skippedAdmin = results.filter((r) => r.result === 'skipped_admin').length;
    const notFound = results.filter((r) => r.result === 'not_found').length;
    const alreadyDeleted = results.filter((r) => r.result === 'already_deleted').length;
    const anySuccess = deleted > 0;

    await this.auditService.record({
      actorUserId: admin.id,
      actorRole: admin.role,
      action: 'admin.users.bulk_delete',
      targetType: 'user',
      targetIds: ids,
      outcome: anySuccess ? 'success' : 'failure',
      request: req,
      metadata: {
        ids,
        deleted,
        skippedAdmin,
        notFound,
        alreadyDeleted,
        perItem: results.map((r) => ({
          id: r.id,
          result: r.result,
          beforeState: r.user
            ? {
                role: r.user.role,
                isActive: r.user.isActive,
                deletedAt: r.user.deletedAt ? r.user.deletedAt.toISOString() : null,
              }
            : null,
        })),
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
    @Req() req: AuthRequest,
  ) {
    const user = await this.userRepo.findOne({ where: { id }, withDeleted: true });

    const beforeState = user
      ? {
          role: user.role,
          isActive: user.isActive,
          deletedAt: user.deletedAt ? user.deletedAt.toISOString() : null,
        }
      : null;

    try {
      const res = await this.softDeleteUserById(id);

      if (res === 'not_found') {
        throw new NotFoundException('Benutzer nicht gefunden.');
      }
      if (res === 'skipped_admin') {
        throw new BadRequestException('Admin Benutzer können nicht gelöscht werden.');
      }

      await this.auditService.record({
        actorUserId: admin.id,
        actorRole: admin.role,
        action: 'admin.user.delete',
        targetType: 'user',
        targetId: id,
        outcome: 'success',
        request: req,
        beforeState,
        afterState: res === 'deleted' ? { isActive: false, deletedAt: true } : null,
        metadata: {
          result: res,
        },
      });
    } catch (error) {
      await this.auditService.record({
        actorUserId: admin.id,
        actorRole: admin.role,
        action: 'admin.user.delete',
        targetType: 'user',
        targetId: id,
        outcome: 'failure',
        request: req,
        beforeState,
        afterState: null,
        metadata: {
          error: error instanceof Error ? error.message : String(error),
        },
      });
      throw error;
    }
  }
}
