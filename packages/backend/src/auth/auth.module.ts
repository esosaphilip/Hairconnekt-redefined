import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RefreshJwtStrategy } from './strategies/refresh-jwt.strategy';
import { RefreshToken } from './entities/refresh-token.entity';
import { PasswordResetRequest } from './entities/password-reset-request.entity';
import { User } from '../entities/user.entity';
import { IpThrottlerGuard } from './guards/ip-throttler.guard';
import { UserThrottlerGuard } from './guards/user-throttler.guard';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_ACCESS_SECRET,
      signOptions: { expiresIn: (process.env.JWT_ACCESS_EXPIRES ?? '15m') as any },
    }),
    TypeOrmModule.forFeature([User, RefreshToken, PasswordResetRequest]),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, RefreshJwtStrategy, IpThrottlerGuard, UserThrottlerGuard],
  exports: [AuthService, JwtModule, PassportModule],
})
export class AuthModule {}
