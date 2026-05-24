import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
  GoneException,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import * as disposableEmailDomains from 'disposable-email-domains';
import { sendEmail } from '../common/email/mailer';
import { User } from '../entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { PasswordResetRequest } from './entities/password-reset-request.entity';
import { AuthResponseDto } from './dto/auth-response.dto';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  private intEnv(name: string, fallback: number, min?: number, max?: number): number {
    const raw = process.env[name];
    const parsed = raw !== undefined ? parseInt(raw, 10) : NaN;
    let value = Number.isFinite(parsed) ? parsed : fallback;
    if (typeof min === 'number') value = Math.max(min, value);
    if (typeof max === 'number') value = Math.min(max, value);
    return value;
  }

  private hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,

    @InjectRepository(PasswordResetRequest)
    private readonly passwordResetRepo: Repository<PasswordResetRequest>,

    private readonly jwtService: JwtService,
  ) {}

  // ─── REGISTER ──────────────────────────────────────────────────────────────
  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const isProd = (process.env.NODE_ENV ?? 'development') === 'production';
    if (isProd && dto.role === 'admin') {
      throw new BadRequestException('Ungültige Rolle.');
    }

    const email = dto.email.toLowerCase();
    const emailDomain = email.split('@')[1]?.trim()?.toLowerCase();
    if (!emailDomain) {
      throw new BadRequestException('Bitte verwende eine echte E-Mail-Adresse.');
    }
    const rawDisposable: any =
      (disposableEmailDomains as any)?.default ?? (disposableEmailDomains as any);
    const list: string[] | null = Array.isArray(rawDisposable)
      ? rawDisposable
      : Array.isArray(rawDisposable?.domains)
        ? rawDisposable.domains
        : null;
    if (list && list.includes(emailDomain)) {
      throw new BadRequestException('Bitte verwende eine echte E-Mail-Adresse.');
    }

    // Check if email already exists
    const existing = await this.userRepo.findOne({
      where: { email },
    });
    if (existing) {
      throw new ConflictException('Diese E-Mail-Adresse ist bereits registriert.');
    }

    const rounds = this.intEnv('BCRYPT_ROUNDS', 12, 10, 14);
    const passwordHash = await bcrypt.hash(dto.password, rounds);

    const user = this.userRepo.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email,
      phone: dto.phone,
      passwordHash,
      role: dto.role,
    });

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedCode = await bcrypt.hash(verificationCode, 10);
    user.emailVerificationCode = hashedCode;
    user.emailVerificationExpires = new Date(Date.now() + 30 * 60 * 1000);

    await this.userRepo.save(user);

    await this.sendVerificationEmail(user.email, user.firstName, verificationCode).catch((err) => {
      this.logger.error(
        'SendGrid email verification send failed',
        err instanceof Error ? err.message : undefined,
      );
    });

    return this.generateAuthResponse(user);
  }

  // ─── LOGIN ─────────────────────────────────────────────────────────────────
  async login(dto: LoginDto): Promise<AuthResponseDto> {
    // Identify by email or phone
    const user = await this.userRepo
      .createQueryBuilder('u')
      .addSelect('u.passwordHash') // select:false — must be explicit
      .where('u.email = :identifier OR u.phone = :identifier', {
        identifier: dto.identifier.toLowerCase(),
      })
      .andWhere('u.isActive = true')
      .getOne();

    if (!user) throw new UnauthorizedException('E-Mail oder Passwort falsch.');

    // Guard against Google-only accounts
    if (!user.passwordHash) {
      throw new UnauthorizedException(
        'Dieses Konto wurde mit Google erstellt. Bitte melde dich mit Google an.',
      );
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) throw new UnauthorizedException('E-Mail oder Passwort falsch.');

    return this.generateAuthResponse(user);
  }

  // ─── ADMIN LOGIN ───────────────────────────────────────────────────────────
  async adminLogin(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.userRepo
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where('u.email = :identifier', {
        identifier: dto.identifier.toLowerCase(),
      })
      .andWhere('u.isActive = true')
      .getOne();

    if (!user || user.role !== 'admin') {
      throw new UnauthorizedException('Kein Admin-Zugang.');
    }

    if (!user.passwordHash) {
      throw new UnauthorizedException('Kein Admin-Zugang.');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Kein Admin-Zugang.');
    }

    return this.generateAuthResponse(user);
  }

  // ─── GOOGLE AUTH ───────────────────────────────────────────────────────────
  async googleAuth(dto: GoogleAuthDto): Promise<AuthResponseDto> {
    // Phase 1: Basic Google auth via ID token — verify with Google OAuth2 client
    // In production, verify the idToken against Google's servers
    // For now, decode the payload (full verification added when integrating expo-auth-session)
    throw new BadRequestException('Google-Auth in Konfiguration. Bitte E-Mail verwenden.');
    // Full implementation: const payload = await verifyGoogleToken(dto.idToken);
    // Then find-or-create user from payload.email + payload.sub
  }

  // ─── REFRESH TOKEN ─────────────────────────────────────────────────────────
  async refresh(dto: RefreshTokenDto): Promise<AuthResponseDto> {
    // Verify the refresh JWT signature
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(dto.refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
    } catch {
      throw new UnauthorizedException('Refresh-Token ungültig oder abgelaufen.');
    }

    const tokenHash = this.hashRefreshToken(dto.refreshToken);

    // Check token exists in DB and is not revoked
    const stored = await this.refreshTokenRepo.findOne({
      where: [
        { token: tokenHash, userId: payload.sub, isRevoked: false },
        { token: dto.refreshToken, userId: payload.sub, isRevoked: false },
      ],
    });
    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh-Token ungültig oder abgelaufen.');
    }

    // Rotate — revoke old, issue new
    stored.isRevoked = true;
    await this.refreshTokenRepo.save(stored);

    const user = await this.userRepo.findOne({ where: { id: payload.sub } });
    if (!user) throw new UnauthorizedException();

    return this.generateAuthResponse(user);
  }

  // ─── LOGOUT ────────────────────────────────────────────────────────────────
  async logout(userId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      const tokenHash = this.hashRefreshToken(refreshToken);
      await this.refreshTokenRepo.update(
        [
          { userId, token: tokenHash },
          { userId, token: refreshToken },
        ],
        { isRevoked: true },
      );
    } else {
      // Revoke ALL refresh tokens for this user (logout all devices)
      await this.refreshTokenRepo.update({ userId }, { isRevoked: true });
    }
  }

  // ─── FORGOT PASSWORD ───────────────────────────────────────────────────────
  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const email = dto.email.toLowerCase();
    const user = await this.userRepo.findOne({ where: { email } });

    const message =
      'Falls ein Konto mit dieser E-Mail existiert, wurde ein Code gesendet.';

    if (!user) return { message };

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(
      Date.now() +
        this.intEnv('OTP_EXPIRES_MINUTES', 10, 5, 30) * 60 * 1000,
    );

    const rounds = this.intEnv('BCRYPT_ROUNDS', 12, 10, 14);
    const otpHash = await bcrypt.hash(otp, rounds);

    const reset = this.passwordResetRepo.create({
      userId: user.id,
      otpHash,
      resetTokenHash: null,
      expiresAt,
      otpVerifiedAt: null,
      usedAt: null,
    });
    await this.passwordResetRepo.save(reset);

    await this.sendOtpEmail(user.email, otp).catch(() => {});

    const isDev =
      (process.env.NODE_ENV ?? 'development') !== 'production' &&
      process.env.OTP_DEV_MODE === 'true';
    if (isDev) {
      return { message: `${message} (DEV Code: ${otp})` };
    }

    return { message };
  }

  // ─── VERIFY OTP ────────────────────────────────────────────────────────────
  async verifyOtp(dto: VerifyOtpDto): Promise<{ resetToken: string }> {
    const email = dto.email.toLowerCase();
    const user = await this.userRepo.findOne({ where: { email } });
    if (!user) {
      throw new BadRequestException('Ungültiger Code. Bitte versuche es erneut.');
    }

    const req = await this.passwordResetRepo.findOne({
      where: { userId: user.id, usedAt: null },
      order: { createdAt: 'DESC' },
    });

    if (!req) {
      throw new BadRequestException('Ungültiger Code. Bitte versuche es erneut.');
    }

    if (req.expiresAt < new Date()) {
      throw new GoneException('Code abgelaufen. Bitte fordere einen neuen an.');
    }

    const ok = await bcrypt.compare(dto.otp, req.otpHash);
    if (!ok) {
      throw new BadRequestException('Ungültiger Code. Bitte versuche es erneut.');
    }

    const resetToken = randomBytes(32).toString('hex');
    const resetTokenHash = createHash('sha256')
      .update(resetToken)
      .digest('hex');

    req.resetTokenHash = resetTokenHash;
    req.otpVerifiedAt = new Date();
    await this.passwordResetRepo.save(req);

    return { resetToken };
  }

  // ─── RESET PASSWORD ────────────────────────────────────────────────────────
  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const tokenHash = createHash('sha256')
      .update(dto.resetToken)
      .digest('hex');

    const req = await this.passwordResetRepo.findOne({
      where: { resetTokenHash: tokenHash, usedAt: null },
      order: { createdAt: 'DESC' },
    });

    if (!req || req.expiresAt < new Date() || !req.otpVerifiedAt) {
      throw new BadRequestException(
        'Code-Verifizierung fehlgeschlagen. Bitte starte den Vorgang neu.',
      );
    }

    const user = await this.userRepo
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where('u.id = :id', { id: req.userId })
      .getOne();

    if (!user) throw new NotFoundException('Konto nicht gefunden.');

    const rounds = parseInt(process.env.BCRYPT_ROUNDS ?? '12');
    user.passwordHash = await bcrypt.hash(dto.password, rounds);
    await this.userRepo.save(user);

    await this.refreshTokenRepo.update({ userId: user.id }, { isRevoked: true });

    req.usedAt = new Date();
    await this.passwordResetRepo.save(req);

    return { message: 'Passwort wurde erfolgreich geändert.' };
  }

  async verifyEmail(
    emailRaw: string,
    code: string,
  ): Promise<{ success: boolean; alreadyVerified?: boolean }> {
    const email = String(emailRaw ?? '').toLowerCase();

    const user = await this.userRepo
      .createQueryBuilder('u')
      .addSelect(['u.emailVerificationCode', 'u.emailVerificationExpires'])
      .where('u.email = :email', { email })
      .andWhere('u.isActive = true')
      .andWhere('u.deletedAt IS NULL')
      .getOne();

    if (!user) {
      throw new UnauthorizedException('Ungültiger Code.');
    }

    if (!user.emailVerificationCode || !user.emailVerificationExpires) {
      return { success: true, alreadyVerified: true };
    }

    if (user.emailVerificationExpires < new Date()) {
      throw new UnauthorizedException('Code abgelaufen. Bitte fordere einen neuen an.');
    }

    const ok = await bcrypt.compare(code, user.emailVerificationCode);
    if (!ok) {
      throw new UnauthorizedException('Ungültiger Code.');
    }

    await this.userRepo.update(
      { id: user.id },
      {
        isEmailVerified: true,
        emailVerificationCode: null,
        emailVerificationExpires: null,
      },
    );

    return { success: true };
  }

  async resendEmailVerification(
    emailRaw: string,
  ): Promise<{ success: boolean; alreadyVerified?: boolean }> {
    const email = String(emailRaw ?? '').toLowerCase();
    const user = await this.userRepo
      .createQueryBuilder('u')
      .addSelect(['u.emailVerificationCode', 'u.emailVerificationExpires'])
      .where('u.email = :email', { email })
      .andWhere('u.isActive = true')
      .andWhere('u.deletedAt IS NULL')
      .getOne();

    if (!user) {
      return { success: true };
    }

    if (user.isEmailVerified) {
      return { success: true, alreadyVerified: true };
    }

    if (user.emailVerificationExpires && user.emailVerificationCode) {
      const lastSentAt = new Date(user.emailVerificationExpires.getTime() - 30 * 60 * 1000);
      const diffMs = Date.now() - lastSentAt.getTime();
      if (diffMs < 2 * 60 * 1000) {
        throw new HttpException(
          { message: 'Bitte warte 2 Minuten vor dem erneuten Senden.' },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedCode = await bcrypt.hash(verificationCode, 10);

    await this.userRepo.update(
      { id: user.id },
      {
        emailVerificationCode: hashedCode,
        emailVerificationExpires: new Date(Date.now() + 30 * 60 * 1000),
      },
    );

    await this.sendVerificationEmail(user.email, user.firstName, verificationCode).catch((err) => {
      this.logger.error(
        'Email verification resend failed',
        err instanceof Error ? err.message : undefined,
      );
    });

    return { success: true };
  }

  // ─── PRIVATE HELPERS ───────────────────────────────────────────────────────
  private async sendVerificationEmail(to: string, firstName: string, code: string): Promise<void> {
    await sendEmail({
      to,
      subject: 'HairConnekt – E-Mail bestätigen',
      html: `
        <h2>Hallo ${firstName},</h2>
        <p>Bitte bestätige deine E-Mail-Adresse mit diesem Code:</p>
        <h1 style="letter-spacing:8px;font-size:36px;">${code}</h1>
        <p>Der Code ist 30 Minuten gültig.</p>
        <p>Falls du dich nicht bei HairConnekt registriert hast, ignoriere diese E-Mail.</p>
      `,
      text:
        `Hallo ${firstName},\n\n` +
        `Dein HairConnekt Bestätigungscode: ${code}\n\n` +
        `Gültig für 30 Minuten.`,
    });
  }

  private async sendOtpEmail(to: string, otp: string): Promise<void> {
    const subject = 'Dein HairConnekt Sicherheitscode';
    const text = [
      'Hallo,',
      '',
      'hier ist dein Sicherheitscode für HairConnekt:',
      '',
      `${otp}`,
      '',
      'Gültig für 10 Minuten.',
      '',
      'Wenn du diese Anfrage nicht gestellt hast, kannst du diese E-Mail ignorieren.',
      '',
      'Liebe Grüße',
      'Dein HairConnekt Team',
    ].join('\n');

    await sendEmail({
      to,
      subject,
      text,
      html: `<!doctype html>
<html lang="de">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${subject}</title>
  </head>
  <body style="margin:0;padding:0;background:#f7f7f7;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      Dein Code ist ${otp} (10 Minuten gültig).
    </div>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f7f7f7;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="520" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;">
            <tr>
              <td style="padding:22px 24px 8px 24px;">
                <div style="font-size:14px;letter-spacing:0.08em;text-transform:uppercase;color:#777777;">
                  HairConnekt
                </div>
                <div style="font-size:22px;line-height:1.25;color:#111111;margin-top:8px;font-weight:700;">
                  Sicherheitscode
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:0 24px 18px 24px;color:#222222;font-size:15px;line-height:1.5;">
                <div style="margin-top:6px;">Hallo,</div>
                <div style="margin-top:10px;">hier ist dein Sicherheitscode für HairConnekt:</div>
                <div style="margin-top:16px;padding:14px 16px;border-radius:12px;background:#f3f4f6;text-align:center;">
                  <div style="font-size:28px;letter-spacing:0.22em;font-weight:800;color:#111111;">
                    ${otp}
                  </div>
                </div>
                <div style="margin-top:14px;color:#444444;">
                  Gültig für <strong>10 Minuten</strong>.
                </div>
                <div style="margin-top:14px;color:#555555;">
                  Wenn du diese Anfrage nicht gestellt hast, kannst du diese E-Mail ignorieren.
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:14px 24px 22px 24px;border-top:1px solid #eeeeee;color:#666666;font-size:12px;line-height:1.5;">
                <div>Liebe Grüße</div>
                <div style="font-weight:700;color:#444444;">Dein HairConnekt Team</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
    });
  }

  private async generateAuthResponse(user: User): Promise<AuthResponseDto> {
    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role };

    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: (process.env.JWT_ACCESS_EXPIRES ?? '15m') as any,
    });

    const refreshTokenStr = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: (process.env.JWT_REFRESH_EXPIRES ?? '30d') as any,
    });

    // Persist refresh token for rotation
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await this.refreshTokenRepo.delete({ userId: user.id });

    const refreshTokenEntity = this.refreshTokenRepo.create({
      userId: user.id,
      token: this.hashRefreshToken(refreshTokenStr),
      expiresAt,
    });
    await this.refreshTokenRepo.save(refreshTokenEntity);

    return AuthResponseDto.fromUser(user, accessToken, refreshTokenStr);
  }
}
