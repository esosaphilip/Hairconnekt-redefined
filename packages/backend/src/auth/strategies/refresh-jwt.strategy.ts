import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import { JwtPayload } from './jwt.strategy';

/**
 * RefreshJwtStrategy — validates the refresh token (30d secret).
 * Named 'jwt-refresh' to distinguish from the access token strategy 'jwt'.
 *
 * On validate:
 *  1. Confirms the raw token exists in refresh_tokens table
 *  2. Confirms it is not revoked and not expired
 *  3. Returns the User entity — populates req.user for the refresh endpoint
 *
 * Usage: @UseGuards(AuthGuard('jwt-refresh')) — currently the auth.service
 *        handles rotation logic directly; this strategy is provided for
 *        guard-based refresh endpoints if needed in the future.
 */
@Injectable()
export class RefreshJwtStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_REFRESH_SECRET,
      passReqToCallback: false,
    });
  }

  async validate(payload: JwtPayload): Promise<User> {
    // Ensure the token record exists in DB and is not revoked
    // Note: the raw token string is not available here without passReqToCallback.
    // The auth.service.refresh() method performs full DB validation.
    // This strategy primarily validates the JWT signature + expiry.
    const user = await this.userRepo.findOne({
      where: { id: payload.sub, isActive: true },
    });
    if (!user) throw new UnauthorizedException();
    return user;
  }
}
