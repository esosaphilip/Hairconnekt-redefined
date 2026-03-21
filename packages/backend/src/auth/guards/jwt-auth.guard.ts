import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * JwtAuthGuard — protects any route requiring a valid JWT access token.
 * Usage: @UseGuards(JwtAuthGuard) on controller or route level.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
