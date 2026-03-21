import {
  Controller, Post, Body, UseGuards, HttpCode, HttpStatus, Req,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { User } from '../entities/user.entity';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /auth/register
   * Creates a User (+ pending Provider if role=provider)
   * Returns: AuthResponseDto (accessToken + refreshToken + user)
   */
  @Post('register')
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
   * POST /auth/google
   * Mobile Google Sign-In flow
   * Returns: AuthResponseDto
   */
  @Post('google')
  @HttpCode(HttpStatus.OK)
  googleAuth(@Body() dto: GoogleAuthDto): Promise<AuthResponseDto> {
    return this.authService.googleAuth(dto);
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
  verifyOtp(@Body() dto: VerifyOtpDto): Promise<{ valid: boolean }> {
    return this.authService.verifyOtp(dto);
  }

  /**
   * POST /auth/reset-password
   * Verifies OTP + sets new password + revokes all refresh tokens.
   * Returns: AuthResponseDto (auto-login after reset)
   */
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() dto: ResetPasswordDto): Promise<AuthResponseDto> {
    return this.authService.resetPassword(dto);
  }
}
