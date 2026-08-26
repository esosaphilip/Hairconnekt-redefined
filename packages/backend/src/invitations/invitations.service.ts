import {
  BadRequestException,
  ConflictException,
  GoneException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { sendEmail } from '../common/email/mailer';
import { Gender, User, UserRole } from '../entities/user.entity';
import { Invitation, InvitationStatus } from '../entities/invitation.entity';
import { RefreshToken } from '../auth/entities/refresh-token.entity';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class InvitationsService {
  private readonly logger = new Logger(InvitationsService.name);

  constructor(
    @InjectRepository(Invitation)
    private readonly inviteRepo: Repository<Invitation>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,
    private readonly auditService: AuditService,
    @InjectDataSource() private readonly dataSource?: DataSource,
  ) {}

  private hashToken(raw: string): string {
    return createHash('sha256').update(raw).digest('hex').toLowerCase();
  }

  private genRawToken(): string {
    return randomBytes(32).toString('base64url');
  }

  private getAdminAppUrlOrThrow(): string {
    const raw = process.env.ADMIN_APP_URL?.trim();
    const env = (process.env.NODE_ENV ?? 'development').trim().toLowerCase();
    if (raw) return raw;
    if (env === 'production') {
      this.logger.error(
        '[INVITES] createInvitation blockiert: ADMIN_APP_URL fehlt in NODE_ENV=production. ' +
          'Setze ADMIN_APP_URL (z.B. https://admin.hairconnekt.de) in den Backend-Umgebungsvariablen.',
      );
      throw new InternalServerErrorException(
        'ADMIN_APP_URL ist nicht konfiguriert. Bitte im Backend hinterlegen (z.B. https://admin.hairconnekt.de).',
      );
    }
    const fallback = 'http://localhost:5173';
    this.logger.warn(
      `[INVITES] ADMIN_APP_URL nicht gesetzt (NODE_ENV=${env}). Verwende Fallback ${fallback}. ` +
        'Setze ADMIN_APP_URL in der Backend-Deploy-Konfiguration, damit Einladungs-Links korrekt sind.',
    );
    return fallback;
  }

  async createInvitation(
    invitedByAdmin: User,
    email: string,
  ): Promise<{ invitation: Invitation; rawToken: string }> {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      throw new BadRequestException('E-Mail ist erforderlich.');
    }

    const existingPending = await this.inviteRepo.findOne({
      where: { email: trimmedEmail, status: InvitationStatus.PENDING },
    });
    if (existingPending) {
      throw new ConflictException(
        'Für diese E-Mail besteht bereits eine offene Einladung.',
      );
    }

    const existingUser = await this.userRepo.findOne({
      where: [{ email: trimmedEmail, role: UserRole.ADMIN }],
      withDeleted: true,
    });
    if (existingUser) {
      throw new ConflictException(
        'Unter dieser E-Mail existiert bereits ein Admin-Konto.',
      );
    }

    const raw = this.genRawToken();
    const tokenHash = this.hashToken(raw);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const entity = this.inviteRepo.create({
      email: trimmedEmail,
      role: UserRole.ADMIN,
      tokenHash,
      invitedBy: invitedByAdmin.id,
      expiresAt,
      status: InvitationStatus.PENDING,
    });

    const saved = await this.inviteRepo.save(entity);

    const baseUrl = this.getAdminAppUrlOrThrow();
    const inviteLink = `${baseUrl}/accept-invite?token=${raw}`;

    try {
      await sendEmail({
        to: trimmedEmail,
        subject: 'Du wurdest zu HairConnekt Admin eingeladen',
        html: `<p>Hallo,</p><p>Du wurdest von ${invitedByAdmin.firstName} ${invitedByAdmin.lastName} zum HairConnekt Admin-Panel eingeladen.</p><p>Klicke hier, um dein Passwort festzulegen:<br/><a href="${inviteLink}">${inviteLink}</a></p><p>Dieser Link ist 7 Tage gültig.</p>`,
        text: `Hallo,\n\nDu wurdest von ${invitedByAdmin.firstName} ${invitedByAdmin.lastName} zum HairConnekt Admin-Panel eingeladen.\n\nKlicke hier, um dein Passwort festzulegen:\n${inviteLink}\n\nDieser Link ist 7 Tage gültig.`,
      });
    } catch (emailError) {
      try {
        saved.status = InvitationStatus.REVOKED;
        await this.inviteRepo.save(saved);
      } catch {
        // ignore rollback failure
      }
      throw emailError;
    }

    return { invitation: saved, rawToken: raw };
  }

  async listInvitations(statusFilter?: string): Promise<Invitation[]> {
    return this.inviteRepo.find({
      where: statusFilter
        ? { status: statusFilter as InvitationStatus }
        : undefined,
      order: { createdAt: 'DESC' },
    });
  }

  async revokePendingInvitation(id: string): Promise<Invitation> {
    const inv = await this.inviteRepo.findOne({ where: { id } });
    if (!inv) {
      throw new NotFoundException('Einladung nicht gefunden.');
    }
    if (inv.status !== InvitationStatus.PENDING) {
      throw new BadRequestException(
        'Nur offene Einladungen können widerrufen werden.',
      );
    }
    inv.status = InvitationStatus.REVOKED;
    return this.inviteRepo.save(inv);
  }

  private async loadValidOrThrow(
    tokenRaw: string,
    opts?: { forAccept?: boolean },
  ): Promise<Invitation> {
    const tokenHash = this.hashToken(tokenRaw);
    const inv = await this.inviteRepo.findOne({ where: { tokenHash } });
    if (!inv) {
      throw new NotFoundException('Einladung nicht gefunden.');
    }
    if (inv.status === InvitationStatus.ACCEPTED) {
      throw new GoneException('Einladung wurde bereits angenommen.');
    }
    if (inv.status === InvitationStatus.REVOKED) {
      throw new GoneException('Einladung wurde widerrufen.');
    }
    if (new Date(inv.expiresAt).getTime() < Date.now()) {
      if (inv.status !== InvitationStatus.EXPIRED) {
        inv.status = InvitationStatus.EXPIRED;
        await this.inviteRepo.save(inv);
      }
      throw new GoneException('Einladung ist abgelaufen.');
    }
    if (opts?.forAccept && inv.status === InvitationStatus.EXPIRED) {
      throw new GoneException('Einladung ist abgelaufen.');
    }
    return inv;
  }

  async verifyPublic(tokenRaw: string): Promise<{ email: string; role: UserRole }> {
    const inv = await this.loadValidOrThrow(tokenRaw);
    return { email: inv.email, role: inv.role };
  }

  async acceptInvitation(
    tokenRaw: string,
    password: string,
  ): Promise<{ user: User; invitation: Invitation }> {
    const inv = await this.loadValidOrThrow(tokenRaw, { forAccept: true });

    const rawRounds = process.env.BCRYPT_ROUNDS ?? '12';
    const rounds = Math.max(10, Math.min(14, parseInt(rawRounds, 10)));
    const passwordHash = await bcrypt.hash(password, rounds);

    const emailPrefix = inv.email.split('@')[0] ?? 'Admin';
    const useTransaction = !!this.dataSource;

    if (useTransaction && this.dataSource) {
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
      try {
        const manager = queryRunner.manager;

        const existingUser = await manager.getRepository(User).findOne({
          where: { email: inv.email },
          withDeleted: true,
        });
        if (existingUser) {
          throw new ConflictException(
            'Es existiert bereits ein Benutzer mit dieser E-Mail.',
          );
        }

        const user = manager.getRepository(User).create({
          firstName: emailPrefix,
          lastName: 'Team',
          email: inv.email,
          passwordHash,
          role: inv.role,
          isActive: true,
          isEmailVerified: true,
          gender: Gender.UNSPECIFIED,
        });

        const savedUser = await manager.getRepository(User).save(user);

        inv.status = InvitationStatus.ACCEPTED;
        inv.acceptedAt = new Date();
        const savedInv = await manager.getRepository(Invitation).save(inv);

        await queryRunner.commitTransaction();
        return { user: savedUser, invitation: savedInv };
      } catch (err) {
        await queryRunner.rollbackTransaction();
        throw err;
      } finally {
        await queryRunner.release();
      }
    } else {
      const existingUser = await this.userRepo.findOne({
        where: { email: inv.email },
        withDeleted: true,
      });
      if (existingUser) {
        throw new ConflictException(
          'Es existiert bereits ein Benutzer mit dieser E-Mail.',
        );
      }

      const user = this.userRepo.create({
        firstName: emailPrefix,
        lastName: 'Team',
        email: inv.email,
        passwordHash,
        role: inv.role,
        isActive: true,
        isEmailVerified: true,
        gender: Gender.UNSPECIFIED,
      });

      const savedUser = await this.userRepo.save(user);

      inv.status = InvitationStatus.ACCEPTED;
      inv.acceptedAt = new Date();
      const savedInv = await this.inviteRepo.save(inv);

      return { user: savedUser, invitation: savedInv };
    }
  }
}
