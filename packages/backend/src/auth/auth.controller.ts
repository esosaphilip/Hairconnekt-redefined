import {
  Controller, Post, Body, UseGuards, HttpCode, HttpStatus, Req, HttpException,
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
import { AuthResponseDto } from './dto/auth-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { IpThrottlerGuard } from './guards/ip-throttler.guard';
import { UserThrottlerGuard } from './guards/user-throttler.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { User } from '../entities/user.entity';
import { Throttle } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /auth/register
   * Returns: AuthResponseDto (accessToken + refreshToken + user)
   */
  @Post('register')
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
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(dto);
  }

  /**
   * POST /auth/admin-login
   * Returns: AuthResponseDto
   */
  @Post('admin-login')
  @HttpCode(HttpStatus.OK)
  adminLogin(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.adminLogin(dto);
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
    @Body() body: { refreshToken?: string },
  ): Promise<void> {
    await this.authService.logout(user.id, body.refreshToken);
  }

  /**
   * POST /auth/forgot-password
   * Sends OTP code to user's email. Returns generic message (no enumeration).
   */
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  forgotPassword(@Body() dto: ForgotPasswordDto): Promise<{ message: string }> {
    return this.authService.forgotPassword(dto);
  }

  /**
   * POST /auth/verify-otp
   * Validates the 6-digit OTP. Must be called before reset-password.
   */
  @Post('verify-otp')
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
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() dto: ResetPasswordDto): Promise<{ message: string }> {
    return this.authService.resetPassword(dto);
  }

  @Post('verify-email')
  @UseGuards(JwtAuthGuard, UserThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 15 * 60 } })
  @HttpCode(HttpStatus.OK)
  verifyEmail(
    @CurrentUser() user: User,
    @Body() dto: VerifyEmailDto,
  ): Promise<{ message: string }> {
    return this.authService.verifyEmail(user.id, dto.otp);
  }

  @Post('resend-verification')
  @UseGuards(JwtAuthGuard, UserThrottlerGuard)
  @Throttle({ default: { limit: 3, ttl: 60 * 60 } })
  @HttpCode(HttpStatus.OK)
  resendVerification(@CurrentUser() user: User): Promise<{ message: string }> {
    return this.authService.resendEmailVerification(user.id);
  }
}
