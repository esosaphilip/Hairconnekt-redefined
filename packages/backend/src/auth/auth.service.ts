import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { AuthResponseDto } from './dto/auth-response.dto';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { JwtPayload } from './strategies/jwt.strategy';

// In-memory OTP store for Phase 1 (swap for Redis in Phase 2)
const otpStore = new Map<string, { otp: string; expiresAt: Date }>();

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,

    private readonly jwtService: JwtService,
  ) {}

  // ─── REGISTER ──────────────────────────────────────────────────────────────
  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    // Check if email already exists
    const existing = await this.userRepo.findOne({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException('Diese E-Mail-Adresse ist bereits registriert.');
    }

    const rounds = parseInt(process.env.BCRYPT_ROUNDS ?? '12');
    const passwordHash = await bcrypt.hash(dto.password, rounds);

    const user = this.userRepo.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email.toLowerCase(),
      phone: dto.phone,
      passwordHash,
      role: dto.role,
    });

    await this.userRepo.save(user);

    // NOTE: if role=provider, the Provider profile is created separately
    // via POST /providers/register — NOT here. (DOC08 rule)

    return this.generateAuthResponse(user);
  }

  // ─── LOGIN ─────────────────────────────────────────────────────────────────
  async login(dto: LoginDto): Promise<AuthResponseDto> {
    // Identify by email or phone
    const user = await this.userRepo
      .createQueryBuilder('user')
      .addSelect('user.passwordHash') // select:false — must be explicit
      .where('user.email = :identifier OR user.phone = :identifier', {
        identifier: dto.identifier.toLowerCase(),
      })
      .andWhere('user.isActive = true')
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
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :identifier', {
        identifier: dto.identifier.toLowerCase(),
      })
      .andWhere('user.isActive = true')
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

    // Check token exists in DB and is not revoked
    const stored = await this.refreshTokenRepo.findOne({
      where: { token: dto.refreshToken, userId: payload.sub, isRevoked: false },
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
      await this.refreshTokenRepo.update(
        { userId, token: refreshToken },
        { isRevoked: true },
      );
    } else {
      // Revoke ALL refresh tokens for this user (logout all devices)
      await this.refreshTokenRepo.update({ userId }, { isRevoked: true });
    }
  }

  // ─── FORGOT PASSWORD ───────────────────────────────────────────────────────
  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const user = await this.userRepo.findOne({
      where: { email: dto.email.toLowerCase() },
    });

    // Always return success to prevent email enumeration attacks
    if (!user) {
      return { message: 'Falls ein Konto mit dieser E-Mail existiert, wurde ein Code gesendet.' };
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(
      Date.now() + (parseInt(process.env.OTP_EXPIRES_MINUTES ?? '10') * 60 * 1000),
    );

    otpStore.set(dto.email.toLowerCase(), { otp, expiresAt });

    // TODO: Send OTP via email service (SMTP — DOC09 SMTP vars)
    // await this.emailService.sendOtp(user.email, otp);
    console.log(`[DEV] OTP for ${dto.email}: ${otp}`); // Remove in production

    return { message: 'Falls ein Konto mit dieser E-Mail existiert, wurde ein Code gesendet.' };
  }

  // ─── VERIFY OTP ────────────────────────────────────────────────────────────
  async verifyOtp(dto: VerifyOtpDto): Promise<{ valid: boolean }> {
    const stored = otpStore.get(dto.email.toLowerCase());
    if (!stored) throw new BadRequestException('Kein Code für diese E-Mail gefunden.');
    if (stored.expiresAt < new Date()) throw new BadRequestException('Code abgelaufen. Bitte neuen Code anfordern.');
    if (stored.otp !== dto.otp) throw new BadRequestException('Falscher Code. Bitte erneut versuchen.');

    return { valid: true };
  }

  // ─── RESET PASSWORD ────────────────────────────────────────────────────────
  async resetPassword(dto: ResetPasswordDto): Promise<AuthResponseDto> {
    // Verify OTP first
    await this.verifyOtp({ email: dto.email, otp: dto.otp });

    const user = await this.userRepo
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email: dto.email.toLowerCase() })
      .getOne();

    if (!user) throw new NotFoundException('Konto nicht gefunden.');

    const rounds = parseInt(process.env.BCRYPT_ROUNDS ?? '12');
    user.passwordHash = await bcrypt.hash(dto.newPassword, rounds);
    await this.userRepo.save(user);

    // Revoke all refresh tokens for security after password reset
    await this.refreshTokenRepo.update({ userId: user.id }, { isRevoked: true });

    // Clear OTP
    otpStore.delete(dto.email.toLowerCase());

    return this.generateAuthResponse(user);
  }

  // ─── PRIVATE HELPERS ───────────────────────────────────────────────────────
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

    const refreshTokenEntity = this.refreshTokenRepo.create({
      userId: user.id,
      token: refreshTokenStr,
      expiresAt,
    });
    await this.refreshTokenRepo.save(refreshTokenEntity);

    return AuthResponseDto.fromUser(user, accessToken, refreshTokenStr);
  }
}
