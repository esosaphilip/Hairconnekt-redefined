import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { Invitation } from '../entities/invitation.entity';
import { User } from '../entities/user.entity';
import { RefreshToken } from '../auth/entities/refresh-token.entity';
import { InvitationsService } from './invitations.service';
import { AdminInvitationsController } from './admin-invitations.controller';
import { PublicInvitationsController } from './public-invitations.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Invitation, User, RefreshToken]),
    AuditModule,
  ],
  controllers: [AdminInvitationsController, PublicInvitationsController],
  providers: [InvitationsService],
  exports: [InvitationsService],
})
export class InvitationsModule {}
