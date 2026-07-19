import {
  Controller, Post, Body, UseGuards, HttpCode, HttpStatus, Req, HttpException,
  Res, Get,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LogoutDto } from './dto/logout.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { IpThrottlerGuard } from './guards/ip-throttler.guard';
import { UserThrottlerGuard } from './guards/user-throttler.guard';
import { AdminLoginThrottlerGuard } from './guards/admin-login-throttler.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { User } from '../entities/user.entity';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import {
  clearAdminSessionCookie,
  setAdminSessionCookie,
} from './admin-session';
import { AdminGuard } from './guards/admin.guard';
import { AuditService } from '../audit/audit.service';
import { clearAdminCsrfCookie, issueAdminCsrfToken } from './admin-csrf';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * POST /auth/register
   * Returns: AuthResponseDto (accessToken + refreshToken + user)
   */
  @Post('register')
  @SkipThrottle()
  @UseGuards(IpThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60 * 60 } })
  @HttpCode(HttpStatus.CREATED)
  register(@Body() dto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(dto);
  }

  /**
   * POST /auth/login
   * identifier = email or phone
   * Returns: AuthResponseDto
   */
  @Post('login')
  @SkipThrottle()
  @UseGuards(IpThrottlerGuard)
  @Throttle({ default: { limit: 20, ttl: 15 * 60 } })
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(dto);
  }

  /**
   * POST /auth/admin-login
   * Returns: AuthResponseDto
   */
  @Post('admin-login')
  @SkipThrottle()
  @UseGuards(IpThrottlerGuard, AdminLoginThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 15 * 60 } })
  @HttpCode(HttpStatus.OK)
  async adminLogin(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ user: AuthResponseDto['user'] }> {
    try {
      const auth = await this.authService.adminLogin(dto);
      setAdminSessionCookie(res, auth.accessToken);
      await this.auditService.record({
        actorUserId: auth.user.id,
        actorRole: auth.user.role,
        action: 'auth.admin.login',
        targetType: 'session',
        targetId: auth.user.id,
        request: req,
        metadata: {
          identifier: dto.identifier,
        },
      });
      return { user: auth.user };
    } catch (error) {
      await this.auditService.record({
        action: 'auth.admin.login',
        targetType: 'session',
        outcome: 'failure',
        reason: error instanceof HttpException ? error.message : 'admin_login_failed',
        request: req,
        metadata: {
          identifier: dto.identifier,
        },
      });
      throw error;
    }
  }

  @Get('admin-csrf')
  @HttpCode(HttpStatus.OK)
  getAdminCsrf(
    @Res({ passthrough: true }) res: Response,
  ): { csrfToken: string } {
    return {
      csrfToken: issueAdminCsrfToken(res),
    };
  }

  @Get('admin-session')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(HttpStatus.OK)
  getAdminSession(@CurrentUser() user: User): { user: AuthResponseDto['user'] } {
    return {
      user: AuthResponseDto.fromUser(user, '', '').user,
    };
  }

  /**
   * POST /auth/google
   * Mobile Google Sign-In flow
   * Returns: AuthResponseDto
   */
  @Post('google')
  @HttpCode(HttpStatus.OK)
  googleAuth(@Body() dto: GoogleAuthDto): Promise<AuthResponseDto> {
    throw new HttpException(
      'Google OAuth not available in Phase 1',
      HttpStatus.NOT_IMPLEMENTED,
    );
  }

  /**
   * POST /auth/refresh
   * Rotates refresh token — old is revoked, new pair issued
   * Returns: AuthResponseDto
   */
  @Post('refresh')
  @SkipThrottle()
  @UseGuards(IpThrottlerGuard)
  @Throttle({ default: { limit: 120, ttl: 60 * 60 } })
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshTokenDto): Promise<AuthResponseDto> {
    return this.authService.refresh(dto);
  }

  /**
   * POST /auth/logout
   * Revokes refresh tokens for this user.
   * Body is optional — if refreshToken provided, revokes only that token.
   */
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @CurrentUser() user: User,
    @Req() req: Request,
    @Body() body: LogoutDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.authService.logout(user.id, body.refreshToken);
    if (user.role === 'admin') {
      clearAdminCsrfCookie(res);
      clearAdminSessionCookie(res);
      await this.auditService.record({
        actorUserId: user.id,
        actorRole: user.role,
        action: 'auth.admin.logout',
        targetType: 'session',
        targetId: user.id,
        request: req,
      });
    }
  }

  @Post('admin-logout')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async adminLogout(
    @CurrentUser() user: User,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    clearAdminCsrfCookie(res);
    clearAdminSessionCookie(res);
    await this.authService.logout(user.id);
    await this.auditService.record({
      actorUserId: user.id,
      actorRole: user.role,
      action: 'auth.admin.logout',
      targetType: 'session',
      targetId: user.id,
      request: req,
    });
  }

  /**
   * POST /auth/forgot-password
   * Sends OTP code to user's email. Returns generic message (no enumeration).
   */
  @Post('forgot-password')
  @SkipThrottle()
  @UseGuards(IpThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60 * 60 } })
  @HttpCode(HttpStatus.OK)
  forgotPassword(@Body() dto: ForgotPasswordDto): Promise<{ message: string }> {
    return this.authService.forgotPassword(dto);
  }

  /**
   * POST /auth/verify-otp
   * Validates the 6-digit OTP. Must be called before reset-password.
   */
  @Post('verify-otp')
  @SkipThrottle()
  @UseGuards(IpThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60 * 60 } })
  @HttpCode(HttpStatus.OK)
  verifyOtp(@Body() dto: VerifyOtpDto): Promise<{ resetToken: string }> {
    return this.authService.verifyOtp(dto);
  }

  /**
   * POST /auth/reset-password
   * Verifies OTP + sets new password + revokes all refresh tokens.
   * Returns: AuthResponseDto (auto-login after reset)
   */
  @Post('reset-password')
  @SkipThrottle()
  @UseGuards(IpThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60 * 60 } })
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() dto: ResetPasswordDto): Promise<{ message: string }> {
    return this.authService.resetPassword(dto);
  }

  @Post('verify-email')
  @SkipThrottle()
  @UseGuards(IpThrottlerGuard)
  @Throttle({ default: { limit: 20, ttl: 60 * 60 } })
  @HttpCode(HttpStatus.OK)
  verifyEmail(@Body() dto: VerifyEmailDto): Promise<{ success: boolean; alreadyVerified?: boolean }> {
    return this.authService.verifyEmail(dto.email, dto.code);
  }

  @Post('resend-verification')
  @SkipThrottle()
  @UseGuards(IpThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60 * 60 } })
  @HttpCode(HttpStatus.OK)
  resendVerification(@Body() dto: ResendVerificationDto): Promise<{ success: boolean; alreadyVerified?: boolean }> {
    return this.authService.resendEmailVerification(dto.email);
  }
}
