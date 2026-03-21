import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RefreshJwtStrategy } from './strategies/refresh-jwt.strategy';
import { RefreshToken } from './entities/refresh-token.entity';
import { User } from '../entities/user.entity';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      // Secrets loaded dynamically in service — module just enables JwtService
      secret: process.env.JWT_ACCESS_SECRET,
      signOptions: { expiresIn: (process.env.JWT_ACCESS_EXPIRES ?? '15m') as any },
    }),
    TypeOrmModule.forFeature([User, RefreshToken]),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, RefreshJwtStrategy],
  exports: [AuthService, JwtModule, PassportModule],
})
export class AuthModule {}
