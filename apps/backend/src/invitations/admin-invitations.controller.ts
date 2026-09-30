import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Request } from 'express';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EmailVerifiedGuard } from '../auth/guards/email-verified.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../entities/user.entity';
import { Invitation, InvitationStatus } from '../entities/invitation.entity';
import { InvitationsService } from './invitations.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { AuditService } from '../audit/audit.service';

@Controller('admin/invitations')
@UseGuards(JwtAuthGuard, EmailVerifiedGuard, AdminGuard)
export class AdminInvitationsController {
  constructor(
    private readonly invitationsService: InvitationsService,
    private readonly auditService: AuditService,
    @InjectRepository(Invitation)
    private readonly inviteRepo: Repository<Invitation>,
  ) {}

  @Post()
  async create(
    @CurrentUser() admin: User,
    @Req() req: Request,
    @Body() dto: CreateInvitationDto,
  ): Promise<Invitation> {
    const { invitation } = await this.invitationsService.createInvitation(
      admin,
      dto.email,
    );
    await this.auditService.record({
      actorUserId: admin.id,
      actorRole: admin.role,
      action: 'admin.invitation.created',
      targetType: 'invitation',
      targetId: invitation.id,
      request: req,
      afterState: {
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
      },
    });
    return invitation;
  }

  @Get()
  async list(@Query('status') status?: string): Promise<Invitation[]> {
    if (status && !['pending', 'accepted', 'revoked', 'expired'].includes(status)) {
      throw new BadRequestException('Ungültiger Statusfilter.');
    }
    return this.invitationsService.listInvitations(status);
  }

  @Delete(':id')
  @HttpCode(204)
  async revoke(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() admin: User,
    @Req() req: Request,
  ): Promise<void> {
    const before = await this.inviteRepo.findOne({ where: { id } });
    const after = await this.invitationsService.revokePendingInvitation(id);
    await this.auditService.record({
      actorUserId: admin.id,
      actorRole: admin.role,
      action: 'admin.invitation.revoked',
      targetType: 'invitation',
      targetId: id,
      request: req,
      beforeState: before
        ? { email: before.email, status: before.status }
        : null,
      afterState: { status: InvitationStatus.REVOKED },
    });
  }
}
