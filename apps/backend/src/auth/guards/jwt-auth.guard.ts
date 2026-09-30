import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * JwtAuthGuard — protects any route requiring a valid JWT access token.
 * Usage: @UseGuards(JwtAuthGuard) on controller or route level.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: unknown, user: unknown) {
    if (err || !user) {
      throw new UnauthorizedException('Nicht autorisiert. Bitte melde dich erneut an.');
    }
    return user as any;
  }
}
