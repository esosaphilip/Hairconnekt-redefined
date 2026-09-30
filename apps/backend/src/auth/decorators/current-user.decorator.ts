import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '../../entities/user.entity';

/**
 * CurrentUser decorator — extracts the authenticated User from request.
 * Populated by JwtAuthGuard / JwtStrategy.validate().
 *
 * Usage: async myRoute(@CurrentUser() user: User)
 */
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): User => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
