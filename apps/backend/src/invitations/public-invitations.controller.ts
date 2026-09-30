import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '../entities/user.entity';
import { InvitationsService } from './invitations.service';
import { AcceptInvitationDto } from './dto/create-invitation.dto';
import { AuditService } from '../audit/audit.service';
import { IpThrottlerGuard } from '../auth/guards/ip-throttler.guard';

@Controller('invitations')
@UseGuards(IpThrottlerGuard)
export class PublicInvitationsController {
  constructor(
    private readonly invitationsService: InvitationsService,
    private readonly auditService: AuditService,
  ) {}

  @Get(':token/verify')
  async verify(
    @Param('token') token: string,
  ): Promise<{ email: string; role: UserRole }> {
    return this.invitationsService.verifyPublic(token);
  }

  @Post(':token/accept')
  @HttpCode(201)
  async accept(
    @Param('token') token: string,
    @Body() dto: AcceptInvitationDto,
  ): Promise<{ success: boolean; message: string }> {
    if (!token?.trim()) {
      throw new BadRequestException('Token ist erforderlich.');
    }
    const { user, invitation } = await this.invitationsService.acceptInvitation(
      token,
      dto.password,
    );
    await this.auditService.record({
      action: 'admin.invitation.accepted',
      targetType: 'invitation',
      targetId: invitation.id,
      actorUserId: user.id,
      actorRole: user.role,
      metadata: { acceptedFromPublicEndpoint: true },
      afterState: {
        userId: user.id,
        email: user.email,
        acceptedAt: invitation.acceptedAt,
      },
    });
    return {
      success: true,
      message: 'Konto erfolgreich erstellt. Du kannst dich jetzt anmelden.',
    };
  }
}
